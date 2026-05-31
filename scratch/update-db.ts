import { drizzle } from "drizzle-orm/mysql2";
import { wazuhSettings, systemSettings, components } from "../drizzle/schema.js";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

async function run() {
  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("Updating wazuhSettings...");
  await db.update(wazuhSettings).set({ elasticsearchUrl: "https://172.31.41.10:9200" });
  
  console.log("Updating systemSettings...");
  await db.update(systemSettings).set({ value: "https://172.31.41.10:9200" }).where(eq(systemSettings.key, "wazuh_elasticsearch_url"));
  await db.update(systemSettings).set({ value: "http://172.31.25.6:5000" }).where(eq(systemSettings.key, "local_ai_brain_url"));
  await db.update(systemSettings).set({ value: "http://172.31.30.123:5678" }).where(eq(systemSettings.key, "n8n_base_url"));
  await db.update(systemSettings).set({ value: "172.31.41.10" }).where(eq(systemSettings.key, "soar_ssh_host"));
  
  console.log("Updating components...");
  await db.update(components).set({ url: "https://172.31.41.10" }).where(eq(components.slug, "wazuh"));
  await db.update(components).set({ url: "https://172.31.13.157" }).where(eq(components.slug, "tpot"));
  await db.update(components).set({ url: "http://172.31.30.123" }).where(eq(components.slug, "n8n-soar"));

  console.log("Database successfully updated.");
  process.exit(0);
}

run().catch(console.error);
