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
