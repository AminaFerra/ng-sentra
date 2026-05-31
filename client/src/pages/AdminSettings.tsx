import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SSHCredentialsSettings } from "@/components/SSHCredentialsSettings";
import { WazuhSettings } from "@/components/WazuhSettings";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff, Globe, Server, Key, Mail, Network } from "lucide-react";
import { useLocation } from "wouter";

const settingMeta: Record<string, { label: string; description: string; icon: any; sensitive?: boolean; placeholder: string }> = {
  n8n_base_url:            { label: "n8n Base URL",             icon: Globe,   placeholder: "http://172.31.30.123:5678",  description: "Base URL of your n8n SOAR instance" },
  wazuh_elasticsearch_url: { label: "Wazuh Elasticsearch URL",  icon: Server,  placeholder: "https://172.31.41.10:9200",  description: "Elasticsearch endpoint used by Wazuh" },
  local_ai_brain_url:      { label: "Local AI Brain URL",       icon: Server,  placeholder: "http://172.31.25.6:5000",  description: "REST API endpoint for Local AI Brain / UBA (Waitress)" },
  soar_ssh_host:           { label: "SOAR SSH Host",            icon: Network, placeholder: "172.31.41.10",              description: "SSH host IP for executing IR scripts (IP & Behavior)" },
  soar_ssh_user:           { label: "SOAR SSH User",            icon: Network, placeholder: "ubuntu",                    description: "SSH username for connecting to the SOAR host" },
  ssh_host:                { label: "SSH Host (Config/Terminal)", icon: Network, placeholder: "172.31.41.10",              description: "SSH host for health checks, config files, and terminal access" },
  ssh_port:                { label: "SSH Port",                  icon: Network, placeholder: "22",                        description: "SSH port (default: 22 for AWS EC2)" },
  ssh_user:                { label: "SSH User (Config/Terminal)", icon: Network, placeholder: "ubuntu",                    description: "SSH username for config file and terminal access" },
  ssh_password:            { label: "SSH Password",             icon: Key,     placeholder: "Enter password...",         description: "SSH password for authentication (optional if using key-based auth)", sensitive: true },
  ssh_private_key_path:    { label: "SSH Private Key Path",     icon: Key,     placeholder: "/home/ubuntu/.ssh/ng-soc-key",  description: "Path to the SSH private key file on the server (for AWS EC2 key-based auth)" },
  virustotal_api_key:      { label: "VirusTotal API Key",       icon: Key,     placeholder: "Enter API key...",          description: "Used by URL real-time IR workflow for VirusTotal lookups", sensitive: true },
  abuseipdb_api_key:       { label: "AbuseIPDB API Key",        icon: Key,     placeholder: "Enter API key...",          description: "Used by IP IR workflow for AbuseIPDB reputation checks", sensitive: true },
  gemini_api_key:          { label: "Google Gemini API Key",    icon: Key,     placeholder: "Enter API key...",          description: "API key for Gemini 2.5 Flash (Alert Classification)", sensitive: true },
  notification_email:      { label: "Notification Email",       icon: Mail,    placeholder: "admin@example.com",         description: "Email address used for n8n alert notifications" },
};

const settingOrder = [
  "n8n_base_url",
  "wazuh_elasticsearch_url",
  "local_ai_brain_url",
  "soar_ssh_host",
  "soar_ssh_user",
  "ssh_host",
  "ssh_port",
  "ssh_user",
  "ssh_password",
  "ssh_private_key_path",
  "virustotal_api_key",
  "abuseipdb_api_key",
  "gemini_api_key",
  "notification_email",
];

export default function AdminSettings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "Admin" || user?.role === "admin";

  const { data: settings, refetch, isLoading } = trpc.settings.list.useQuery();
  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => { toast.success("Setting saved"); refetch(); },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  // Local editable state per key
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value ?? ""; });
      setValues(map);
    }
  }, [settings]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-2">
          <Settings className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-mono text-sm">Admin access required</p>
        </div>
      </div>
    );
  }

  const handleSave = (key: string) => {
    const meta = settingMeta[key];
    upsertMutation.mutate({
      key,
      value: values[key] ?? "",
      label: meta?.label,
      description: meta?.description,
    });
  };

  const handleSaveAll = () => {
    settingOrder.forEach(key => {
      if (values[key] !== undefined) {
        const meta = settingMeta[key];
        upsertMutation.mutate({ key, value: values[key], label: meta?.label, description: meta?.description });
      }
    });
    toast.success("All settings saved");
  };

  const groups = [
    { title: "Infrastructure URLs", keys: ["n8n_base_url", "wazuh_elasticsearch_url", "local_ai_brain_url"] },
    { title: "SSH Configuration", keys: ["soar_ssh_host", "soar_ssh_user", "ssh_host", "ssh_port", "ssh_user", "ssh_password", "ssh_private_key_path"] },
    { title: "API Keys", keys: ["virustotal_api_key", "abuseipdb_api_key", "gemini_api_key"] },
    { title: "Notifications", keys: ["notification_email"] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            System Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure all infrastructure URLs, API keys, and service endpoints. All values are stored in the database — no hardcoded configuration.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs font-mono gap-1.5"
          onClick={handleSaveAll}
          disabled={upsertMutation.isPending || isLoading}
        >
          <Save className="w-3.5 h-3.5" />
          Save All
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
        <Settings className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p>
          These settings are used by the dashboard to display correct URLs in the SOAR Panel, AI Models panel, and component viewer.
          API keys are stored in the database and used for reference only — they are not sent to the browser.
        </p>
      </div>

      {/* SSH Credentials Management */}
      <SSHCredentialsSettings />

      {/* Wazuh Configuration */}
      <WazuhSettings />

      {/* Setting Groups */}
      {groups.map(group => (
        <Card key={group.title} className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.keys.map(key => {
              const meta = settingMeta[key];
              if (!meta) return null;
              const Icon = meta.icon;
              const isSensitive = meta.sensitive;
              const isVisible = showSensitive[key];

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <label className="text-xs font-medium text-foreground">{meta.label}</label>
                    <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">{key}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 pl-5">{meta.description}</p>
                  <div className="flex items-center gap-2 pl-5">
                    <div className="relative flex-1">
                      <Input
                        type={isSensitive && !isVisible ? "password" : "text"}
                        value={values[key] ?? ""}
                        onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={meta.placeholder}
                        className="h-8 text-xs font-mono pr-8"
                      />
                      {isSensitive && (
                        <button
                          type="button"
                          onClick={() => setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs font-mono flex-shrink-0"
                      onClick={() => handleSave(key)}
                      disabled={upsertMutation.isPending}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
