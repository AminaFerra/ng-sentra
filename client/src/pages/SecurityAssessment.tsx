import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Crosshair, FileSearch, Search, Play, Plus, Server, Activity, Bug, FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SecurityAssessment() {
  const [activeTab, setActiveTab] = useState<"scanners" | "emulation" | "findings" | "report">("scanners");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Security Assessment Panel
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">
            Manage defensive testing, emulation, and findings
          </p>
        </div>
      </div>

      <div className="flex bg-muted/30 p-1 rounded-lg w-fit border border-border">
        <button
          onClick={() => setActiveTab("scanners")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === "scanners" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="w-4 h-4" />
          Scanner Integrations
        </button>
        <button
          onClick={() => setActiveTab("emulation")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === "emulation" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Crosshair className="w-4 h-4" />
          Adversary Emulation
        </button>
        <button
          onClick={() => setActiveTab("findings")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === "findings" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bug className="w-4 h-4" />
          Pentest Findings
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === "report" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "scanners" && <ScannersTab />}
        {activeTab === "emulation" && <EmulationTab />}
        {activeTab === "findings" && <FindingsTab />}
        {activeTab === "report" && <ReportTab />}
      </div>
    </div>
  );
}

function downloadScanReport(scan: any) {
  const lines = (scan.resultSummary || "").split("\n");
  const passed = lines.filter((l: string) => l.includes("[OK]") || l.includes("[PASS]")).length;
  const failed = lines.filter((l: string) => l.includes("[FAIL]") || l.includes("[VULN]") || l.includes("[WARN]")).length;
  const total = passed + failed || lines.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : (scan.status === "completed" ? 100 : 0);
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  const checksHtml = lines.filter((l: string) => l.trim()).map((line: string) => {
    const isOk = line.includes("[OK]") || line.includes("[PASS]");
    const isFail = line.includes("[FAIL]") || line.includes("[VULN]") || line.includes("[WARN]");
    const color = isOk ? "#10b981" : isFail ? "#ef4444" : "#94a3b8";
    const icon = isOk ? "✅" : isFail ? "❌" : "ℹ️";
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:${color};font-family:monospace;font-size:13px">${icon} ${line.replace(/\[OK\]|\[PASS\]|\[FAIL\]|\[VULN\]|\[WARN\]/g, "").trim()}</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scan Report - ${scan.target}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0e1a;color:#e2e8f0;padding:40px;line-height:1.6}
.c{max-width:850px;margin:0 auto}
.hdr{text-align:center;padding:40px 0;border-bottom:2px solid #1e293b;margin-bottom:30px}
.hdr h1{font-size:26px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr p{color:#94a3b8;font-size:13px;margin-top:4px}
.sec{margin-bottom:28px}.sec h2{font-size:16px;color:#06b6d4;border-bottom:1px solid #1e293b;padding-bottom:6px;margin-bottom:14px}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px}
.m{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:14px;text-align:center}
.m .v{font-size:28px;font-weight:700;font-family:monospace}.m .l{font-size:11px;color:#94a3b8;text-transform:uppercase;margin-top:4px}
.sb{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:28px;text-align:center;margin-bottom:20px}
.sc{font-size:56px;font-weight:800;font-family:monospace}
.sc.a{color:#10b981}.sc.b{color:#06b6d4}.sc.c{color:#eab308}.sc.d{color:#f97316}.sc.f{color:#ef4444}
table{width:100%;border-collapse:collapse}th{text-align:left;padding:10px 12px;background:#111827;color:#94a3b8;text-transform:uppercase;font-size:11px;border-bottom:1px solid #1e293b}
td{padding:10px 12px;border-bottom:1px solid #1e293b}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge.completed{background:#064e3b;color:#6ee7b7}.badge.failed{background:#7f1d1d;color:#fca5a5}.badge.pending{background:#1e293b;color:#94a3b8}
.ft{text-align:center;color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:16px;margin-top:36px}
.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px}
.info-row .k{color:#94a3b8}.info-row .val{color:#e2e8f0;font-family:monospace}
</style></head><body><div class="c">
<div class="hdr">
<h1>🛡️ NG-SENTRA Scan Report</h1>
<p>Individual Scan Assessment Report — Confidential</p>
</div>

<div class="sec">
<h2>Scan Information</h2>
<div class="info-row"><span class="k">Target</span><span class="val">${scan.target}</span></div>
<div class="info-row"><span class="k">Scanner</span><span class="val">${scan.scannerType.toUpperCase()}</span></div>
<div class="info-row"><span class="k">Status</span><span class="val"><span class="badge ${scan.status}">${scan.status}</span></span></div>
<div class="info-row"><span class="k">Started</span><span class="val">${new Date(scan.createdAt).toLocaleString()}</span></div>
<div class="info-row"><span class="k">Scan ID</span><span class="val">#${scan.id}</span></div>
</div>

<div class="sec">
<h2>Scan Score</h2>
<div class="sb">
<div class="sc ${grade.toLowerCase()}">${score}/100</div>
<div style="font-size:20px;margin-top:4px;color:#94a3b8">Grade: <strong style="color:${score>=80?'#10b981':score>=60?'#eab308':'#ef4444'}">${grade}</strong></div>
</div>
<div class="g">
<div class="m"><div class="v" style="color:#10b981">${passed}</div><div class="l">Checks Passed</div></div>
<div class="m"><div class="v" style="color:#ef4444">${failed}</div><div class="l">Issues Found</div></div>
<div class="m"><div class="v" style="color:#06b6d4">${total}</div><div class="l">Total Checks</div></div>
</div>
</div>

<div class="sec">
<h2>Detailed Check Results</h2>
<table>
<thead><tr><th>Check Result</th></tr></thead>
<tbody>
${checksHtml || '<tr><td style="text-align:center;color:#475569;padding:20px">No detailed results available for this scan.</td></tr>'}
</tbody>
</table>
</div>

<div class="sec">
<h2>Raw Output</h2>
<div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;white-space:pre-wrap;max-height:400px;overflow-y:auto;color:#94a3b8">
${scan.resultSummary || "No output recorded."}
</div>
</div>

<div class="sec">
<h2>Recommendations</h2>
<ul style="list-style:none;padding:0">
${failed > 0 ? `<li style="padding:8px 0;border-bottom:1px solid #1e293b">🔴 <strong>${failed} issue(s)</strong> require remediation. Review failed checks above.</li>` : ''}
${score < 60 ? '<li style="padding:8px 0;border-bottom:1px solid #1e293b">🟠 <strong>Critical:</strong> Score below 60 — immediate action required.</li>' : ''}
${score >= 80 ? '<li style="padding:8px 0;color:#10b981">✅ Strong results. Continue routine scanning.</li>' : ''}
<li style="padding:8px 0;border-bottom:1px solid #1e293b">📋 Schedule a follow-up scan after remediation to verify fixes.</li>
</ul>
</div>

<div class="ft">
<p>NG-SENTRA Security Operations Center — Scan Report #${scan.id}</p>
<p>Generated: ${new Date().toLocaleString()}</p>
</div>
</div></body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scan-report-${scan.target.replace(/[^a-zA-Z0-9]/g, "_")}-${scan.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function ScannersTab() {
  const { data: scans, refetch } = trpc.security.getScans.useQuery();
  const createScan = trpc.security.createScan.useMutation({ onSuccess: () => refetch() });
  
  const [target, setTarget] = useState("");
  const [scanner, setScanner] = useState<"nmap" | "zap" | "openvas" | "custom" | "full_suite">("nmap");
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async () => {
    if (!target) return;
    await createScan.mutateAsync({ target, scannerType: scanner });
    setIsOpen(false);
    setTarget("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Active Scans</h2>
          <p className="text-sm text-muted-foreground">Monitor and trigger authorized vulnerability scans.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Scan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Trigger New Scan</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target (IP or Hostname)</label>
                <Input placeholder="e.g., 192.168.1.100" value={target} onChange={e => setTarget(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Scanner Tool</label>
                <Select value={scanner} onValueChange={(v: any) => setScanner(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_suite">Automated Pentest Suite (20+ Checks)</SelectItem>
                    <SelectItem value="nmap">Nmap (Network Discovery)</SelectItem>
                    <SelectItem value="zap">OWASP ZAP (Web Apps)</SelectItem>
                    <SelectItem value="openvas">OpenVAS (Full Vuln Scan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!target || createScan.isPending}>
                Start Scan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scans?.map((scan: any) => (
          <Card key={scan.id} className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant={scan.scannerType === 'nmap' ? 'outline' : 'default'} className="uppercase font-mono">
                  {scan.scannerType}
                </Badge>
                <Badge variant={scan.status === 'completed' ? 'default' : scan.status === 'running' ? 'secondary' : 'outline'}>
                  {scan.status}
                </Badge>
              </div>
              <CardTitle className="text-base mt-2 font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                {scan.target}
              </CardTitle>
              <CardDescription className="text-xs">
                Started: {new Date(scan.createdAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.status === "completed" ? (
                <>
                  <div className="text-xs p-2 bg-muted/50 rounded border border-border/50 text-muted-foreground font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {scan.resultSummary || "No vulnerabilities found."}
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3 gap-2 text-xs" onClick={() => downloadScanReport(scan)}>
                    <Download className="w-3 h-3" /> Download Report
                  </Button>
                </>
              ) : scan.status === "failed" ? (
                <div className="text-xs p-2 bg-red-500/10 rounded border border-red-500/30 text-red-400 font-mono">
                  {scan.resultSummary || "Scan failed."}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Activity className="w-3 h-3 animate-pulse text-primary" /> Scan is currently queued or running...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {scans?.length === 0 && (
          <div className="col-span-full text-center p-8 border border-dashed rounded-lg text-muted-foreground">
            No scans recorded. Trigger a new scan to test your defenses.
          </div>
        )}
      </div>
    </div>
  );
}

function EmulationTab() {
  const { data: tests, refetch } = trpc.security.getEmulationTests.useQuery();
  const createTest = trpc.security.createEmulationTest.useMutation({ onSuccess: () => refetch() });
  const updateStatus = trpc.security.updateEmulationTestStatus.useMutation({ onSuccess: () => refetch() });
  const runTest = trpc.security.runEmulationTest.useMutation({
    onMutate: (variables) => {
      setRunningId(variables.id);
    },
    onSettled: () => {
      setRunningId(null);
      refetch();
    }
  });

  const [runningId, setRunningId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [techniqueId, setTechniqueId] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async () => {
    if (!name) return;
    await createTest.mutateAsync({ name, techniqueId });
    setIsOpen(false);
    setName("");
    setTechniqueId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Adversary Emulation</h2>
          <p className="text-sm text-muted-foreground">Track MITRE ATT&CK simulations and SOC detection capabilities.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Scenario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Emulation Scenario</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario Name</label>
                <Input placeholder="e.g., Pass-the-Hash Execution" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">MITRE Technique ID (Optional)</label>
                <Input placeholder="e.g., T1550.002" value={techniqueId} onChange={e => setTechniqueId(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!name || createTest.isPending}>
                Save Scenario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-mono">
            <tr>
              <th className="px-4 py-3">Technique</th>
              <th className="px-4 py-3">Scenario</th>
              <th className="px-4 py-3">Verification Details</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tests?.map((test: any) => {
              const isPending = runningId === test.id;
              return (
                <tr key={test.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-primary">{test.techniqueId || "Custom"}</td>
                  <td className="px-4 py-3 font-medium">{test.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{test.notes || "Not yet simulated"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={test.status === 'detected' ? 'default' : test.status === 'missed' ? 'destructive' : 'outline'}>
                      {test.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => runTest.mutate({ id: test.id })} 
                      disabled={isPending}
                    >
                      {isPending ? "Running..." : "Run Test"}
                    </Button>
                    <Select value={test.status} onValueChange={(v: any) => updateStatus.mutate({ id: test.id, status: v })}>
                      <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="executed">Executed</SelectItem>
                        <SelectItem value="detected">Detected</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {tests?.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No scenarios defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FindingsTab() {
  const { data: findings, refetch } = trpc.security.getFindings.useQuery();
  const createFinding = trpc.security.createFinding.useMutation({ onSuccess: () => refetch() });
  const updateStatus = trpc.security.updateFindingStatus.useMutation({ onSuccess: () => refetch() });
  
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [desc, setDesc] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = async () => {
    if (!title) return;
    await createFinding.mutateAsync({ title, severity, description: desc });
    setIsOpen(false);
    setTitle("");
    setDesc("");
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case "critical": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default: return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Pentest Findings Tracker</h2>
          <p className="text-sm text-muted-foreground">Manage and resolve vulnerabilities discovered during tests.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Log Finding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log New Finding</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Finding Title</label>
                <Input placeholder="e.g., Unauthenticated API Access" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Details about the vulnerability..." value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!title || createFinding.isPending}>
                Save Finding
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {findings?.map((finding: any) => (
          <Card key={finding.id} className="bg-card/50 border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${getSeverityColor(finding.severity).split(' ')[0]}`} />
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {finding.title}
                    <Badge variant="outline" className={`text-[10px] uppercase font-mono px-1.5 py-0 border-0 ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {finding.description || "No description provided."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={finding.status} onValueChange={(v: any) => updateStatus.mutate({ id: finding.id, status: v })}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {findings?.length === 0 && (
          <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
            No findings recorded. Excellent!
          </div>
        )}
      </div>
    </div>
  );
}

function ReportTab() {
  const { data: scans } = trpc.security.getScans.useQuery();
  const { data: tests } = trpc.security.getEmulationTests.useQuery();
  const { data: findings } = trpc.security.getFindings.useQuery();

  const stats = {
    totalScans: scans?.length ?? 0,
    completedScans: scans?.filter((s: any) => s.status === "completed").length ?? 0,
    totalEmulations: tests?.length ?? 0,
    detected: tests?.filter((t: any) => t.status === "detected").length ?? 0,
    missed: tests?.filter((t: any) => t.status === "missed").length ?? 0,
    totalFindings: findings?.length ?? 0,
    critical: findings?.filter((f: any) => f.severity === "critical").length ?? 0,
    high: findings?.filter((f: any) => f.severity === "high").length ?? 0,
    medium: findings?.filter((f: any) => f.severity === "medium").length ?? 0,
    low: findings?.filter((f: any) => f.severity === "low").length ?? 0,
    open: findings?.filter((f: any) => f.status === "open").length ?? 0,
    resolved: findings?.filter((f: any) => f.status === "resolved").length ?? 0,
  };

  const riskScore = Math.max(0, 100 - (stats.critical * 25) - (stats.high * 10) - (stats.medium * 5) - (stats.low * 2));
  const grade = riskScore >= 90 ? "A" : riskScore >= 80 ? "B" : riskScore >= 60 ? "C" : riskScore >= 40 ? "D" : "F";
  const detectionRate = stats.totalEmulations > 0 ? Math.round((stats.detected / stats.totalEmulations) * 100) : 0;

  const downloadReport = () => {
    const now = new Date().toISOString();
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NG-SENTRA Risk Assessment Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0e1a;color:#e2e8f0;padding:40px;line-height:1.6}
.container{max-width:900px;margin:0 auto}
.header{text-align:center;padding:40px 0;border-bottom:2px solid #1e293b;margin-bottom:30px}
.header h1{font-size:28px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.header p{color:#94a3b8;font-size:14px}
.section{margin-bottom:32px}
.section h2{font-size:18px;color:#06b6d4;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.metric{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:16px;text-align:center}
.metric .value{font-size:32px;font-weight:700;font-family:monospace}
.metric .label{font-size:12px;color:#94a3b8;text-transform:uppercase;margin-top:4px}
.score-box{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;text-align:center;margin-bottom:24px}
.score{font-size:64px;font-weight:800;font-family:monospace}
.score.a{color:#10b981}.score.b{color:#06b6d4}.score.c{color:#eab308}.score.d{color:#f97316}.score.f{color:#ef4444}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
th{text-align:left;padding:10px 12px;background:#111827;color:#94a3b8;text-transform:uppercase;font-size:11px;border-bottom:1px solid #1e293b}
td{padding:10px 12px;border-bottom:1px solid #1e293b}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge.critical{background:#7f1d1d;color:#fca5a5}.badge.high{background:#7c2d12;color:#fdba74}
.badge.medium{background:#713f12;color:#fde047}.badge.low{background:#1e3a5f;color:#93c5fd}
.badge.detected{background:#064e3b;color:#6ee7b7}.badge.missed{background:#7f1d1d;color:#fca5a5}
.badge.open{background:#7f1d1d;color:#fca5a5}.badge.resolved{background:#064e3b;color:#6ee7b7}
.badge.in_progress{background:#713f12;color:#fde047}.badge.planned{background:#1e293b;color:#94a3b8}
.footer{text-align:center;color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:20px;margin-top:40px}
.bar{height:8px;border-radius:4px;background:#1e293b;overflow:hidden;margin:8px 0}
.bar-fill{height:100%;border-radius:4px}
</style></head><body><div class="container">
<div class="header">
<h1>🛡️ NG-SENTRA Risk Assessment Report</h1>
<p>Generated: ${new Date().toLocaleString()} | Target: NG-SENTRA SOC Dashboard</p>
<p>Scope: Full-Stack Security Assessment (SAST + DAST + Emulation)</p>
</div>

<div class="section">
<h2>Executive Summary</h2>
<div class="score-box">
<div class="score ${grade.toLowerCase()}">${riskScore}/100</div>
<div style="font-size:24px;margin-top:4px;color:#94a3b8">Grade: <strong style="color:${riskScore>=80?'#10b981':riskScore>=60?'#eab308':'#ef4444'}">${grade}</strong></div>
</div>
<div class="grid">
<div class="metric"><div class="value" style="color:#06b6d4">${stats.totalScans}</div><div class="label">Total Scans</div></div>
<div class="metric"><div class="value" style="color:#10b981">${stats.completedScans}</div><div class="label">Completed</div></div>
<div class="metric"><div class="value" style="color:#8b5cf6">${stats.totalEmulations}</div><div class="label">Emulations</div></div>
<div class="metric"><div class="value" style="color:#ef4444">${stats.totalFindings}</div><div class="label">Findings</div></div>
</div>
</div>

<div class="section">
<h2>Detection Capability Assessment</h2>
<div class="grid">
<div class="metric"><div class="value" style="color:#10b981">${detectionRate}%</div><div class="label">Detection Rate</div></div>
<div class="metric"><div class="value" style="color:#10b981">${stats.detected}</div><div class="label">Detected</div></div>
<div class="metric"><div class="value" style="color:#ef4444">${stats.missed}</div><div class="label">Missed</div></div>
</div>
<div class="bar"><div class="bar-fill" style="width:${detectionRate}%;background:linear-gradient(90deg,#06b6d4,#10b981)"></div></div>
<p style="font-size:13px;color:#94a3b8;margin-top:8px">${detectionRate >= 80 ? 'Strong detection posture.' : detectionRate >= 50 ? 'Moderate detection gaps exist.' : 'Significant detection gaps require immediate action.'}</p>
</div>

<div class="section">
<h2>Vulnerability Severity Breakdown</h2>
<div class="grid">
<div class="metric"><div class="value" style="color:#ef4444">${stats.critical}</div><div class="label">Critical</div></div>
<div class="metric"><div class="value" style="color:#f97316">${stats.high}</div><div class="label">High</div></div>
<div class="metric"><div class="value" style="color:#eab308">${stats.medium}</div><div class="label">Medium</div></div>
<div class="metric"><div class="value" style="color:#3b82f6">${stats.low}</div><div class="label">Low</div></div>
</div>
</div>

<div class="section">
<h2>Scan Results</h2>
<table><thead><tr><th>Target</th><th>Scanner</th><th>Status</th><th>Date</th></tr></thead><tbody>
${(scans ?? []).map((s: any) => `<tr><td style="font-family:monospace">${s.target}</td><td>${s.scannerType}</td><td><span class="badge ${s.status}">${s.status}</span></td><td>${new Date(s.createdAt).toLocaleString()}</td></tr>`).join("")}
${(scans?.length ?? 0) === 0 ? '<tr><td colspan="4" style="text-align:center;color:#475569">No scans recorded</td></tr>' : ''}
</tbody></table>
</div>

<div class="section">
<h2>Adversary Emulation Results</h2>
<table><thead><tr><th>Technique</th><th>Scenario</th><th>Status</th><th>Details</th></tr></thead><tbody>
${(tests ?? []).map((t: any) => `<tr><td style="font-family:monospace;color:#06b6d4">${t.techniqueId || "Custom"}</td><td>${t.name}</td><td><span class="badge ${t.status}">${t.status}</span></td><td style="font-size:12px;color:#94a3b8">${t.notes || "—"}</td></tr>`).join("")}
${(tests?.length ?? 0) === 0 ? '<tr><td colspan="4" style="text-align:center;color:#475569">No emulation tests recorded</td></tr>' : ''}
</tbody></table>
</div>

<div class="section">
<h2>Pentest Findings Detail</h2>
<table><thead><tr><th>Finding</th><th>Severity</th><th>Status</th><th>Description</th></tr></thead><tbody>
${(findings ?? []).map((f: any) => `<tr><td style="font-weight:600">${f.title}</td><td><span class="badge ${f.severity}">${f.severity}</span></td><td><span class="badge ${f.status}">${f.status}</span></td><td style="font-size:12px;color:#94a3b8;max-width:300px">${f.description || "—"}</td></tr>`).join("")}
${(findings?.length ?? 0) === 0 ? '<tr><td colspan="4" style="text-align:center;color:#475569">No findings recorded</td></tr>' : ''}
</tbody></table>
</div>

<div class="section">
<h2>Recommendations</h2>
<ul style="list-style:none;padding:0">
${stats.critical > 0 ? '<li style="padding:8px 0;border-bottom:1px solid #1e293b">🔴 <strong>Immediate:</strong> Remediate all critical findings within 24 hours.</li>' : ''}
${stats.high > 0 ? '<li style="padding:8px 0;border-bottom:1px solid #1e293b">🟠 <strong>Urgent:</strong> Address high-severity findings within 48 hours.</li>' : ''}
${stats.medium > 0 ? '<li style="padding:8px 0;border-bottom:1px solid #1e293b">🟡 <strong>Short-term:</strong> Resolve medium findings within 1 week.</li>' : ''}
${stats.missed > 0 ? '<li style="padding:8px 0;border-bottom:1px solid #1e293b">🔴 <strong>Detection Gap:</strong> ${stats.missed} emulation scenario(s) went undetected. Review and add detection rules.</li>' : ''}
${stats.totalFindings === 0 && stats.missed === 0 ? '<li style="padding:8px 0;color:#10b981">✅ No critical issues found. Continue routine assessments.</li>' : ''}
</ul>
</div>

<div class="footer">
<p>NG-SENTRA Security Operations Center — Confidential Report</p>
<p>Generated by automated security assessment engine</p>
</div>
</div></body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ng-sentra-risk-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gradeColor = riskScore >= 80 ? "text-emerald-400" : riskScore >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Risk Assessment Report</h2>
          <p className="text-sm text-muted-foreground">Generate a comprehensive security report from all assessment data.</p>
        </div>
        <Button onClick={downloadReport} className="gap-2">
          <Download className="w-4 h-4" /> Download Report
        </Button>
      </div>

      {/* Score Card */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground uppercase font-mono mb-2">Overall Security Score</p>
          <p className={`text-6xl font-extrabold font-mono ${gradeColor}`}>{riskScore}/100</p>
          <p className="text-lg text-muted-foreground mt-1">Grade: <span className={`font-bold ${gradeColor}`}>{grade}</span></p>
        </CardContent>
      </Card>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-cyan-400">{stats.totalScans}</p>
            <p className="text-xs text-muted-foreground uppercase mt-1">Scans Run</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-purple-400">{detectionRate}%</p>
            <p className="text-xs text-muted-foreground uppercase mt-1">Detection Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-red-400">{stats.open}</p>
            <p className="text-xs text-muted-foreground uppercase mt-1">Open Findings</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold font-mono text-emerald-400">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground uppercase mt-1">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity Breakdown */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Findings by Severity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Critical", count: stats.critical, color: "bg-red-500", max: stats.totalFindings },
              { label: "High", count: stats.high, color: "bg-orange-500", max: stats.totalFindings },
              { label: "Medium", count: stats.medium, color: "bg-yellow-500", max: stats.totalFindings },
              { label: "Low", count: stats.low, color: "bg-blue-500", max: stats.totalFindings },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs font-mono w-16 text-muted-foreground">{item.label}</span>
                <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.max > 0 ? (item.count / item.max) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-mono w-6 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detection */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Adversary Emulation Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${detectionRate}%` }} />
            </div>
            <span className="text-sm font-mono font-bold">{detectionRate}%</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span>🟢 {stats.detected} Detected</span>
            <span>🔴 {stats.missed} Missed</span>
            <span>📋 {stats.totalEmulations - stats.detected - stats.missed} Pending</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
