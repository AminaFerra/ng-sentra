import { Client } from "ssh2";
import { getSSHConfig } from "../ssh-service";
import { fetchWazuhAlerts } from "../wazuh-service";
import fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContainerInfo {
  name: string;
  status: string;
  image: string;
  running: boolean;
}

export interface ContainerLog {
  container: string;
  logs: string;
}

export interface ServiceInfo {
  unit: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export interface WazuhAlertSummary {
  id: string;
  timestamp: string;
  rule_id: string;
  rule_description: string;
  severity: number;
  agent_name: string;
  source_ip?: string;
}

export interface IntelligenceSnapshot {
  fetchedAt: string;
  containers: ContainerInfo[];
  failedContainers: ContainerInfo[];
  containerLogs: ContainerLog[];
  runningServices: ServiceInfo[];
  failedServices: ServiceInfo[];
  wazuhAlerts: WazuhAlertSummary[];
  criticalAlertCount: number;
  snortAlerts: string;
  auditdEvents: string;
  ubaLogs: string;
  sshAvailable: boolean;
  wazuhAvailable: boolean;
  errors: string[];
}

// ─── SSH exec helper ─────────────────────────────────────────────────────────

/**
 * Run a read-only command on the Ubuntu VM via SSH.
 * Commands are hardcoded — no user input reaches the shell.
 */
async function sshExec(command: string, timeoutMs = 15000): Promise<string> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) throw new Error("SSH credentials not configured");

  return new Promise<string>((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          reject(err);
          return;
        }

        let stdout = "";
        let stderr = "";
        stream.on("data", (d: Buffer) => { stdout += d.toString(); });
        stream.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        stream.on("close", () => {
          clearTimeout(timer);
          conn.end();
          resolve((stdout + (stderr ? `\n[STDERR]: ${stderr}` : "")).trim());
        });
        stream.on("error", (e: Error) => {
          clearTimeout(timer);
          conn.end();
          reject(e);
        });
      });
    });

    conn.on("error", (err) => { clearTimeout(timer); reject(err); });
    conn.on("keyboard-interactive", (_n, _i, _il, _p, finish) => finish([sshConfig.password]));

    const connectOpts: any = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      tryKeyboard: true,
      readyTimeout: 20000,
    };
    if (sshConfig.privateKeyPath) {
      try {
        connectOpts.privateKey = fs.readFileSync(sshConfig.privateKeyPath);
      } catch (e: any) {
        console.warn(`[SSH/DataFetcher] Failed to read key at ${sshConfig.privateKeyPath}:`, e.message);
      }
    }
    if (sshConfig.password) {
      connectOpts.password = sshConfig.password;
    }
    conn.connect(connectOpts);
  });
}

// ─── Individual data fetchers ─────────────────────────────────────────────────

async function fetchDockerContainers(): Promise<ContainerInfo[]> {
  const output = await sshExec(
    "docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}'",
    12000
  );
  return output.split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", status = "", image = ""] = line.split("|");
      return {
        name: name.trim(),
        status: status.trim(),
        image: image.trim(),
        running: status.trim().toLowerCase().startsWith("up"),
      };
    });
}

async function fetchDockerLogs(containerNames: string[]): Promise<ContainerLog[]> {
  const results: ContainerLog[] = [];
  for (const name of containerNames) {
    try {
      // Safe: container names are hardcoded, not user-supplied
      const logs = await sshExec(
        `docker logs --tail 80 --since 168h ${name} 2>&1 | tail -n 80`,
        12000
      );
      results.push({ container: name, logs: logs.slice(0, 4000) });
    } catch {
      results.push({ container: name, logs: "[logs unavailable]" });
    }
  }
  return results;
}

async function fetchSystemdServices(): Promise<{ running: ServiceInfo[]; failed: ServiceInfo[] }> {
  const [runningRaw, failedRaw] = await Promise.all([
    sshExec("systemctl list-units --type=service --state=running --no-pager --no-legend", 10000),
    sshExec("systemctl list-units --type=service --state=failed --no-pager --no-legend", 10000),
  ]);

  const parse = (raw: string): ServiceInfo[] =>
    raw.split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return {
          unit: parts[0] ?? "",
          load: parts[1] ?? "",
          active: parts[2] ?? "",
          sub: parts[3] ?? "",
          description: parts.slice(4).join(" "),
        };
      })
      .filter((s) => s.unit);

  return { running: parse(runningRaw), failed: parse(failedRaw) };
}

