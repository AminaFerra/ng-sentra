import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import {
  Bot, X, Send, Loader2, Sparkles, ChevronDown, ChevronUp,
  Wifi, WifiOff, Square, Trash2, Shield, AlertTriangle,
  Server, Activity, Database, RefreshCw, Maximize2, Minimize2,
} from "lucide-react";
import { useCopilotSocket, type SourceData } from "@/hooks/useCopilotSocket";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { History, BrainCircuit } from "lucide-react";

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
          {(sources.memoryCount ?? 0) > 0 && (
            <div className="text-blue-400 flex items-center gap-1.5 font-semibold">
              <BrainCircuit className="w-3.5 h-3.5" />
              Recalled {sources.memoryCount} past memories
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
  const [showHistory, setShowHistory] = useState(false);
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
    loadSession,
    resetSession,
  } = useCopilotSocket();

  const { data: historySessions, refetch: refetchHistory } = trpc.copilot.listSessions.useQuery(
    { limit: 30 },
    { enabled: showHistory }
  );

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
            <button
              onClick={() => setShowHistory((v) => !v)}
              title="Session History"
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                showHistory ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <History className="w-3.5 h-3.5" />
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => { resetSession(); setShowHistory(false); }}
                title="New Session"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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
          {showHistory ? (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><History className="w-4 h-4"/> Investigation History</h3>
              {historySessions?.map((sess: any) => (
                <button
                  key={sess.sessionId}
                  onClick={() => {
                    loadSession(sess.sessionId, JSON.parse(sess.messages));
                    setShowHistory(false);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all group"
                >
                  <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{sess.title || "Investigation Session"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(sess.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
              {historySessions?.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-10">No past sessions found.</div>
              )}
            </div>
          ) : messages.length === 0 ? (
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
