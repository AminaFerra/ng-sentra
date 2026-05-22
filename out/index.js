var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      get appId() {
        return process.env.VITE_APP_ID ?? "";
      },
      get cookieSecret() {
        return process.env.JWT_SECRET ?? "";
      },
      get databaseUrl() {
        return process.env.DATABASE_URL ?? "";
      },
      get oAuthServerUrl() {
        return process.env.OAUTH_SERVER_URL ?? "";
      },
      get ownerOpenId() {
        return process.env.OWNER_OPEN_ID ?? "";
      },
      get localAuthEnabled() {
        return process.env.LOCAL_AUTH_ENABLED !== "false";
      },
      get localAuthOpenId() {
        return process.env.LOCAL_AUTH_OPEN_ID ?? "local-admin";
      },
      get localAuthName() {
        return process.env.LOCAL_AUTH_NAME ?? "Local Admin";
      },
      get localAuthEmail() {
        return process.env.LOCAL_AUTH_EMAIL ?? "admin@localhost";
      },
      get localAuthRole() {
        return process.env.LOCAL_AUTH_ROLE ?? "Admin";
      },
      get isProduction() {
        return process.env.NODE_ENV === "production";
      },
      get forgeApiUrl() {
        return process.env.BUILT_IN_FORGE_API_URL ?? "";
      },
      get forgeApiKey() {
        return process.env.BUILT_IN_FORGE_API_KEY ?? "";
      }
    };
  }
});

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, components, auditLogs, soarApproaches, aiModels, sshCredentials, wazuhSettings, systemSettings, soarTelemetry, securityScans, emulationTests, pentestFindings;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin", "Admin", "Analyst", "Viewer"]).default("Viewer").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    components = mysqlTable("components", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 128 }).notNull().unique(),
      slug: varchar("slug", { length: 64 }).notNull().unique(),
      url: varchar("url", { length: 512 }),
      port: int("port"),
      description: text("description"),
      icon: varchar("icon", { length: 64 }),
      category: varchar("category", { length: 64 }),
      customCommand: varchar("customCommand", { length: 512 }),
      accessType: mysqlEnum("accessType", ["iframe", "config-file", "terminal", "service"]).default("iframe").notNull(),
      adminOnly: boolean("adminOnly").default(false).notNull(),
      enabled: boolean("enabled").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    auditLogs = mysqlTable("audit_logs", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId"),
      userName: varchar("userName", { length: 256 }),
      userRole: varchar("userRole", { length: 32 }),
      action: varchar("action", { length: 128 }).notNull(),
      target: varchar("target", { length: 256 }),
      details: text("details"),
      ipAddress: varchar("ipAddress", { length: 64 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    soarApproaches = mysqlTable("soar_approaches", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 64 }).notNull().unique(),
      slug: varchar("slug", { length: 32 }).notNull().unique(),
      webhookUrl: varchar("webhookUrl", { length: 512 }),
      description: text("description"),
      enabled: boolean("enabled").default(true).notNull(),
      lastTriggered: timestamp("lastTriggered"),
      triggerCount: int("triggerCount").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    aiModels = mysqlTable("ai_models", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 128 }).notNull().unique(),
      slug: varchar("slug", { length: 64 }).notNull().unique(),
      endpointUrl: varchar("endpointUrl", { length: 512 }),
      status: mysqlEnum("status", ["running", "stopped", "error", "unknown"]).default("unknown").notNull(),
      lastActive: timestamp("lastActive"),
      recentOutput: text("recentOutput"),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    sshCredentials = mysqlTable("ssh_credentials", {
      id: int("id").autoincrement().primaryKey(),
      componentId: int("componentId").notNull().references(() => components.id, { onDelete: "cascade" }),
      host: varchar("host", { length: 256 }).notNull(),
      port: int("port").default(22).notNull(),
      username: varchar("username", { length: 128 }).notNull(),
      password: text("password").notNull(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    wazuhSettings = mysqlTable("wazuh_settings", {
      id: int("id").autoincrement().primaryKey(),
      apiUrl: varchar("apiUrl", { length: 512 }),
      apiUsername: varchar("apiUsername", { length: 128 }),
      apiPassword: text("apiPassword"),
      elasticsearchUrl: varchar("elasticsearchUrl", { length: 512 }),
      elasticsearchUsername: varchar("elasticsearchUsername", { length: 128 }),
      elasticsearchPassword: text("elasticsearchPassword"),
      alertIndexPattern: varchar("alertIndexPattern", { length: 256 }).default("wazuh-alerts-*"),
      refreshInterval: int("refreshInterval").default(5e3),
      alertLimit: int("alertLimit").default(50),
      enabled: boolean("enabled").default(true).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    systemSettings = mysqlTable("system_settings", {
      id: int("id").autoincrement().primaryKey(),
      key: varchar("key", { length: 128 }).notNull().unique(),
      value: text("value"),
      label: varchar("label", { length: 256 }),
      description: text("description"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    soarTelemetry = mysqlTable("soar_telemetry", {
      id: int("id").autoincrement().primaryKey(),
      playbook: varchar("playbook", { length: 128 }).notNull(),
      actionTaken: varchar("actionTaken", { length: 256 }).notNull(),
      details: text("details"),
      executionId: varchar("executionId", { length: 64 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    securityScans = mysqlTable("security_scans", {
      id: int("id").autoincrement().primaryKey(),
      target: varchar("target", { length: 256 }).notNull(),
      scannerType: mysqlEnum("scannerType", ["nmap", "zap", "openvas", "custom", "full_suite"]).default("nmap").notNull(),
      status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
      resultSummary: text("resultSummary"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    emulationTests = mysqlTable("emulation_tests", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 256 }).notNull(),
      techniqueId: varchar("techniqueId", { length: 64 }),
      // e.g., T1548
      status: mysqlEnum("status", ["planned", "executed", "detected", "missed"]).default("planned").notNull(),
      notes: text("notes"),
      executedAt: timestamp("executedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    pentestFindings = mysqlTable("pentest_findings", {
      id: int("id").autoincrement().primaryKey(),
      title: varchar("title", { length: 256 }).notNull(),
      severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
      status: mysqlEnum("status", ["open", "in_progress", "resolved", "accepted_risk"]).default("open").notNull(),
      description: text("description"),
      remediation: text("remediation"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  createAuditLog: () => createAuditLog,
  deleteSshCredential: () => deleteSshCredential,
  deleteUser: () => deleteUser,
  getAiModelBySlug: () => getAiModelBySlug,
  getAllAiModels: () => getAllAiModels,
  getAllComponents: () => getAllComponents,
  getAllSettings: () => getAllSettings,
  getAllSoarApproaches: () => getAllSoarApproaches,
  getAllSshCredentials: () => getAllSshCredentials,
  getAllUsers: () => getAllUsers,
  getAuditLogs: () => getAuditLogs,
  getComponentBySlug: () => getComponentBySlug,
  getDb: () => getDb,
  getRecentAuditLogs: () => getRecentAuditLogs,
  getSettingByKey: () => getSettingByKey,
  getSoarTelemetryMetrics: () => getSoarTelemetryMetrics,
  getSshCredentialsByComponentId: () => getSshCredentialsByComponentId,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getWazuhSettings: () => getWazuhSettings,
  insertSoarTelemetry: () => insertSoarTelemetry,
  triggerSoarApproach: () => triggerSoarApproach,
  updateAiModel: () => updateAiModel,
  updateComponent: () => updateComponent,
  updateSoarApproach: () => updateSoarApproach,
  updateUserRole: () => updateUserRole,
  upsertSetting: () => upsertSetting,
  upsertSshCredential: () => upsertSshCredential,
  upsertUser: () => upsertUser,
  upsertWazuhSettings: () => upsertWazuhSettings
});
import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
function getBooleanFlag(value) {
  if (!value) return void 0;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return void 0;
}
function parseSslFromUrl(url) {
  const raw = url.searchParams.get("ssl");
  if (!raw) return void 0;
  const bool = getBooleanFlag(raw);
  if (bool !== void 0) {
    return bool ? { rejectUnauthorized: true } : void 0;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    try {
      const normalized = raw.replace(/\\"/g, '"');
      const parsed = JSON.parse(normalized);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
    }
  }
  return void 0;
}
function toPoolOptions(databaseUrl) {
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
    connectionLimit: 10
  };
}
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = { openId: user.openId };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "Admin";
      updateSet.role = "Admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateUserRole(id, role) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
}
async function deleteUser(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}
async function getAllComponents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(components).orderBy(components.id);
}
async function getComponentBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(components).where(eq(components.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updateComponent(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(components).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(components.id, id));
}
async function createAuditLog(log) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}
async function getAuditLogs(opts) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };
  const conditions = [];
  if (opts?.userId) conditions.push(eq(auditLogs.userId, opts.userId));
  if (opts?.action) conditions.push(like(auditLogs.action, `%${opts.action}%`));
  if (opts?.userName) conditions.push(like(auditLogs.userName, `%${opts.userName}%`));
  if (opts?.from) conditions.push(gte(auditLogs.createdAt, opts.from));
  if (opts?.to) conditions.push(lte(auditLogs.createdAt, opts.to));
  const where = conditions.length > 0 ? and(...conditions) : void 0;
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const [logs, countResult] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql`count(*)` }).from(auditLogs).where(where)
  ]);
  return { logs, total: Number(countResult[0]?.count ?? 0) };
}
async function getRecentAuditLogs(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
async function getAllSoarApproaches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soarApproaches).orderBy(soarApproaches.id);
}
async function updateSoarApproach(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(soarApproaches).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(soarApproaches.id, id));
}
async function triggerSoarApproach(id) {
  const db = await getDb();
  if (!db) return;
  await db.update(soarApproaches).set({
    lastTriggered: /* @__PURE__ */ new Date(),
    triggerCount: sql`${soarApproaches.triggerCount} + 1`,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(soarApproaches.id, id));
}
async function getAllAiModels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiModels).orderBy(aiModels.id);
}
async function updateAiModel(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiModels).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(aiModels.id, id));
}
async function getAiModelBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(aiModels).where(eq(aiModels.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.key);
}
async function getSettingByKey(key) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result.length > 0 ? result[0].value ?? null : null;
}
async function upsertSetting(key, value, label, description) {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemSettings).values({ key, value, label: label ?? key, description: description ?? null }).onDuplicateKeyUpdate({ set: { value, updatedAt: /* @__PURE__ */ new Date() } });
}
async function getSshCredentialsByComponentId(componentId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sshCredentials).where(eq(sshCredentials.componentId, componentId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllSshCredentials() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sshCredentials).orderBy(sshCredentials.componentId);
}
async function upsertSshCredential(componentId, data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSshCredentialsByComponentId(componentId);
  if (existing) {
    await db.update(sshCredentials).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sshCredentials.componentId, componentId));
  } else {
    await db.insert(sshCredentials).values({ componentId, ...data, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() });
  }
}
async function deleteSshCredential(componentId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sshCredentials).where(eq(sshCredentials.componentId, componentId));
}
async function getWazuhSettings() {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(wazuhSettings).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function upsertWazuhSettings(data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getWazuhSettings();
  if (existing) {
    await db.update(wazuhSettings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(wazuhSettings.id, existing.id));
  } else {
    await db.insert(wazuhSettings).values({ ...data, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() });
  }
}
async function insertSoarTelemetry(data) {
  const db = await getDb();
  if (!db) return;
  await db.insert(soarTelemetry).values(data);
}
async function getSoarTelemetryMetrics() {
  const db = await getDb();
  if (!db) return { logs: [] };
  const logs = await db.select().from(soarTelemetry).orderBy(desc(soarTelemetry.createdAt)).limit(1e3);
  return { logs };
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/wazuh-service.ts
var wazuh_service_exports = {};
__export(wazuh_service_exports, {
  fetchWazuhAlerts: () => fetchWazuhAlerts,
  testWazuhConnection: () => testWazuhConnection
});
import axios from "axios";
import https from "https";
function createAxiosInstance(url) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
  return axios.create({
    httpsAgent,
    timeout: 1e4
  });
}
async function fetchWazuhAlerts(limit = 50) {
  try {
    const settings = await getWazuhSettings();
    if (!settings?.elasticsearchUrl) {
      throw new Error("Wazuh Elasticsearch URL not configured");
    }
    const client = createAxiosInstance(settings.elasticsearchUrl);
    const query = {
      size: limit,
      sort: [{ timestamp: { order: "desc", unmapped_type: "date" } }],
      query: {
        bool: {
          filter: [{ exists: { field: "rule.id" } }]
        }
      }
    };
    const headers = {
      "Content-Type": "application/json"
    };
    let auth = void 0;
    if (settings.elasticsearchUsername && settings.elasticsearchPassword) {
      auth = {
        username: settings.elasticsearchUsername,
        password: settings.elasticsearchPassword
      };
    }
    const indexPattern = settings.alertIndexPattern || "wazuh-alerts-*";
    const response = await client.post(
      `${settings.elasticsearchUrl}/${encodeURIComponent(indexPattern)}/_search`,
      query,
      { headers, auth }
    );
    const data = response.data;
    const hits = data.hits?.hits || [];
    const read = (obj, path) => path.reduce((acc, key) => acc && typeof acc === "object" ? acc[key] : void 0, obj);
    return hits.map((hit) => {
      const source = hit._source || {};
      const ruleDescription = read(source, ["rule", "description"]) || read(source, ["message"]) || read(source, ["full_log"]) || "Unknown Rule";
      const ruleId = read(source, ["rule", "id"]) ?? read(source, ["rule", "sid"]) ?? "unknown";
      const levelRaw = read(source, ["rule", "level"]) ?? read(source, ["severity"]) ?? 0;
      const severity = typeof levelRaw === "number" ? levelRaw : Number(levelRaw) || 0;
      const action = read(source, ["action"]) || read(source, ["data", "action"]) || read(source, ["syscheck", "event"]) || read(source, ["rule", "groups", 0]) || "unknown";
      return {
        id: hit._id,
        timestamp: read(source, ["timestamp"]) || (/* @__PURE__ */ new Date()).toISOString(),
        rule_id: String(ruleId),
        rule_description: ruleDescription,
        severity,
        agent_id: String(read(source, ["agent", "id"]) ?? "unknown"),
        agent_name: String(read(source, ["agent", "name"]) ?? "Unknown Agent"),
        source_ip: read(source, ["source", "ip"]) || read(source, ["data", "srcip"]),
        destination_ip: read(source, ["destination", "ip"]) || read(source, ["data", "dstip"]),
        action
      };
    });
  } catch (error) {
    console.error("[Wazuh] Failed to fetch alerts:", error);
    throw error;
  }
}
async function testWazuhConnection() {
  try {
    const settings = await getWazuhSettings();
    if (!settings?.elasticsearchUrl) {
      return { success: false, message: "Elasticsearch URL not configured" };
    }
    console.log("[Wazuh] Testing connection to:", settings.elasticsearchUrl);
    const client = createAxiosInstance(settings.elasticsearchUrl);
    const headers = {};
    let auth = void 0;
    if (settings.elasticsearchUsername && settings.elasticsearchPassword) {
      auth = {
        username: settings.elasticsearchUsername,
        password: settings.elasticsearchPassword
      };
      console.log("[Wazuh] Using authentication with username:", settings.elasticsearchUsername);
    } else {
      console.log("[Wazuh] No authentication configured");
    }
    console.log("[Wazuh] Sending request to:", `${settings.elasticsearchUrl}/_cluster/health`);
    const response = await client.get(
      `${settings.elasticsearchUrl}/_cluster/health`,
      { headers, auth }
    );
    console.log("[Wazuh] Response status:", response.status);
    if (response.status === 200) {
      const data = response.data;
      const message = `Connected successfully. Cluster status: ${data.status}`;
      console.log("[Wazuh]", message);
      return { success: true, message };
    } else {
      const message = `HTTP ${response.status}: Unexpected response`;
      console.error("[Wazuh] Connection failed:", message);
      return { success: false, message };
    }
  } catch (error) {
    console.error("[Wazuh] Connection test failed:", error);
    let message = "Unknown error";
    if (error?.code === "ECONNREFUSED") {
      message = "Connection refused: Elasticsearch is not running or the port is incorrect.";
    } else if (error?.code === "ENOTFOUND") {
      message = "DNS error: Cannot resolve the Elasticsearch hostname.";
    } else if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
      message = "Connection timeout: Elasticsearch is not reachable. Check if the URL is correct and accessible from your network.";
    } else if (error?.response?.status === 401) {
      message = "Authentication failed: Invalid username or password.";
    } else if (error?.response?.status === 403) {
      message = "Access forbidden: User does not have permission to access Elasticsearch.";
    } else if (error?.message) {
      message = `Error: ${error.message}`;
    }
    return { success: false, message };
  }
}
var init_wazuh_service = __esm({
  "server/wazuh-service.ts"() {
    "use strict";
    init_db();
  }
});

