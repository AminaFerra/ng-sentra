import { drizzle } from 'drizzle-orm/mysql2';
import { components } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const db = drizzle(process.env.DATABASE_URL!);
  const res = await db.select().from(components).where(eq(components.slug, 'snort'));
  console.log("Component config:", res);
  process.exit(0);
}
run();
