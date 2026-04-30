import { readFileSync } from 'fs';
import { createPool } from 'mysql2/promise';

async function main() {
  const envContent = readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  const dbUrl = new URL(match[1]);
  
  const pool = createPool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: true },
  });

  await pool.execute('UPDATE system_settings SET value = ? WHERE `key` = ?', ['22', 'ssh_port']);
  console.log('Updated ssh_port to 22');
  
  await pool.end();
}

main().catch(console.error);