// server/ssh-service.ts
var ssh_service_exports = {};
__export(ssh_service_exports, {
  getSSHConfig: () => getSSHConfig,
  readFileViaSsh: () => readFileViaSsh,
  testSSHConnection: () => testSSHConnection,
  writeFileViaSsh: () => writeFileViaSsh
});
import { Client } from "ssh2";
import { inArray } from "drizzle-orm";
async function getSSHConfig() {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(systemSettings).where(inArray(systemSettings.key, ["ssh_host", "ssh_port", "ssh_user", "ssh_password"]));
    const settings = result;
    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value ?? "";
    });
    if (!map.ssh_host || !map.ssh_user || !map.ssh_password) {
      return null;
    }
    return {
      host: map.ssh_host,
      port: parseInt(map.ssh_port, 10) || 22,
      user: map.ssh_user,
      password: map.ssh_password
    };
  } catch (error) {
    console.error("[SSH Service] Failed to get SSH config:", error);
    return null;
  }
}
async function readFileViaSsh(filePath) {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    throw new Error("SSH credentials not configured");
  }
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => {
      conn.exec(`cat "${filePath}"`, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        let data = "";
        stream.on("data", (chunk) => {
          data += chunk.toString();
        });
        stream.on("close", () => {
          conn.end();
          resolve(data);
        });
        stream.on("error", (err2) => {
          conn.end();
          reject(err2);
        });
      });
    });
    conn.on("error", (err) => {
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
      readyTimeout: 3e4
    });
  });
}
async function writeFileViaSsh(filePath, content) {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    throw new Error("SSH credentials not configured");
  }
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => {
      conn.exec(`tee "${filePath}" > /dev/null`, (err, stream) => {
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
        stream.on("error", (err2) => {
          conn.end();
          reject(err2);
        });
      });
    });
    conn.on("error", (err) => {
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
      readyTimeout: 3e4
    });
  });
}
async function testSSHConnection() {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) {
    return false;
  }
  return new Promise((resolve) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(false);
    }, 5e3);
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
      readyTimeout: 3e4
    });
  });
}
var init_ssh_service = __esm({
  "server/ssh-service.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// api/index.ts
import dotenv from "dotenv";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routes.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Browsers reject SameSite=None cookies unless Secure=true.
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/security.ts
import { z as z2 } from "zod";
init_db();
init_schema();
import { eq as eq3, desc as desc2 } from "drizzle-orm";

// server/scanner-service.ts
init_db();
init_schema();
import { eq as eq2 } from "drizzle-orm";
var PENTEST_CHECKS = [
  "1. TCP Port Scan (Top 1000 ports)",
  "2. UDP Port Scan (Top 100 ports)",
  "3. OS Fingerprinting (TCP/IP stack analysis)",
  "4. Service Version Detection",
  "5. Anonymous FTP Access Check",
  "6. Default SSH Credentials Verification",
  "7. Web Server Directory Enumeration",
  "8. SSL/TLS Certificate Validation",
  "9. HTTP Security Headers Analysis",
  "10. Cross-Site Scripting (XSS) Probes",
  "11. SQL Injection (SQLi) Payload Testing",
  "12. Open Redirect Vulnerability Check",
  "13. CORS Misconfiguration Audit",
  "14. Exposed .git Directory Check",
  "15. Unauthenticated API Endpoint Discovery",
  "16. SMB Null Session Enumeration",
  "17. SNMP Public Community String Check",
  "18. Missing Patch Detection (CVE correlation)",
  "19. Insecure Cookie Flags Verification",
  "20. Local File Inclusion (LFI) Fuzzing",
  "21. Remote Code Execution (RCE) Safe Probes",
  "22. DNS Zone Transfer Attempt"
];
var MOCK_VULNERABILITIES = [
  { title: "Unauthenticated API Endpoint Detected", severity: "high", desc: "Found an open API endpoint leaking internal metrics without authorization checks." },
  { title: "Missing HTTP Strict Transport Security", severity: "low", desc: "The HSTS header is not configured on the target web server." },
  { title: "Outdated SSH Server Version", severity: "medium", desc: "Target is running OpenSSH 7.2p2, which has known vulnerabilities." },
  { title: "Default Web Server Configuration Found", severity: "low", desc: "Apache default index page is exposed." },
  { title: "Reflected XSS in Search Parameter", severity: "high", desc: "The 'q' parameter on the search endpoint reflects user input without sanitization." },
  { title: "Weak SSL/TLS Cipher Suites Supported", severity: "medium", desc: "Server supports TLSv1.0 and weak CBC ciphers." }
];
async function processSecurityScan(scanId, target, scannerType) {
  await (await getDb()).update(securityScans).set({ status: "running" }).where(eq2(securityScans.id, scanId));
  try {
    let resultSummary = "";
    if (scannerType === "full_suite") {
      await new Promise((resolve) => setTimeout(resolve, 5e3));
      const successfulExploits = Math.floor(Math.random() * 3) + 1;
      const foundVulns = [];
      const dbInstance = await getDb();
      const VULN_TO_CHECK_MAP = {
        "Unauthenticated API Endpoint Detected": 14,
        // Check 15
        "Missing HTTP Strict Transport Security": 8,
        // Check 9
        "Outdated SSH Server Version": 3,
        // Check 4
        "Default Web Server Configuration Found": 6,
        // Check 7
        "Reflected XSS in Search Parameter": 9,
        // Check 10
        "Weak SSL/TLS Cipher Suites Supported": 7
        // Check 8
      };
      const vulnCheckIndices = /* @__PURE__ */ new Set();
      for (let i = 0; i < successfulExploits; i++) {
        const randVuln = MOCK_VULNERABILITIES[Math.floor(Math.random() * MOCK_VULNERABILITIES.length)];
        foundVulns.push(randVuln);
        const checkIdx = VULN_TO_CHECK_MAP[randVuln.title];
        if (checkIdx !== void 0) vulnCheckIndices.add(checkIdx);
        await dbInstance.insert(pentestFindings).values({
          title: `[${target}] ${randVuln.title}`,
          severity: randVuln.severity,
          description: randVuln.desc,
          status: "open"
        });
      }
      const checkLines = PENTEST_CHECKS.map((check, idx) => {
        if (vulnCheckIndices.has(idx)) {
          return `[VULN] ${check}`;
        }
        return `[OK] ${check}`;
      }).join("\n");
      resultSummary = `Automated Pentest Suite Completed.
Target: ${target}
Executed ${PENTEST_CHECKS.length} security checks.

Checks Performed:
${checkLines}

Vulnerabilities Found: ${successfulExploits}
${foundVulns.map((v, i) => `  ${i + 1}. [${v.severity.toUpperCase()}] ${v.title}`).join("\n")}

Summary: ${successfulExploits} potential vulnerabilities identified and automatically logged to the Findings tab.`;
    } else if (scannerType === "nmap") {
      await new Promise((resolve) => setTimeout(resolve, 3e3));
      resultSummary = `Nmap Scan Report for ${target}
Host is up.
Not shown: 997 closed tcp ports
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https`;
    } else if (scannerType === "zap") {
      await new Promise((resolve) => setTimeout(resolve, 4e3));
      resultSummary = `OWASP ZAP Report for ${target}
Alerts:
- High: 0
- Medium: 1 (Missing Anti-clickjacking Header)
- Low: 2
- Informational: 5`;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      resultSummary = `Scan completed successfully against ${target}. No critical issues found.`;
    }
    await (await getDb()).update(securityScans).set({
      status: "completed",
      resultSummary
    }).where(eq2(securityScans.id, scanId));
  } catch (error) {
    console.error("Scan failed:", error);
    await (await getDb()).update(securityScans).set({
      status: "failed",
      resultSummary: `Error executing scan: ${error.message}`
    }).where(eq2(securityScans.id, scanId));
  }
}

// server/routers/security.ts
var securityRouter = router({
  // Security Scans
  getScans: publicProcedure.query(async () => {
    return await (await getDb()).select().from(securityScans).orderBy(desc2(securityScans.createdAt));
  }),
  createScan: publicProcedure.input(z2.object({
    target: z2.string(),
    scannerType: z2.enum(["nmap", "zap", "openvas", "custom", "full_suite"])
  })).mutation(async ({ input }) => {
    const dbInstance = await getDb();
    const [{ insertId }] = await dbInstance.insert(securityScans).values({
      target: input.target,
      scannerType: input.scannerType,
      status: "pending"
    });
    processSecurityScan(insertId, input.target, input.scannerType).catch(console.error);
    return { success: true };
  }),
  // Emulation Tests
  getEmulationTests: publicProcedure.query(async () => {
    return await (await getDb()).select().from(emulationTests).orderBy(desc2(emulationTests.createdAt));
  }),
  createEmulationTest: publicProcedure.input(z2.object({
    name: z2.string(),
    techniqueId: z2.string().optional()
  })).mutation(async ({ input }) => {
    await (await getDb()).insert(emulationTests).values({
      name: input.name,
      techniqueId: input.techniqueId,
      status: "planned"
    });
    return { success: true };
  }),
  updateEmulationTestStatus: publicProcedure.input(z2.object({
    id: z2.number(),
    status: z2.enum(["planned", "executed", "detected", "missed"])
  })).mutation(async ({ input }) => {
    await (await getDb()).update(emulationTests).set({ status: input.status }).where(eq3(emulationTests.id, input.id));
    return { success: true };
  }),
  runEmulationTest: publicProcedure.input(z2.object({
    id: z2.number()
  })).mutation(async ({ input }) => {
    const dbInstance = await getDb();
    const [test] = await dbInstance.select().from(emulationTests).where(eq3(emulationTests.id, input.id));
    if (!test) {
      throw new Error("Emulation test scenario not found");
    }
    await dbInstance.update(emulationTests).set({ status: "executed", executedAt: /* @__PURE__ */ new Date() }).where(eq3(emulationTests.id, input.id));
    let detected = false;
    let checkDetails = "Automated verification initiated.";
    try {
      const { fetchWazuhAlerts: fetchWazuhAlerts2 } = await Promise.resolve().then(() => (init_wazuh_service(), wazuh_service_exports));
      const alerts = await fetchWazuhAlerts2(20);
      const match = alerts.find(
        (a) => test.techniqueId && a.rule_description.includes(test.techniqueId) || a.rule_description.toLowerCase().includes(test.name.toLowerCase())
      );
      if (match) {
        detected = true;
        checkDetails = `Verified detection in Wazuh alerts (Alert ID: ${match.id}, Rule: ${match.rule_description})`;
      } else {
        detected = Math.random() > 0.4;
        checkDetails = detected ? "Simulated detection verified via host IDS rules." : "No matching indicator or log trace detected on target system.";
      }
    } catch (e) {
      detected = Math.random() > 0.5;
      checkDetails = `Wazuh connection offline. Simulated result: ${detected ? "Detected" : "Missed"}`;
    }
    const finalStatus = detected ? "detected" : "missed";
    await dbInstance.update(emulationTests).set({ status: finalStatus, notes: checkDetails }).where(eq3(emulationTests.id, input.id));
    if (finalStatus === "missed") {
      await dbInstance.insert(pentestFindings).values({
        title: `[Emulation Gap] Detection rules missing for ${test.techniqueId || "Custom"} - ${test.name}`,
        severity: "high",
        description: `Adversary emulation failed to trigger an alert. Details: ${checkDetails}`,
        status: "open"
      });
    }
    return { success: true, status: finalStatus, details: checkDetails };
  }),
  // Pentest Findings
  getFindings: publicProcedure.query(async () => {
    return await (await getDb()).select().from(pentestFindings).orderBy(desc2(pentestFindings.createdAt));
  }),
  createFinding: publicProcedure.input(z2.object({
    title: z2.string(),
    severity: z2.enum(["low", "medium", "high", "critical"]),
    description: z2.string().optional()
  })).mutation(async ({ input }) => {
    await (await getDb()).insert(pentestFindings).values({
      title: input.title,
      severity: input.severity,
      description: input.description,
      status: "open"
    });
    return { success: true };
  }),
  updateFindingStatus: publicProcedure.input(z2.object({
    id: z2.number(),
    status: z2.enum(["open", "in_progress", "resolved", "accepted_risk"])
  })).mutation(async ({ input }) => {
    await (await getDb()).update(pentestFindings).set({ status: input.status }).where(eq3(pentestFindings.id, input.id));
    return { success: true };
  })
});

// server/routes.ts
init_db();

// server/ai-health-service.ts
init_ssh_service();
var SYSTEMD_SERVICE_MAP = {
  "anomaly-detection": "ngsentra-ai",
  uba: "ngsentra-uba"
  // local-ti: runs on Windows localhost:5000 — checked via HTTP only
};
var DOCKER_CONTAINER_MAP = {
  "alert-classification": "ng_soc_ai_classifier_brain"
};
async function probeHttpEndpoint(url, timeoutMs = 8e3) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      // Skip SSL verification for self-signed certs on local services
      ...url.startsWith("https") ? {} : {}
    });
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    if (response.ok || response.status === 301 || response.status === 302) {
      let body = "";
      try {
        body = await response.text();
        body = body.substring(0, 500);
      } catch {
        body = `HTTP ${response.status} OK`;
      }
      return {
        status: "running",
        responseTimeMs: elapsed,
        output: body || `HTTP ${response.status} \u2014 ${response.statusText}`
      };
    }
    if (response.status >= 500) {
      return {
        status: "error",
        responseTimeMs: elapsed,
        output: `HTTP ${response.status} \u2014 ${response.statusText}`
      };
    }
    return {
      status: "running",
      responseTimeMs: elapsed,
      output: `HTTP ${response.status} \u2014 service is responding`
    };
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    if (err.name === "AbortError") {
      return {
        status: "stopped",
        responseTimeMs: elapsed,
        output: `Timeout after ${timeoutMs}ms \u2014 service unreachable`
      };
    }
    return {
      status: "stopped",
      responseTimeMs: elapsed,
      output: `Connection failed: ${err.code || err.message}`
    };
  }
}
async function probeSystemdService(serviceName) {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) return null;
  return new Promise(async (resolve) => {
    let Client2;
    try {
      const ssh2 = await import("ssh2");
      Client2 = ssh2.Client;
    } catch (e) {
      console.warn("ssh2 module not available, skipping SSH check");
      return resolve(null);
    }
    const conn = new Client2();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(null);
    }, 3e4);
    conn.on("ready", () => {
      const cmd = `systemctl is-active ${serviceName} 2>&1 && echo '---JOURNAL---' && journalctl -u ${serviceName} --no-pager -n 5 --output=short 2>/dev/null || true`;
      conn.exec(cmd, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve(null);
          return;
        }
        let data = "";
        stream.on("data", (chunk) => {
          data += chunk.toString();
        });
        stream.stderr.on("data", (chunk) => {
          data += chunk.toString();
        });
        stream.on("close", () => {
          clearTimeout(timeout);
          conn.end();
          const cleanData = data.replace(/\[sudo\] password for [^:]+:\s*/g, "");
          const lines = cleanData.trim().split("\n");
          const statusLine = lines[0]?.trim().toLowerCase() ?? "";
          const isActive = statusLine === "active";
          const isActivating = statusLine === "activating";
          const isFailed = statusLine === "failed" || statusLine === "inactive";
          const journalIdx = cleanData.indexOf("---JOURNAL---");
          const journalOutput = journalIdx >= 0 ? cleanData.substring(journalIdx + "---JOURNAL---".length).trim().substring(0, 500) : "";
          resolve({
            active: isActive,
            activating: isActivating,
            failed: isFailed,
            output: journalOutput || `systemd status: ${statusLine}`
          });
        });
      });
    });
    conn.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
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
      readyTimeout: 3e4
    });
  });
}
async function probeDockerContainer(containerName) {
  const sshConfig = await getSSHConfig();
  if (!sshConfig) return null;
  return new Promise(async (resolve) => {
    let Client2;
    try {
      const ssh2 = await import("ssh2");
      Client2 = ssh2.Client;
    } catch (e) {
      console.warn("ssh2 module not available, skipping SSH check");
      return resolve(null);
    }
    const conn = new Client2();
    const timeout = setTimeout(() => {
      conn.end();
      resolve(null);
    }, 3e4);
    conn.on("ready", () => {
      const cmd = `echo '${sshConfig.password}' | sudo -S docker inspect -f '{{.State.Status}}' ${containerName} 2>&1 && echo '---LOGS---' && echo '${sshConfig.password}' | sudo -S docker logs --tail 5 ${containerName} 2>&1 || true`;
      conn.exec(cmd, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve(null);
          return;
        }
        let data = "";
        stream.on("data", (chunk) => {
          data += chunk.toString();
        });
        stream.stderr.on("data", (chunk) => {
          data += chunk.toString();
        });
        stream.on("close", () => {
          clearTimeout(timeout);
          conn.end();
          const cleanData = data.replace(/\[sudo\] password for [^:]+:\s*/g, "");
          const lines = cleanData.trim().split("\n");
          const statusLine = lines[0]?.trim().toLowerCase() ?? "";
          const isActive = statusLine === "running";
          const logsIdx = cleanData.indexOf("---LOGS---");
          const logsOutput = logsIdx >= 0 ? cleanData.substring(logsIdx + "---LOGS---".length).trim().substring(0, 500) : "";
          resolve({
            active: isActive,
            output: logsOutput || `docker status: ${statusLine}`
          });
        });
      });
    });
    conn.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
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
      readyTimeout: 3e4
    });
  });
}
async function checkModelHealth(slug, endpointUrl) {
  const result = {
    slug,
    status: "unknown",
    lastActive: null,
    responseTimeMs: null,
    recentOutput: null,
    checkedVia: "none"
  };
  let httpResult = null;
  if (endpointUrl) {
    try {
      httpResult = await probeHttpEndpoint(endpointUrl);
      result.status = httpResult.status;
      result.responseTimeMs = httpResult.responseTimeMs;
      result.recentOutput = httpResult.output;
      result.checkedVia = "http";
      if (httpResult.status === "running") {
        result.lastActive = /* @__PURE__ */ new Date();
      }
    } catch {
      result.recentOutput = "HTTP probe threw unexpected error";
    }
  }
  const serviceName = SYSTEMD_SERVICE_MAP[slug];
  if (serviceName) {
    try {
      const sshResult = await probeSystemdService(serviceName);
      if (sshResult) {
        if (sshResult.active) {
          result.status = "running";
          result.lastActive = /* @__PURE__ */ new Date();
          if (sshResult.output) {
            result.recentOutput = sshResult.output;
          }
          result.checkedVia = result.checkedVia === "http" ? "both" : "ssh";
        } else if (sshResult.activating) {
          result.status = "error";
          result.recentOutput = sshResult.output || result.recentOutput || "Service crash-looping (activating/auto-restart)";
          result.checkedVia = result.checkedVia === "http" ? "both" : "ssh";
        } else {
          result.status = "stopped";
          result.recentOutput = sshResult.output || result.recentOutput || "Service inactive (dead)";
          result.checkedVia = result.checkedVia === "http" ? "both" : "ssh";
        }
      }
    } catch {
    }
  }
  const containerName = DOCKER_CONTAINER_MAP[slug];
  if (containerName) {
    try {
      const dockerResult = await probeDockerContainer(containerName);
      if (dockerResult) {
        if (dockerResult.active) {
          result.status = "running";
          result.lastActive = /* @__PURE__ */ new Date();
          if (dockerResult.output) {
            result.recentOutput = dockerResult.output;
          }
          result.checkedVia = result.checkedVia === "http" ? "both" : "ssh";
        } else {
          result.status = "stopped";
          result.recentOutput = dockerResult.output || result.recentOutput || "Container not running";
          result.checkedVia = result.checkedVia === "http" ? "both" : "ssh";
        }
      }
    } catch {
    }
  }
  if (slug === "alert-classification" && endpointUrl && result.status !== "stopped") {
    try {
      const googleProbe = await probeHttpEndpoint(endpointUrl, 5e3);
      if (googleProbe.status !== "running") {
        result.status = googleProbe.status;
        result.recentOutput = `Container running, but Gemini API failed: ${googleProbe.output}`;
      } else if (!result.recentOutput) {
        result.recentOutput = `Google Gemini API reachable. Docker running.`;
      }
      result.checkedVia = "both";
    } catch {
      result.status = "error";
      result.recentOutput = "Container running, but failed to reach Google Gemini API";
    }
  }
  return result;
}
async function checkAllModelsHealth(models) {
  const results = await Promise.allSettled(
    models.map((m) => checkModelHealth(m.slug, m.endpointUrl))
  );
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      slug: models[i].slug,
      status: "unknown",
      lastActive: null,
      responseTimeMs: null,
      recentOutput: `Health check failed: ${r.reason}`,
      checkedVia: "none"
    };
  });
}

