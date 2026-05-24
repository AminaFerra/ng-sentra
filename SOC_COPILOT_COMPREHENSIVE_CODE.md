# SOC Copilot Comprehensive Code Documentation

This document contains the complete source code for all components, hooks, services, and handlers added to build the SOC Copilot feature, from frontend UI components to backend WebSocket and LLM integration.

## File: `client/src/components/SOCCopilotPanel.tsx`

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import {
  Bot, X, Send, Loader2, Sparkles, ChevronDown, ChevronUp,
  Wifi, WifiOff, Square, Trash2, Shield, AlertTriangle,
  Server, Activity, Database, RefreshCw, Maximize2, Minimize2,
} from "lucide-react";
import { useCopilotSocket, type SourceData } from "@/hooks/useCopilotSocket";
import { cn } from "@/lib/utils";

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  {
    category: "🔥 Threat Analysis",
    prompts: [
      "What are the top 5 most suspicious IPs in the last 7 days?",
      "Are there any brute force attempts against SSH or system accounts?",
      "Show lateral movement indicators across agents",
      "Correlate Snort IDS alerts with Wazuh security events",
      "Detect privilege escalation attempts in recent alerts",
    ],
  },
  {
    category: "🔍 Log Analytics",
    prompts: [
      "Which agent is generating the most alerts today?",
      "Summarize all critical incidents in the last 24 hours",
      "Detect spikes in failed authentication attempts",
      "Which rule IDs are firing most frequently?",
      "Give me a full incident timeline for today",
    ],
  },
  {
    category: "🤖 AI Investigation",
    prompts: [
      "Is the AI brain container (ng_soc_ai_brain) healthy?",
      "Analyze UBA engine recent behavior and anomalies",
      "Give me a complete threat summary for the past 7 days",
      "Are any AI classifier containers showing errors?",
      "Recommend remediation actions for the top threats",
    ],
  },
  {
    category: "🛡️ Infrastructure",
    prompts: [
      "Are any Docker containers in a stopped or failed state?",
      "Which systemd services have failed recently?",
      "Analyze suspicious shell activity in auditd events",
      "Is the n8n SOAR engine running correctly?",
      "Check the health of all Wazuh stack containers",
    ],
  },
];

// ─── Source summary card ──────────────────────────────────────────────────────

