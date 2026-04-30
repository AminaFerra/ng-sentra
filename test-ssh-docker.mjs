import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { createPool } from 'mysql2/promise';

async function testSSH() {
  // Get SSH settings from DB
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

  const [rows] = await pool.execute('SELECT `key`, value FROM system_settings WHERE `key` IN ("ssh_host", "ssh_port", "ssh_user", "ssh_password")');
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  await pool.end();

  const containerName = "ng_soc_ai_classifier_brain";
  const cmd = `echo '${map.ssh_password}' | sudo -S docker inspect -f '{{.State.Status}}' ${containerName} 2>&1 && echo '---LOGS---' && echo '${map.ssh_password}' | sudo -S docker logs --tail 5 ${containerName} 2>&1 || true`;
  
  console.log("Connecting to:", map.ssh_host, "Port:", map.ssh_port, "User:", map.ssh_user);
  console.log("Command:", cmd);

  const conn = new Client();
  conn.on('ready', () => {
    console.log("SSH Ready! Executing...");
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      
      let data = "";
      stream.on('data', d => { data += d.toString(); });
      stream.stderr.on('data', d => { data += d.toString(); });
      
      stream.on('close', () => {
        console.log("\n--- RAW OUTPUT ---");
        console.log(data);
        console.log("------------------\n");
        
        const cleanData = data.replace(/\[sudo\] password for [^:]+:\s*/g, "");
        const lines = cleanData.trim().split("\n");
        console.log("Filtered Lines:", lines);
        
        const statusLine = lines[0]?.trim().toLowerCase() ?? "";
        console.log("Parsed Status:", statusLine);
        console.log("Is Active?", statusLine === "running");
        
        conn.end();
      });
    });
  });
  
  conn.on('error', (err) => console.error("SSH Error:", err));
  
  conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
    console.log("Keyboard-interactive prompts:", prompts);
    finish([map.ssh_password]);
  });
  
  conn.connect({
    host: map.ssh_host,
    port: parseInt(map.ssh_port),
    username: map.ssh_user,
    password: map.ssh_password,
    tryKeyboard: true,
    readyTimeout: 20000,
  });
}

testSSH().catch(console.error);
