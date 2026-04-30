import { Client } from "ssh2";
import { getDb } from "./db";
import { eq, inArray } from "drizzle-orm";
import { systemSettings } from "../drizzle/schema";

interface SSHConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

/**
 * Get SSH credentials from system settings
 */
export async function getSSHConfig(): Promise<SSHConfig | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, ["ssh_host", "ssh_port", "ssh_user", "ssh_password"]));
    const settings = result;

    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value ?? ""; });

    if (!map.ssh_host || !map.ssh_user || !map.ssh_password) {
      return null;
    }

    return {
      host: map.ssh_host,
      port: parseInt(map.ssh_port, 10) || 22,
      user: map.ssh_user,
      password: map.ssh_password,
    };
  } catch (error) {
    console.error("[SSH Service] Failed to get SSH config:", error);
    return null;
  }
}

/**
 * Read a file from the remote server via SSH
 */
export async function readFileViaSsh(filePath: string): Promise<string | null> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    throw new Error("SSH credentials not configured");
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.exec(`cat "${filePath}"`, (err: Error | undefined, stream: any) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        let data = "";
        stream.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });

        stream.on("close", () => {
          conn.end();
          resolve(data);
        });

        stream.on("error", (err: Error) => {
          conn.end();
          reject(err);
        });
      });
    });

    conn.on("error", (err: Error) => {
      reject(err);
    });

    conn.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
      finish([sshConfig.password]);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 30000,
    });
  });
}

/**
 * Write a file to the remote server via SSH
 */
export async function writeFileViaSsh(filePath: string, content: string): Promise<void> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    throw new Error("SSH credentials not configured");
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.exec(`tee "${filePath}" > /dev/null`, (err: Error | undefined, stream: any) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }

        stream.write(content);
        stream.end();

        stream.on("close", () => {
          conn.end();
          resolve();
        });

        stream.on("error", (err: Error) => {
          conn.end();
          reject(err);
        });
      });
    });

    conn.on("error", (err: Error) => {
      reject(err);
    });

    conn.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
      finish([sshConfig.password]);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 30000,
    });
  });
}

/**
 * Test SSH connection
 */
export async function testSSHConnection(): Promise<boolean> {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    return false;
  }

  return new Promise((resolve) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(false);
    }, 5000);

    conn.on("ready", () => {
      clearTimeout(timeout);
      conn.end();
      resolve(true);
    });

    conn.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });

    conn.on("keyboard-interactive", (name, instructions, instructionsLang, prompts, finish) => {
      finish([sshConfig.password]);
    });

    conn.connect({
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      password: sshConfig.password,
      tryKeyboard: true,
      readyTimeout: 30000,
    });
  });
}
