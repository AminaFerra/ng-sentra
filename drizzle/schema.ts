import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "Admin", "Analyst", "Viewer"]).default("Viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const components = mysqlTable("components", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Component = typeof components.$inferSelect;
export type InsertComponent = typeof components.$inferInsert;

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 256 }),
  userRole: varchar("userRole", { length: 32 }),
  action: varchar("action", { length: 128 }).notNull(),
  target: varchar("target", { length: 256 }),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export const soarApproaches = mysqlTable("soar_approaches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  webhookUrl: varchar("webhookUrl", { length: 512 }),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  lastTriggered: timestamp("lastTriggered"),
  triggerCount: int("triggerCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SoarApproach = typeof soarApproaches.$inferSelect;
export type InsertSoarApproach = typeof soarApproaches.$inferInsert;

export const aiModels = mysqlTable("ai_models", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  endpointUrl: varchar("endpointUrl", { length: 512 }),
  status: mysqlEnum("status", ["running", "stopped", "error", "unknown"]).default("unknown").notNull(),
  lastActive: timestamp("lastActive"),
  recentOutput: text("recentOutput"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = typeof aiModels.$inferInsert;

export const sshCredentials = mysqlTable("ssh_credentials", {
  id: int("id").autoincrement().primaryKey(),
  componentId: int("componentId").notNull().references(() => components.id, { onDelete: "cascade" }),
  host: varchar("host", { length: 256 }).notNull(),
  port: int("port").default(22).notNull(),
  username: varchar("username", { length: 128 }).notNull(),
  password: text("password").notNull(), 
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SshCredential = typeof sshCredentials.$inferSelect;
export type InsertSshCredential = typeof sshCredentials.$inferInsert;

export const wazuhSettings = mysqlTable("wazuh_settings", {
  id: int("id").autoincrement().primaryKey(),
  apiUrl: varchar("apiUrl", { length: 512 }),
  apiUsername: varchar("apiUsername", { length: 128 }),
  apiPassword: text("apiPassword"), 
  elasticsearchUrl: varchar("elasticsearchUrl", { length: 512 }),
  elasticsearchUsername: varchar("elasticsearchUsername", { length: 128 }),
  elasticsearchPassword: text("elasticsearchPassword"), 
  alertIndexPattern: varchar("alertIndexPattern", { length: 256 }).default("wazuh-alerts-*"),
  refreshInterval: int("refreshInterval").default(5000), 
  alertLimit: int("alertLimit").default(50),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WazuhSetting = typeof wazuhSettings.$inferSelect;
export type InsertWazuhSetting = typeof wazuhSettings.$inferInsert;

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  label: varchar("label", { length: 256 }),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

export const soarTelemetry = mysqlTable("soar_telemetry", {
  id: int("id").autoincrement().primaryKey(),
  playbook: varchar("playbook", { length: 128 }).notNull(),
  actionTaken: varchar("actionTaken", { length: 256 }).notNull(),
  details: text("details"),
  executionId: varchar("executionId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SoarTelemetry = typeof soarTelemetry.$inferSelect;
export type InsertSoarTelemetry = typeof soarTelemetry.$inferInsert;