function SourcesCard({ sources }: { sources: SourceData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-lg border border-border/40 bg-muted/20 text-xs overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Database className="w-3 h-3 flex-shrink-0" />
        <span className="flex-1 text-left font-mono">
          Data: {sources.containerCount} containers · {sources.alertCount} alerts
          {sources.criticalAlerts > 0 && (
            <span className="text-red-400 ml-1">· 🔴 {sources.criticalAlerts} critical</span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-border/30 pt-2">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full", sources.sshAvailable ? "bg-emerald-400" : "bg-red-400")} />
            <span>SSH: {sources.sshAvailable ? "Connected" : "Unavailable"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full", sources.wazuhAvailable ? "bg-emerald-400" : "bg-red-400")} />
            <span>Wazuh/OpenSearch: {sources.wazuhAvailable ? "Connected" : "Unavailable"}</span>
          </div>
          {sources.stoppedContainers.length > 0 && (
            <div className="text-orange-400">
              ⚠️ Stopped: {sources.stoppedContainers.join(", ")}
            </div>
          )}
          {sources.failedServices.length > 0 && (
            <div className="text-red-400">
              ❌ Failed services: {sources.failedServices.join(", ")}
            </div>
          )}
          {sources.dataErrors.length > 0 && (
            <div className="text-yellow-500">
              Warnings: {sources.dataErrors.join(" · ")}
            </div>
          )}
          <div className="text-muted-foreground/60 font-mono">
            Snapshot: {new Date(sources.fetchedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  role,
  content,
  streaming,
  sources,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: SourceData | null;
}) {
  return (
    <div className={cn("flex gap-2.5", role === "user" ? "justify-end" : "justify-start items-start")}>
      {role === "assistant" && (
        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div className={cn("max-w-[86%] space-y-1", role === "user" ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
            role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/60 border border-border/40 text-foreground rounded-tl-sm"
          )}
        >
          {role === "assistant" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-code:text-xs prose-pre:text-xs">
              <Streamdown>{content}</Streamdown>
              {streaming && (
                <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>

        {/* Sources card — only shown under the last assistant message when done */}
        {role === "assistant" && !streaming && sources && (
          <SourcesCard sources={sources} />
        )}
      </div>

      {role === "user" && (
        <div className="w-7 h-7 rounded-lg bg-secondary border border-border/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function SOCCopilotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    status,
    statusMessage,
    lastSources,
    isStreaming,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useCopilotSocket();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, statusMessage]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
    inputRef.current?.focus();
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasCriticalAlerts = lastSources && lastSources.criticalAlerts > 0;

  // ─── Status indicator ─────────────────────────────────────────────────────

  const statusConfig = {
    idle: { color: "bg-muted", label: "Idle", icon: null },
    connecting: { color: "bg-yellow-400 animate-pulse", label: "Connecting…", icon: RefreshCw },
    connected: { color: "bg-emerald-400", label: "Ready", icon: null },
    thinking: { color: "bg-blue-400 animate-pulse", label: statusMessage || "Thinking…", icon: Loader2 },
    streaming: { color: "bg-primary animate-pulse", label: "Responding…", icon: null },
    error: { color: "bg-red-400", label: "Error", icon: AlertTriangle },
    disconnected: { color: "bg-orange-400 animate-pulse", label: "Reconnecting…", icon: RefreshCw },
  }[status];

  const panelWidth = isExpanded ? "w-[680px]" : "w-[420px]";

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        id="copilot-trigger-btn"
        onClick={() => setIsOpen((v) => !v)}
        title="SOC Copilot (Ctrl+K)"
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3",
          "bg-primary text-primary-foreground shadow-2xl shadow-primary/30",
          "border border-primary/40 hover:shadow-primary/50",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          "backdrop-blur-sm",
          isOpen && "opacity-0 pointer-events-none scale-90"
        )}
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          {hasCriticalAlerts && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-primary animate-pulse" />
          )}
        </div>
        <span className="text-sm font-semibold tracking-wide">SOC Copilot</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-primary-foreground/15 text-primary-foreground/80 rounded px-1.5 py-0.5 text-[10px] font-mono border border-primary-foreground/10">
          ⌘K
        </kbd>
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col",
          "bg-card/95 backdrop-blur-xl border-l border-border/60",
          "shadow-2xl shadow-black/40",
          "transition-all duration-300 ease-out",
          panelWidth,
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Panel header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/40 flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground tracking-wide">SOC Copilot</h2>
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusConfig.color)} />
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                title="Clear chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded((v) => !v)}
              title={isExpanded ? "Collapse" : "Expand"}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors hidden sm:flex"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              title="Close (Esc)"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Infrastructure quick-stats bar ────────────────────────────── */}
        {lastSources && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30 bg-muted/20 text-xs font-mono flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Server className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{lastSources.containerCount} containers</span>
            </div>
            <div className="w-px h-3 bg-border/50 flex-shrink-0" />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{lastSources.alertCount} alerts</span>
              {lastSources.criticalAlerts > 0 && (
                <span className="text-red-400 font-bold">🔴 {lastSources.criticalAlerts}</span>
              )}
            </div>
            <div className="w-px h-3 bg-border/50 flex-shrink-0" />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {lastSources.sshAvailable
                ? <Wifi className="w-3 h-3 text-emerald-400" />
                : <WifiOff className="w-3 h-3 text-red-400" />}
              <span className={lastSources.sshAvailable ? "text-emerald-400" : "text-red-400"}>
                SSH
              </span>
            </div>
          </div>
        )}

        {/* ── Messages area ─────────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {messages.length === 0 ? (
            /* Empty state — suggested prompts */
            <div className="p-4 space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Ask your SOC Copilot</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Analyze live threat data, investigate incidents, and get AI-powered security insights.
                </p>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {SUGGESTED_PROMPTS.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategory(i)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full border transition-all",
                      activeCategory === i
                        ? "bg-primary/15 border-primary/40 text-primary font-medium"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"
                    )}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>

              {/* Prompts for selected category */}
              <div className="space-y-2">
                {SUGGESTED_PROMPTS[activeCategory]?.prompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={isStreaming || !isConnected}
                    className={cn(
                      "w-full text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all",
                      "border-border/40 bg-muted/20 text-foreground/80",
                      "hover:bg-muted/40 hover:border-primary/30 hover:text-foreground",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      "flex items-start gap-2"
                    )}
                  >
                    <span className="text-primary/50 font-mono text-[10px] mt-0.5 flex-shrink-0">→</span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message thread */
            <div className="p-4 space-y-4">
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
                return (
                  <MessageBubble
                    key={i}
                    role={msg.role}
                    content={msg.content}
                    streaming={msg.streaming}
                    sources={isLastAssistant && !msg.streaming ? lastSources : null}
                  />
                );
              })}

              {/* Thinking / status indicator */}
              {(status === "thinking") && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="rounded-xl px-3.5 py-2.5 bg-muted/60 border border-border/40 max-w-[86%]">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                      <span className="font-mono">{statusMessage || "Analyzing…"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {status === "error" && statusMessage && !isStreaming && (
          <div className="mx-4 mb-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive flex items-start gap-2 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ── Input area ────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-border/50 bg-background/40 flex-shrink-0">
          <div className={cn(
            "flex gap-2 rounded-xl border bg-muted/30 transition-colors p-1",
            "focus-within:border-primary/40 focus-within:bg-muted/50",
            "border-border/50"
          )}>
            <textarea
              ref={inputRef}
              id="copilot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Ask about threats, alerts, containers…" : "Connecting…"}
              disabled={!isConnected || status === "error"}
              rows={1}
              className={cn(
                "flex-1 bg-transparent text-sm px-2 py-2 resize-none outline-none",
                "text-foreground placeholder:text-muted-foreground/60",
                "max-h-32 scrollbar-thin",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              style={{ fieldSizing: "content" } as any}
            />

            {isStreaming ? (
              <button
                onClick={cancelStream}
                title="Stop generating"
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors self-end"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isConnected || status === "error"}
                title="Send (Enter)"
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all self-end",
                  input.trim() && isConnected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-mono">
            Copilot analyzes live data · Analyst/Admin only · ⌘K to toggle
          </p>
        </div>
      </div>
    </>
  );
}
```

## File: `client/src/hooks/useCopilotSocket.ts`

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

export type CopilotRole = "user" | "assistant";

export interface CopilotMessage {
  role: CopilotRole;
  content: string;
  /** Streaming: true while this assistant message is still being written */
  streaming?: boolean;
}

export interface SourceData {
  fetchedAt: string;
  containerCount: number;
  stoppedContainers: string[];
  alertCount: number;
  criticalAlerts: number;
  failedServices: string[];
  sshAvailable: boolean;
  wazuhAvailable: boolean;
  dataErrors: string[];
}

export type CopilotStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "thinking"
  | "streaming"
  | "error"
  | "disconnected";

interface UseCopilotSocketReturn {
  messages: CopilotMessage[];
  status: CopilotStatus;
  statusMessage: string;
  lastSources: SourceData | null;
  isStreaming: boolean;
  isConnected: boolean;
  sendMessage: (content: string) => void;
  cancelStream: () => void;
  clearMessages: () => void;
  resetSession: () => void;
}

const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/copilot`;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useCopilotSocket(): UseCopilotSocketReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [status, setStatus] = useState<CopilotStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastSources, setLastSources] = useState<SourceData | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreaming = status === "streaming" || status === "thinking";
  const isConnected = status === "connected" || status === "thinking" || status === "streaming";

  // Connect to the WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setStatus("connected");
      setStatusMessage("");
    };

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case "connected":
          setStatus("connected");
          break;

        case "pong":
          break;

        case "thinking":
        case "status":
          setStatus("thinking");
          setStatusMessage(msg.message ?? "Thinking…");
          break;

        case "token":
          setStatus("streaming");
          setStatusMessage("");
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              // Append token to the in-progress assistant message
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + msg.data },
              ];
            }
            // Start a new streaming assistant message
            return [...prev, { role: "assistant", content: msg.data, streaming: true }];
          });
          break;

        case "done":
          setStatus("connected");
          setStatusMessage("");
          // Mark the last message as no longer streaming
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            }
            return prev;
          });
          break;

        case "sources":
          setLastSources(msg.data as SourceData);
          break;

        case "cancelled":
          setStatus("connected");
          setStatusMessage("");
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + "\n\n*[Response cancelled]*", streaming: false },
              ];
            }
            return prev;
          });
          break;

        case "error":
          setStatus(msg.code === "FORBIDDEN" ? "error" : "connected");
          setStatusMessage(msg.message ?? "An error occurred.");
          // Show error inline if mid-stream
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.streaming) {
              return [
                ...prev.slice(0, -1),
                { role: "assistant", content: `⚠️ **Error**: ${msg.message}`, streaming: false },
              ];
            }
            if (msg.code !== "FORBIDDEN") {
              return [...prev, { role: "assistant", content: `⚠️ **Error**: ${msg.message}`, streaming: false }];
            }
            return prev;
          });
          break;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setStatus("error");
        setStatusMessage("Connection lost. Please refresh the page.");
      }
    };

    ws.onerror = () => {
      // onclose fires right after onerror, so we handle reconnect there
    };
  }, []);

  // Establish connection on mount
  useEffect(() => {
    connect();
    // Heartbeat ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Optimistically add the user message to the local list
      const newMessages: CopilotMessage[] = [
        ...messages,
        { role: "user", content: content.trim() },
      ];
      setMessages(newMessages);
      setLastSources(null);

      // Send all messages (conversation history) to the server
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        })
      );
    },
    [messages]
  );

  const cancelStream = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastSources(null);
    setStatusMessage("");
  }, []);

  const resetSession = useCallback(() => {
    clearMessages();
    setStatus("connected");
  }, [clearMessages]);

  return {
    messages,
    status,
    statusMessage,
    lastSources,
    isStreaming,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
    resetSession,
  };
}
```

## File: `client/src/pages/CopilotPage.tsx`

```typescript
import { useState } from "react";
import { Bot, Sparkles, Shield, Server, Activity, Database, Send, Square, Loader2 } from "lucide-react";
import { useCopilotSocket } from "@/hooks/useCopilotSocket";
import SOCCopilotPanel from "@/components/SOCCopilotPanel";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

