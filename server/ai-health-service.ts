/**
 * AI Health Service — probes real AI model endpoints and systemd services
 * to determine live status rather than relying on static DB values.
 *
 * How it works:
 * 1. HTTP Health Check: Sends a request to each model's endpointUrl
 *    - If it responds (any 2xx/3xx), status = "running"
 *    - If it times out or refuses connection, status = "stopped"
 *    - If it returns 5xx, status = "error"
 * 2. SSH systemd check (optional): If SSH is configured, runs
 *    `systemctl is-active <service>` on the VirtualBox host.
 * 3. Updates the DB with the real status and lastActive timestamp.
 */

import { getSSHConfig } from "./ssh-service";
import { Client } from "ssh2";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  slug: string;
  status: "running" | "stopped" | "error" | "unknown";
  lastActive: Date | null;
  responseTimeMs: number | null;
  recentOutput: string | null;
  checkedVia: "http" | "ssh" | "both" | "none";
}

// Map model slugs to their systemd service names on the VirtualBox host
// Only anomaly-detection and uba run as systemd services on VirtualBox
// local-ti runs locally on Windows (server.py at localhost:5000)
const SYSTEMD_SERVICE_MAP: Record<string, string> = {
  "anomaly-detection": "ngsentra-ai",
  uba: "ngsentra-uba",
  // local-ti: runs on Windows localhost:5000 — checked via HTTP only
};

// Map model slugs to their Docker container names on the VirtualBox host
const DOCKER_CONTAINER_MAP: Record<string, string> = {
  "alert-classification": "ng_soc_ai_classifier_brain",
};

// ─── HTTP Health Probe ───────────────────────────────────────────────────────

async function probeHttpEndpoint(
  url: string,
  timeoutMs = 8000,
): Promise<{
  status: "running" | "stopped" | "error";
  responseTimeMs: number;
  output: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      // Skip SSL verification for self-signed certs on local services
      ...(url.startsWith("https")
        ? {}
        : {}),
    });

    clearTimeout(timer);
    const elapsed = Date.now() - start;

    if (response.ok || response.status === 301 || response.status === 302) {
      let body = "";
      try {
        body = await response.text();
        body = body.substring(0, 500); // Truncate for storage
      } catch {
        body = `HTTP ${response.status} OK`;
      }
      return {
        status: "running",
        responseTimeMs: elapsed,
        output: body || `HTTP ${response.status} — ${response.statusText}`,
      };
    }

    if (response.status >= 500) {
      return {
        status: "error",
        responseTimeMs: elapsed,
        output: `HTTP ${response.status} — ${response.statusText}`,
      };
    }

    // 4xx is still "running" — the service is alive, just different endpoint
    return {
      status: "running",
      responseTimeMs: elapsed,
      output: `HTTP ${response.status} — service is responding`,
    };
  } catch (err: any) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;

    if (err.name === "AbortError") {
      return {
        status: "stopped",
        responseTimeMs: elapsed,
        output: `Timeout after ${timeoutMs}ms — service unreachable`,
      };
    }

    // Connection refused, DNS failure, etc.
    return {
      status: "stopped",
      responseTimeMs: elapsed,
      output: `Connection failed: ${err.code || err.message}`,
    };
  }
}

// ─── SSH systemd Probe ───────────────────────────────────────────────────────

async function probeSystemdService(
  serviceName: string,
): Promise<{
  active: boolean;
  activating?: boolean;
  failed?: boolean;
  output: string;
} | null> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) return null;

  return new Promise((resolve) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(null);
    }, 30000);

    conn.on("ready", () => {
      // Check systemd status and get recent journal output
      const cmd = `systemctl is-active ${serviceName} 2>&1 && echo '---JOURNAL---' && journalctl -u ${serviceName} --no-pager -n 5 --output=short 2>/dev/null || true`;

      conn.exec(cmd, (err: Error | undefined, stream: any) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve(null);
          return;
        }

        let data = "";
        stream.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });

        stream.stderr.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });

        stream.on("close", () => {
          clearTimeout(timeout);
          conn.end();

          // Remove sudo password prompt that might appear on the same line as output
          const cleanData = data.replace(/\[sudo\] password for [^:]+:\s*/g, "");
          const lines = cleanData.trim().split("\n");
          const statusLine = lines[0]?.trim().toLowerCase() ?? "";
          const isActive = statusLine === "active";
          const isActivating = statusLine === "activating";
          const isFailed = statusLine === "failed" || statusLine === "inactive";

          // Extract journal output after the separator
          const journalIdx = cleanData.indexOf("---JOURNAL---");
          const journalOutput =
            journalIdx >= 0
              ? cleanData
                  .substring(journalIdx + "---JOURNAL---".length)
                  .trim()
                  .substring(0, 500)
              : "";

          resolve({
            active: isActive,
            activating: isActivating,
            failed: isFailed,
            output: journalOutput || `systemd status: ${statusLine}`,
          });
        });
      });
    });

    conn.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    conn.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
      finish([sshConfig.password]);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 30000,
    });
  });
}

// ─── SSH Docker Probe ────────────────────────────────────────────────────────

