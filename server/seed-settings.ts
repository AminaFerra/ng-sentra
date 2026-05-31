/**
 * Seed system settings with default configurable values.
 * Run with: npx tsx server/seed-settings.ts
 */
import { drizzle } from "drizzle-orm/mysql2";
import { systemSettings } from "../drizzle/schema";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const db = drizzle(process.env.DATABASE_URL!);

const defaults = [
  {
    key: "n8n_base_url",
    value: "http://172.31.30.123:5678",
    label: "n8n Base URL",
    description: "Base URL of your n8n SOAR instance (e.g. http://172.31.30.123:5678)",
  },
  {
    key: "wazuh_elasticsearch_url",
    value: "https://172.31.41.10:9200",
    label: "Wazuh Elasticsearch URL",
    description: "Elasticsearch endpoint used by Wazuh for alert queries",
  },
  {
    key: "local_ai_brain_url",
    value: "http://172.31.25.6:5000",
    label: "Local AI Brain URL",
    description: "Internal REST API endpoint for the Local AI Brain / UBA service (Waitress)",
  },
  {
    key: "virustotal_api_key",
    value: "",
    label: "VirusTotal API Key",
    description: "API key used by n8n URL real-time IR workflow for VirusTotal lookups",
  },
  {
    key: "abuseipdb_api_key",
    value: "",
    label: "AbuseIPDB API Key",
    description: "API key used by n8n IP IR workflow for AbuseIPDB reputation checks",
  },
  {
    key: "gemini_api_key",
    value: "",
    label: "Google Gemini API Key",
    description: "API key for Google Gemini 2.5 Flash used in Alert Classification workflow",
  },
  {
    key: "soar_ssh_host",
    value: "172.31.41.10",
    label: "SOAR SSH Host",
    description: "SSH host IP for executing incident_response.py commands (IP & Behavior IR)",
  },
  {
    key: "soar_ssh_user",
    value: "ubuntu",
    label: "SOAR SSH User",
    description: "SSH username for connecting to the SOAR host",
  },
  {
    key: "ssh_port",
    value: "22",
    label: "SSH Port",
    description: "SSH port (default: 22 for AWS EC2)",
  },
  {
    key: "ssh_private_key_path",
    value: "/home/ubuntu/.ssh/ng-soc-key",
    label: "SSH Private Key Path",
    description: "Path to the SSH private key file on the Web Server for key-based auth (AWS EC2)",
  },
  {
    key: "notification_email",
    value: "",
    label: "Notification Email",
    description: "Email address used for n8n alert notification emails",
  },
];

async function seedSettings() {
  console.log("Seeding system settings...");
  for (const s of defaults) {
    await db.insert(systemSettings)
      .values(s)
      .onDuplicateKeyUpdate({ set: { label: s.label, description: s.description } });
    console.log(`  ✓ ${s.key}`);
  }
  console.log("Done.");
  process.exit(0);
}

seedSettings().catch(e => { console.error(e); process.exit(1); });