const QUICK_PROMPTS = [
  "Give me a complete threat summary for the past 7 days",
  "What are the top suspicious IPs and attack patterns?",
  "Are there any brute force attacks in progress?",
  "Which containers are stopped or unhealthy?",
  "Summarize all critical incidents from the last 24 hours",
  "Detect lateral movement indicators across all agents",
  "Show me the most active attack sources by IP",
  "Are there privilege escalation attempts in recent alerts?",
];

export default function CopilotPage() {
  const {
    messages,
    status,
    statusMessage,
    lastSources,
    isStreaming,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useCopilotSocket();

  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOC Copilot</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered security analyst — analyzes live threat data from your SOC infrastructure
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
            )} />
            <span className="text-muted-foreground">
              {isConnected ? "Connected to SOC infrastructure" : "Connecting…"}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/50"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Stats bar — shown after first response */}
      {lastSources && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Containers", value: lastSources.containerCount, icon: Server, color: "text-blue-400" },
            { label: "Alerts (7d)", value: lastSources.alertCount, icon: Activity, color: "text-yellow-400" },
            { label: "Critical", value: lastSources.criticalAlerts, icon: Shield, color: lastSources.criticalAlerts > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Stopped Ctnrs", value: lastSources.stoppedContainers.length, icon: Database, color: lastSources.stoppedContainers.length > 0 ? "text-orange-400" : "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
              <Icon className={cn("w-5 h-5 flex-shrink-0", color)} />
              <div>
                <p className={cn("text-xl font-bold font-mono", color)}>{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary/50" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Ready to Analyze</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                  Ask me anything about your SOC environment. I'll fetch live data from Wazuh,
                  Docker containers, auditd, Snort IDS, and your AI engines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={isStreaming || !isConnected}
                    className={cn(
                      "text-sm px-4 py-3 rounded-xl border transition-all text-left",
                      "border-border/40 bg-muted/20 text-foreground/80",
                      "hover:bg-muted/50 hover:border-primary/30 hover:text-foreground",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-3xl rounded-2xl px-5 py-3.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border border-border/40 text-foreground rounded-tl-sm"
                )}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{msg.content}</Streamdown>
                      {msg.streaming && (
                        <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse ml-0.5 rounded-sm" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {status === "thinking" && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-2xl px-5 py-3.5 bg-muted/50 border border-border/40 rounded-tl-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-mono">{statusMessage || "Analyzing SOC data…"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/40">
          <div className={cn(
            "flex gap-3 rounded-2xl border p-2 transition-colors",
            "border-border/50 bg-background/60",
            "focus-within:border-primary/40"
          )}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about threats, incidents, containers, or request a threat summary…"
              disabled={!isConnected}
              rows={2}
              className="flex-1 bg-transparent text-sm px-2 py-1.5 resize-none outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            {isStreaming ? (
              <button
                onClick={cancelStream}
                className="px-4 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors text-sm font-medium flex items-center gap-2 self-end"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isConnected}
                className={cn(
                  "px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-all self-end",
                  input.trim() && isConnected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-mono">
            Analyzes live data from Wazuh · Docker · Snort · auditd · UBA Engine
          </p>
        </div>
      </div>

      {/* The floating panel is also available here (Ctrl+K) */}
      <SOCCopilotPanel />
    </div>
  );
}
```

## File: `server/copilot/copilot-service.ts`

```typescript
import type { Message } from "../_core/llm";
import { streamLLM, invokeLLM } from "../_core/llm";
import { fetchIntelligenceSnapshot, type IntelligenceSnapshot } from "./data-fetcher";
import { buildSystemPrompt, buildSnapshotSummary } from "./prompt-builder";

export interface CopilotStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (snapshot: IntelligenceSnapshot) => void;
  onError: (message: string) => void;
  onStatus: (message: string) => void;
}

/**
 * Main copilot orchestrator.
 *
 * Flow:
 *   1. Fetch live intelligence snapshot (Wazuh + SSH data)
 *   2. Build a security-focused system prompt with full context
 *   3. Stream the LLM response token by token
 *   4. Signal completion with the snapshot for the "sources" panel
 */
export async function streamCopilotResponse(
  userMessages: Message[],
  callbacks: CopilotStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { onToken, onDone, onError, onStatus } = callbacks;

  // Step 1 — Gather live intel
  onStatus("🔍 Gathering live intelligence from SOC infrastructure…");

  let snapshot: IntelligenceSnapshot;
  try {
    snapshot = await fetchIntelligenceSnapshot();
  } catch (err: any) {
    onError(`Failed to fetch SOC intelligence: ${err?.message ?? err}`);
    return;
  }

  if (signal?.aborted) { onDone(snapshot); return; }

  onStatus("🧠 Synthesizing threat intelligence with AI…");

  // Step 2 — Assemble the full message list with system context
  const systemPrompt = buildSystemPrompt(snapshot);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...userMessages,
  ];

  // Step 3 — Stream LLM response
  // If streaming fails (e.g. API doesn't support SSE), fall back to a single blocking call
  let streamingWorked = false;

  await streamLLM({
    messages,
    maxTokens: 4096,
    signal,
    onToken: (chunk) => {
      streamingWorked = true;
      onToken(chunk);
    },
    onDone: () => {
      onDone(snapshot);
    },
    onError: async (err) => {
      // Graceful degradation: if streaming isn't supported, try non-streaming
      if (!streamingWorked) {
        console.warn("[Copilot] Streaming failed, falling back to blocking invokeLLM:", err.message);
        try {
          const result = await invokeLLM({ messages, maxTokens: 4096 });
          const content = result.choices[0]?.message?.content;
          if (typeof content === "string") {
            onToken(content);
            onDone(snapshot);
          } else {
            onError("LLM returned no content in fallback mode.");
          }
        } catch (fallbackErr: any) {
          onError(`AI analysis failed: ${fallbackErr?.message ?? fallbackErr}`);
        }
      } else {
        onError(`Stream interrupted: ${err.message}`);
      }
    },
  });
}

export { buildSnapshotSummary };
```

## File: `server/copilot/copilotHandler.ts`

```typescript
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
              onDone: (snapshot) => {
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
                };
                send(ws, { type: "sources", data: sourceSummary });
                send(ws, { type: "done" });
              },
              onError: (msg) => send(ws, { type: "error", message: msg }),
            },
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
```

## File: `server/copilot/data-fetcher.ts`

```typescript
import { Client } from "ssh2";
import { getSSHConfig } from "../ssh-service";
import { fetchWazuhAlerts } from "../wazuh-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContainerInfo {
  name: string;
  status: string;
  image: string;
  running: boolean;
}