async function probeDockerContainer(
  containerName: string,
): Promise<{
  active: boolean;
  output: string;
} | null> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) return null;

  return new Promise((resolve) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(null);
    }, 30000);

    conn.on("ready", () => {
      // Check docker status and get recent logs. Use sudo -S with password since it's non-interactive
      const cmd = `echo '${sshConfig.password}' | sudo -S docker inspect -f '{{.State.Status}}' ${containerName} 2>&1 && echo '---LOGS---' && echo '${sshConfig.password}' | sudo -S docker logs --tail 5 ${containerName} 2>&1 || true`;

      conn.exec(cmd, (err: Error | undefined, stream: any) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve(null);
          return;
        }

        let data = "";
        stream.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });

        stream.stderr.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });

        stream.on("close", () => {
          clearTimeout(timeout);
          conn.end();

          // Remove sudo password prompt that might appear on the same line as output
          const cleanData = data.replace(/\[sudo\] password for [^:]+:\s*/g, "");
          const lines = cleanData.trim().split("\n");
          const statusLine = lines[0]?.trim().toLowerCase() ?? "";
          const isActive = statusLine === "running";

          const logsIdx = cleanData.indexOf("---LOGS---");
          const logsOutput =
            logsIdx >= 0
              ? cleanData
                  .substring(logsIdx + "---LOGS---".length)
                  .trim()
                  .substring(0, 500)
              : "";

          resolve({
            active: isActive,
            output: logsOutput || `docker status: ${statusLine}`,
          });
        });
      });
    });

    conn.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });

    conn.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
      finish([sshConfig.password]);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 30000,
    });
  });
}

// ─── Combined Health Check ───────────────────────────────────────────────────

export async function checkModelHealth(
  slug: string,
  endpointUrl: string | null,
): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    slug,
    status: "unknown",
    lastActive: null,
    responseTimeMs: null,
    recentOutput: null,
    checkedVia: "none",
  };

  // 1. HTTP probe (if endpoint URL exists)
  let httpResult: Awaited<ReturnType<typeof probeHttpEndpoint>> | null = null;
  if (endpointUrl) {
    try {
      httpResult = await probeHttpEndpoint(endpointUrl);
      result.status = httpResult.status;
      result.responseTimeMs = httpResult.responseTimeMs;
      result.recentOutput = httpResult.output;
      result.checkedVia = "http";

      if (httpResult.status === "running") {
        result.lastActive = new Date();
      }
    } catch {
      result.recentOutput = "HTTP probe threw unexpected error";
    }
  }

  // 2. SSH systemd probe (if a service mapping exists)
  const serviceName = SYSTEMD_SERVICE_MAP[slug];
  if (serviceName) {
    try {
      const sshResult = await probeSystemdService(serviceName);
      if (sshResult) {
        // SSH result can override or supplement HTTP result
        if (sshResult.active) {
          result.status = "running";
          result.lastActive = new Date();
          if (sshResult.output) {
            result.recentOutput = sshResult.output;
          }
          result.checkedVia =
            result.checkedVia === "http" ? "both" : "ssh";
        } else if (sshResult.activating) {
          // Service is in a crash/restart loop (like core-dump)
          result.status = "error";
          result.recentOutput =
            sshResult.output || result.recentOutput || "Service crash-looping (activating/auto-restart)";
          result.checkedVia =
            result.checkedVia === "http" ? "both" : "ssh";
        } else {
          // SSH says inactive/failed. Trust systemd over HTTP.
          result.status = "stopped";
          result.recentOutput =
            sshResult.output || result.recentOutput || "Service inactive (dead)";
          result.checkedVia =
            result.checkedVia === "http" ? "both" : "ssh";
        }
      }
    } catch {
      // SSH probe failed, rely on HTTP result only
    }
  }

  // 3. SSH Docker probe (if a container mapping exists)
  const containerName = DOCKER_CONTAINER_MAP[slug];
  if (containerName) {
    try {
      const dockerResult = await probeDockerContainer(containerName);
      if (dockerResult) {
        if (dockerResult.active) {
          result.status = "running";
          result.lastActive = new Date();
          if (dockerResult.output) {
            result.recentOutput = dockerResult.output;
          }
          result.checkedVia =
            result.checkedVia === "http" ? "both" : "ssh";
        } else {
          result.status = "stopped";
          result.recentOutput =
            dockerResult.output || result.recentOutput || "Container not running";
          result.checkedVia =
            result.checkedVia === "http" ? "both" : "ssh";
        }
      }
    } catch {
      // SSH probe failed
    }
  }

  // 4. Special case: alert-classification also uses external Google API
  // We already checked Docker, but let's also check if the Google API is reachable
  if (slug === "alert-classification" && endpointUrl && result.status !== "stopped") {
    // Just check if the Google API base is reachable
    try {
      const googleProbe = await probeHttpEndpoint(endpointUrl, 5000);
      // We don't overwrite status if Docker is running, but we update output if Google failed
      if (googleProbe.status !== "running") {
        result.status = googleProbe.status;
        result.recentOutput = `Container running, but Gemini API failed: ${googleProbe.output}`;
      } else if (!result.recentOutput) {
        result.recentOutput = `Google Gemini API reachable. Docker running.`;
      }
      
      // Override checkedVia to reflect we checked multiple layers
      result.checkedVia = "both";
    } catch {
      result.status = "error";
      result.recentOutput = "Container running, but failed to reach Google Gemini API";
    }
  }

  return result;
}

// ─── Batch Health Check ──────────────────────────────────────────────────────

export async function checkAllModelsHealth(
  models: Array<{ id: number; slug: string; endpointUrl: string | null }>,
): Promise<HealthCheckResult[]> {
  // Run all health checks in parallel for speed
  const results = await Promise.allSettled(
    models.map((m) => checkModelHealth(m.slug, m.endpointUrl)),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      slug: models[i].slug,
      status: "unknown" as const,
      lastActive: null,
      responseTimeMs: null,
      recentOutput: `Health check failed: ${r.reason}`,
      checkedVia: "none" as const,
    };
  });
}
