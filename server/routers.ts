import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAuditLog, deleteUser, getAllAiModels, getAllComponents, getAllSoarApproaches,
  getAllSettings, getAllUsers, getAuditLogs, getRecentAuditLogs, triggerSoarApproach,
  updateAiModel, updateComponent, updateSoarApproach, updateUserRole, upsertSetting,
  getSshCredentialsByComponentId, getAllSshCredentials, upsertSshCredential, deleteSshCredential,
  getWazuhSettings, upsertWazuhSettings,
} from "./db";
import { checkAllModelsHealth, checkModelHealth } from "./ai-health-service";

// ─── RBAC helpers ────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "Admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const analystProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["Admin", "admin", "Analyst"];
  if (!allowed.includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Analyst or Admin access required" });
  }
  return next({ ctx });
});

// ─── Audit helper ────────────────────────────────────────────────────────────
async function logAction(ctx: any, action: string, target?: string, details?: string) {
  try {
    await createAuditLog({
      userId: ctx.user?.id,
      userName: ctx.user?.name ?? ctx.user?.email ?? "Unknown",
      userRole: ctx.user?.role ?? "Unknown",
      action,
      target,
      details,
      ipAddress: ctx.req?.ip ?? ctx.req?.headers?.["x-forwarded-for"] as string ?? undefined,
    });
  } catch (e) {
    console.warn("[Audit] Failed to log action:", e);
  }
}