export interface ContainerLog {
  container: string;
  logs: string;
}

export interface ServiceInfo {
  unit: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface WazuhAlertSummary {
  id: string;
  timestamp: string;
  rule_id: string;
  rule_description: string;
  severity: number;
  agent_name: string;
  source_ip?: string;
}

export interface IntelligenceSnapshot {
  fetchedAt: string;
  containers: ContainerInfo[];
  failedContainers: ContainerInfo[];
  containerLogs: ContainerLog[];
  runningServices: ServiceInfo[];
  failedServices: ServiceInfo[];
  wazuhAlerts: WazuhAlertSummary[];
  criticalAlertCount: number;
  snortAlerts: string;
  auditdEvents: string;
  ubaLogs: string;
  sshAvailable: boolean;
  wazuhAvailable: boolean;
  errors: string[];
}

// ─── SSH exec helper ─────────────────────────────────────────────────────────

/**
 * Run a read-only command on the Ubuntu VM via SSH.
 * Commands are hardcoded — no user input reaches the shell.
 */
async function sshExec(command: string, timeoutMs = 15000): Promise<string> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) throw new Error("SSH credentials not configured");

  return new Promise<string>((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          reject(err);
          return;
        }

        let stdout = "";
        let stderr = "";
        stream.on("data", (d: Buffer) => { stdout += d.toString(); });
        stream.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        stream.on("close", () => {
          clearTimeout(timer);
          conn.end();
          resolve((stdout + (stderr ? `\n[STDERR]: ${stderr}` : "")).trim());
        });
        stream.on("error", (e: Error) => {
          clearTimeout(timer);
          conn.end();
          reject(e);
        });
      });
    });

    conn.on("error", (err) => { clearTimeout(timer); reject(err); });
    conn.on("keyboard-interactive", (_n, _i, _il, _p, finish) => finish([sshConfig.password]));

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 20000,
    });
  });
}

