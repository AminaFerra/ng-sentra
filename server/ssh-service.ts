import { Client } from "ssh2";
import { getDb } from "./db";
import { eq, inArray } from "drizzle-orm";
import { systemSettings } from "../drizzle/schema";
import fs from "fs";

interface SSHConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  privateKeyPath?: string;
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
      .where(inArray(systemSettings.key, ["ssh_host", "ssh_port", "ssh_user", "ssh_password", "ssh_private_key_path"]));
    const settings = result;

    const map: Record<string, string> = {};
    settings.forEach((s: any) => { map[s.key] = s.value ?? ""; });

    // Allow key-based auth without password
    if (!map.ssh_host || !map.ssh_user) {
      return null;
    }

    // Must have either password or private key
    const keyPath = map.ssh_private_key_path || process.env.SSH_PRIVATE_KEY_PATH;
    if (!map.ssh_password && !keyPath) {
      return null;
    }

    return {
      host: map.ssh_host,
      port: parseInt(map.ssh_port, 10) || 22,
      user: map.ssh_user,
      password: map.ssh_password,
      privateKeyPath: keyPath,
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

    // Build connection options — prefer key-based auth for AWS EC2
    const connectOpts: any = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      tryKeyboard: true,
      readyTimeout: 30000,
    };
    if (sshConfig.privateKeyPath) {
      try {
        connectOpts.privateKey = fs.readFileSync(sshConfig.privateKeyPath);
      } catch (e: any) {
        console.warn(`[SSH] Failed to read private key at ${sshConfig.privateKeyPath}:`, e.message);
      }
    }
    if (sshConfig.password) {
      connectOpts.password = sshConfig.password;
    }
    conn.connect(connectOpts);
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

    const connectOpts: any = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      tryKeyboard: true,
      readyTimeout: 30000,
    };
    if (sshConfig.privateKeyPath) {
      try {
        connectOpts.privateKey = fs.readFileSync(sshConfig.privateKeyPath);
      } catch (e: any) {
        console.warn(`[SSH] Failed to read private key at ${sshConfig.privateKeyPath}:`, e.message);
      }
    }
    if (sshConfig.password) {
      connectOpts.password = sshConfig.password;
    }
    conn.connect(connectOpts);
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

    const connectOpts: any = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.user,
      tryKeyboard: true,
      readyTimeout: 30000,
    };
    if (sshConfig.privateKeyPath) {
      try {
        connectOpts.privateKey = fs.readFileSync(sshConfig.privateKeyPath);
      } catch (e: any) {
        console.warn(`[SSH] Failed to read private key at ${sshConfig.privateKeyPath}:`, e.message);
      }
    }
    if (sshConfig.password) {
      connectOpts.password = sshConfig.password;
    }
    conn.connect(connectOpts);
  });
}
