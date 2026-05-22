import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerStorageProxy } from "./storageProxy";
import { getSessionCookieOptions } from "./cookies";
import { setupTerminalHandler } from "./terminalHandler";
import { appRouter } from "../routes";
import { createContext } from "./context";
// Dynamic imports used to prevent Vite devDependencies from crashing Vercel Serverless environment
// Load .env first, then override with .env.local when present.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const app = express();
const server = createServer(app);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup routes synchronously
registerStorageProxy(app);
registerLocalAuthRoutes(app);
registerOAuthRoutes(app);
registerGoogleAuthRoutes(app);
setupTerminalHandler(server);

// Webhook Receiver for n8n Telemetry
app.post("/api/soar/telemetry", async (req, res) => {
  try {
    const { insertSoarTelemetry } = await import("../db");
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

async function startServer() {
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

if (process.env.VERCEL || process.env.VERCEL_ENV) {
  // On Vercel, we export the Express app for Serverless Functions
  console.log("Running in Vercel Serverless mode");
} else {
  // Otherwise, start the standard Node.js HTTP server
  startServer().catch(console.error);
}

export default app;