// ─── Individual data fetchers ─────────────────────────────────────────────────

async function fetchDockerContainers(): Promise<ContainerInfo[]> {
  const output = await sshExec(
    "docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}'",
    12000
  );
  return output.split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", status = "", image = ""] = line.split("|");
      return {
        name: name.trim(),
        status: status.trim(),
        image: image.trim(),
        running: status.trim().toLowerCase().startsWith("up"),
      };
    });
}

async function fetchDockerLogs(containerNames: string[]): Promise<ContainerLog[]> {
  const results: ContainerLog[] = [];
  for (const name of containerNames) {
    try {
      // Safe: container names are hardcoded, not user-supplied
      const logs = await sshExec(
        `docker logs --tail 80 --since 168h ${name} 2>&1 | tail -n 80`,
        12000
      );
      results.push({ container: name, logs: logs.slice(0, 4000) });
    } catch {
      results.push({ container: name, logs: "[logs unavailable]" });
    }
  }
  return results;
}

async function fetchSystemdServices(): Promise<{ running: ServiceInfo[]; failed: ServiceInfo[] }> {
  const [runningRaw, failedRaw] = await Promise.all([
    sshExec("systemctl list-units --type=service --state=running --no-pager --no-legend", 10000),
    sshExec("systemctl list-units --type=service --state=failed --no-pager --no-legend", 10000),
  ]);

  const parse = (raw: string): ServiceInfo[] =>
    raw.split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          unit: parts[0] ?? "",
          load: parts[1] ?? "",
          active: parts[2] ?? "",
          sub: parts[3] ?? "",
          description: parts.slice(4).join(" "),
        };
      })
      .filter((s) => s.unit);

  return { running: parse(runningRaw), failed: parse(failedRaw) };
}

