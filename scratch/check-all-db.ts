import { drizzle } from 'drizzle-orm/mysql2';
import { components } from '../drizzle/schema.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const db = drizzle(process.env.DATABASE_URL!);
  const res = await db.select().from(components);
  console.log(res.map(c => `${c.slug}: ${c.customCommand}`).join('\n'));
  process.exit(0);
}
run();
