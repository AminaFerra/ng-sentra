/**
 * Quick script to insert SSH settings into the database.
 * Run: node setup-ssh-settings.mjs
 */
import { createPool } from 'mysql2/promise';
import { readFileSync } from 'fs';

// Read DATABASE_URL from .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) { console.error('DATABASE_URL not found in .env.local'); process.exit(1); }

const dbUrl = new URL(match[1]);
const pool = createPool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: true },
});

const settings = [
  { key: 'ssh_host', value: '10.211.78.229', label: 'SSH Host', description: 'VirtualBox host IP for SSH health checks' },
  { key: 'ssh_port', value: '2222', label: 'SSH Port', description: 'SSH port (2222 for VirtualBox port forwarding)' },
  { key: 'ssh_user', value: 'ziad', label: 'SSH User', description: 'SSH username for VirtualBox host' },
  { key: 'ssh_password', value: '', label: 'SSH Password', description: 'SSH password for VirtualBox host (set this!)' },
];

for (const s of settings) {
  await pool.execute(
    `INSERT INTO system_settings (\`key\`, value, label, description, updatedAt)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description)`,
    [s.key, s.value, s.label, s.description]
  );
  console.log(`  ✅ ${s.key} = ${s.value || '(empty - set via Admin UI)'}`);
}

console.log('\n🔑 Now set ssh_password in Admin → System Settings (or edit this script and re-run)');
await pool.end();