async function fetchSnortAlerts(): Promise<string> {
  return sshExec(
    "docker exec snort tail -n 200 /var/log/snort/alert 2>/dev/null || echo '[Snort alert log not accessible]'",
    12000
  );
}

async function fetchAuditdEvents(): Promise<string> {
  return sshExec(
    "ausearch -ts today -i 2>/dev/null | tail -n 100 || echo '[auditd not available]'",
    12000
  );
}

async function fetchUbaLogs(): Promise<string> {
  return sshExec(
    "journalctl -u ngsentra-uba.service -u ngsentra-uba-api.service --since '7 days ago' --no-pager -n 60 2>/dev/null || echo '[UBA service logs not available]'",
    12000
  );
}

// ─── Main intelligence snapshot ───────────────────────────────────────────────

// High-priority containers to always fetch logs from
const CRITICAL_CONTAINERS = [
  "single-node-wazuh.manager-1",
  "ng_soc_ai_brain",
  "ng_soc_ai_classifier_brain",
  "snort",
  "n8n-soc",
];

export async function fetchIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  // Run all fetches concurrently with individual error capture
  const [
    containersResult,
    servicesResult,
    snortResult,
    auditdResult,
    ubaResult,
    wazuhResult,
  ] = await Promise.allSettled([
    fetchDockerContainers(),
    fetchSystemdServices(),
    fetchSnortAlerts(),
    fetchAuditdEvents(),
    fetchUbaLogs(),
    fetchWazuhAlerts(200),
  ]);

  const sshAvailable = containersResult.status === "fulfilled";
  const wazuhAvailable = wazuhResult.status === "fulfilled";

  // Containers
  const containers = containersResult.status === "fulfilled"
    ? containersResult.value
    : (errors.push(`Docker: ${(containersResult as PromiseRejectedResult).reason?.message}`), []);
  const failedContainers = containers.filter((c) => !c.running);

  // Container logs (only if SSH is available)
  let containerLogs: ContainerLog[] = [];
  if (sshAvailable) {
    try {
      containerLogs = await fetchDockerLogs(CRITICAL_CONTAINERS);
    } catch (e: any) {
      errors.push(`Container logs: ${e?.message}`);
    }
  }

  // Services
  const { running: runningServices, failed: failedServices } =
    servicesResult.status === "fulfilled"
      ? servicesResult.value
      : (errors.push(`Systemd: ${(servicesResult as PromiseRejectedResult).reason?.message}`), { running: [], failed: [] });

  // Wazuh alerts
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allAlerts = wazuhResult.status === "fulfilled"
    ? wazuhResult.value
    : (errors.push(`Wazuh: ${(wazuhResult as PromiseRejectedResult).reason?.message}`), []);
  const wazuhAlerts: WazuhAlertSummary[] = allAlerts
    .filter((a) => new Date(a.timestamp) >= sevenDaysAgo)
    .map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      rule_id: a.rule_id,
      rule_description: a.rule_description,
      severity: a.severity,
      agent_name: a.agent_name,
      source_ip: a.source_ip,
    }));
  const criticalAlertCount = wazuhAlerts.filter((a) => a.severity >= 10).length;

  return {
    fetchedAt,
    containers,
    failedContainers,
    containerLogs,
    runningServices,
    failedServices,
    wazuhAlerts,
    criticalAlertCount,
    snortAlerts: snortResult.status === "fulfilled" ? snortResult.value : "[Snort unavailable]",
    auditdEvents: auditdResult.status === "fulfilled" ? auditdResult.value : "[auditd unavailable]",
    ubaLogs: ubaResult.status === "fulfilled" ? ubaResult.value : "[UBA logs unavailable]",
    sshAvailable,
    wazuhAvailable,
    errors,
  };
}
```

## File: `server/copilot/prompt-builder.ts`

```typescript
import type { IntelligenceSnapshot } from "./data-fetcher";

/**
 * Build the security-focused LLM system prompt from a live intelligence snapshot.
 * The prompt is assembled such that the LLM has full context of the SOC environment
 * but is explicitly instructed not to hallucinate details absent from the data.
 */
