import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ExternalLink, Shield, AlertTriangle, Globe, Terminal,
  FileText, Cpu, Zap, Bug, Eye, Activity, Network, Server
} from "lucide-react";
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";

const iconMap: Record<string, React.ElementType> = {
  Shield, Globe, Terminal, FileText, Cpu, Zap, Bug, Eye, Activity, Network, Server,
};

const accessTypeLabels: Record<string, { label: string; color: string; description: string }> = {
  iframe:       { label: "Web UI",       color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", description: "Opens in your browser as a web interface." },
  "config-file":{ label: "Config File",  color: "text-amber-400 border-amber-500/30 bg-amber-500/10",       description: "Managed via configuration files on the server. No web UI." },
  terminal:     { label: "Terminal",     color: "text-blue-400 border-blue-500/30 bg-blue-500/10",           description: "Accessible via SSH terminal on the server." },
  service:      { label: "Background Service", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", description: "Runs as a background service. No direct web access." },
};

export default function ComponentViewer() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();

  const { data: components } = trpc.components.list.useQuery();
  const logAction = trpc.audit.log.useMutation();

  const component = components?.find(c => c.slug === slug);

  useEffect(() => {
    if (component) {
      logAction.mutate({
        action: "ACCESS_COMPONENT",
        target: component.name,
        details: `Launched component: ${component.url ?? "no URL"}`,
      });
    }
  }, [component?.id]);

  if (!component) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Component not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/components")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Components
          </Button>
        </div>
      </div>
    );
  }

  const Icon = iconMap[component.icon ?? "Shield"] ?? Shield;
  const accessType = component.accessType ?? "iframe";
  const atInfo = accessTypeLabels[accessType] ?? accessTypeLabels.iframe;
  
  // The raw internal URL (e.g., https://192.168.1.14:5601)
  const internalUrl = component.url
    ? (component.port ? `${component.url}:${component.port}` : component.url)
    : null;

  // Smart Routing:
  // If we are accessing the dashboard from the local network (localhost or 192.168.x.x)
  // we should connect directly to the VM for maximum performance.
  // Otherwise (if we are on Cloudflare), we must use the proxy.
  const isLocalNetwork = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.hostname.startsWith('192.168.');

  const launchUrl = internalUrl 
    ? (isLocalNetwork ? internalUrl : `/proxy/${slug}`) 
    : null;

  const canLaunch = accessType === "iframe" && !!launchUrl;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/components")}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Components
      </Button>

      {/* Main Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1 w-full ${component.enabled ? "bg-gradient-to-r from-primary via-cyan-500 to-transparent" : "bg-muted/30"}`} />

        <div className="p-8 space-y-6">
          {/* Icon + Name */}
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              component.enabled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/20 border-border text-muted-foreground"
            }`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{component.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {component.category && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
                    {component.category}
                  </span>
                )}
                <Badge variant="outline" className={`text-[10px] font-mono ${atInfo.color}`}>
                  {atInfo.label}
                </Badge>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${component.enabled ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
                <span className="text-xs text-muted-foreground">{component.enabled ? "Active" : "Disabled"}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {component.description && (
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
              {component.description}
            </p>
          )}

          {/* Access Info */}
          <div className="rounded-lg bg-muted/20 border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Access Type</span>
                <p className="font-mono text-foreground mt-0.5">{atInfo.label}</p>
              </div>
              {launchUrl && (
                <div>
                  <span className="text-muted-foreground text-xs">URL</span>
                  <p className="font-mono text-primary text-xs mt-0.5 truncate">{launchUrl}</p>
                </div>
              )}
              {component.port && (
                <div>
                  <span className="text-muted-foreground text-xs">Port</span>
                  <p className="font-mono text-foreground mt-0.5">{component.port}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 italic">{atInfo.description}</p>
          </div>

          {/* Action Area */}
          {canLaunch ? (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => window.open(launchUrl!, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-5 h-5" />
                Open {component.name} in New Tab
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Opens <span className="font-mono text-primary/80">{launchUrl}</span> in a new browser tab.
                Make sure you are on the same network as the SOC server.
              </p>
            </div>
          ) : accessType === "config-file" ? (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
                onClick={() => navigate(`/config/${slug}`)}
              >
                <FileText className="w-5 h-5" />
                View Configuration & SSH Commands
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                View the current config file and get SSH commands to edit it on the server.
              </p>
            </div>
          ) : accessType === "terminal" ? (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full gap-2 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                onClick={() => navigate(`/terminal/${slug}`)}
              >
                <Terminal className="w-5 h-5" />
                Access via SSH Terminal
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Get SSH connection details and commands to access this component.
              </p>
            </div>
          ) : accessType === "service" ? (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 flex gap-3">
              <Cpu className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-300">Background Service</p>
                <p className="text-xs text-muted-foreground">
                  {component.name} runs as a background service on the SOC server. Monitor its status in the
                  <button onClick={() => navigate("/ai-models")} className="text-primary hover:underline ml-1">AI Models panel</button>.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-300">Not Configured</p>
                <p className="text-xs text-muted-foreground">
                  No URL has been set for <strong>{component.name}</strong>.
                  Configure it in the
                  <button onClick={() => navigate("/admin/components")} className="text-primary hover:underline ml-1">Admin Component Config</button> panel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
