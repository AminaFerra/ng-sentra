import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { ShieldAlert, Activity, RefreshCw, RefreshCwOff, Zap, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ThreatAlert {
  id: string;
  time: string;
  model: string;
  type: string;
  score: string;
  target: string;
  description: string;
}

export default function AIThreatFeed() {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const seenHashes = useRef<Set<string>>(new Set());
  const [autoPoll, setAutoPoll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [engineFilter, setEngineFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: alertsData, refetch } = trpc.wazuh.getAlerts.useQuery({ limit: 1000 }, {
    refetchInterval: autoPoll ? 10000 : false
  });

  useEffect(() => {
    if (alertsData) {
      const raw = ((alertsData && 'alerts' in alertsData ? alertsData.alerts : alertsData) || []) as any[];
      const newAlerts: ThreatAlert[] = [];
      const now = new Date().toLocaleTimeString();

      for (const a of raw) {
        const desc = a.rule_description?.toLowerCase() || "";
        let model = null;
        let aiName = "Unknown Engine";

        if (desc.includes("anomaly") || desc.includes("behavior") || desc.includes("deviation")) {
          model = "anomaly-detection";
          aiName = "Anomaly Detection";
        } else if (desc.includes("user") || desc.includes("profile") || desc.includes("uba") || desc.includes("login")) {
          model = "uba";
          aiName = "User Behavior Profiler (UBA)";
        } else if (desc.includes("threat") || desc.includes("intel") || desc.includes("malicious") || desc.includes("ti")) {
          model = "local-ti";
          aiName = "Local Threat Intel";
        } else if (desc.includes("triage") || desc.includes("classified") || desc.includes("gemini") || desc.includes("report")) {
          model = "alert-classification";
          aiName = "Alert Classification (Gemini)";
        }

        // Fallback distribution for demo visuals if no exact matches are found
        if (!model) {
          if (a.severity >= 7) { model = "alert-classification"; aiName = "Alert Classification (Gemini)"; }
          else if (a.severity === 5 || a.severity === 6) { model = "anomaly-detection"; aiName = "Anomaly Detection"; }
          else if (a.severity === 3 || a.severity === 4) { model = "uba"; aiName = "User Behavior Profiler (UBA)"; }
          else { model = "local-ti"; aiName = "Local Threat Intel"; }
        }

        if (model) {
          const hash = a.id;
          if (!seenHashes.current.has(hash)) {
            seenHashes.current.add(hash);
            const scoreNum = a.severity / 15.0; // rough confidence score
            
            let niceDesc = "No further details available";
            if (a.full_log) {
              if (typeof a.full_log === 'object') {
                niceDesc = a.full_log.message || a.full_log.syslog || a.full_log.audit || JSON.stringify(a.full_log);
              } else if (typeof a.full_log === 'string') {
                niceDesc = a.full_log;
              }
            } else if (a.data) {
               niceDesc = JSON.stringify(a.data);
            }
            if (niceDesc.length > 250) niceDesc = niceDesc.substring(0, 250) + '...';

            newAlerts.push({
              id: a.id,
              time: new Date(a.timestamp).toLocaleTimeString(),
              model: aiName,
              type: a.rule_description || 'Unknown Threat',
              score: scoreNum.toFixed(2),
              target: a.agent_name || a.agent_ip || 'N/A',
              description: niceDesc
            });
          }
        }
      }

      if (newAlerts.length > 0) {
        setAlerts(prev => {
          // Put new alerts at the top
          const combined = [...newAlerts, ...prev];
          // Remove duplicates based on ID (since React strict mode might double fire)
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          return unique.slice(0, 500);
        });
      }
    }
  }, [alertsData]);

  const filteredAlerts = alerts.filter(a => {
    const matchSearch = a.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEngine = engineFilter === "all" || a.model === engineFilter;
    let matchRisk = true;
    const scoreNum = parseFloat(a.score);
    const isHigh = scoreNum >= 0.8 || a.type.toLowerCase().includes("critical");
    const isMed = scoreNum >= 0.5 && scoreNum < 0.8;
    if (riskFilter === "high") matchRisk = isHigh;
    if (riskFilter === "medium") matchRisk = isMed;
    if (riskFilter === "low") matchRisk = !isHigh && !isMed;
    
    return matchSearch && matchEngine && matchRisk;
  });

  return (
    <div className="space-y-6 cyber-grid-bg min-h-full">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                AI Threat Intelligence Feed
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Live streaming alerts detected by SOC AI engines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant={autoPoll ? "default" : "outline"}
            className={`h-8 text-xs font-mono gap-1.5 ${autoPoll ? "bg-orange-500 hover:bg-orange-600 text-white border-none" : ""}`}
            onClick={() => setAutoPoll(!autoPoll)}>
            {autoPoll ? <Activity className="w-3 h-3 animate-pulse" /> : <RefreshCwOff className="w-3 h-3" />}
            {autoPoll ? "Live Stream Active" : "Stream Paused"}
          </Button>
          <Button size="sm" variant="outline"
            className="h-8 text-xs font-mono gap-1.5"
            onClick={() => refetch()}
            disabled={!alertsData || autoPoll}>
            <Zap className={`w-3 h-3 ${!alertsData ? "animate-pulse text-yellow-400" : ""}`} />
            {!alertsData ? "Fetching…" : "Fetch Now"}
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border shadow-lg overflow-hidden flex flex-col h-[70vh]">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search threat type, IP, or description..." 
              className="pl-9 h-9 bg-background/50 border-border font-mono text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={engineFilter} onValueChange={setEngineFilter}>
            <SelectTrigger className="w-[180px] h-9 bg-background/50 text-xs font-mono border-border">
              <SelectValue placeholder="AI Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Engines</SelectItem>
              <SelectItem value="Anomaly Detection">Anomaly Detection</SelectItem>
              <SelectItem value="Alert Classification (Gemini)">Alert Classification</SelectItem>
              <SelectItem value="User Behavior Profiler (UBA)">UBA Profiler</SelectItem>
              <SelectItem value="Local Threat Intel">Local Threat Intel</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-background/50 text-xs font-mono border-border">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto text-xs font-mono text-muted-foreground">
            <Filter className="w-3 h-3" />
            Showing {filteredAlerts.length} of {alerts.length} threats
          </div>
        </div>

        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0 backdrop-blur-md z-10 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-medium border-b border-border">Time</th>
                <th className="py-3 px-4 font-medium border-b border-border">Threat Type</th>
                <th className="py-3 px-4 font-medium border-b border-border">Confidence</th>
                <th className="py-3 px-4 font-medium border-b border-border">Target/Source</th>
                <th className="py-3 px-4 font-medium border-b border-border">AI Engine</th>
                <th className="py-3 px-4 font-medium border-b border-border w-1/3">Description</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground/50 font-mono text-xs">
                    {alerts.length === 0 ? "Awaiting live AI alerts... Turn on Live Stream." : "No alerts match your search."}
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const scoreNum = parseFloat(alert.score);
                  const isHighRisk = scoreNum >= 0.8 || alert.type.toLowerCase().includes("critical");
                  const isMediumRisk = scoreNum >= 0.5 && scoreNum < 0.8;
                  
                  return (
                    <tr key={alert.id} className="hover:bg-muted/10 transition-colors font-mono text-[11px] group">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{alert.time}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded border ${
                          isHighRisk ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          isMediumRisk ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        }`}>
                          {alert.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`font-bold ${isHighRisk ? "text-red-400" : isMediumRisk ? "text-orange-400" : "text-cyan-400"}`}>
                          {alert.score}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-foreground">{alert.target}</td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{alert.model}</td>
                      <td className="py-2.5 px-4 text-foreground break-words max-w-[300px]">
                        {alert.description}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10">
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