export function buildSystemPrompt(snapshot: IntelligenceSnapshot): string {
  const lines: string[] = [];

  const push = (...args: string[]) => lines.push(...args);

  push(
    "You are NG-SENTRA Copilot, an expert Security Operations Center (SOC) analyst AI embedded in the NG-SENTRA enterprise dashboard.",
    "You analyze REAL, LIVE data from this SOC infrastructure. You NEVER invent or hallucinate IP addresses, hostnames, alert IDs, or any security indicators not present in the data below.",
    "You give concise, technical, actionable answers in markdown. Use tables when presenting multi-row data. Use severity emoji: 🔴 Critical/Emergency, 🟠 High, 🟡 Medium, 🟢 Low.",
    "",
    `== SNAPSHOT TIMESTAMP ==`,
    snapshot.fetchedAt,
    "",
    `== INFRASTRUCTURE ==`,
    `Target Machine: Ubuntu 22.04 @ 192.168.1.14 (SSH port 2222)`,
    `SSH Available: ${snapshot.sshAvailable ? "YES" : "NO — SSH data unavailable for this query"}`,
    `Wazuh/OpenSearch Available: ${snapshot.wazuhAvailable ? "YES" : "NO — alert data unavailable for this query"}`,
    ""
  );

  // ─── Docker Containers ────────────────────────────────────────────────────
  if (snapshot.containers.length > 0) {
    push(`== DOCKER CONTAINERS (${snapshot.containers.length} total) ==`);
    push("| Name | Status | Image | Running |");
    push("|---|---|---|---|");
    for (const c of snapshot.containers) {
      push(`| ${c.name} | ${c.status} | ${c.image} | ${c.running ? "✅" : "❌"} |`);
    }
    push("");

    if (snapshot.failedContainers.length > 0) {
      push(`⚠️ STOPPED/FAILED CONTAINERS (${snapshot.failedContainers.length}):`);
      for (const c of snapshot.failedContainers) {
        push(`  - ${c.name}: ${c.status}`);
      }
      push("");
    }
  } else {
    push("== DOCKER CONTAINERS == [Unavailable — SSH connection failed]", "");
  }

  // ─── Wazuh Alerts ─────────────────────────────────────────────────────────
  if (snapshot.wazuhAlerts.length > 0) {
    const highSev = snapshot.wazuhAlerts.filter((a) => a.severity >= 10).length;
    const medSev = snapshot.wazuhAlerts.filter((a) => a.severity >= 6 && a.severity < 10).length;
    const lowSev = snapshot.wazuhAlerts.filter((a) => a.severity < 6).length;

    push(`== WAZUH SECURITY ALERTS (last 7 days, ${snapshot.wazuhAlerts.length} alerts) ==`);
    push(`Summary: 🔴 ${highSev} critical/emergency | 🟠 ${medSev} high/medium | 🟢 ${lowSev} low`);
    push("");
    push("| Timestamp | Severity | Rule ID | Description | Agent | Source IP |");
    push("|---|---|---|---|---|---|");

    // Show up to 150 alerts in the table (context budget)
    const alertsToShow = snapshot.wazuhAlerts.slice(0, 150);
    for (const a of alertsToShow) {
      const sevEmoji = a.severity >= 10 ? "🔴" : a.severity >= 6 ? "🟠" : "🟡";
      const time = new Date(a.timestamp).toISOString().replace("T", " ").slice(0, 19);
      const desc = a.rule_description.replace(/\|/g, "/").slice(0, 80);
      push(`| ${time} | ${sevEmoji} ${a.severity} | ${a.rule_id} | ${desc} | ${a.agent_name} | ${a.source_ip ?? "—"} |`);
    }

    if (snapshot.wazuhAlerts.length > 150) {
      push(`\n... and ${snapshot.wazuhAlerts.length - 150} more alerts (showing newest 150 only)`);
    }
    push("");
  } else {
    push("== WAZUH ALERTS == [None found in last 7 days, or Wazuh is unreachable]", "");
  }

  // ─── Snort IDS Alerts ─────────────────────────────────────────────────────
  push("== SNORT IDS ALERTS (latest 200 lines) ==");
  push(snapshot.snortAlerts.slice(0, 3000) || "[No Snort alert data]");
  push("");

  // ─── Container Logs ───────────────────────────────────────────────────────
  if (snapshot.containerLogs.length > 0) {
    push("== CRITICAL CONTAINER LOGS (last 80 lines each, 7-day window) ==");
    for (const cl of snapshot.containerLogs) {
      push(`--- ${cl.container} ---`);
      push(cl.logs.slice(0, 2500) || "[empty]");
      push("");
    }
  }

  // ─── Systemd Services ─────────────────────────────────────────────────────
  if (snapshot.runningServices.length > 0) {
    push(`== SYSTEMD SERVICES (${snapshot.runningServices.length} running) ==`);
    const socServices = snapshot.runningServices.filter(
      (s) => s.unit.includes("ngsentra") || s.unit.includes("docker") || s.unit.includes("ssh")
    );
    push("Key SOC services:");
    for (const s of socServices) {
      push(`  ✅ ${s.unit} — ${s.description}`);
    }
    push("");
  }

  if (snapshot.failedServices.length > 0) {
    push(`⚠️ FAILED SYSTEMD SERVICES (${snapshot.failedServices.length}):`);
    for (const s of snapshot.failedServices) {
      push(`  ❌ ${s.unit} — ${s.description}`);
    }
    push("");
  }

  // ─── Auditd Events ────────────────────────────────────────────────────────
  push("== AUDITD EVENTS (today) ==");
  push(snapshot.auditdEvents.slice(0, 2000) || "[No auditd data]");
  push("");

  // ─── UBA Engine Logs ──────────────────────────────────────────────────────
  push("== UBA ENGINE LOGS (last 7 days, 60 lines) ==");
  push(snapshot.ubaLogs.slice(0, 2000) || "[No UBA logs]");
  push("");

  // ─── Fetch errors ─────────────────────────────────────────────────────────
  if (snapshot.errors.length > 0) {
    push("== DATA COLLECTION WARNINGS ==");
    for (const e of snapshot.errors) push(`  ⚠️ ${e}`);
    push("");
  }

  // ─── Analyst instructions ─────────────────────────────────────────────────
  push(
    "== ANALYST INSTRUCTIONS ==",
    "1. Base ALL answers strictly on the data above. Do NOT invent IPs, hostnames, rule IDs, or events.",
    "2. When identifying threats, cite specific alert IDs, rule descriptions, and timestamps from the data.",
    "3. Provide severity ratings, MITRE ATT&CK technique IDs when applicable, and actionable remediation steps.",
    "4. When data is insufficient to answer definitively, say so and suggest what additional data would help.",
    "5. Format responses in clean markdown with tables where helpful.",
    "6. Keep responses concise. Lead with the most critical finding first.",
    "7. You are integrated into a live SOC dashboard. Treat every query as coming from a tier-2/3 analyst."
  );

  return lines.join("\n");
}

