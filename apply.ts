import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`soar_telemetry\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`playbook\` varchar(128) NOT NULL,
        \`actionTaken\` varchar(256) NOT NULL,
        \`executionId\` varchar(64),
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`soar_telemetry_id\` PRIMARY KEY(\`id\`)
    );
  `);

  try {
    await db.execute(sql`ALTER TABLE \`soar_telemetry\` ADD COLUMN \`details\` text;`);
  } catch (e: any) {
    // Ignore if column already exists
    if (!e.message.includes("Duplicate column name")) {
      console.error(e);
    }
  }
  
  console.log("Migration successful!");
  process.exit(0);
}

run();
