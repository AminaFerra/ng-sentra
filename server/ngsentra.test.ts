import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routes";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllComponents: vi.fn().mockResolvedValue([
    { id: 1, name: "Wazuh", slug: "wazuh", url: "http://192.168.1.14", port: 443, description: "SIEM", icon: "Shield", category: "SIEM", enabled: true, adminOnly: false, accessType: "iframe", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "T-Pot", slug: "tpot", url: "http://192.168.1.14", port: 64297, description: "Honeypot", icon: "Bug", category: "Honeypot", enabled: true, adminOnly: false, accessType: "iframe", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "Snort", slug: "snort", url: null, port: null, description: "IDS", icon: "Eye", category: "IDS/IPS", enabled: true, adminOnly: true, accessType: "config-file", createdAt: new Date(), updatedAt: new Date() },
    { id: 4, name: "n8n SOAR", slug: "n8n", url: "http://192.168.1.14", port: 5678, description: "SOAR", icon: "Zap", category: "SOAR", enabled: true, adminOnly: false, accessType: "iframe", createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateComponent: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, openId: "admin-1", name: "Admin User", email: "admin@soc.local", role: "Admin", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 2, openId: "analyst-1", name: "Analyst User", email: "analyst@soc.local", role: "Analyst", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  ]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getRecentAuditLogs: vi.fn().mockResolvedValue([]),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getAllSoarApproaches: vi.fn().mockResolvedValue([
    { id: 1, name: "IP", slug: "ip", webhookUrl: "http://n8n:5678/webhook/ip", description: "IP-based IR", enabled: true, lastTriggered: null, triggerCount: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Behavior", slug: "behavior", webhookUrl: null, description: "Behavior-based IR", enabled: true, lastTriggered: null, triggerCount: 0, createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateSoarApproach: vi.fn().mockResolvedValue(undefined),
  triggerSoarApproach: vi.fn().mockResolvedValue(undefined),
  getAllAiModels: vi.fn().mockResolvedValue([
    { id: 1, name: "Anomaly Detection", slug: "anomaly-detection", endpointUrl: "http://localhost:5001", status: "running", lastActive: new Date(), recentOutput: "No anomalies", description: "Anomaly detection AI", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Alert Classification", slug: "alert-classification", endpointUrl: null, status: "unknown", lastActive: null, recentOutput: null, description: "Alert classification AI", createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateAiModel: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context Factories ────────────────────────────────────────────────────────
function makeCtx(role: string, id = 1): TrpcContext {
  return {
    user: { id, openId: `user-${id}`, name: `User ${id}`, email: `user${id}@soc.local`, role: role as any, loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

const adminCtx = makeCtx("Admin", 1);
const analystCtx = makeCtx("Analyst", 2);
const viewerCtx = makeCtx("Viewer", 3);

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("returns current user from auth.me", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const user = await caller.auth.me();
    expect(user?.role).toBe("Admin");
  });

  it("clears session cookie on logout", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── RBAC Tests ───────────────────────────────────────────────────────────────
describe("RBAC - components", () => {
  it("allows Viewer to list components", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    const result = await caller.components.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("allows Admin to update a component", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.components.update({ id: 1, url: "http://192.168.1.10", port: 443, enabled: true });
    expect(result.success).toBe(true);
  });

  it("rejects Analyst from updating a component", async () => {
    const caller = appRouter.createCaller(analystCtx);
    await expect(caller.components.update({ id: 1, url: "http://evil.com" })).rejects.toThrow("Admin access required");
  });

  it("rejects Viewer from updating a component", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    await expect(caller.components.update({ id: 1, url: "http://evil.com" })).rejects.toThrow("Admin access required");
  });
});

// ─── User Management Tests ────────────────────────────────────────────────────
describe("RBAC - users", () => {
  it("allows Admin to list users", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.users.list();
    expect(result.length).toBe(2);
  });

  it("rejects Analyst from listing users", async () => {
    const caller = appRouter.createCaller(analystCtx);
    await expect(caller.users.list()).rejects.toThrow("Admin access required");
  });

  it("allows Admin to update user role", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.users.updateRole({ id: 2, role: "Viewer" });
    expect(result.success).toBe(true);
  });

  it("allows Admin to delete a user", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.users.delete({ id: 2 });
    expect(result.success).toBe(true);
  });
});

// ─── Audit Log Tests ──────────────────────────────────────────────────────────
describe("audit logs", () => {
  it("allows Admin to list audit logs", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.audit.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
  });

  it("rejects Viewer from listing audit logs", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    await expect(caller.audit.list({ limit: 10, offset: 0 })).rejects.toThrow("Admin access required");
  });

  it("allows any authenticated user to log an action", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    const result = await caller.audit.log({ action: "TEST_ACTION", target: "test" });
    expect(result.success).toBe(true);
  });
});

// ─── SOAR Tests ───────────────────────────────────────────────────────────────
describe("SOAR", () => {
  it("allows Viewer to list SOAR approaches", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    const result = await caller.soar.list();
    expect(result.length).toBe(2);
    expect(result[0].name).toBe("IP");
    expect(result[1].name).toBe("Behavior");
  });

  it("allows Analyst to trigger a SOAR approach", async () => {
    const caller = appRouter.createCaller(analystCtx);
    const result = await caller.soar.trigger({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects Viewer from triggering SOAR", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    await expect(caller.soar.trigger({ id: 1 })).rejects.toThrow("Analyst or Admin access required");
  });

  it("rejects Analyst from updating SOAR approach config", async () => {
    const caller = appRouter.createCaller(analystCtx);
    await expect(caller.soar.update({ id: 1, webhookUrl: "http://evil.com" })).rejects.toThrow("Admin access required");
  });
});

// ─── AI Models Tests ──────────────────────────────────────────────────────────
describe("AI Models", () => {
  it("allows Viewer to list AI models", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    const result = await caller.aiModels.list();
    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Anomaly Detection");
  });

  it("allows Admin to update AI model status", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.aiModels.update({ id: 1, status: "running" });
    expect(result.success).toBe(true);
  });

  it("rejects Analyst from updating AI model", async () => {
    const caller = appRouter.createCaller(analystCtx);
    await expect(caller.aiModels.update({ id: 1, status: "stopped" })).rejects.toThrow("Admin access required");
  });
});

// ─── Metrics Tests ────────────────────────────────────────────────────────────
describe("Metrics", () => {
  it("returns summary metrics for authenticated users", async () => {
    const caller = appRouter.createCaller(viewerCtx);
    const result = await caller.metrics.summary();
    expect(result).toHaveProperty("totalComponents");
    expect(result).toHaveProperty("aiModels");
    expect(result).toHaveProperty("recentActivity");
    expect(result).toHaveProperty("timestamp");
    expect(result.totalComponents).toBe(4);
  });
});
