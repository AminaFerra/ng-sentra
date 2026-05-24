import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown,
  CheckCircle2, ChevronLeft, ChevronRight, Download, Filter,
  RefreshCw, Shield, Siren, Users, XCircle, Zap, Database,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface WazuhAlert {
  id: string;
  timestamp: string;
  rule_id: string;
  rule_description: string;
  severity: number;
  agent_id: string;
  agent_name: string;
  source_ip?: string;
  destination_ip?: string;
  action: string;
}

type SortKey = keyof WazuhAlert;
type SortDir = 'asc' | 'desc';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SEV_COLOR: Record<number, string> = {
  1: '#6b7280', 2: '#3b82f6', 3: '#06b6d4', 4: '#eab308',
  5: '#f97316', 6: '#ef4444', 7: '#dc2626', 8: '#b91c1c',
};
const SEV_LABEL: Record<number, string> = {
  1: 'Info', 2: 'Low', 3: 'Low+', 4: 'Medium',
  5: 'High', 6: 'Critical', 7: 'Emergency', 8: 'Alert',
};
const SEV_BG: Record<number, string> = {
  1: 'bg-muted text-muted-foreground border-border',
  2: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  3: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  4: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  5: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  6: 'bg-red-500/15 text-red-400 border-red-500/30',
  7: 'bg-red-700/20 text-red-300 border-red-600/40',
  8: 'bg-red-900/30 text-red-200 border-red-700/50',
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30 ml-1 inline" />;
  return dir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-primary ml-1 inline" />
    : <ArrowDown className="w-3 h-3 text-primary ml-1 inline" />;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function WazuhAlertDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

  /* State */
  const [limit, setLimit] = useState(500);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [indexInput, setIndexInput] = useState('');
  const [showIndexEdit, setShowIndexEdit] = useState(false);

  /* Data fetching */
  const { data: alertsData, isLoading, refetch } = trpc.wazuh.getAlerts.useQuery(
    { limit },
    { refetchInterval: autoRefresh ? 15000 : false }
  );
  const { data: statsData } = trpc.wazuh.getStats.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
  });
  const updateIndexMutation = trpc.wazuh.updateIndex.useMutation({
    onSuccess: (d) => { toast.success(`Index updated to: ${d.indexPattern}`); setShowIndexEdit(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const rawAlerts: WazuhAlert[] = useMemo(
    () => ((alertsData && 'alerts' in alertsData ? alertsData.alerts : alertsData) || []) as WazuhAlert[],
    [alertsData]
  );

  /* ── Filtering ─────────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return rawAlerts.filter(a => {
      if (dismissed.has(a.id)) return false;
      if (sevFilter !== 'all' && a.severity !== parseInt(sevFilter)) return false;
      if (agentFilter !== 'all' && a.agent_name !== agentFilter) return false;
      if (actionFilter !== 'all' && (a.action || 'unknown') !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.rule_description.toLowerCase().includes(q) ||
          a.agent_name.toLowerCase().includes(q) ||
          a.rule_id.includes(q) ||
          (a.source_ip || '').includes(q)
        );
      }
      return true;
    });
  }, [rawAlerts, dismissed, sevFilter, agentFilter, actionFilter, search]);

  /* ── Sorting ───────────────────────────────────────────────────────────── */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  /* ── Pagination ────────────────────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => { setPage(1); }, [search, sevFilter, agentFilter, actionFilter, sortKey, sortDir, pageSize]);

  /* ── Stat cards ────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const sev = statsData?.severityCount ?? {};
    const get = (n: number) => (sev as Record<number, number>)[n] || 0;
    return {
      total: statsData?.total ?? rawAlerts.length,
      critical: get(6) + get(7) + get(8),
      high: get(5),
      medium: get(4),
      low: get(1) + get(2) + get(3),
      agents: new Set(rawAlerts.map(a => a.agent_name)).size,
    };
  }, [rawAlerts, statsData]);

  /* ── Chart data ────────────────────────────────────────────────────────── */
  const timelineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    filtered.forEach(a => {
      const h = new Date(a.timestamp).toISOString().slice(0, 13) + ':00';
      buckets[h] = (buckets[h] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([h, count]) => ({
        time: new Date(h).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        count,
      }));
  }, [filtered]);

  const severityPieData = useMemo(() => {
    const sev = statsData?.severityCount ?? {};
    return Object.entries(sev)
      .map(([lvl, cnt]) => ({
        name: SEV_LABEL[parseInt(lvl)] ?? `Lvl ${lvl}`,
        value: cnt as number,
        color: SEV_COLOR[parseInt(lvl)] ?? '#6b7280',
      }))
      .filter(d => d.value > 0);
  }, [statsData]);

  const topAgentsData = useMemo(() => (statsData?.topAgents ?? []).slice(0, 8), [statsData]);
  const topRulesData = useMemo(() => (statsData?.topRules ?? []).slice(0, 8), [statsData]);

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const uniqueAgents = useMemo(() => {
    const s: string[] = [];
    rawAlerts.forEach(a => { if (!s.includes(a.agent_name)) s.push(a.agent_name); });
    return s.sort();
  }, [rawAlerts]);
  const uniqueActions = useMemo(() => {
    const s: string[] = [];
    rawAlerts.forEach(a => { const v = a.action || 'unknown'; if (!s.includes(v)) s.push(v); });
    return s.sort();
  }, [rawAlerts]);

  const toggleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(a => a.id)));
  };

  const bulkAcknowledge = () => {
    const ids = Array.from(selected);
    setAcknowledged(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    toast.success(`Acknowledged ${selected.size} alert(s)`);
    setSelected(new Set());
  };

  const bulkDismiss = () => {
    const ids = Array.from(selected);
    setDismissed(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    toast.success(`Dismissed ${selected.size} alert(s)`);
    setSelected(new Set());
  };

  const handleExport = useCallback(() => {
    const rows = [
      ['Timestamp', 'Agent', 'Rule ID', 'Severity', 'Description', 'Action', 'Source IP', 'Dest IP'],
      ...sorted.map(a => [
        a.timestamp, a.agent_name, a.rule_id, SEV_LABEL[a.severity] ?? a.severity,
        a.rule_description, a.action || 'N/A', a.source_ip || 'N/A', a.destination_ip || 'N/A',
      ]),
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ng-sentra-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [sorted]);

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Siren className="w-5 h-5 text-primary" />
            Live Alert Feed
            <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
              {filtered.length.toLocaleString()} of {rawAlerts.length.toLocaleString()} alerts
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time Wazuh/OpenSearch security event monitoring</p>
        </div>

        {/* Dynamic index picker */}
        <div className="flex items-center gap-2">
          {showIndexEdit && isAdmin ? (
            <div className="flex items-center gap-1">
              <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                className="h-8 w-48 text-xs font-mono bg-background/60"
                placeholder="wazuh-alerts-*"
                value={indexInput}
                onChange={e => setIndexInput(e.target.value)}
              />
              <Button size="sm" className="h-8 text-xs" onClick={() => updateIndexMutation.mutate({ indexPattern: indexInput })} disabled={!indexInput || updateIndexMutation.isPending}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowIndexEdit(false)}>Cancel</Button>
            </div>
          ) : (
            isAdmin && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowIndexEdit(true)}>
                <Database className="w-3 h-3" /> Change Index
              </Button>
            )
          )}

          {/* Limit selector */}
          <Select value={String(limit)} onValueChange={v => setLimit(Number(v))}>
            <SelectTrigger className="h-8 w-32 text-xs bg-background/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 alerts</SelectItem>
              <SelectItem value="500">500 alerts</SelectItem>
              <SelectItem value="1000">1 000 alerts</SelectItem>
              <SelectItem value="2500">2 500 alerts</SelectItem>
              <SelectItem value="5000">5 000 alerts</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant={autoRefresh ? 'default' : 'outline'} className="h-8 text-xs gap-1" onClick={() => setAutoRefresh(r => !r)}>
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'TOTAL ALERTS', value: stats.total, icon: AlertCircle, color: 'text-primary', bg: 'from-primary/8' },
          { label: 'CRITICAL', value: stats.critical, icon: Siren, color: 'text-red-400', bg: 'from-red-500/8' },
          { label: 'HIGH', value: stats.high, icon: AlertTriangle, color: 'text-orange-400', bg: 'from-orange-500/8' },
          { label: 'MEDIUM', value: stats.medium, icon: Shield, color: 'text-yellow-400', bg: 'from-yellow-500/8' },
          { label: 'LOW', value: stats.low, icon: CheckCircle2, color: 'text-cyan-400', bg: 'from-cyan-500/8' },
          { label: 'AGENTS', value: stats.agents, icon: Users, color: 'text-emerald-400', bg: 'from-emerald-500/8' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent pointer-events-none`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[9px] font-mono text-muted-foreground tracking-widest">{label}</span>
              </div>
              <div className={`text-2xl font-black font-mono ${color}`}>
                {isLoading ? '—' : value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Alert Timeline (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="time" stroke="transparent" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} tickMargin={10} minTickGap={30} />
                <YAxis stroke="transparent" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} tickMargin={10} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#alertGrad)" dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity Donut */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-foreground">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={2} stroke="none">
                  {severityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Agents */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" />Top Agents by Alert Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topAgentsData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="transparent" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fill: 'var(--color-foreground)', fontSize: 11, fontWeight: 500 }} width={80} />
                <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }} contentStyle={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)', fontSize: '11px', borderRadius: '6px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Rules */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" />Top Triggered Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topRulesData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="transparent" tick={{ fontSize: 10, fill: '#888888' }} />
                <YAxis type="category" dataKey="id" width={60} stroke="transparent" tick={{ fontSize: 11, fill: '#aaaaaa' }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} formatter={(v, _n, p) => [v, p.payload.description?.slice(0, 40) ?? 'Rule']} itemStyle={{ color: '#fff' }} />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter bar ── */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search alerts, IPs, rules…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 flex-1 min-w-[180px] text-xs bg-background/50"
            />
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-background/50"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="8">Alert (8)</SelectItem>
                <SelectItem value="7">Emergency (7)</SelectItem>
                <SelectItem value="6">Critical (6)</SelectItem>
                <SelectItem value="5">High (5)</SelectItem>
                <SelectItem value="4">Medium (4)</SelectItem>
                <SelectItem value="3">Low (3)</SelectItem>
                <SelectItem value="2">Low (2)</SelectItem>
                <SelectItem value="1">Info (1)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-background/50"><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {uniqueAgents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-background/50"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(''); setSevFilter('all'); setAgentFilter('all'); setActionFilter('all'); }}>
              <XCircle className="w-3 h-3 mr-1" />Reset
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground font-mono">{selected.size} selected</span>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={bulkAcknowledge}>
                    <CheckCircle2 className="w-3 h-3" />Acknowledge
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={bulkDismiss}>
                    <XCircle className="w-3 h-3" />Dismiss
                  </Button>
                </>
              )}
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-28 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100, 250, 500].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Alert Table ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            Alerts
            <span className="font-mono text-xs text-muted-foreground">({sorted.length.toLocaleString()} results)</span>
          </CardTitle>
          {/* Pagination */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Loading alerts…</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/40" />
              <p className="text-sm">No alerts match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 text-left w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border cursor-pointer"
                        checked={selected.size === paginated.length && paginated.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    {([
                      { key: 'timestamp', label: 'Timestamp' },
                      { key: 'agent_name', label: 'Agent' },
                      { key: 'rule_id', label: 'Rule ID' },
                      { key: 'severity', label: 'Severity' },
                      { key: 'rule_description', label: 'Description' },
                      { key: 'source_ip', label: 'Source IP' },
                      { key: 'action', label: 'Action' },
                    ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                      <th
                        key={key}
                        className="py-2.5 px-3 text-left font-semibold cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortIcon col={key} sortKey={sortKey} dir={sortDir} />
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card">
                  {paginated.map((alert) => {
                    const isAck = acknowledged.has(alert.id);
                    return (
                      <tr
                        key={alert.id}
                        className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${isAck ? 'opacity-50' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            className="rounded border-border cursor-pointer"
                            checked={selected.has(alert.id)}
                            onChange={() => toggleSelect(alert.id)}
                          />
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(alert.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap">{alert.agent_name}</td>
                        <td className="py-2 px-3 font-mono text-primary">{alert.rule_id}</td>
                        <td className="py-2 px-3">
                          <Badge className={`text-[9px] px-1.5 py-0.5 border font-mono ${SEV_BG[alert.severity] ?? SEV_BG[1]}`}>
                            {SEV_LABEL[alert.severity] ?? `Lvl ${alert.severity}`}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-foreground/80 max-w-xs truncate" title={alert.rule_description}>
                          {alert.rule_description}
                        </td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">{alert.source_ip || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{alert.action || '—'}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => { setAcknowledged(p => { const n = new Set(p); n.add(alert.id); return n; }); toast.success('Alert acknowledged'); }}
                              disabled={isAck}
                            >
                              {isAck ? '✓ Ack' : 'Ack'}
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => { setDismissed(p => { const n = new Set(p); n.add(alert.id); return n; }); toast.info('Alert dismissed'); }}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 px-2 text-[10px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                              onClick={() => toast.warning(`Escalating rule ${alert.rule_id} to SOAR…`)}
                            >
                              Escalate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length.toLocaleString()} results</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(1)} disabled={page === 1}>First</Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-3 h-3" /></Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-3 h-3" /></Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</Button>
          </div>
        </div>
      )}
    </div>
  );
}
