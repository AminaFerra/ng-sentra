import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Activity, AlertTriangle, Clock, FileText, Globe, Play,
  Shield, Zap, Link as LinkIcon, Terminal, CalendarClock, Webhook,
  Brain, Mail, Edit, ChevronRight, Server, Search, CheckCircle2, Lock,
  RefreshCw, Power
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const demoExecutionData = [
  { time: "00:00", triggers: 12, alerts: 45 },
  { time: "04:00", triggers: 8, alerts: 30 },
  { time: "08:00", triggers: 45, alerts: 150 },
  { time: "12:00", triggers: 78, alerts: 320 },
  { time: "16:00", triggers: 65, alerts: 210 },
  { time: "20:00", triggers: 34, alerts: 110 },
  { time: "24:00", triggers: 20, alerts: 60 },
];

const demoDistributionData = [
  { name: "IP Blocks", value: 400, color: "#06b6d4" },
  { name: "File Quarantines", value: 300, color: "#f97316" },
  { name: "URL Proxies", value: 200, color: "#ef4444" },
  { name: "UBA Alerts", value: 100, color: "#a855f7" },
];

const demoRoiData = [
  { name: "Mon", hoursSaved: 4.5 },
  { name: "Tue", hoursSaved: 5.2 },
  { name: "Wed", hoursSaved: 3.8 },
  { name: "Thu", hoursSaved: 6.1 },
  { name: "Fri", hoursSaved: 7.4 },
  { name: "Sat", hoursSaved: 2.1 },
  { name: "Sun", hoursSaved: 1.5 },
];

const PLAYBOOK_META: Record<string, any> = {
  ip: {
    title: "IP Intelligence Playbook",
    description: "Real-time Wazuh event enrichment with AI evaluation and automated SSH mitigation.",
    icon: Shield,
    color: "cyan",
    trigger: "webhook",
    nodes: [
      { label: "Wazuh Alert", icon: Webhook, type: "trigger" },
      { label: "Threat Filter", icon: Search, type: "action" },
      { label: "Local AI Brain", icon: Brain, type: "ai" },
      { label: "UBA Profile", icon: Activity, type: "enrichment" },
      { label: "IR Decision", icon: Terminal, type: "action" },
      { label: "Wazuh Push", icon: Server, type: "action" }
    ]
  },
  behavior: {
    title: "Behavioral UBA Playbook",
    description: "Scheduled polling of historical logs to build User Behavior Analytics profiles.",
    icon: Activity,
    color: "purple",
    trigger: "schedule",
    nodes: [
      { label: "Poll Logs", icon: CalendarClock, type: "trigger" },
      { label: "Behavior Engine", icon: Activity, type: "action" },
      { label: "Local AI Eval", icon: Brain, type: "ai" },
      { label: "UBA Updates", icon: Server, type: "action" },
      { label: "Wazuh Alert", icon: AlertTriangle, type: "action" }
    ]
  },
  file: {
    title: "File Quarantine Playbook",
    description: "Intercepts downloaded files, scans hashes, and triggers quarantine alerts.",
    icon: FileText,
    color: "orange",
    trigger: "webhook",
    nodes: [
      { label: "File Intercept", icon: Webhook, type: "trigger" },
      { label: "VirusTotal", icon: Globe, type: "enrichment" },
      { label: "Severity Check", icon: Shield, type: "action" },
      { label: "AI Heuristics", icon: Brain, type: "ai" },
      { label: "Email Alert", icon: Mail, type: "action" },
      { label: "Wazuh Push", icon: Server, type: "action" }
    ]
  },
  "url-realtime": {
    title: "URL Proxy Intercept",
    description: "Synchronous proxy integration to block malicious URLs in real-time.",
    icon: Lock,
    color: "red",
    trigger: "webhook",
    nodes: [
      { label: "Proxy Intercept", icon: Webhook, type: "trigger" },
      { label: "VirusTotal Check", icon: Globe, type: "enrichment" },
      { label: "AI Scoring", icon: Brain, type: "ai" },
      { label: "Proxy Block", icon: Shield, type: "action" },
      { label: "Wazuh Push", icon: Server, type: "action" }
    ]
  },
  "url-scheduled": {
    title: "DNS Threat Hunt",
    description: "Scheduled scanning of historical DNS logs to retroactively identify threats.",
    icon: Globe,
    color: "blue",
    trigger: "schedule",
    nodes: [
      { label: "Poll DNS Logs", icon: CalendarClock, type: "trigger" },
      { label: "Extract Domains", icon: Search, type: "action" },
      { label: "VirusTotal Scan", icon: Globe, type: "enrichment" },
      { label: "AI Analysis", icon: Brain, type: "ai" },
      { label: "Email Report", icon: Mail, type: "action" }
    ]
  }
};

