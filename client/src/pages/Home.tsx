import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WazuhAlertDashboard } from "@/components/WazuhAlertDashboard";
import {
  Activity, Brain, CheckCircle2, Clock, HardDrive,
  RefreshCw, Shield, TrendingUp, Users, Zap, XCircle, AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";

const statusDots: Record<string, string> = {
  running: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
  stopped: "bg-red-500",
  error: "bg-orange-500",
  unknown: "bg-slate-500",
};

const statusColors: Record<string, string> = {
  running: "text-emerald-400",
  stopped: "text-red-400",
  error: "text-orange-400",
  unknown: "text-muted-foreground",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDots[status] ?? statusDots.unknown} ${
        status === "running" ? "animate-pulse" : ""
      }`}
    />
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right hidden sm:block">
      <div className="text-lg font-mono font-bold text-foreground tabular-nums">
        {time.toLocaleTimeString("en-US", { hour12: false })}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(60);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: metrics, refetch, isLoading } = trpc.metrics.summary.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const { data: components } = trpc.components.list.useQuery();
  const { data: recentLogs } = trpc.audit.recent.useQuery({ limit: 10 });
  const { data: alertStats } = trpc.wazuh.getStats.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { setLastRefresh(new Date()); refetch(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const roleLabel = user?.role ?? "Viewer";
  const roleBadge =
    roleLabel === "Admin" || roleLabel === "admin"
      ? "bg-red-500/15 text-red-400 border-red-500/30"
      : roleLabel === "Analyst"
      ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
      : "bg-muted text-muted-foreground border-border";

  const aiRunning = metrics?.aiModels?.filter((m) => m.status === "running").length ?? 0;
  const aiTotal = metrics?.aiModels?.length ?? 0;
  const configuredCount = metrics?.configuredComponents ?? 0;
  const totalCount = metrics?.totalComponents ?? 0;
  const sev = alertStats?.severityCount as Record<number, number> | undefined ?? {} as Record<number, number>;
  const criticalAlerts = (sev[6] ?? 0) + (sev[7] ?? 0);
  const totalAlerts = alertStats?.total ?? 0;

  const threatLevel =
    criticalAlerts > 10 ? { label: "HIGH", cls: "text-red-400 bg-red-500/10 border-red-500/30" } :
    criticalAlerts > 3  ? { label: "MEDIUM", cls: "text-orange-400 bg-orange-500/10 border-orange-500/30" } :
                          { label: "LOW", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };

  return (
    <div className="space-y-5">
      {/* ── Premium Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Security Operations Center
            </h1>
            <Badge className={`text-[10px] font-mono px-2 py-1 border ${roleBadge}`}>
              {roleLabel}
            </Badge>
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border ${threatLevel.cls}`}>
              <AlertTriangle className="w-3 h-3" />
              THREAT LEVEL: {threatLevel.label}
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back,{" "}
            <span className="text-primary font-semibold">{user?.name ?? "Operator"}</span>
            <span className="text-muted-foreground/60 mx-2">·</span>
            <span className="text-xs font-mono text-muted-foreground">
              UTC {new Date().toUTCString().slice(17, 22)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <LiveClock />
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-3 py-2 rounded-md border border-border">
            <RefreshCw className={`w-3 h-3 ${countdown <= 5 ? "animate-spin text-primary" : ""}`} />
            <span>
              Refresh in <span className="text-primary font-bold">{countdown}s</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Top KPI Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">COMPONENTS</span>
            </div>
            <div className="text-3xl font-black font-mono text-foreground">
              {configuredCount}<span className="text-muted-foreground text-lg">/{totalCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Configured / Total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border relative overflow-hidden hover:border-emerald-500/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">AI MODELS</span>
            </div>
            <div className="text-3xl font-black font-mono text-foreground">
              {aiRunning}<span className="text-muted-foreground text-lg">/{aiTotal}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Running / Total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border relative overflow-hidden hover:border-red-500/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/8 to-transparent" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">ALERTS</span>
            </div>
            <div className="text-3xl font-black font-mono text-red-400">
              {criticalAlerts}<span className="text-muted-foreground text-lg font-normal"> crit</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalAlerts.toLocaleString()} total tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border relative overflow-hidden hover:border-purple-500/40 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] font-mono text-muted-foreground tracking-widest">SYSTEM EVENTS</span>
            </div>
            <div className="text-3xl font-black font-mono text-foreground">
              {recentLogs?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recent SOC actions</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Wazuh Alert Dashboard (centrepiece) ── */}
      <WazuhAlertDashboard />

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Component Health */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Component Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-14 bg-muted/30 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(components ?? []).map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center gap-2.5 p-3 bg-popover border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all cursor-default"
                    >
                      <StatusDot status={comp.url ? "running" : "unknown"} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{comp.name}</p>
                        <p className={`text-[10px] font-mono ${comp.url ? statusColors.running : statusColors.unknown}`}>
                          {comp.url ? `Port ${comp.port ?? "—"}` : "Not configured"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(components ?? []).length === 0 && (
                    <p className="col-span-3 text-xs text-muted-foreground text-center py-6">No components configured.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* AI Models */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                AI Models
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(metrics?.aiModels ?? []).map((model) => (
                <div key={model.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/15 border border-border/50 hover:border-emerald-500/20 transition-colors">
                  <StatusDot status={model.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{model.name}</p>
                    <p className={`text-[10px] font-mono ${statusColors[model.status] ?? "text-muted-foreground"}`}>
                      {model.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
              {(!metrics?.aiModels || metrics.aiModels.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">No AI models configured</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card border-border flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                Recent Activity
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {lastRefresh.toLocaleTimeString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(recentLogs ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No activity recorded.</p>
              ) : (
                <div className="space-y-1">
                  {(recentLogs ?? []).map((log) => (
                    <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/20 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-primary truncate">{log.action}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{log.target ?? "—"}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 font-mono flex-shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
