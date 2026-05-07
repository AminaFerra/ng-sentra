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
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`security_scans\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`target\` varchar(256) NOT NULL,
        \`scannerType\` enum('nmap','zap','openvas','custom') NOT NULL DEFAULT 'nmap',
        \`status\` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
        \`resultSummary\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`security_scans_id\` PRIMARY KEY(\`id\`)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`emulation_tests\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(256) NOT NULL,
        \`techniqueId\` varchar(64),
        \`status\` enum('planned','executed','detected','missed') NOT NULL DEFAULT 'planned',
        \`notes\` text,
        \`executedAt\` timestamp,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`emulation_tests_id\` PRIMARY KEY(\`id\`)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`pentest_findings\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`title\` varchar(256) NOT NULL,
        \`severity\` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
        \`status\` enum('open','in_progress','resolved','accepted_risk') NOT NULL DEFAULT 'open',
        \`description\` text,
        \`remediation\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`pentest_findings_id\` PRIMARY KEY(\`id\`)
    );
  `);

  try {
    await db.execute(sql`ALTER TABLE \`security_scans\` MODIFY COLUMN \`scannerType\` enum('nmap','zap','openvas','custom','full_suite') NOT NULL DEFAULT 'nmap';`);
  } catch (e) {
    console.warn("Failed to alter security_scans:", e);
  }

  console.log("Migration successful!");
  process.exit(0);
}

run();
