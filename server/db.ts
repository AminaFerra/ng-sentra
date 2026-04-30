import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { PoolOptions } from "mysql2";
import { AiModel, AuditLog, Component, InsertAiModel, InsertAuditLog, InsertComponent, InsertSoarApproach, InsertUser, SoarApproach, SystemSetting, User, SshCredential, InsertSshCredential, WazuhSetting, InsertWazuhSetting, aiModels, auditLogs, components, soarApproaches, systemSettings, users, sshCredentials, wazuhSettings, soarTelemetry, InsertSoarTelemetry, SoarTelemetry } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _dbInitAttempted = false;

function getBooleanFlag(value: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parseSslFromUrl(url: URL) {
  const raw = url.searchParams.get("ssl");
  if (!raw) return undefined;

  // Supports ssl=true/false and JSON object value.
  const bool = getBooleanFlag(raw);
  if (bool !== undefined) {
    return bool ? { rejectUnauthorized: true } : undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Some URLs encode JSON with escaped quotes like {\"rejectUnauthorized\":true}.
    try {
      const normalized = raw.replace(/\\"/g, '"');
      const parsed = JSON.parse(normalized) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore invalid ssl JSON and continue without SSL override.
    }
  }

  return undefined;
}

function toPoolOptions(databaseUrl: string): PoolOptions {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "");
  const port = url.port ? Number(url.port) : 3306;
  const ssl = parseSslFromUrl(url);

  return {
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // TiDB Cloud requires secure transport.
    ssl: ssl ?? { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
  };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle({ connection: toPoolOptions(process.env.DATABASE_URL) });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'Admin' as any; updateSet.role = 'Admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(id: number, role: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

// ─── Components ──────────────────────────────────────────────────────────────

export async function getAllComponents(): Promise<Component[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(components).orderBy(components.id);
}

export async function getComponentBySlug(slug: string): Promise<Component | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(components).where(eq(components.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateComponent(id: number, data: Partial<InsertComponent>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(components).set({ ...data, updatedAt: new Date() }).where(eq(components.id, id));
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export async function createAuditLog(log: InsertAuditLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}

export async function getAuditLogs(opts?: {
  userId?: number;
  action?: string;
  userName?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };

  const conditions = [];
  if (opts?.userId) conditions.push(eq(auditLogs.userId, opts.userId));
  if (opts?.action) conditions.push(like(auditLogs.action, `%${opts.action}%`));
  if (opts?.userName) conditions.push(like(auditLogs.userName, `%${opts.userName}%`));
  if (opts?.from) conditions.push(gte(auditLogs.createdAt, opts.from));
  if (opts?.to) conditions.push(lte(auditLogs.createdAt, opts.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const [logs, countResult] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where),
  ]);

  return { logs, total: Number(countResult[0]?.count ?? 0) };
}

export async function getRecentAuditLogs(limit = 10): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── SOAR Approaches ─────────────────────────────────────────────────────────

export async function getAllSoarApproaches(): Promise<SoarApproach[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soarApproaches).orderBy(soarApproaches.id);
}

export async function updateSoarApproach(id: number, data: Partial<InsertSoarApproach>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(soarApproaches).set({ ...data, updatedAt: new Date() }).where(eq(soarApproaches.id, id));
}

export async function triggerSoarApproach(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(soarApproaches).set({
    lastTriggered: new Date(),
    triggerCount: sql`${soarApproaches.triggerCount} + 1`,
    updatedAt: new Date(),
  }).where(eq(soarApproaches.id, id));
}

// ─── AI Models ───────────────────────────────────────────────────────────────

export async function getAllAiModels(): Promise<AiModel[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiModels).orderBy(aiModels.id);
}

export async function updateAiModel(id: number, data: Partial<InsertAiModel>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aiModels).set({ ...data, updatedAt: new Date() }).where(eq(aiModels.id, id));
}

export async function getAiModelBySlug(slug: string): Promise<AiModel | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiModels).where(eq(aiModels.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── System Settings ────────────────────────────────────────────────────────────
export async function getAllSettings(): Promise<SystemSetting[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.key);
}

export async function getSettingByKey(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result.length > 0 ? (result[0].value ?? null) : null;
}

export async function upsertSetting(key: string, value: string, label?: string, description?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemSettings)
    .values({ key, value, label: label ?? key, description: description ?? null })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

// ─── SSH Credentials ─────────────────────────────────────────────────────────

export async function getSshCredentialsByComponentId(componentId: number): Promise<SshCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sshCredentials).where(eq(sshCredentials.componentId, componentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllSshCredentials(): Promise<SshCredential[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sshCredentials).orderBy(sshCredentials.componentId);
}

export async function upsertSshCredential(componentId: number, data: Omit<InsertSshCredential, 'componentId'>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getSshCredentialsByComponentId(componentId);
  if (existing) {
    await db.update(sshCredentials).set({ ...data, updatedAt: new Date() }).where(eq(sshCredentials.componentId, componentId));
  } else {
    await db.insert(sshCredentials).values({ componentId, ...data, createdAt: new Date(), updatedAt: new Date() } as InsertSshCredential);
  }
}

export async function deleteSshCredential(componentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(sshCredentials).where(eq(sshCredentials.componentId, componentId));
}

// ─── Wazuh Settings ──────────────────────────────────────────────────────────

export async function getWazuhSettings(): Promise<WazuhSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wazuhSettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWazuhSettings(data: Partial<InsertWazuhSetting>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getWazuhSettings();
  if (existing) {
    await db.update(wazuhSettings).set({ ...data, updatedAt: new Date() }).where(eq(wazuhSettings.id, existing.id));
  } else {
    await db.insert(wazuhSettings).values({ ...data, createdAt: new Date(), updatedAt: new Date() } as InsertWazuhSetting);
  }
}

// ─── SOAR Telemetry ──────────────────────────────────────────────────────────

export async function insertSoarTelemetry(data: any): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(soarTelemetry).values(data);
}

export async function getSoarTelemetryMetrics(): Promise<{ logs: any[] }> {
  const db = await getDb();
  if (!db) return { logs: [] };
  const logs = await db.select().from(soarTelemetry).orderBy(desc(soarTelemetry.createdAt)).limit(1000);
  return { logs };
}

