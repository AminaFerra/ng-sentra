import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  console.log("Clearing security_scans...");
  await db.execute(sql`DELETE FROM security_scans`);

  console.log("Clearing emulation_tests...");
  await db.execute(sql`DELETE FROM emulation_tests`);

  console.log("Clearing pentest_findings...");
  await db.execute(sql`DELETE FROM pentest_findings`);

  console.log("✅ All security assessment data cleared!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
