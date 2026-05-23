import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerStorageProxy } from "./storageProxy";
import { getSessionCookieOptions } from "./cookies";
import { setupTerminalHandler } from "./terminalHandler";
import { appRouter } from "../routes";
import { createContext } from "./context";
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

// Cache proxy instances to prevent MaxListenersExceededWarning memory leaks
const proxyInstances: Record<string, express.RequestHandler> = {};

// SPA Double Path Fixer Middleware
// SPAs (like n8n with Vue Router) sometimes read window.location.pathname and push it to the router,
// causing the base path to be duplicated (e.g., /proxy/slug/proxy/slug/). This catches and fixes it.
app.use((req, res, next) => {
  const doubleProxyRegex = /^\/proxy\/([^/]+)\/proxy\/\1(.*)/;
  const match = req.url.match(doubleProxyRegex);
  if (match) {
    const slug = match[1];
    const rest = match[2];
    return res.redirect(`/proxy/${slug}${rest}`);
  }
  next();
});

// SPA Subpath Fixer Middleware
// When a complex app like Wazuh loads via /proxy/wazuh, it requests assets from the root (e.g., /bundles/app.js).
// This middleware checks the Referer header. If the request came from a proxy page, we invisibly rewrite 
// the URL to go through the proxy so the assets load correctly!
app.use((req, res, next) => {
  const referer = req.get('Referer');
  if (referer && !req.path.startsWith('/proxy/')) {
    // Look for /proxy/slug in the Referer URL
    try {
      const refererUrl = new URL(referer);
      const match = refererUrl.pathname.match(/^\/proxy\/([^/]+)/);
      if (match) {
        const slug = match[1];
        // Rewrite the internal request URL so it hits the proxy middleware below
        req.url = `/proxy/${slug}${req.url}`;
      }
    } catch (e) {
      // Ignore invalid Referer URLs
    }
  }
  next();
});

// Dynamic Component Reverse Proxy
// We place this before body-parser so the proxy receives the raw request body!
app.use('/proxy/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    
    if (proxyInstances[slug]) {
      return proxyInstances[slug](req, res, next);
    }

    const { getAllComponents } = await import("../db");
    const components = await getAllComponents();
    const component = components.find((c: any) => c.slug === slug);

    if (!component || !component.url) {
      return res.status(404).send(`Component URL not configured for slug: ${slug}`);
    }

    // Build the target URL
    const rawTargetUrl = component.port ? `${component.url}:${component.port}` : component.url;
    let origin = rawTargetUrl;
    let targetPath = '';
    
    try {
      const urlObj = new URL(rawTargetUrl);
      origin = urlObj.origin;
      targetPath = urlObj.pathname === '/' ? '' : urlObj.pathname;
    } catch (e) {
      // Fallback if not a valid URL
    }

    // Create and cache the proxy instance
    proxyInstances[slug] = createProxyMiddleware({
      target: origin,
      changeOrigin: true,
      secure: false, // Bypass self-signed cert errors
      pathRewrite: (path, req) => {
        // If the user requests the exact proxy root, route them to the specific path configured in the DB
        if (path === `/proxy/${slug}` || path === `/proxy/${slug}/`) {
          return targetPath || '/';
        }
        // For all other requests (like assets /static/..., /bundles/...), strip the proxy prefix
        // and fetch them from the root of the target server
        return path.replace(new RegExp(`^/proxy/${slug}`), '');
      },
      selfHandleResponse: true, // We handle ALL responses ourselves
      on: {
        proxyRes: responseInterceptor(async (responseBuffer: Buffer, proxyRes: any, req: any, res: any) => {
          const contentType = proxyRes.headers['content-type'] || '';
          const basePath = `/proxy/${slug}`;

          // 1. Handle Redirects (301, 302, 307, 308)
          if ([301, 302, 307, 308].includes(proxyRes.statusCode || 200)) {
            const location = proxyRes.headers.location;
            if (location && location.startsWith('/')) {
              res.setHeader('location', `/proxy/${slug}${location}`);
            }
            return responseBuffer;
          }

          // 2. Handle HTML rewriting for SPAs (Kibana/Wazuh/n8n)
          if (contentType.includes('text/html')) {
            let html = responseBuffer.toString('utf8');

            // Rewrite Kibana/OpenSearch Dashboards basePath dynamically!
            html = html.replace(/&quot;basePath&quot;:&quot;&quot;/g, `&quot;basePath&quot;:&quot;${basePath}&quot;`);
            html = html.replace(/&quot;serverBasePath&quot;:&quot;&quot;/g, `&quot;serverBasePath&quot;:&quot;${basePath}&quot;`);

            // Rewrite absolute paths for n8n and T-Pot (e.g., src="/assets/..." -> src="/proxy/slug/assets/...")
            html = html.replace(/href="\//g, `href="${basePath}/`);
            html = html.replace(/src="\//g, `src="${basePath}/`);

            // Inject <base> tag and unsafe-url referrer policy
            if (!html.includes('<base href=')) {
              html = html.replace('<head>', `<head><base href="${basePath}/" /><meta name="referrer" content="unsafe-url" />`);
            }

            return html;
          }

          // 3. Handle Javascript rewriting for n8n
          if (contentType.includes('javascript') || contentType.includes('application/x-javascript')) {
            let js = responseBuffer.toString('utf8');
            if (js.includes("window.BASE_PATH = '/'")) {
              js = js.replace("window.BASE_PATH = '/'", `window.BASE_PATH = '${basePath}/'`);
            }
            if (js.includes('window.BASE_PATH="/"')) {
              js = js.replace('window.BASE_PATH="/"', `window.BASE_PATH="${basePath}/"`);
            }
            // Rewrite dynamic import paths hardcoded inside Vite bundles
            js = js.replace(/"\/assets\//g, `"${basePath}/assets/`);
            js = js.replace(/'\/assets\//g, `'${basePath}/assets/`);
            js = js.replace(/"\/static\//g, `"${basePath}/static/`);
            js = js.replace(/'\/static\//g, `'${basePath}/static/`);
            return js;
          }

          // For everything else (JSON, SSE, images, etc.) return as-is
          return responseBuffer;
        }),
      },
    });

    // Execute the proxy
    proxyInstances[slug](req, res, next);
  } catch (error) {
    console.error("[Proxy Error]:", error);
    res.status(500).send("Proxy routing failed");
  }
});

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

startServer().catch(console.error);
export default app;
