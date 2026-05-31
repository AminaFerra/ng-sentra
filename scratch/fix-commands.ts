import { drizzle } from 'drizzle-orm/mysql2';
import { components } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const db = drizzle(process.env.DATABASE_URL!);
  
  console.log("Updating filebeat command...");
  await db.update(components)
    .set({ customCommand: "sudo docker exec -it filebeat-snort /bin/bash" })
    .where(eq(components.slug, "filebeat"));

  console.log("Updating digital-forensics command...");
  await db.update(components)
    .set({ customCommand: "ssh -i /home/ubuntu/.ssh/ng-soc-key -o StrictHostKeyChecking=no ubuntu@172.31.36.190" })
    .where(eq(components.slug, "digital-forensics"));

  console.log("Database successfully updated.");
  process.exit(0);
}

run().catch(console.error);
