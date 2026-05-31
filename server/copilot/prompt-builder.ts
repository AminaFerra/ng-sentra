import type { IntelligenceSnapshot } from "./data-fetcher";

/**
 * Build the security-focused LLM system prompt from a live intelligence snapshot.
 * The prompt is assembled such that the LLM has full context of the SOC environment
 * but is explicitly instructed not to hallucinate details absent from the data.
 */
export function buildSystemPrompt(snapshot: IntelligenceSnapshot): string {
  const lines: string[] = [];

  const push = (...args: string[]) => lines.push(...args);

  push(
    "You are NG-SENTRA Copilot, an expert Security Operations Center (SOC) analyst AI embedded in the NG-SENTRA enterprise dashboard.",
    "You analyze REAL, LIVE data from this SOC infrastructure. You NEVER invent or hallucinate IP addresses, hostnames, alert IDs, or any security indicators not present in the data below.",
    "You give concise, technical, actionable answers in markdown. Use tables when presenting multi-row data. Use severity emoji: 🔴 Critical/Emergency, 🟠 High, 🟡 Medium, 🟢 Low.",
    "",
    `== SNAPSHOT TIMESTAMP ==`,
    snapshot.fetchedAt,
    "",
    `== INFRASTRUCTURE ==`,
    `Target Infrastructure: AWS EC2 Distributed SOC (Wazuh: 172.31.41.10, n8n: 172.31.30.123, AI: 172.31.25.6, T-Pot: 172.31.13.157)`,
    `SSH Available: ${snapshot.sshAvailable ? "YES" : "NO — SSH data unavailable for this query"}`,
    `Wazuh/OpenSearch Available: ${snapshot.wazuhAvailable ? "YES" : "NO — alert data unavailable for this query"}`,
    ""
  );

  // ─── Docker Containers ────────────────────────────────────────────────────
  if (snapshot.containers.length > 0) {
    push(`== DOCKER CONTAINERS (${snapshot.containers.length} total) ==`);
    push("| Name | Status | Image | Running |");
    push("|---|---|---|---|");
    for (const c of snapshot.containers) {
      push(`| ${c.name} | ${c.status} | ${c.image} | ${c.running ? "✅" : "❌"} |`);
    }
    push("");

    if (snapshot.failedContainers.length > 0) {
      push(`⚠️ STOPPED/FAILED CONTAINERS (${snapshot.failedContainers.length}):`);
      for (const c of snapshot.failedContainers) {
        push(`  - ${c.name}: ${c.status}`);
      }
      push("");
    }
  } else {
    push("== DOCKER CONTAINERS == [Unavailable — SSH connection failed]", "");
  }

  // ─── Wazuh Alerts ─────────────────────────────────────────────────────────
  if (snapshot.wazuhAlerts.length > 0) {
    const highSev = snapshot.wazuhAlerts.filter((a) => a.severity >= 10).length;
    const medSev = snapshot.wazuhAlerts.filter((a) => a.severity >= 6 && a.severity < 10).length;
    const lowSev = snapshot.wazuhAlerts.filter((a) => a.severity < 6).length;

    push(`== WAZUH SECURITY ALERTS (last 7 days, ${snapshot.wazuhAlerts.length} alerts) ==`);
    push(`Summary: 🔴 ${highSev} critical/emergency | 🟠 ${medSev} high/medium | 🟢 ${lowSev} low`);
    push("");
    push("| Timestamp | Severity | Rule ID | Description | Agent | Source IP |");
    push("|---|---|---|---|---|---|");

    // Show up to 150 alerts in the table (context budget)
    const alertsToShow = snapshot.wazuhAlerts.slice(0, 150);
    for (const a of alertsToShow) {
      const sevEmoji = a.severity >= 10 ? "🔴" : a.severity >= 6 ? "🟠" : "🟡";
      const time = new Date(a.timestamp).toISOString().replace("T", " ").slice(0, 19);
      const desc = a.rule_description.replace(/\|/g, "/").slice(0, 80);
      push(`| ${time} | ${sevEmoji} ${a.severity} | ${a.rule_id} | ${desc} | ${a.agent_name} | ${a.source_ip ?? "—"} |`);
    }

    if (snapshot.wazuhAlerts.length > 150) {
      push(`\n... and ${snapshot.wazuhAlerts.length - 150} more alerts (showing newest 150 only)`);
    }
    push("");
  } else {
    push("== WAZUH ALERTS == [None found in last 7 days, or Wazuh is unreachable]", "");
  }

  // ─── Snort IDS Alerts ─────────────────────────────────────────────────────
  push("== SNORT IDS ALERTS (latest 200 lines) ==");
  push(snapshot.snortAlerts.slice(0, 3000) || "[No Snort alert data]");
  push("");

  // ─── Container Logs ───────────────────────────────────────────────────────
  if (snapshot.containerLogs.length > 0) {
    push("== CRITICAL CONTAINER LOGS (last 80 lines each, 7-day window) ==");
    for (const cl of snapshot.containerLogs) {
      push(`--- ${cl.container} ---`);
      push(cl.logs.slice(0, 2500) || "[empty]");
      push("");
    }
  }

  // ─── Systemd Services ─────────────────────────────────────────────────────
  if (snapshot.runningServices.length > 0) {
    push(`== SYSTEMD SERVICES (${snapshot.runningServices.length} running) ==`);
    const socServices = snapshot.runningServices.filter(
      (s) => s.unit.includes("ngsentra") || s.unit.includes("docker") || s.unit.includes("ssh")
    );
    push("Key SOC services:");
    for (const s of socServices) {
      push(`  ✅ ${s.unit} — ${s.description}`);
    }
    push("");
  }

  if (snapshot.failedServices.length > 0) {
    push(`⚠️ FAILED SYSTEMD SERVICES (${snapshot.failedServices.length}):`);
    for (const s of snapshot.failedServices) {
      push(`  ❌ ${s.unit} — ${s.description}`);
    }
    push("");
  }

  // ─── Auditd Events ────────────────────────────────────────────────────────
  push("== AUDITD EVENTS (today) ==");
  push(snapshot.auditdEvents.slice(0, 2000) || "[No auditd data]");
  push("");

  // ─── UBA Engine Logs ──────────────────────────────────────────────────────
  push("== UBA ENGINE LOGS (last 7 days, 60 lines) ==");
  push(snapshot.ubaLogs.slice(0, 2000) || "[No UBA logs]");
  push("");

  // ─── Fetch errors ─────────────────────────────────────────────────────────
  if (snapshot.errors.length > 0) {
    push("== DATA COLLECTION WARNINGS ==");
    for (const e of snapshot.errors) push(`  ⚠️ ${e}`);
    push("");
  }

  // ─── Analyst instructions ─────────────────────────────────────────────────
  push(
    "== ANALYST INSTRUCTIONS ==",
    "1. Base ALL answers strictly on the data above. Do NOT invent IPs, hostnames, rule IDs, or events.",
    "2. When identifying threats, cite specific alert IDs, rule descriptions, and timestamps from the data.",
    "3. Provide severity ratings, MITRE ATT&CK technique IDs when applicable, and actionable remediation steps.",
    "4. When data is insufficient to answer definitively, say so and suggest what additional data would help.",
    "5. Format responses in clean markdown with tables where helpful.",
    "6. Keep responses concise. Lead with the most critical finding first.",
    "7. You are integrated into a live SOC dashboard. Treat every query as coming from a tier-2/3 analyst."
  );

  return lines.join("\n");
}

/**
 * Build a brief text summary of the snapshot for storing in the DB audit trail.
 */
export function buildSnapshotSummary(snapshot: IntelligenceSnapshot): string {
  return [
    `Fetched: ${snapshot.fetchedAt}`,
    `Containers: ${snapshot.containers.length} (${snapshot.failedContainers.length} stopped)`,
    `Wazuh alerts (7d): ${snapshot.wazuhAlerts.length} (${snapshot.criticalAlertCount} critical)`,
    `Failed services: ${snapshot.failedServices.length}`,
    `SSH: ${snapshot.sshAvailable ? "OK" : "UNAVAILABLE"}`,
    `Wazuh: ${snapshot.wazuhAvailable ? "OK" : "UNAVAILABLE"}`,
  ].join(" | ");
}
