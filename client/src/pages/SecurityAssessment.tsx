import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Crosshair, FileSearch, Search, Play, Plus, Server, Activity, Bug } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SecurityAssessment() {
  const [activeTab, setActiveTab] = useState<"scanners" | "emulation" | "findings">("scanners");

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
      </div>

      <div className="mt-6">
        {activeTab === "scanners" && <ScannersTab />}
        {activeTab === "emulation" && <EmulationTab />}
        {activeTab === "findings" && <FindingsTab />}
      </div>
    </div>
  );
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
                <div className="text-xs p-2 bg-muted/50 rounded border border-border/50 text-muted-foreground font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {scan.resultSummary || "No vulnerabilities found."}
                </div>
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tests?.map((test: any) => (
              <tr key={test.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-primary">{test.techniqueId || "Custom"}</td>
                <td className="px-4 py-3 font-medium">{test.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={test.status === 'detected' ? 'default' : test.status === 'missed' ? 'destructive' : 'outline'}>
                    {test.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Select value={test.status} onValueChange={(v: any) => updateStatus.mutate({ id: test.id, status: v })}>
                    <SelectTrigger className="w-[130px] ml-auto h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="executed">Executed</SelectItem>
                      <SelectItem value="detected">Detected</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
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