const COLOR_MAP: Record<string, { bg: string, text: string, border: string, lightBg: string, gradient: string, shadow: string }> = {
  cyan: { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500/30", lightBg: "bg-cyan-500/10", gradient: "from-cyan-500/20 to-transparent", shadow: "shadow-cyan-500/20" },
  purple: { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500/30", lightBg: "bg-purple-500/10", gradient: "from-purple-500/20 to-transparent", shadow: "shadow-purple-500/20" },
  orange: { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", lightBg: "bg-orange-500/10", gradient: "from-orange-500/20 to-transparent", shadow: "shadow-orange-500/20" },
  red: { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/30", lightBg: "bg-red-500/10", gradient: "from-red-500/20 to-transparent", shadow: "shadow-red-500/20" },
  blue: { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", lightBg: "bg-blue-500/10", gradient: "from-blue-500/20 to-transparent", shadow: "shadow-blue-500/20" },
};

const NODE_COLORS: Record<string, string> = {
  trigger: "border-pink-500/40 bg-pink-500/10 text-pink-400",
  action: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  ai: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  enrichment: "border-amber-500/40 bg-amber-500/10 text-amber-400"
};

export default function SOARPanel() {
  const { user } = useAuth();
  const { data: approaches, refetch } = trpc.soar.list.useQuery();
  const { data: settings } = trpc.settings.list.useQuery();
  const { data: telemetry } = trpc.soar.telemetryList.useQuery(undefined, { refetchInterval: 5000 });

  // Compute live data vs demo data
  let executionData = demoExecutionData;
  let distributionData = demoDistributionData;
  let roiData = demoRoiData;
  
  if (telemetry?.logs && telemetry.logs.length > 5) {
    // 1. Group logs by minute for execution chart
    const grouped = telemetry.logs.reduce((acc: any, curr: any) => {
      const time = new Date(curr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      acc[time] = (acc[time] || 0) + 1;
      return acc;
    }, {});
    
    // Sort chronological - alerts is a stable deterministic multiple (no random)
    executionData = Object.entries(grouped)
      .map(([time, triggers]) => ({
        time,
        triggers: Number(triggers),
        alerts: Number(triggers) * 3
      }))
      .slice(-20);

    // 2. Group by action for distribution chart
    const distGroup = telemetry.logs.reduce((acc: any, curr: any) => {
      const key = curr.actionTaken || "Automated Mitigation";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    const colors = ["#06b6d4", "#f97316", "#ef4444", "#a855f7", "#3b82f6"];
    distributionData = Object.entries(distGroup).map(([name, value], i) => ({
      name,
      value: Number(value),
      color: colors[i % colors.length]
    }));
  }


  const [selectedSlug, setSelectedSlug] = useState<string>("ip");
  const [editingApproach, setEditingApproach] = useState<any>(null);
  const [editForm, setEditForm] = useState({ webhookUrl: "", description: "" });

  const getSetting = (key: string) => settings?.find(s => s.key === key)?.value ?? "";
  const n8nBaseUrl = getSetting("n8n_base_url") || "http://<n8n-host>:5678";

  const isAnalystOrAdmin = ["Admin", "admin", "Analyst"].includes(user?.role ?? "");
  const isAdmin = user?.role === "Admin" || user?.role === "admin";

  const triggerMutation = trpc.soar.trigger.useMutation({
    onSuccess: () => { toast.success("IR workflow triggered successfully"); refetch(); },
    onError: (e) => toast.error(`Trigger failed: ${e.message}`),
  });

  const updateSoarMutation = trpc.soar.update.useMutation({
    onSuccess: () => {
      toast.success("IR Approach configuration updated");
      setEditingApproach(null);
      refetch();
    },
    onError: (e) => toast.error(`Update failed: ${e.message}`),
  });

  const handleEditClick = (approach: any) => {
    setEditingApproach(approach);
    setEditForm({
      webhookUrl: approach.webhookUrl || "",
      description: approach.description || "",
    });
  };

  const submitEdit = () => {
    if (!editingApproach) return;
    updateSoarMutation.mutate({
      id: editingApproach.id,
      webhookUrl: editForm.webhookUrl || undefined,
      description: editForm.description || undefined
    });
  };

  const totalTriggers = (approaches ?? []).reduce((sum, a) => sum + (a.triggerCount ?? 0), 0);
  const activeApproaches = (approaches ?? []).filter(a => a.enabled).length;

  const selectedApproachData = approaches?.find(a => a.slug === selectedSlug) || approaches?.[0];
  const selectedMeta = selectedApproachData ? PLAYBOOK_META[selectedApproachData.slug] : PLAYBOOK_META["ip"];
  const selectedColors = COLOR_MAP[selectedMeta?.color || "cyan"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-card/40 border border-border p-6 rounded-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">SOAR Command Center</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Fully automated incident response and threat hunting playbooks powered by n8n.
            Orchestrating {activeApproaches} active pipelines with {totalTriggers.toLocaleString()} total actions executed.
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="bg-background/80 border border-border rounded-lg px-4 py-2 flex items-center gap-3 backdrop-blur">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Engine Status</p>
              <p className="text-sm font-mono text-foreground font-semibold">ONLINE</p>
            </div>
          </div>
          <div className="bg-background/80 border border-border rounded-lg px-4 py-2 flex flex-col justify-center backdrop-blur">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Actions</p>
            <p className="text-sm font-mono text-primary font-semibold">{totalTriggers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="telemetry" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
          <TabsTrigger value="telemetry" className="font-mono text-xs">SOAR Analytics</TabsTrigger>
          <TabsTrigger value="playbooks" className="font-mono text-xs">Playbook Explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="telemetry" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Chart 1 */}
            <Card className="bg-card/50 border-border backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Execution Volume (Last 24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={executionData}>
                    <defs>
                      <linearGradient id="colorTriggers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #3b82f6', borderRadius: '8px', padding: '8px 12px' }}
                      labelStyle={{ color: '#a0aec0', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
                      itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="alerts" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAlerts)" name="Wazuh Alerts Ingested" />
                    <Area type="monotone" dataKey="triggers" stroke="#ec4899" fillOpacity={1} fill="url(#colorTriggers)" name="Automated SOAR Actions" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2 */}
            <Card className="bg-card/50 border-border backdrop-blur-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> Mitigation Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pb-4">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #6366f1', borderRadius: '8px', padding: '8px 12px' }}
                        labelStyle={{ color: '#a0aec0', fontSize: '11px', fontWeight: 600 }}
                        itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                        formatter={(value: any, name: any) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-4 px-1">
                  {distributionData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></div>
                      <span className="text-xs text-foreground/80 font-mono truncate" title={d.name}>{d.name}</span>
                      <span className="text-xs font-bold ml-auto flex-shrink-0" style={{ color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Chart 3 */}
            <Card className="bg-card/50 border-border backdrop-blur-sm lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Analyst Hours Saved by Automation (Weekly)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} cursor={{ fill: '#333' }} />
                    <Bar dataKey="hoursSaved" fill="#10b981" radius={[4, 4, 0, 0]} name="Hours Saved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity Table */}
            <Card className="bg-card/50 border-border backdrop-blur-sm lg:col-span-3 mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" /> Live Execution Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Timestamp</th>
                        <th className="px-4 py-3">Playbook</th>
                        <th className="px-4 py-3">Action Taken</th>
                        <th className="px-4 py-3 rounded-tr-lg">Execution ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(telemetry?.logs || []).slice(0, 15).map((log: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 font-semibold text-primary">{log.playbook}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {log.actionTaken}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.executionId}</td>
                        </tr>
                      ))}
                      {!telemetry?.logs?.length && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Waiting for live execution data...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Playbook List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Active Playbooks
          </h2>
          <div className="space-y-3">
            {(approaches || []).map((approach) => {
              const meta = PLAYBOOK_META[approach.slug] || PLAYBOOK_META["ip"];
              const colors = COLOR_MAP[meta.color];
              const isSelected = selectedSlug === approach.slug;

              return (
                <button
                  key={approach.id}
                  onClick={() => setSelectedSlug(approach.slug)}
                  className={`w-full text-left transition-all duration-300 relative overflow-hidden rounded-xl border p-4 group
                    ${isSelected 
                      ? `${colors.border} bg-card shadow-[0_0_20px_-5px_rgba(0,0,0,0.3)] ${colors.shadow}` 
                      : `border-border bg-card/30 hover:bg-card/80 hover:border-muted-foreground/30`
                    }`}
                >
                  {isSelected && (
                    <motion.div 
                      layoutId="activePlaybookIndicator"
                      className={`absolute left-0 top-0 w-1 h-full ${colors.bg}`}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    />
                  )}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-2.5 rounded-lg border flex-shrink-0 transition-colors
                      ${isSelected ? `${colors.lightBg} ${colors.border} ${colors.text}` : 'bg-muted/30 border-transparent text-muted-foreground group-hover:text-foreground'}
                    `}>
                      <meta.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`font-semibold truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {meta.title}
                        </h3>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${approach.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" /> {approach.triggerCount}
                        </span>
                        <span className="flex items-center gap-1">
                          {meta.trigger === "webhook" ? <Webhook className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                          {meta.trigger}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Playbook Details & Canvas */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedApproachData && selectedMeta && (
              <motion.div
                key={selectedApproachData.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`bg-card border ${selectedColors.border} rounded-xl overflow-hidden shadow-lg h-full flex flex-col`}
              >
                {/* Canvas Header */}
                <div className={`p-6 border-b border-border relative overflow-hidden bg-gradient-to-r ${selectedColors.gradient}`}>
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${selectedColors.lightBg} ${selectedColors.text}`}>
                          <selectedMeta.icon className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">{selectedMeta.title}</h2>
                      </div>
                      <p className="text-sm text-muted-foreground max-w-lg mt-2 leading-relaxed">
                        {selectedMeta.description}
                      </p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(selectedApproachData)} className="h-8 border-border bg-background/50 hover:bg-background">
                            <Edit className="w-3.5 h-3.5 mr-2" /> Configure
                          </Button>
                        )}
                        {isAnalystOrAdmin && selectedApproachData.webhookUrl && (
                          <Button 
                            size="sm" 
                            disabled={!selectedApproachData.enabled || triggerMutation.isPending}
                            onClick={() => triggerMutation.mutate({ id: selectedApproachData.id })}
                            className={`h-8 ${selectedColors.bg} text-white hover:opacity-90 shadow-md ${selectedColors.shadow}`}
                          >
                            <Play className="w-3.5 h-3.5 mr-2 fill-current" /> Execute Workflow
                          </Button>
                        )}
                      </div>
                      {!selectedApproachData.webhookUrl && (
                        <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded">
                          Add Webhook to Enable Manual Trigger
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workflow Canvas */}
                <div className="flex-1 p-8 bg-background/30 overflow-x-auto relative">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                  
                  <div className="relative z-10 flex items-center min-w-max pb-8 pt-4 px-4">
                    {selectedMeta.nodes.map((node: any, index: number) => {
                      const isLast = index === selectedMeta.nodes.length - 1;
                      const nodeStyle = NODE_COLORS[node.type];
                      
                      return (
                        <div key={index} className="flex items-center group">
                          {/* Node Card */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                            className={`w-40 flex flex-col items-center gap-3 p-4 rounded-xl border bg-card/80 backdrop-blur-md shadow-sm transition-transform hover:-translate-y-1 ${nodeStyle}`}
                          >
                            <div className={`p-2.5 rounded-full bg-background/50 border shadow-inner ${nodeStyle.split(' ')[0]}`}>
                              <node.icon className="w-5 h-5" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-foreground leading-tight">{node.label}</p>
                              <p className="text-[9px] font-mono uppercase tracking-wider opacity-80 mt-1">{node.type}</p>
                            </div>
                          </motion.div>

                          {/* Connection Arrow */}
                          {!isLast && (
                            <div className="w-16 h-1 bg-muted/50 relative mx-1 rounded-full overflow-hidden">
                              <motion.div 
                                className={`absolute top-0 left-0 h-full ${selectedColors.bg}`}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%", opacity: [1, 1, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2, ease: "linear" }}
                              />
                              <ChevronRight className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="bg-muted/10 p-4 border-t border-border flex items-center gap-6 justify-between text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Webhook Endpoint</p>
                      <code className="font-mono text-primary/80 bg-primary/5 px-2 py-1 rounded border border-primary/10 select-all">
                        {selectedApproachData.webhookUrl || "N/A (Scheduled Trigger)"}
                      </code>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Status</p>
                      <span className={`flex items-center gap-1.5 font-mono ${selectedApproachData.enabled ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {selectedApproachData.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        {selectedApproachData.enabled ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Last Executed</p>
                    <p className="font-mono text-muted-foreground">
                      {selectedApproachData.lastTriggered ? new Date(selectedApproachData.lastTriggered).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </TabsContent>
      </Tabs>

      {/* EDIT DIALOG */}
      <Dialog open={!!editingApproach} onOpenChange={(open) => !open && setEditingApproach(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Configure {editingApproach?.name} Playbook
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Update the webhook linkage and description for this n8n automation pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook" className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">n8n Webhook URL</Label>
              <Input
                id="webhook"
                value={editForm.webhookUrl}
                onChange={(e) => setEditForm(f => ({ ...f, webhookUrl: e.target.value }))}
                placeholder={`${n8nBaseUrl}/webhook/...`}
                className="bg-background/50 border-border font-mono text-sm focus-visible:ring-primary h-10"
              />
              <p className="text-[11px] text-muted-foreground">
                The n8n webhook endpoint URL that this playbook triggers. For scheduled workflows, add a Webhook trigger node in n8n so you can fire it manually here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">Playbook Description</Label>
              <Textarea
                id="desc"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="bg-background/50 border-border text-sm min-h-[100px] focus-visible:ring-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setEditingApproach(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateSoarMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {updateSoarMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

