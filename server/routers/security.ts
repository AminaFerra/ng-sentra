import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { securityScans, emulationTests, pentestFindings } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

import { processSecurityScan } from "../scanner-service";

export const securityRouter = router({
  // Security Scans
  getScans: publicProcedure.query(async () => {
    return await (await getDb())!.select().from(securityScans).orderBy(desc(securityScans.createdAt));
  }),
  createScan: publicProcedure
    .input(z.object({
      target: z.string(),
      scannerType: z.enum(["nmap", "zap", "openvas", "custom", "full_suite"]),
    }))
    .mutation(async ({ input }) => {
      const dbInstance = (await getDb())!;
      const [{ insertId }] = await dbInstance.insert(securityScans).values({
        target: input.target,
        scannerType: input.scannerType,
        status: "pending",
      });
      
      // Fire and forget the scanning process
      processSecurityScan(insertId, input.target, input.scannerType).catch(console.error);

      return { success: true };
    }),

  // Emulation Tests
  getEmulationTests: publicProcedure.query(async () => {
    return await (await getDb())!.select().from(emulationTests).orderBy(desc(emulationTests.createdAt));
  }),
  createEmulationTest: publicProcedure
    .input(z.object({
      name: z.string(),
      techniqueId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await (await getDb())!.insert(emulationTests).values({
        name: input.name,
        techniqueId: input.techniqueId,
        status: "planned",
      });
      return { success: true };
    }),
  updateEmulationTestStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["planned", "executed", "detected", "missed"]),
    }))
    .mutation(async ({ input }) => {
      await (await getDb())!.update(emulationTests)
        .set({ status: input.status })
        .where(eq(emulationTests.id, input.id));
      return { success: true };
    }),

  // Pentest Findings
  getFindings: publicProcedure.query(async () => {
    return await (await getDb())!.select().from(pentestFindings).orderBy(desc(pentestFindings.createdAt));
  }),
  createFinding: publicProcedure
    .input(z.object({
      title: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await (await getDb())!.insert(pentestFindings).values({
        title: input.title,
        severity: input.severity,
        description: input.description,
        status: "open",
      });
      return { success: true };
    }),
  updateFindingStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "resolved", "accepted_risk"]),
    }))
    .mutation(async ({ input }) => {
      await (await getDb())!.update(pentestFindings)
        .set({ status: input.status })
        .where(eq(pentestFindings.id, input.id));
      return { success: true };
    }),
});