// ─── App Router ──────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Components ────────────────────────────────────────────────────────────
  components: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const all = await getAllComponents();
      const role = ctx.user?.role;
      const isAdmin = role === "Admin" || role === "admin";
      const isViewer = role === "Viewer" || role === "user";

      if (isAdmin) return all;
      // Viewer role: only Wazuh and T-Pot (iframe components with web UI)
      if (isViewer) return all.filter((c: any) => ["wazuh", "tpot"].includes(c.slug));
      // Analyst: all non-adminOnly components
      return all.filter((c: any) => !c.adminOnly);
    }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        url: z.string().optional(),
        port: z.number().nullable().optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        customCommand: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateComponent(id, data);
        await logAction(ctx, "UPDATE_COMPONENT", `component:${id}`, JSON.stringify(data));
        return { success: true };
      }),
  }),

  // ─── Users ─────────────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(async () => {
      return getAllUsers();
    }),

    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["Admin", "Analyst", "Viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(input.id, input.role);
        await logAction(ctx, "UPDATE_USER_ROLE", `user:${input.id}`, `role=${input.role}`);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteUser(input.id);
        await logAction(ctx, "DELETE_USER", `user:${input.id}`);
        return { success: true };
      }),
  }),

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  audit: router({
    list: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        action: z.string().optional(),
        userName: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getAuditLogs(input);
      }),

    recent: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
      .query(async ({ input }) => {
        return getRecentAuditLogs(input.limit);
      }),

    log: protectedProcedure
      .input(z.object({
        action: z.string(),
        target: z.string().optional(),
        details: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await logAction(ctx, input.action, input.target, input.details);
        return { success: true };
      }),
  }),

  // ─── Metrics (dashboard summary) ───────────────────────────────────────────
  metrics: router({
    summary: protectedProcedure.query(async () => {
      const [allComponents, allAiModels, recentLogs] = await Promise.all([
        getAllComponents(),
        getAllAiModels(),
        getRecentAuditLogs(5),
      ]);

      const enabledComponents = allComponents.filter(c => c.enabled);
      const configuredComponents = allComponents.filter(c => c.url);

      return {
        totalComponents: allComponents.length,
        enabledComponents: enabledComponents.length,
        configuredComponents: configuredComponents.length,
        aiModels: allAiModels.map(m => ({
          id: m.id,
          name: m.name,
          slug: m.slug,
          status: m.status,
          lastActive: m.lastActive,
        })),
        recentActivity: recentLogs.map(l => ({
          id: l.id,
          action: l.action,
          userName: l.userName,
          target: l.target,
          createdAt: l.createdAt,
        })),
        timestamp: new Date(),
      };
    }),
  }),

  // ─── SOAR ──────────────────────────────────────────────────────────────────
  soar: router({
    telemetryList: protectedProcedure.query(async () => {
      const { getSoarTelemetryMetrics } = await import("./db");
      return getSoarTelemetryMetrics();
    }),

    list: protectedProcedure.query(async () => {
      return getAllSoarApproaches();
    }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        webhookUrl: z.string().optional(),
        enabled: z.boolean().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateSoarApproach(id, data);
        await logAction(ctx, "UPDATE_SOAR_APPROACH", `soar:${id}`, JSON.stringify(data));
        return { success: true };
      }),

    trigger: analystProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const approaches = await getAllSoarApproaches();
        const approach = approaches.find((a: any) => a.id === input.id);

        if (approach && approach.webhookUrl) {
          try {
            // Build a dynamic mock payload that satisfies the n8n Switch nodes
            let mockRuleGroups = ["syslog"]; // Default for IP
            if (approach.slug === "behavior") mockRuleGroups = ["mitre_attack"];
            if (approach.slug === "file") mockRuleGroups = ["ossec", "syscheck"];
            if (approach.slug === "url-realtime" || approach.slug === "url-scheduled") mockRuleGroups = ["web", "accesslog"];

            await fetch(approach.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source: 'NG-SENTRA SOAR Dashboard',
                action: 'Manual Trigger',
                timestamp: new Date().toISOString(),
                rule: {
                  groups: mockRuleGroups,
                  level: 10,
                  description: `Manual execution of ${approach.name} playbook`
                },
                data: {
                  srcip: "185.199.108.153", // Public IP so n8n's isBad(ip) filter doesn't drop it
                  url: "http://malicious.test.local/download",
                  file_hash: "44d88612fea8a8f36de82e1278abb02f"
                }
              })
            });
          } catch (e: any) {
            console.error("Failed to trigger n8n webhook:", e);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Failed to trigger n8n webhook: ${e.message}` });
          }
        }

        await triggerSoarApproach(input.id);
        await logAction(ctx, "TRIGGER_SOAR", `soar:${input.id}`);
        return { success: true };
      }),
  }),

  // ─── AI Models ─────────────────────────────────────────────────────────────
  aiModels: router({
    list: protectedProcedure.query(async () => {
      return getAllAiModels();
    }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        endpointUrl: z.string().optional(),
        status: z.enum(["running", "stopped", "error", "unknown"]).optional(),
        recentOutput: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAiModel(id, data);
        await logAction(ctx, "UPDATE_AI_MODEL", `ai:${id}`, JSON.stringify(data));
        return { success: true };
      }),

    // Probe ALL AI model endpoints and update their status in the DB
    healthCheck: protectedProcedure.mutation(async ({ ctx }) => {
      const models = await getAllAiModels();
      if (!models.length) return { results: [], checkedAt: new Date() };

      const results = await checkAllModelsHealth(
        models.map(m => ({ id: m.id, slug: m.slug, endpointUrl: m.endpointUrl }))
      );

      // Persist results back to DB
      for (const result of results) {
        const model = models.find(m => m.slug === result.slug);
        if (!model) continue;

        await updateAiModel(model.id, {
          status: result.status as any,
          lastActive: result.lastActive ?? model.lastActive,
          recentOutput: result.recentOutput ?? model.recentOutput,
        });
      }

      await logAction(ctx, "AI_HEALTH_CHECK", "ai:all", `Checked ${results.length} models`);

      return {
        results: results.map(r => ({
          slug: r.slug,
          status: r.status,
          lastActive: r.lastActive,
          responseTimeMs: r.responseTimeMs,
          recentOutput: r.recentOutput,
          checkedVia: r.checkedVia,
        })),
        checkedAt: new Date(),
      };
    }),

    // Probe a SINGLE AI model endpoint
    healthCheckSingle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const models = await getAllAiModels();
        const model = models.find(m => m.id === input.id);
        if (!model) {
          throw new TRPCError({ code: "NOT_FOUND", message: "AI model not found" });
        }

        const result = await checkModelHealth(model.slug, model.endpointUrl);

        // Persist to DB
        await updateAiModel(model.id, {
          status: result.status as any,
          lastActive: result.lastActive ?? model.lastActive,
          recentOutput: result.recentOutput ?? model.recentOutput,
        });

        await logAction(ctx, "AI_HEALTH_CHECK", `ai:${model.id}`, `${model.name}: ${result.status}`);

        return {
          slug: result.slug,
          status: result.status,
          lastActive: result.lastActive,
          responseTimeMs: result.responseTimeMs,
          recentOutput: result.recentOutput,
          checkedVia: result.checkedVia,
        };
      }),
  }),

  // ─── System Settings ────────────────────────────────────────────────────────────
  settings: router({
    list: protectedProcedure.query(async () => {
      return getAllSettings();
    }),
    upsert: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertSetting(input.key, input.value, input.label, input.description);
        await logAction(ctx, "UPDATE_SETTING", `setting:${input.key}`, input.value);
        return { success: true };
      }),
  }),

  ssh: router({
    readConfig: adminProcedure
      .input(z.object({ filePath: z.string() }))
      .query(async ({ input }) => {
        try {
          const { readFileViaSsh } = await import("./ssh-service");
          const content = await readFileViaSsh(input.filePath);
          return { success: true, content };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }),

    testConnection: adminProcedure
      .query(async () => {
        try {
          const { testSSHConnection } = await import("./ssh-service");
          const connected = await testSSHConnection();
          return { success: connected, message: connected ? "SSH connection successful" : "SSH connection failed" };
        } catch (error: any) {
          return { success: false, message: error.message };
        }
      }),

    // SSH Credentials management
    credentials: router({
      getByComponent: protectedProcedure
        .input(z.object({ componentId: z.number() }))
        .query(async ({ input }) => {
          return getSshCredentialsByComponentId(input.componentId);
        }),

      getAll: adminProcedure
        .query(async () => {
          return getAllSshCredentials();
        }),

      upsert: adminProcedure
        .input(z.object({
          componentId: z.number(),
          host: z.string().min(1),
          port: z.number().int().min(1).max(65535).default(22),
          username: z.string().min(1),
          password: z.string().min(1),
          description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { componentId, ...data } = input;
          await upsertSshCredential(componentId, data as any);
          await logAction(ctx, "UPSERT_SSH_CREDENTIAL", `component:${componentId}`, `host=${data.host}`);
          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({ componentId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          await deleteSshCredential(input.componentId);
          await logAction(ctx, "DELETE_SSH_CREDENTIAL", `component:${input.componentId}`);
          return { success: true };
        }),
    }),
  }),

  wazuh: router({
    getSettings: adminProcedure.query(async () => {
      return getWazuhSettings();
    }),

    updateSettings: adminProcedure
      .input(z.object({
        apiUrl: z.string().optional(),
        apiUsername: z.string().optional(),
        apiPassword: z.string().optional(),
        elasticsearchUrl: z.string().optional(),
        elasticsearchUsername: z.string().optional(),
        elasticsearchPassword: z.string().optional(),
        alertIndexPattern: z.string().optional(),
        refreshInterval: z.number().optional(),
        alertLimit: z.number().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertWazuhSettings(input);
        await logAction(ctx, "UPDATE_WAZUH_SETTINGS", "wazuh:config");
        return { success: true };
      }),

    getAlerts: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        try {
          const { fetchWazuhAlerts } = await import("./wazuh-service");
          const alerts = await fetchWazuhAlerts(input.limit);
          return { success: true, alerts };
        } catch (error: any) {
          return { success: false, error: error.message, alerts: [] };
        }
      }),


    testConnection: adminProcedure.query(async () => {
      try {
        const { testWazuhConnection } = await import("./wazuh-service");
        return await testWazuhConnection();
      } catch (error: any) {
        return { success: false, message: `Unexpected error: ${error.message}` };
      }
    }),








  }),
});

export type AppRouter = typeof appRouter;
