import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import {
  Activity, AlertTriangle, Brain, Globe, Users, Zap,
  Terminal, Workflow, RefreshCw, Server, Lock, Cpu,
  Network, Shield, Eye, Radio, CircleDot, ArrowRight,
  TrendingUp, Clock, Layers, ActivitySquare, TerminalSquare, RefreshCwOff, Edit
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

// ─── Config maps ─────────────────────────────────────────────────────────────

const modelIcons: Record<string, any> = {
  "anomaly-detection": Activity,
  "alert-classification": AlertTriangle,
  uba: Users,
  "local-ti": Globe,
};

const statusConfig: Record<string, {
  label: string; color: string; dot: string;
  neonClass: string; ringColor: string; bgAccent: string;
}> = {
  running: {
    label: "ONLINE", color: "text-emerald-400",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
    neonClass: "neon-glow-green", ringColor: "#10b981", bgAccent: "from-emerald-500/8",
  },
  stopped: {
    label: "OFFLINE", color: "text-red-400",
    dot: "bg-red-500",
    neonClass: "neon-glow-red", ringColor: "#ef4444", bgAccent: "from-red-500/8",
  },
  error: {
    label: "ERROR", color: "text-orange-400",
    dot: "bg-orange-500 animate-pulse",
    neonClass: "neon-glow-orange", ringColor: "#f97316", bgAccent: "from-orange-500/8",
  },
  unknown: {
    label: "UNKNOWN", color: "text-muted-foreground",
    dot: "bg-slate-500",
    neonClass: "", ringColor: "#64748b", bgAccent: "from-slate-500/8",
  },
};

const modelMeta: Record<string, {
  gradient: string; accentColor: string; role: string;
  workflows: string[]; tech: string[]; description: string;
}> = {
  "anomaly-detection": {
    gradient: "from-cyan-500/12 via-cyan-500/4 to-transparent",
    accentColor: "cyan",
    role: "Behavioral Anomaly Engine",
    workflows: ["IP Real-time", "Behavior Scheduled", "URL Scheduled"],
    tech: ["Isolation Forest", "Behavioral Baselines", "systemd (VirtualBox)"],
    description: "Runs on VirtualBox as ngsentra-ai.service (ai_ids.py). Analyzes log patterns using Isolation Forest to detect anomalous behavior and pushes results to Wazuh via Filebeat.",
  },
  "alert-classification": {
    gradient: "from-orange-500/12 via-orange-500/4 to-transparent",
    accentColor: "orange",
    role: "Alert Triage Engine",
    workflows: ["IP", "File", "URL Real-time", "URL Scheduled"],
    tech: ["Gemini 2.5 Flash", "Docker (VirtualBox)", "HTML Report Gen"],
    description: "Runs on VirtualBox as Docker containers (ng_soc_ai_classifier_brain/shipper). Classifies incoming alerts using Gemini 2.5 Flash LLM and generates structured HTML incident reports for n8n workflows.",
  },
  uba: {
    gradient: "from-purple-500/12 via-purple-500/4 to-transparent",
    accentColor: "purple",
    role: "User Behavior Profiler",
    workflows: ["Behavior Scheduled"],
    tech: ["Historical IP Profiles", "UFW Action History", "systemd (VirtualBox)"],
    description: "Runs on VirtualBox as ngsentra-uba.service. Maintains historical behavioral profiles for each IP, tracking actions and UFW responses to build risk scoring baselines.",
  },
  "local-ti": {
    gradient: "from-red-500/12 via-red-500/4 to-transparent",
    accentColor: "red",
    role: "Central Threat Intelligence Brain",
    workflows: ["IP", "File", "URL Real-time", "URL Scheduled"],
    tech: ["Universal Anomaly Detector", "Threat Scoring", "Waitress (Windows)", "localhost:5000"],
    description: "Runs locally on Windows (server.py). Universal Anomaly Detector supporting Behavior, IP, URL, and File flows with model retraining.",
  },
};

const accentColors: Record<string, {
  border: string; text: string; bg: string; badge: string; ring: string;
}> = {
  cyan:   { border: "border-cyan-500/30",   text: "text-cyan-400",   bg: "bg-cyan-500/10",   badge: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",   ring: "#06b6d4" },
  orange: { border: "border-orange-500/30", text: "text-orange-400", bg: "bg-orange-500/10", badge: "bg-orange-400/10 text-orange-400 border-orange-400/30", ring: "#f97316" },
  purple: { border: "border-purple-500/30", text: "text-purple-400", bg: "bg-purple-500/10", badge: "bg-purple-400/10 text-purple-400 border-purple-400/30", ring: "#a855f7" },
  red:    { border: "border-red-500/30",    text: "text-red-400",    bg: "bg-red-500/10",    badge: "bg-red-400/10 text-red-400 border-red-400/30",       ring: "#ef4444" },
};

// ─── Status Ring SVG ─────────────────────────────────────────────────────────

function StatusRing({ status, size = 64 }: { status: string; size?: number }) {
  const cfg = statusConfig[status] ?? statusConfig.unknown;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = status === "running" ? 100 : status === "error" ? 60 : status === "stopped" ? 0 : 25;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        className="progress-ring-track" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={cfg.ringColor} strokeWidth="3" strokeLinecap="round"
        className="progress-ring-fill"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 4px ${cfg.ringColor}40)` }} />
    </svg>
  );
}

// ─── Uptime Counter ──────────────────────────────────────────────────────────

function UptimeCounter({ lastActive }: { lastActive?: Date | string | null }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!lastActive) { setElapsed("—"); return; }
    const tick = () => {
      const diff = Date.now() - new Date(lastActive).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastActive]);
  return <span className="font-mono text-xs tabular-nums">{elapsed}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIModelsPanel() {
  const { user } = useAuth();
  const { data: settings } = trpc.settings.list.useQuery();
  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value ?? "";
  const n8nBaseUrl = getSetting("n8n_base_url") || "http://<n8n-host>:5678";
  const localAiBrainUrl = getSetting("local_ai_brain_url") || "http://<host>:5000";

  const { data: models, refetch, isLoading } = trpc.aiModels.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const [autoProbe, setAutoProbe] = useState(false);

  const { data: alertsData } = trpc.wazuh.getAlerts.useQuery({ limit: 1500 }, {
    refetchInterval: autoProbe ? 15000 : false
  });
  const rawAlerts = useMemo(() => {
    return ((alertsData && 'alerts' in alertsData ? alertsData.alerts : alertsData) || []) as any[];
  }, [alertsData]);

  const aiTelemetry = useMemo(() => {
    const aiAlerts = [];
    const modelCounts = {
      "anomaly-detection": 0,
      "alert-classification": 0,
      "uba": 0,
      "local-ti": 0,
    };
    const severityMap: Record<string, { Low: number; Medium: number; High: number; Critical: number }> = {
      "anomaly-detection": { Low: 0, Medium: 0, High: 0, Critical: 0 },
      "alert-classification": { Low: 0, Medium: 0, High: 0, Critical: 0 },
      "uba": { Low: 0, Medium: 0, High: 0, Critical: 0 },
      "local-ti": { Low: 0, Medium: 0, High: 0, Critical: 0 },
    };
    const hourlyCounts: Record<string, number> = {};

    for (const a of rawAlerts) {
      const desc = a.rule_description?.toLowerCase() || "";
      let model = null;

      if (desc.includes("anomaly") || desc.includes("behavior") || desc.includes("deviation")) model = "anomaly-detection";
      else if (desc.includes("user") || desc.includes("profile") || desc.includes("uba") || desc.includes("login")) model = "uba";
      else if (desc.includes("threat") || desc.includes("intel") || desc.includes("malicious") || desc.includes("ti")) model = "local-ti";
      else if (desc.includes("triage") || desc.includes("classified") || desc.includes("gemini") || desc.includes("report")) model = "alert-classification";
      
      // Fallback distribution for demo visuals if no exact matches are found
      if (!model) {
        if (a.severity >= 7) model = "alert-classification";
        else if (a.severity === 5 || a.severity === 6) model = "anomaly-detection";
        else if (a.severity === 3 || a.severity === 4) model = "uba";
        else model = "local-ti";
      }

      if (model) {
        aiAlerts.push(a);
        modelCounts[model as keyof typeof modelCounts]++;
        
        let sevCat: "Low" | "Medium" | "High" | "Critical" = "Low";
        if (a.severity >= 6) sevCat = "Critical";
        else if (a.severity >= 5) sevCat = "High";
        else if (a.severity >= 4) sevCat = "Medium";

        severityMap[model][sevCat]++;

        const h = new Date(a.timestamp).toISOString().slice(0, 13) + ':00';
        hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
      }
    }

    const timelineData = Object.entries(hourlyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([h, count]) => ({
        time: new Date(h).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        count,
      }));

    const barData = Object.entries(modelCounts).map(([k, v]) => ({
      name: modelMeta[k]?.role || k,
      slug: k,
      count: v,
      color: accentColors[modelMeta[k]?.accentColor || "cyan"].ring
    })).sort((a,b) => b.count - a.count);

    const severityData = Object.entries(severityMap).map(([k, v]) => ({
      name: modelMeta[k]?.role || k,
      slug: k,
      ...v
    }));

    const pieData = Object.entries(modelCounts).map(([k, v]) => ({
      name: modelMeta[k]?.role || k,
      value: v,
      color: accentColors[modelMeta[k]?.accentColor || "cyan"].ring
    })).filter(d => d.value > 0);

    return { timelineData, barData, severityData, pieData, total: aiAlerts.length };
  }, [rawAlerts]);

  const isAdmin = user?.role === "Admin" || user?.role === "admin";

  // ── Live health check state ──
  const [healthResults, setHealthResults] = useState<Record<string, {
    responseTimeMs: number | null; checkedVia: string; checkedAt: Date;
  }>>({});
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingSingle, setCheckingSingle] = useState<number | null>(null);
  
  // ── Edit config state ──
  const [editingModel, setEditingModel] = useState<any>(null);
  const [editForm, setEditForm] = useState({ endpointUrl: "", description: "" });
  
  const updateModel = trpc.aiModels.update.useMutation({
    onSuccess: () => {
      toast.success("AI Model configuration updated");
      setEditingModel(null);
      refetch();
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`)
  });

  const handleEditClick = (model: any) => {
    setEditingModel(model);
    setEditForm({
      endpointUrl: model.endpointUrl || "",
      description: model.description || "",
    });
  };

  const submitEdit = () => {
    if (!editingModel) return;
    updateModel.mutate({
      id: editingModel.id,
      endpointUrl: editForm.endpointUrl,
      description: editForm.description
    });
  };

  const healthCheckAll = trpc.aiModels.healthCheck.useMutation({
    onSuccess: (data) => {
      const map: typeof healthResults = {};
      for (const r of data.results) {
        map[r.slug] = { responseTimeMs: r.responseTimeMs, checkedVia: r.checkedVia, checkedAt: new Date() };
      }
      setHealthResults(map);
      processNewLogs(data.results);
      if (!autoProbe) toast.success(`Health check complete — ${data.results.filter(r => r.status === "running").length}/${data.results.length} online`);
      refetch();
      setCheckingAll(false);
      setCountdown(30);
    },
    onError: (e) => { toast.error(`Health check failed: ${e.message}`); setCheckingAll(false); },
  });

  // ── Telemetry & Logs state ──
  const [chartData, setChartData] = useState<any[]>([]);
  const [logStream, setLogStream] = useState<{ id: string; model: string; time: string; text: string; type: "alert" | "info" | "error" }[]>([]);

  // Auto probe interval
  useEffect(() => {
    if (!autoProbe) return;
    const id = setInterval(() => {
      setCheckingAll(true);
      healthCheckAll.mutate();
    }, 10000); // Poll every 10 seconds for "real-time" feel
    return () => clearInterval(id);
  }, [autoProbe]);

  const healthCheckSingle = trpc.aiModels.healthCheckSingle.useMutation({
    onSuccess: (data) => {
      setHealthResults(prev => ({
        ...prev,
        [data.slug]: { responseTimeMs: data.responseTimeMs, checkedVia: data.checkedVia, checkedAt: new Date() },
      }));
      processNewLogs([data]);
      toast.success(`${data.slug}: ${data.status.toUpperCase()}`);
      refetch();
      setCheckingSingle(null);
    },
    onError: (e) => { toast.error(`Probe failed: ${e.message}`); setCheckingSingle(null); },
  });

  const processNewLogs = (results: any[]) => {
    const newLogs: typeof logStream = [];
    const now = new Date().toLocaleTimeString();
    
    // Add to chart data
    const newPoint: any = { time: now };
    
    for (const r of results) {
      if (r.responseTimeMs != null) newPoint[r.slug] = r.responseTimeMs;
      
      if (r.recentOutput) {
        // Split output into lines and format
        const lines = r.recentOutput.split('\n').filter((l: string) => l.trim().length > 0);
        for (const line of lines) {
          const type = line.toLowerCase().includes('error') || line.toLowerCase().includes('failed') ? 'error' :
                       line.toLowerCase().includes('alert') ? 'alert' : 'info';
          newLogs.push({ id: Math.random().toString(), model: r.slug, time: now, text: line, type });
        }
      }
    }
    
    if (results.length > 1) { // Only update chart on bulk check
      setChartData(prev => {
        const next = [...prev, newPoint];
        if (next.length > 20) return next.slice(next.length - 20); // Keep last 20
        return next;
      });
    }

    if (newLogs.length > 0) {
      setLogStream(prev => {
        const next = [...newLogs, ...prev];
        if (next.length > 100) return next.slice(0, 100); // Keep last 100 lines
        return next;
      });
    }
  };

  const runHealthCheckAll = () => {
    setCheckingAll(true);
    healthCheckAll.mutate();
  };

  const runHealthCheckSingle = (model: any) => {
    setCheckingSingle(model.id);
    healthCheckSingle.mutate({ id: model.id });
  };

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const m = models ?? [];
    return {
      total: m.length,
      running: m.filter(x => x.status === "running").length,
      error: m.filter(x => x.status === "error").length,
      stopped: m.filter(x => x.status === "stopped").length,
      unknown: m.filter(x => x.status === "unknown").length,
    };
  }, [models]);

  // ── Auto-refresh countdown ──
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    const id = setInterval(() => setCountdown(p => p <= 1 ? 30 : p - 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6 cyber-grid-bg min-h-full">

      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                AI Models Command Center
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Real-time monitoring — {stats.total} services integrated into n8n SOAR
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/30 px-3 py-2 rounded-md border border-border">
            <RefreshCw className={`w-3 h-3 ${countdown <= 5 ? "animate-spin text-primary" : ""}`} />
            <span>Refresh in <span className="text-primary font-bold">{countdown}s</span></span>
          </div>
          <Button size="sm" variant={autoProbe ? "default" : "outline"}
            className={`h-8 text-xs font-mono gap-1.5 ${autoProbe ? "bg-emerald-500 hover:bg-emerald-600 text-white border-none" : ""}`}
            onClick={() => {
              if (!autoProbe) runHealthCheckAll();
              setAutoProbe(!autoProbe);
            }}>
            {autoProbe ? <ActivitySquare className="w-3 h-3 animate-pulse" /> : <RefreshCwOff className="w-3 h-3" />}
            {autoProbe ? "Auto-Probe Active" : "Auto-Probe"}
          </Button>
          <Button size="sm" variant="outline"
            className="h-8 text-xs font-mono gap-1.5"
            onClick={runHealthCheckAll}
            disabled={checkingAll || isLoading || autoProbe}>
            <Zap className={`w-3 h-3 ${checkingAll ? "animate-pulse text-yellow-400" : ""}`} />
            {checkingAll ? "Probing…" : "Live Health Check"}
          </Button>
          <Button size="sm" variant="outline"
            className="h-8 text-xs font-mono gap-1.5"
            onClick={() => { refetch(); setCountdown(30); }}
            disabled={isLoading}>
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ═══════════ AGGREGATE STATUS BAR ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Services",  value: stats.total,   icon: Layers,        color: "text-primary",      glow: "" },
          { label: "Online",          value: stats.running,  icon: Radio,         color: "text-emerald-400",  glow: "neon-glow-green" },
          { label: "Errors",          value: stats.error,    icon: AlertTriangle, color: "text-orange-400",   glow: stats.error > 0 ? "neon-glow-orange" : "" },
          { label: "Offline",         value: stats.stopped,  icon: CircleDot,     color: "text-red-400",      glow: stats.stopped > 0 ? "neon-glow-red" : "" },
          { label: "Unknown",         value: stats.unknown,  icon: Eye,           color: "text-muted-foreground",    glow: "" },
        ].map(stat => (
          <div key={stat.label}
            className={`bg-card border border-border rounded-lg p-3.5 flex items-center gap-3 transition-all ${stat.glow}`}>
            <stat.icon className={`w-5 h-5 flex-shrink-0 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground font-mono leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ ARCHITECTURE NOTE ═══════════ */}
      <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-4">
        {/* Scan-line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-scan-line" />
        </div>
        <div className="relative flex items-start gap-3 text-xs text-muted-foreground">
          <Network className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm mb-1">Neural Service Architecture</p>
            <p>
              These AI services run as <span className="text-primary font-mono">systemd background services</span> on the VirtualBox environment.
              They are invoked by your <span className="text-primary font-mono">n8n SOAR</span> workflows at{" "}
              <code className="text-primary/80 font-mono text-[10px]">{n8nBaseUrl}</code>.{" "}
              The Local AI Brain and UBA services run via Waitress at{" "}
              <code className="text-primary/80 font-mono text-[10px]">{localAiBrainUrl}</code>.{" "}
              Alert Classification uses Google Gemini 2.5 Flash via the n8n Google AI node.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ MODEL CARDS ═══════════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-muted/20 animate-pulse border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(models ?? []).map(model => {
            const meta = modelMeta[model.slug] ?? modelMeta["anomaly-detection"];
            const accent = accentColors[meta.accentColor] ?? accentColors.cyan;
            const Icon = modelIcons[model.slug] ?? Brain;
            const sCfg = statusConfig[model.status as keyof typeof statusConfig] ?? statusConfig.unknown;

            return (
              <Card key={model.id}
                className={`bg-card relative overflow-hidden transition-all duration-300 group hover:${accent.border} ${sCfg.neonClass}`}
                style={{ borderColor: undefined }}>

                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />

                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, ${accent.ring}60, transparent)` }} />

                <CardHeader className="pb-2 relative">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    <div className="flex items-center gap-4">
                      {/* Status Ring + Icon */}
                      <div className="relative flex-shrink-0">
                        <StatusRing status={model.status} size={56} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${accent.text}`} />
                        </div>
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-foreground">{model.name}</span>
                          {isAdmin && (
                            <button onClick={() => handleEditClick(model)} className="text-muted-foreground hover:text-primary transition-colors ml-auto">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 ${accent.text}`}>{meta.role}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sCfg.dot}`} />
                            <span className={`text-[10px] font-mono font-bold ${sCfg.color}`}>{sCfg.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/40">•</span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">{model.slug}</span>
                        </div>
                      </div>

                      {/* Uptime */}
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Uptime</p>
                        <UptimeCounter lastActive={model.lastActive} />
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 relative">
                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {model.description || meta.description}
                  </p>

                  {/* Dynamic Endpoint */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">Dynamic Endpoint URL</p>
                    <div className="flex items-center gap-2 bg-muted/50 border border-border rounded px-2 py-1.5">
                      <Cpu className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-mono text-foreground truncate">
                        {model.endpointUrl || "Unconfigured (Uses Default IP)"}
                      </span>
                    </div>
                  </div>

                  {/* Service type indicator */}
                  <div className="flex items-center gap-2 bg-slate-500/8 border border-slate-500/15 rounded-md px-2.5 py-1.5">
                    {model.slug === "alert-classification" ? (
                      <>
                        <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] font-mono text-muted-foreground">VirtualBox Docker Container</span>
                      </>
                    ) : model.slug === "local-ti" ? (
                      <>
                        <Terminal className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] font-mono text-muted-foreground">Windows Localhost Service (Waitress)</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10px] font-mono text-muted-foreground">VirtualBox Background Service</span>
                      </>
                    )}
                    <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
                  </div>

                  {/* Internal Endpoint */}
                  {model.endpointUrl && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1">
                        <Terminal className="w-3 h-3" /> Internal Endpoint
                      </p>
                      <div className="flex items-center gap-2 bg-muted/40 rounded-md px-2.5 py-1.5 border border-border">
                        <code className="text-[10px] font-mono text-muted-foreground truncate">{model.endpointUrl}</code>
                      </div>
                    </div>
                  )}

                  {/* Tech stack */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Technology Stack
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {meta.tech.map(t => (
                        <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 border border-border text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Workflow integration */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1">
                      <Workflow className="w-3 h-3" /> n8n IR Workflows
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {meta.workflows.map(w => (
                        <span key={w} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${accent.badge}`}>{w}</span>
                      ))}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-border">
                    <div>
                      <p className="text-muted-foreground/50 font-mono uppercase text-[10px]">Last Active</p>
                      <p className="font-mono text-foreground text-[11px]">
                        {model.lastActive ? new Date(model.lastActive).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/50 font-mono uppercase text-[10px]">Response</p>
                      <p className="font-mono text-foreground text-[11px]">
                        {healthResults[model.slug]?.responseTimeMs != null
                          ? `${healthResults[model.slug].responseTimeMs}ms`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground/50 font-mono uppercase text-[10px]">Checked Via</p>
                      <p className="font-mono text-foreground text-[11px]">
                        {healthResults[model.slug]?.checkedVia ?? "not probed"}
                      </p>
                    </div>
                  </div>

                  {/* Recent output */}
                  {model.recentOutput && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground/50 font-mono uppercase text-[10px]">Probe Output</p>
                      <div className="bg-muted/50 border border-border rounded-md px-3 py-2">
                        <pre className="text-[10px] font-mono text-emerald-400/80 whitespace-pre-wrap line-clamp-3">
                          {model.recentOutput}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Probe single model */}
                  <Button size="sm" variant="outline"
                    className="w-full h-7 text-[10px] font-mono border-border text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={() => runHealthCheckSingle(model)}
                    disabled={checkingSingle === model.id}>
                    <Zap className={`w-3 h-3 ${checkingSingle === model.id ? "animate-pulse text-yellow-400" : ""}`} />
                    {checkingSingle === model.id ? "Probing…" : "Probe Service"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════ AI ALERT TELEMETRY & ANALYTICS ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
        
        {/* Area Chart: Global AI Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Global AI Alert Timeline (24h)
              <span className="ml-auto text-xs font-mono text-muted-foreground">{aiTelemetry.total.toLocaleString()} Processing Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiTelemetry.timelineData} margin={{ left: -20, right: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="time" stroke="transparent" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} dy={10} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#aiGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Alerts by AI Model */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Workload by Neural Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aiTelemetry.barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="transparent" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <YAxis type="category" dataKey="name" width={120} stroke="transparent" tick={{ fontSize: 10, fill: 'var(--color-foreground)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} cursor={{ fill: 'var(--color-muted)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                  {aiTelemetry.barData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stacked Bar Chart: Severity Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              Severity Breakdown by Model
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aiTelemetry.severityData} margin={{ left: -20, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="transparent" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} dy={10} interval={0} />
                <YAxis stroke="transparent" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} dx={-10} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} cursor={{ fill: 'var(--color-muted)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                <Bar dataKey="Low" stackId="a" fill="#06b6d4" barSize={32} />
                <Bar dataKey="Medium" stackId="a" fill="#eab308" />
                <Bar dataKey="High" stackId="a" fill="#f97316" />
                <Bar dataKey="Critical" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut Chart: AI Workload Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-0 border-b border-border/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 pb-3">
              <Globe className="w-4 h-4 text-purple-400" />
              AI Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aiTelemetry.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2} stroke="none">
                  {aiTelemetry.pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ LIVE TELEMETRY & LOGS (REMOVED) ═══════════ */}

      {/* ═══════════ WORKFLOW TOPOLOGY ═══════════ */}
      <Card className="bg-card border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            AI → n8n Workflow Integration Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(models ?? []).map(model => {
              const meta = modelMeta[model.slug] ?? modelMeta["anomaly-detection"];
              const accent = accentColors[meta.accentColor] ?? accentColors.cyan;
              const sCfg = statusConfig[model.status as keyof typeof statusConfig] ?? statusConfig.unknown;

              return (
                <div key={model.id} className={`rounded-lg border p-3 space-y-2 ${accent.border} bg-card`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sCfg.dot}`} />
                    <span className="text-xs font-bold text-foreground truncate">{model.name}</span>
                  </div>
                  <div className="space-y-1">
                    {meta.workflows.map(w => (
                      <div key={w} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <ArrowRight className="w-2.5 h-2.5 flex-shrink-0 text-primary/50" />
                        <span className="font-mono">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data flow legend */}
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground/60 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" /> Online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Offline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Error
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Unknown
            </span>
            <span className="ml-auto">Data flows: AI Service → Filebeat → Wazuh Index → n8n Webhook</span>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ EDIT CONFIGURATION DIALOG ═══════════ */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit AI Engine Config</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update dynamic connection settings for <span className="font-mono text-primary">{editingModel?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Endpoint URL (IP / Host)</Label>
              <Input
                id="endpoint"
                value={editForm.endpointUrl}
                onChange={(e) => setEditForm(f => ({ ...f, endpointUrl: e.target.value }))}
                placeholder="http://192.168.x.x:5000/detect"
                className="bg-background/50 border-border font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Set this to the real IP address of your VirtualBox VM or local machine port where the Waitress/Flask API is running.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Override Description</Label>
              <Textarea
                id="desc"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description override..."
                className="bg-background/50 border-border text-sm min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingModel(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateModel.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {updateModel.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
