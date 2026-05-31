/**
 * NG-SENTRA Seed Script v2.0 (AWS Distributed)
 * Seeds 7 components (incl. Digital Forensics Workstation), 5 SOAR approaches, 4 AI models.
 * Each service runs on a separate EC2 instance with its own private IP.
 * Run: npx tsx server/seed.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import { components, soarApproaches, aiModels } from "../drizzle/schema";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// AWS VPC Private IPs — each service on a separate EC2 instance
const WAZUH_HOST  = process.env.WAZUH_HOST  || "172.31.41.10";
const TPOT_HOST   = process.env.TPOT_HOST   || "172.31.13.157";
const N8N_HOST    = process.env.N8N_HOST     || "172.31.30.123";
const AI_HOST     = process.env.AI_HOST      || "172.31.25.6";
const DFWS_HOST   = process.env.DFWS_HOST    || "172.31.36.190";
const THREAT_HOST = process.env.THREAT_HOST  || "172.31.27.162";

async function seed() {
  const db = drizzle(process.env.DATABASE_URL!);

  // ── Components ──────────────────────────────────────────────────────────────
  const componentData = [
    {
      name: "Wazuh",
      slug: "wazuh",
      description: "Core SIEM/XDR — manager, indexer, and Kibana-based dashboard. Central alert hub receiving logs from Snort, UFW, Filebeat, and n8n.",
      icon: "Shield",
      category: "SIEM",
      url: `https://${WAZUH_HOST}`,
      port: 443,
      accessType: "iframe" as const,
      adminOnly: false,
      enabled: true,
    },
    {
      name: "Snort",
      slug: "snort",
      description: "Network IDS running inside the Wazuh Docker stack. Managed via configuration files and rules — no web UI. Logs forwarded to Wazuh via snort_to_wazuh.py.",
      icon: "Eye",
      category: "IDS/IPS",
      url: null,
      port: null,
      accessType: "config-file" as const,
      adminOnly: true,
      enabled: true,
    },
    {
      name: "UFW",
      slug: "ufw",
      description: "Host-level firewall on the VirtualBox machine. Managed via configuration files and CLI rules — no web UI. IPs blocked automatically by n8n IR workflows via SSH.",
      icon: "Lock",
      category: "Firewall",
      url: null,
      port: null,
      accessType: "config-file" as const,
      adminOnly: true,
      enabled: true,
    },
    {
      name: "T-Pot",
      slug: "tpot",
      description: "Multi-honeypot platform (Cowrie, Dionaea, etc.) installed at /opt/tpotce. Includes Attack Map, Kibana, and SpiderFoot dashboards.",
      icon: "Bug",
      category: "Honeypot",
      url: `https://${TPOT_HOST}:64297`,
      port: 64297,
      accessType: "iframe" as const,
      adminOnly: false,
      enabled: true,
    },
    {
      name: "Filebeat",
      slug: "filebeat",
      description: "Dedicated log shipper (v7.10.2 OSS) at /opt/filebeat-honeypot. Routes T-Pot honeypot logs to the Wazuh Indexer. Runs as a background service — managed via configuration files.",
      icon: "FileText",
      category: "Log Shipper",
      url: null,
      port: 5044,
      accessType: "config-file" as const,
      adminOnly: true,
      enabled: true,
    },
    {
      name: "n8n SOAR",
      slug: "n8n-soar",
      description: "SOAR automation engine at /opt/n8n-soc. Runs 5 IR workflows: IP, Behavior, File, URL real-time, and URL scheduled.",
      icon: "Zap",
      category: "SOAR",
      url: `http://${N8N_HOST}:5678`,
      port: 5678,
      accessType: "iframe" as const,
      adminOnly: false,
      enabled: true,
    },
    {
      name: "Digital Forensics Workstation",
      slug: "digital-forensics",
      description: "Forensic analysis workstation for disk imaging, memory analysis, and artifact examination. Accessed via terminal/SSH — no web UI. Tools include Autopsy, Volatility, and custom forensic scripts.",
      icon: "Search",
      category: "Forensics",
      url: null,
      port: null,
      accessType: "terminal" as const,
      adminOnly: false,
      enabled: true,
    },
  ];

  for (const comp of componentData) {
    await db.insert(components).values(comp).onDuplicateKeyUpdate({
      set: {
        description: comp.description,
        url: comp.url,
        port: comp.port,
        accessType: comp.accessType,
        adminOnly: comp.adminOnly,
        enabled: comp.enabled,
      },
    });
  }
  console.log("✅ Components seeded (7 components):", componentData.map(c => c.name).join(", "));

  // ── SOAR Approaches ─────────────────────────────────────────────────────────
  // Behavior webhookUrl is null — configurable via Admin → Component Config
  const soarData = [
    {
      name: "IP",
      slug: "ip",
      description: "Webhook-triggered IP incident response. Queries Wazuh alerts, runs Local AI Brain for threat scoring, executes UFW block via SSH (incident_response.py), and sends HTML email report via Gemini AI.",
      webhookUrl: `http://${N8N_HOST}:5678/webhook/wazuh-realtime`,
      enabled: true,
    },
    {
      name: "Behavior",
      slug: "behavior",
      description: "Schedule-based behavioral analysis. Polls Wazuh every few seconds, enriches with UBA model (historical IP profiles + previous UFW actions), runs IR decision via SSH, and escalates to Gemini AI for report generation. n8n webhook IP is configurable via Admin settings.",
      webhookUrl: null, // Configurable — set via Admin UI
      enabled: true,
    },
    {
      name: "File",
      slug: "file",
      description: "Webhook-triggered file analysis. Receives download events from Windows clients, scans with VirusTotal + Local AI Brain, dynamically deletes malicious files, and sends email alert with Gemini AI analysis.",
      webhookUrl: `http://${N8N_HOST}:5678/webhook/downloaded-file`,
      enabled: true,
    },
    {
      name: "URL real-time",
      slug: "url-realtime",
      description: "Real-time URL proxy scan. Browser/proxy sends POST to n8n webhook; checks VirusTotal + Local AI Brain; returns block/allow JSON response instantly. Pushes alert to Wazuh and sends email if malicious.",
      webhookUrl: `http://${N8N_HOST}:5678/webhook/url-scan`,
      enabled: true,
    },
    {
      name: "URL scheduled",
      slug: "url-scheduled",
      description: "Scheduled DNS log analysis (every 1 minute). Queries Wazuh Elasticsearch for DNS/HTTP hostnames from the last 6 hours, checks each domain against VirusTotal + Local AI Brain, and sends email reports for malicious findings.",
      webhookUrl: null, // Schedule-triggered — no external webhook
      enabled: true,
    },
  ];

  for (const approach of soarData) {
    await db.insert(soarApproaches).values(approach).onDuplicateKeyUpdate({
      set: {
        description: approach.description,
        webhookUrl: approach.webhookUrl,
        enabled: approach.enabled,
      },
    });
  }
  console.log("✅ SOAR approaches seeded:", soarData.map(a => a.name).join(", "));

  // ── AI Models ───────────────────────────────────────────────────────────────
  const aiModelData = [
    {
      name: "Anomaly Detection",
      slug: "anomaly-detection",
      description: "Local AI Brain integrated in n8n IP/Behavior workflows. Uses Isolation Forest + behavioral baselines to score threat level (HIGH/MEDIUM/LOW) with confidence % and key indicators.",
      endpointUrl: `http://${AI_HOST}:5000/analyze`,
      status: "unknown" as const,
    },
    {
      name: "Alert Classification",
      slug: "alert-classification",
      description: "Gemini 2.5 Flash AI integrated in n8n workflows. Generates professional HTML incident reports by synthesizing VirusTotal external data with Local AI internal scores. Detects zero-day vs known threats.",
      endpointUrl: "https://generativelanguage.googleapis.com",
      status: "unknown" as const,
    },
    {
      name: "UBA",
      slug: "uba",
      description: "User Behavior Analytics integrated in n8n Behavior workflow. Queries UBA service for historical IP profiles and previous UFW block actions to enrich behavioral incident response decisions.",
      endpointUrl: `http://${AI_HOST}:5000/uba`,
      status: "unknown" as const,
    },
    {
      name: "Local Threat Intelligence",
      slug: "local-ti",
      description: "Local AI Brain REST API (Waitress server). Central AI hub called by IP, File, URL real-time, and URL scheduled workflows. Returns threat_level, confidence, reason, feature_highlights, and cross_flow_analysis.",
      endpointUrl: `http://${AI_HOST}:5000`,
      status: "unknown" as const,
    },
  ];

  for (const model of aiModelData) {
    await db.insert(aiModels).values(model).onDuplicateKeyUpdate({
      set: {
        description: model.description,
        endpointUrl: model.endpointUrl,
      },
    });
  }
  console.log("✅ AI models seeded:", aiModelData.map(m => m.name).join(", "));

  console.log("\n🎯 Seed complete — NG-SENTRA v2.0 configured for AWS distributed architecture");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
