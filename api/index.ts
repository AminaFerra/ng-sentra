import dotenv from "dotenv";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routes";
import { createContext } from "../server/_core/context";
import { insertSoarTelemetry } from "../server/db";

// Load .env first, then override with .env.local when present.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { registerLocalAuthRoutes } from "../server/_core/localAuth";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerGoogleAuthRoutes } from "../server/_core/googleAuth";
import { registerStorageProxy } from "../server/_core/storageProxy";

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup routes synchronously
registerStorageProxy(app);
registerLocalAuthRoutes(app);
registerOAuthRoutes(app);
registerGoogleAuthRoutes(app);

// Webhook Receiver for n8n Telemetry
app.post("/api/soar/telemetry", async (req, res) => {
  try {
    await insertSoarTelemetry({
      playbook: req.body.playbook || "Unknown Playbook",
      actionTaken: req.body.actionTaken || "Workflow Executed",
      details: req.body.details ? (typeof req.body.details === "string" ? req.body.details : JSON.stringify(req.body.details)) : null,
      executionId: req.body.executionId || "N/A"
    });
    res.json({ success: true, message: "Telemetry successfully logged to NG-SENTRA database" });
  } catch (e: any) {
    console.error("[SOAR Telemetry Error]:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