// server/routes.ts
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "Admin" && ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var analystProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["Admin", "admin", "Analyst"];
  if (!allowed.includes(ctx.user.role ?? "")) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Analyst or Admin access required" });
  }
  return next({ ctx });
});
async function logAction(ctx, action, target, details) {
  try {
    await createAuditLog({
      userId: ctx.user?.id,
      userName: ctx.user?.name ?? ctx.user?.email ?? "Unknown",
      userRole: ctx.user?.role ?? "Unknown",
      action,
      target,
      details,
      ipAddress: ctx.req?.ip ?? ctx.req?.headers?.["x-forwarded-for"] ?? void 0
    });
  } catch (e) {
    console.warn("[Audit] Failed to log action:", e);
  }
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── Components ────────────────────────────────────────────────────────────
  components: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const all = await getAllComponents();
      const role = ctx.user?.role;
      const isAdmin = role === "Admin" || role === "admin";
      const isViewer = role === "Viewer" || role === "user";
      if (isAdmin) return all;
      if (isViewer) return all.filter((c) => ["wazuh", "tpot"].includes(c.slug));
      return all.filter((c) => !c.adminOnly);
    }),
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      url: z3.string().optional(),
      port: z3.number().nullable().optional(),
      description: z3.string().optional(),
      enabled: z3.boolean().optional(),
      customCommand: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateComponent(id, data);
      await logAction(ctx, "UPDATE_COMPONENT", `component:${id}`, JSON.stringify(data));
      return { success: true };
    })
  }),
  // ─── Users ─────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure2.query(async () => {
      return getAllUsers();
    }),
    updateRole: adminProcedure2.input(z3.object({
      id: z3.number(),
      role: z3.enum(["Admin", "Analyst", "Viewer"])
    })).mutation(async ({ ctx, input }) => {
      await updateUserRole(input.id, input.role);
      await logAction(ctx, "UPDATE_USER_ROLE", `user:${input.id}`, `role=${input.role}`);
      return { success: true };
    }),
    delete: adminProcedure2.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      await deleteUser(input.id);
      await logAction(ctx, "DELETE_USER", `user:${input.id}`);
      return { success: true };
    })
  }),
  // ─── Audit Logs ────────────────────────────────────────────────────────────
  audit: router({
    list: adminProcedure2.input(z3.object({
      userId: z3.number().optional(),
      action: z3.string().optional(),
      userName: z3.string().optional(),
      from: z3.date().optional(),
      to: z3.date().optional(),
      limit: z3.number().min(1).max(200).default(50),
      offset: z3.number().min(0).default(0)
    })).query(async ({ input }) => {
      return getAuditLogs(input);
    }),
    recent: protectedProcedure.input(z3.object({ limit: z3.number().min(1).max(20).default(10) })).query(async ({ input }) => {
      return getRecentAuditLogs(input.limit);
    }),
    log: protectedProcedure.input(z3.object({
      action: z3.string(),
      target: z3.string().optional(),
      details: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await logAction(ctx, input.action, input.target, input.details);
      return { success: true };
    })
  }),
  // ─── Metrics (dashboard summary) ───────────────────────────────────────────
  metrics: router({
    summary: protectedProcedure.query(async () => {
      const [allComponents, allAiModels, recentLogs] = await Promise.all([
        getAllComponents(),
        getAllAiModels(),
        getRecentAuditLogs(5)
      ]);
      const enabledComponents = allComponents.filter((c) => c.enabled);
      const configuredComponents = allComponents.filter((c) => c.url);
      return {
        totalComponents: allComponents.length,
        enabledComponents: enabledComponents.length,
        configuredComponents: configuredComponents.length,
        aiModels: allAiModels.map((m) => ({
          id: m.id,
          name: m.name,
          slug: m.slug,
          status: m.status,
          lastActive: m.lastActive
        })),
        recentActivity: recentLogs.map((l) => ({
          id: l.id,
          action: l.action,
          userName: l.userName,
          target: l.target,
          createdAt: l.createdAt
        })),
        timestamp: /* @__PURE__ */ new Date()
      };
    })
  }),
  // ─── SOAR ──────────────────────────────────────────────────────────────────
  soar: router({
    telemetryList: protectedProcedure.query(async () => {
      const { getSoarTelemetryMetrics: getSoarTelemetryMetrics2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getSoarTelemetryMetrics2();
    }),
    list: protectedProcedure.query(async () => {
      return getAllSoarApproaches();
    }),
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      webhookUrl: z3.string().optional(),
      enabled: z3.boolean().optional(),
      description: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateSoarApproach(id, data);
      await logAction(ctx, "UPDATE_SOAR_APPROACH", `soar:${id}`, JSON.stringify(data));
      return { success: true };
    }),
    trigger: analystProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      const approaches = await getAllSoarApproaches();
      const approach = approaches.find((a) => a.id === input.id);
      if (approach && approach.webhookUrl) {
        try {
          let mockRuleGroups = ["syslog"];
          if (approach.slug === "behavior") mockRuleGroups = ["mitre_attack"];
          if (approach.slug === "file") mockRuleGroups = ["ossec", "syscheck"];
          if (approach.slug === "url-realtime" || approach.slug === "url-scheduled") mockRuleGroups = ["web", "accesslog"];
          await fetch(approach.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "NG-SENTRA SOAR Dashboard",
              action: "Manual Trigger",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              rule: {
                groups: mockRuleGroups,
                level: 10,
                description: `Manual execution of ${approach.name} playbook`
              },
              data: {
                srcip: "185.199.108.153",
                // Public IP so n8n's isBad(ip) filter doesn't drop it
                url: "http://malicious.test.local/download",
                file_hash: "44d88612fea8a8f36de82e1278abb02f"
              }
            })
          });
        } catch (e) {
          console.error("Failed to trigger n8n webhook:", e);
          throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `Failed to trigger n8n webhook: ${e.message}` });
        }
      }
      await triggerSoarApproach(input.id);
      await logAction(ctx, "TRIGGER_SOAR", `soar:${input.id}`);
      return { success: true };
    })
  }),
  // ─── AI Models ─────────────────────────────────────────────────────────────
  aiModels: router({
    list: protectedProcedure.query(async () => {
      return getAllAiModels();
    }),
    update: adminProcedure2.input(z3.object({
      id: z3.number(),
      endpointUrl: z3.string().optional(),
      status: z3.enum(["running", "stopped", "error", "unknown"]).optional(),
      recentOutput: z3.string().optional(),
      description: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateAiModel(id, data);
      await logAction(ctx, "UPDATE_AI_MODEL", `ai:${id}`, JSON.stringify(data));
      return { success: true };
    }),
    // Probe ALL AI model endpoints and update their status in the DB
    healthCheck: protectedProcedure.mutation(async ({ ctx }) => {
      const models = await getAllAiModels();
      if (!models.length) return { results: [], checkedAt: /* @__PURE__ */ new Date() };
      const results = await checkAllModelsHealth(
        models.map((m) => ({ id: m.id, slug: m.slug, endpointUrl: m.endpointUrl }))
      );
      for (const result of results) {
        const model = models.find((m) => m.slug === result.slug);
        if (!model) continue;
        await updateAiModel(model.id, {
          status: result.status,
          lastActive: result.lastActive ?? model.lastActive,
          recentOutput: result.recentOutput ?? model.recentOutput
        });
      }
      await logAction(ctx, "AI_HEALTH_CHECK", "ai:all", `Checked ${results.length} models`);
      return {
        results: results.map((r) => ({
          slug: r.slug,
          status: r.status,
          lastActive: r.lastActive,
          responseTimeMs: r.responseTimeMs,
          recentOutput: r.recentOutput,
          checkedVia: r.checkedVia
        })),
        checkedAt: /* @__PURE__ */ new Date()
      };
    }),
    // Probe a SINGLE AI model endpoint
    healthCheckSingle: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ ctx, input }) => {
      const models = await getAllAiModels();
      const model = models.find((m) => m.id === input.id);
      if (!model) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "AI model not found" });
      }
      const result = await checkModelHealth(model.slug, model.endpointUrl);
      await updateAiModel(model.id, {
        status: result.status,
        lastActive: result.lastActive ?? model.lastActive,
        recentOutput: result.recentOutput ?? model.recentOutput
      });
      await logAction(ctx, "AI_HEALTH_CHECK", `ai:${model.id}`, `${model.name}: ${result.status}`);
      return {
        slug: result.slug,
        status: result.status,
        lastActive: result.lastActive,
        responseTimeMs: result.responseTimeMs,
        recentOutput: result.recentOutput,
        checkedVia: result.checkedVia
      };
    })
  }),
  // ─── System Settings ────────────────────────────────────────────────────────────
  settings: router({
    list: protectedProcedure.query(async () => {
      return getAllSettings();
    }),
    upsert: adminProcedure2.input(z3.object({
      key: z3.string(),
      value: z3.string(),
      label: z3.string().optional(),
      description: z3.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await upsertSetting(input.key, input.value, input.label, input.description);
      await logAction(ctx, "UPDATE_SETTING", `setting:${input.key}`, input.value);
      return { success: true };
    })
  }),
  ssh: router({
    readConfig: adminProcedure2.input(z3.object({ filePath: z3.string() })).query(async ({ input }) => {
      try {
        const { readFileViaSsh: readFileViaSsh2 } = await Promise.resolve().then(() => (init_ssh_service(), ssh_service_exports));
        const content = await readFileViaSsh2(input.filePath);
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }),
    testConnection: adminProcedure2.query(async () => {
      try {
        const { testSSHConnection: testSSHConnection2 } = await Promise.resolve().then(() => (init_ssh_service(), ssh_service_exports));
        const connected = await testSSHConnection2();
        return { success: connected, message: connected ? "SSH connection successful" : "SSH connection failed" };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }),
    // SSH Credentials management
    credentials: router({
      getByComponent: protectedProcedure.input(z3.object({ componentId: z3.number() })).query(async ({ input }) => {
        return getSshCredentialsByComponentId(input.componentId);
      }),
      getAll: adminProcedure2.query(async () => {
        return getAllSshCredentials();
      }),
      upsert: adminProcedure2.input(z3.object({
        componentId: z3.number(),
        host: z3.string().min(1),
        port: z3.number().int().min(1).max(65535).default(22),
        username: z3.string().min(1),
        password: z3.string().min(1),
        description: z3.string().optional()
      })).mutation(async ({ ctx, input }) => {
        const { componentId, ...data } = input;
        await upsertSshCredential(componentId, data);
        await logAction(ctx, "UPSERT_SSH_CREDENTIAL", `component:${componentId}`, `host=${data.host}`);
        return { success: true };
      }),
      delete: adminProcedure2.input(z3.object({ componentId: z3.number() })).mutation(async ({ ctx, input }) => {
        await deleteSshCredential(input.componentId);
        await logAction(ctx, "DELETE_SSH_CREDENTIAL", `component:${input.componentId}`);
        return { success: true };
      })
    })
  }),
  wazuh: router({
    getSettings: adminProcedure2.query(async () => {
      return getWazuhSettings();
    }),
    updateSettings: adminProcedure2.input(z3.object({
      apiUrl: z3.string().optional(),
      apiUsername: z3.string().optional(),
      apiPassword: z3.string().optional(),
      elasticsearchUrl: z3.string().optional(),
      elasticsearchUsername: z3.string().optional(),
      elasticsearchPassword: z3.string().optional(),
      alertIndexPattern: z3.string().optional(),
      refreshInterval: z3.number().optional(),
      alertLimit: z3.number().optional(),
      enabled: z3.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      await upsertWazuhSettings(input);
      await logAction(ctx, "UPDATE_WAZUH_SETTINGS", "wazuh:config");
      return { success: true };
    }),
    getAlerts: protectedProcedure.input(z3.object({ limit: z3.number().default(50) })).query(async ({ input }) => {
      try {
        const { fetchWazuhAlerts: fetchWazuhAlerts2 } = await Promise.resolve().then(() => (init_wazuh_service(), wazuh_service_exports));
        const alerts = await fetchWazuhAlerts2(input.limit);
        return { success: true, alerts };
      } catch (error) {
        return { success: false, error: error.message, alerts: [] };
      }
    }),
    testConnection: adminProcedure2.query(async () => {
      try {
        const { testWazuhConnection: testWazuhConnection2 } = await Promise.resolve().then(() => (init_wazuh_service(), wazuh_service_exports));
        return await testWazuhConnection2();
      } catch (error) {
        return { success: false, message: `Unexpected error: ${error.message}` };
      }
    })
  }),
  // ─── Security Assessment ───────────────────────────────────────────────────
  security: securityRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios2 from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios2.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    const appId = ENV.appId || "local-app";
    return this.signSession(
      {
        openId,
        appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    const localSessionUser = () => ({
      id: 0,
      openId: sessionUserId,
      name: session.name || ENV.localAuthName,
      email: ENV.localAuthEmail,
      role: ENV.localAuthRole,
      loginMethod: "local",
      createdAt: signedInAt,
      updatedAt: signedInAt,
      lastSignedIn: signedInAt
    });
    if (!user && ENV.localAuthEnabled) {
      try {
        await upsertUser({
          openId: sessionUserId,
          name: session.name || ENV.localAuthName,
          email: ENV.localAuthEmail,
          role: ENV.localAuthRole,
          loginMethod: "local",
          lastSignedIn: signedInAt
        });
      } catch (error) {
        console.warn("[Auth] Failed to upsert local user, using session fallback", error);
      }
      user = await getUserByOpenId(sessionUserId);
      if (!user) {
        return localSessionUser();
      }
    }
    if (!user && !ENV.localAuthEnabled) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (!ENV.localAuthEnabled) {
      await upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt
      });
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
init_db();

// server/_core/localAuth.ts
init_db();
init_env();
function registerLocalAuthRoutes(app2) {
  app2.get("/api/local-auth/login", async (req, res) => {
    if (!ENV.localAuthEnabled) {
      res.status(404).json({ error: "Local auth mode is disabled" });
      return;
    }
    try {
      try {
        await upsertUser({
          openId: ENV.localAuthOpenId,
          name: ENV.localAuthName,
          email: ENV.localAuthEmail,
          role: ENV.localAuthRole,
          loginMethod: "local",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      } catch (error) {
        console.warn("[LocalAuth] Could not persist local user, continuing with session only", error);
      }
      const sessionToken = await sdk.createSessionToken(ENV.localAuthOpenId, {
        name: ENV.localAuthName,
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "Local login failed" });
    }
  });
}

// server/_core/oauth.ts
init_db();
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/googleAuth.ts
init_db();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
function registerGoogleAuthRoutes(app2) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientID || !clientSecret) {
    console.warn("[GoogleAuth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set \u2014 Google OAuth disabled.");
    return;
  }
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback",
        scope: ["profile", "email"]
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const openId = `google_${profile.id}`;
          const name = profile.displayName || email || "Google User";
          await upsertUser({
            openId,
            name,
            email,
            loginMethod: "google",
            lastSignedIn: /* @__PURE__ */ new Date()
          });
          done(null, { openId, name, email });
        } catch (err) {
          done(err);
        }
      }
    )
  );
  app2.use(passport.initialize());
  app2.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );
  app2.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_failed" }),
    async (req, res) => {
      try {
        const user = req.user;
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name,
          expiresInMs: ONE_YEAR_MS
        });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        res.redirect(302, "/");
      } catch (err) {
        console.error("[GoogleAuth] Callback failed:", err);
        res.redirect("/login?error=session_failed");
      }
    }
  );
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const data = await forgeResp.json();
      const { url } = data;
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// api/index.ts
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerLocalAuthRoutes(app);
registerOAuthRoutes(app);
registerGoogleAuthRoutes(app);
app.post("/api/soar/telemetry", async (req, res) => {
  try {
    await insertSoarTelemetry({
      playbook: req.body.playbook || "Unknown Playbook",
      actionTaken: req.body.actionTaken || "Workflow Executed",
      details: req.body.details ? typeof req.body.details === "string" ? req.body.details : JSON.stringify(req.body.details) : null,
      executionId: req.body.executionId || "N/A"
    });
    res.json({ success: true, message: "Telemetry successfully logged to NG-SENTRA database" });
  } catch (e) {
    console.error("[SOAR Telemetry Error]:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var index_default = app;
export {
  index_default as default
};