/**
 * Build a brief text summary of the snapshot for storing in the DB audit trail.
 */
export function buildSnapshotSummary(snapshot: IntelligenceSnapshot): string {
  return [
    `Fetched: ${snapshot.fetchedAt}`,
    `Containers: ${snapshot.containers.length} (${snapshot.failedContainers.length} stopped)`,
    `Wazuh alerts (7d): ${snapshot.wazuhAlerts.length} (${snapshot.criticalAlertCount} critical)`,
    `Failed services: ${snapshot.failedServices.length}`,
    `SSH: ${snapshot.sshAvailable ? "OK" : "UNAVAILABLE"}`,
    `Wazuh: ${snapshot.wazuhAvailable ? "OK" : "UNAVAILABLE"}`,
  ].join(" | ");
}
```

## File: `server/copilot/index.ts`

```typescript
export { setupCopilotHandler } from "./copilotHandler";
export { streamCopilotResponse } from "./copilot-service";
export { fetchIntelligenceSnapshot } from "./data-fetcher";
export { buildSystemPrompt, buildSnapshotSummary } from "./prompt-builder";
```

## File: `server/_core/llm.ts`

```typescript
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () => {
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  const key = ENV.forgeApiKey;
  if (key && key.startsWith("sk-")) {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (key && key.startsWith("AIzaSy")) {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  return "https://forge.manus.im/v1/chat/completions";
};

const resolveModel = () => {
  const key = ENV.forgeApiKey;
  if (key && key.startsWith("sk-")) {
    return "gpt-4o-mini";
  }
  if (key && key.startsWith("AIzaSy")) {
    return "gemini-2.5-flash";
  }
  return "gemini-2.5-flash";
};

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export type StreamParams = {
  messages: Message[];
  maxTokens?: number;
  signal?: AbortSignal;
  onToken: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
};

/**
 * Stream an LLM response token-by-token via the OpenAI-compatible SSE API.
 * Calls onToken for each text chunk, onDone when the stream ends, onError on failure.
 */
export async function streamLLM(params: StreamParams): Promise<void> {
  assertApiKey();

  const { messages, maxTokens, signal, onToken, onDone, onError } = params;
  const model = resolveModel();

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
    max_tokens: maxTokens ?? (model.includes("gemini") ? 8192 : 4096),
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err: any) {
    onError(new Error(`LLM stream request failed: ${err?.message ?? err}`));
    return;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "(no body)");
    onError(new Error(`LLM stream failed: ${response.status} ${response.statusText} – ${errText}`));
    return;
  }

  if (!response.body) {
    onError(new Error("LLM stream: response body is null"));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json?.choices?.[0]?.delta;
          if (delta?.content) {
            onToken(delta.content);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }
    onDone();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      onDone(); // treat cancellation as clean completion
    } else {
      onError(new Error(`LLM stream read error: ${err?.message ?? err}`));
    }
  } finally {
    reader.releaseLock();
  }
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const model = resolveModel();
  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const url = resolveApiUrl();
  if (url.includes("forge.manus.im") && model.includes("gemini")) {
    payload.max_tokens = 32768;
    payload.thinking = {
      "budget_tokens": 128
    };
  } else if (url.includes("generativelanguage.googleapis.com")) {
    payload.max_tokens = 8192;
  } else {
    payload.max_tokens = 4096;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
```