async function fetchSnortAlerts(): Promise<string> {
  return sshExec(
    "docker exec snort tail -n 200 /var/log/snort/alert 2>/dev/null || echo '[Snort alert log not accessible]'",
    12000
  );
}

async function fetchAuditdEvents(): Promise<string> {
  return sshExec(
    "ausearch -ts today -i 2>/dev/null | tail -n 100 || echo '[auditd not available]'",
    12000
  );
}

async function fetchUbaLogs(): Promise<string> {
  return sshExec(
    "journalctl -u ngsentra-uba.service -u ngsentra-uba-api.service --since '7 days ago' --no-pager -n 60 2>/dev/null || echo '[UBA service logs not available]'",
    12000
  );
}

// ─── Main intelligence snapshot ───────────────────────────────────────────────

// High-priority containers to always fetch logs from
const CRITICAL_CONTAINERS = [
  "single-node-wazuh.manager-1",
  "ng_soc_ai_brain",
  "ng_soc_ai_classifier_brain",
  "snort",
  "n8n-soc",
];

export async function fetchIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  // Run all fetches concurrently with individual error capture
  const [
    containersResult,
    servicesResult,
    snortResult,
    auditdResult,
    ubaResult,
    wazuhResult,
  ] = await Promise.allSettled([
    fetchDockerContainers(),
    fetchSystemdServices(),
    fetchSnortAlerts(),
    fetchAuditdEvents(),
    fetchUbaLogs(),
    fetchWazuhAlerts(200),
  ]);

  const sshAvailable = containersResult.status === "fulfilled";
  const wazuhAvailable = wazuhResult.status === "fulfilled";

  // Containers
  const containers = containersResult.status === "fulfilled"
    ? containersResult.value
    : (errors.push(`Docker: ${(containersResult as PromiseRejectedResult).reason?.message}`), []);
  const failedContainers = containers.filter((c) => !c.running);

  // Container logs (only if SSH is available)
  let containerLogs: ContainerLog[] = [];
  if (sshAvailable) {
    try {
      containerLogs = await fetchDockerLogs(CRITICAL_CONTAINERS);
    } catch (e: any) {
      errors.push(`Container logs: ${e?.message}`);
    }
  }

  // Services
  const { running: runningServices, failed: failedServices } =
    servicesResult.status === "fulfilled"
      ? servicesResult.value
      : (errors.push(`Systemd: ${(servicesResult as PromiseRejectedResult).reason?.message}`), { running: [], failed: [] });

  // Wazuh alerts
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allAlerts = wazuhResult.status === "fulfilled"
    ? wazuhResult.value
    : (errors.push(`Wazuh: ${(wazuhResult as PromiseRejectedResult).reason?.message}`), []);
  const wazuhAlerts: WazuhAlertSummary[] = allAlerts
    .filter((a) => new Date(a.timestamp) >= sevenDaysAgo)
    .map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      rule_id: a.rule_id,
      rule_description: a.rule_description,
      severity: a.severity,
      agent_name: a.agent_name,
      source_ip: a.source_ip,
    }));
  const criticalAlertCount = wazuhAlerts.filter((a) => a.severity >= 10).length;

  return {
    fetchedAt,
    containers,
    failedContainers,
    containerLogs,
    runningServices,
    failedServices,
    wazuhAlerts,
    criticalAlertCount,
    snortAlerts: snortResult.status === "fulfilled" ? snortResult.value : "[Snort unavailable]",
    auditdEvents: auditdResult.status === "fulfilled" ? auditdResult.value : "[auditd unavailable]",
    ubaLogs: ubaResult.status === "fulfilled" ? ubaResult.value : "[UBA logs unavailable]",
    sshAvailable,
    wazuhAvailable,
    errors,
  };
}
