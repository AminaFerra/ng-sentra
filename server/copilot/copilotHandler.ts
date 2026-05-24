import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { streamCopilotResponse, buildSnapshotSummary } from "./copilot-service";
import type { Message } from "../_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import * as db from "../db";

// ─── Input validation ─────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const CopilotMessageSchema = z.object({
  type: z.enum(["message", "cancel", "ping"]),
  messages: z.array(MessageSchema).max(20).optional(),
  sessionId: z.string().max(64).optional(),
});

// ─── Rate limiter (per WebSocket session) ─────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

class SessionRateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  check(id: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(id);
    if (!entry || now > entry.resetAt) {
      this.counts.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT_MAX;
  }
}

const rateLimiter = new SessionRateLimiter();

// ─── Auth helpers ─────────────────────────────────────────────────────────────

interface SessionUser {
  id?: number;
  name?: string;
  role?: string;
}

async function getUserFromRequest(req: IncomingMessage): Promise<SessionUser | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookie(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const session = await sdk.verifySession(token);
    if (!session) return null;

    let user = await db.getUserByOpenId(session.openId);
    if (!user) {
      if (ENV.localAuthEnabled) {
        return {
          id: 0,
          name: session.name || ENV.localAuthName,
          role: ENV.localAuthRole,
        };
      }
      return null;
    }

    return {
      id: user.id,
      name: user.name ?? undefined,
      role: user.role ?? undefined,
    };
  } catch {
    return null;
  }
}

function isAllowedRole(role?: string): boolean {
  const allowed = ["Admin", "admin", "Analyst"];
  return allowed.includes(role ?? "");
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

function send(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export function setupCopilotHandler(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/api/copilot")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // Unique id for rate-limiting — use remote IP + random suffix
    const clientId = (req.socket.remoteAddress ?? "unknown") + "_" + Math.random().toString(36).slice(2, 8);

    // Auth check
    const user = await getUserFromRequest(req);
    if (!isAllowedRole(user?.role)) {
      send(ws, {
        type: "error",
        message: "Access denied: SOC Copilot requires Analyst or Admin role.",
        code: "FORBIDDEN",
      });
      ws.close();
      return;
    }

    let abortController: AbortController | null = null;

    ws.on("message", async (raw) => {
      let parsed: z.infer<typeof CopilotMessageSchema>;
      try {
        parsed = CopilotMessageSchema.parse(JSON.parse(raw.toString()));
      } catch {
        send(ws, { type: "error", message: "Invalid message format." });
        return;
      }

      if (parsed.type === "ping") {
        send(ws, { type: "pong" });
        return;
      }

      if (parsed.type === "cancel") {
        abortController?.abort();
        send(ws, { type: "cancelled" });
        return;
      }

      if (parsed.type === "message") {
        // Rate limit check
        if (!rateLimiter.check(clientId)) {
          send(ws, {
            type: "error",
            message: "Rate limit exceeded. Please wait before sending more queries.",
            code: "RATE_LIMITED",
          });
          return;
        }

        const messages = (parsed.messages ?? []) as Message[];
        if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
          send(ws, { type: "error", message: "Last message must be from the user." });
          return;
        }

        // Abort any in-flight request
        abortController?.abort();
        abortController = new AbortController();
        const { signal } = abortController;

        // Audit log (fire and forget)
        const rawContent = messages[messages.length - 1]?.content ?? "";
        const lastUserMsg = (typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent)).slice(0, 200);
        import("../db").then(({ createAuditLog }) => {
          createAuditLog({
            userId: user?.id,
            userName: user?.name ?? "Unknown",
            userRole: user?.role ?? "Unknown",
            action: "COPILOT_QUERY",
            target: "copilot",
            details: lastUserMsg,
          }).catch(console.warn);
        });

        // Stream the response
        send(ws, { type: "thinking", message: "Initializing…" });

        try {
          await streamCopilotResponse(
            messages,
            {
              onToken: (token) => send(ws, { type: "token", data: token }),
              onStatus: (msg) => send(ws, { type: "status", message: msg }),
              onDone: (snapshot, fullAiResponse, memoryCount) => {
                const sourceSummary = {
                  fetchedAt: snapshot.fetchedAt,
                  containerCount: snapshot.containers.length,
                  stoppedContainers: snapshot.failedContainers.map((c) => c.name),
                  alertCount: snapshot.wazuhAlerts.length,
                  criticalAlerts: snapshot.criticalAlertCount,
                  failedServices: snapshot.failedServices.map((s) => s.unit),
                  sshAvailable: snapshot.sshAvailable,
                  wazuhAvailable: snapshot.wazuhAvailable,
                  dataErrors: snapshot.errors,
                  memoryCount, // Include memory count
                };
                send(ws, { type: "sources", data: sourceSummary });
                
                // Save to DB
                if (parsed.sessionId) {
                  const updatedMessages = [
                    ...messages,
                    { role: "assistant", content: fullAiResponse }
                  ];
                  
                  let title: string | undefined = undefined;
                  if (messages.length <= 2) {
                    const firstMsg = typeof messages[0]?.content === "string" ? messages[0].content : "Security Event";
                    title = "Investigation: " + firstMsg.substring(0, 40) + "...";
                  }

                  import("../db").then(({ saveCopilotSession }) => {
                    saveCopilotSession({
                      sessionId: parsed.sessionId as string,
                      userId: user?.id,
                      userName: user?.name ?? "Unknown",
                      userRole: user?.role ?? "Unknown",
                      messages: JSON.stringify(updatedMessages),
                      snapshotSummary: JSON.stringify(sourceSummary),
                      title
                    }).catch(console.error);
                  });
                }

                send(ws, { type: "done" });
              },
              onError: (msg) => send(ws, { type: "error", message: msg }),
            },
            { sessionId: parsed.sessionId },
            signal
          );
        } catch (err: any) {
          send(ws, { type: "error", message: `Unexpected error: ${err?.message ?? err}` });
        }
      }
    });

    ws.on("close", () => {
      abortController?.abort();
    });

    ws.on("error", (err) => {
      console.error("[CopilotWS] Error:", err);
    });

    // Greet
    send(ws, { type: "connected", user: { name: user?.name, role: user?.role } });
  });

  console.log("[Copilot] WebSocket handler registered at /api/copilot");
}
