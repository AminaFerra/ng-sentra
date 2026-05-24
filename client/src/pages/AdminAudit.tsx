import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Activity, ChevronLeft, ChevronRight, Download, Lock, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const actionColors: Record<string, string> = {
  ACCESS_COMPONENT: "text-cyan-400",
  UPDATE_COMPONENT: "text-blue-400",
  UPDATE_USER_ROLE: "text-purple-400",
  DELETE_USER: "text-red-400",
  TRIGGER_SOAR: "text-pink-400",
  UPDATE_SOAR_APPROACH: "text-orange-400",
  UPDATE_AI_MODEL: "text-emerald-400",
  LOGIN: "text-green-400",
  LOGOUT: "text-muted-foreground",
};

export default function AdminAudit() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const limit = 20;

  const isAdmin = user?.role === "Admin" || user?.role === "admin";

  const { data } = trpc.audit.list.useQuery({
    limit,
    offset: page * limit,
    action: actionFilter || undefined,
    userName: userFilter || undefined,
  }, { enabled: isAdmin });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  const exportCSV = () => {
    if (!data?.logs) return;
    const headers = ["ID", "User", "Role", "Action", "Target", "Details", "IP", "Timestamp"];
    const rows = data.logs.map(l => [
      l.id, l.userName ?? "", l.userRole ?? "", l.action,
      l.target ?? "", l.details ?? "", l.ipAddress ?? "",
      new Date(l.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ng-sentra-audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Activity className="w-6 h-6 text-orange-400" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete log of all user actions — {data?.total ?? 0} total entries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs font-mono">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(0); }}
            placeholder="Filter by action..."
            className="pl-8 h-8 text-xs bg-input border-border font-mono w-48"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(0); }}
            placeholder="Filter by user..."
            className="pl-8 h-8 text-xs bg-input border-border w-40"
          />
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            Audit Log Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-muted/20 text-[10px] font-mono text-muted-foreground uppercase">
            <div className="col-span-2">User</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-2">IP</div>
            <div className="col-span-1">Time</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/50">
            {(data?.logs ?? []).map(log => (
              <div key={log.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-muted/10 transition-colors text-xs">
                <div className="col-span-2 font-medium text-foreground truncate">{log.userName ?? "System"}</div>
                <div className="col-span-1">
                  <span className={`text-[10px] font-mono px-1 rounded border ${
                    log.userRole === "Admin" || log.userRole === "admin" ? "text-red-400 bg-red-400/10 border-red-400/30" :
                    log.userRole === "Analyst" ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/30" :
                    "text-muted-foreground bg-muted border-border"
                  }`}>{log.userRole ?? "—"}</span>
                </div>
                <div className={`col-span-3 font-mono truncate ${actionColors[log.action] ?? "text-muted-foreground"}`}>
                  {log.action}
                </div>
                <div className="col-span-3 text-muted-foreground truncate font-mono text-[10px]">{log.target ?? "—"}</div>
                <div className="col-span-2 text-muted-foreground font-mono text-[10px] truncate">{log.ipAddress ?? "—"}</div>
                <div className="col-span-1 text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {(!data?.logs || data.logs.length === 0) && (
              <div className="py-12 text-center text-sm text-muted-foreground">No audit log entries found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">Page {page + 1} of {totalPages} — {data?.total ?? 0} entries</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
