# NG-SENTRA Cloud Deployment — Complete Walkthrough

## Table of Contents
1. [Overview](#overview)
2. [Why Not Vercel or Render?](#why-not-vercel-or-render)
3. [Why Cloudflare Tunnel?](#why-cloudflare-tunnel)
4. [Architecture Diagram](#architecture-diagram)
5. [Prerequisites](#prerequisites)
6. [Step-by-Step Deployment](#step-by-step-deployment)
7. [How to Restart the Deployment](#how-to-restart-the-deployment)
8. [Permanent Setup (Named Tunnel)](#permanent-setup-named-tunnel)
9. [Troubleshooting](#troubleshooting)

---

## Overview

NG-SENTRA is a full-stack SOC (Security Operations Center) dashboard built with:
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Express + tRPC
- **Database**: TiDB Cloud (MySQL-compatible, public internet)
- **Local Infrastructure**: VirtualBox VM at `192.168.1.14` running Wazuh, AI models, Docker containers

The dashboard connects to **local private network resources** (SSH terminal, Wazuh Elasticsearch, AI health checks). This is the critical constraint that dictates our deployment strategy.

---

## Why Not Vercel or Render?

### Vercel — Failed ❌

We attempted to deploy on Vercel first. Here's what went wrong:

| Problem | Details |
|---|---|
| **Serverless Architecture** | Vercel runs code as short-lived "serverless functions" (AWS Lambda under the hood). Each request spins up a new isolated container, runs for a few seconds, then dies. This is fundamentally incompatible with persistent SSH/WebSocket connections. |
| **Native Module Crashes** | The `ssh2` library uses C++ bindings (`cpu-features.node`). Vercel's restricted serverless runtime cannot load native `.node` binary modules, causing `FUNCTION_INVOCATION_FAILED` errors on every request. |
| **ESM Directory Collision** | We had both a file `server/routers.ts` and a directory `server/routers/`. In Node.js ESM mode, `import "../server/routers"` resolved to the **directory** instead of the file, causing `ERR_UNSUPPORTED_DIR_IMPORT`. We fixed this by renaming to `routes.ts`, but more issues kept appearing. |
| **Cannot Reach Local Network** | Even if all the above were fixed, Vercel servers are in AWS data centers. They physically **cannot reach `192.168.1.14`** — that IP only exists on your home LAN. SSH, Wazuh, and AI health checks would all fail with connection timeouts. |

### Render — Blocked ❌

Render is a traditional server platform (not serverless) that would have worked perfectly — it runs a persistent Node.js process just like your local machine. However:
- Render requires a **credit card** for account verification, even on the free tier
- Same network problem: Render servers cannot reach `192.168.1.14`

---

## Why Cloudflare Tunnel?

Cloudflare Tunnel solves the deployment problem perfectly:

| Benefit | How |
|---|---|
| **Public HTTPS URL** | Cloudflare gives you a URL like `https://xxx.trycloudflare.com` that anyone on the internet can access |
| **Backend stays local** | The server runs on your Windows PC, so it can freely access `192.168.1.14` (SSH, Wazuh, Docker, AI) |
| **Zero code changes** | No serverless hacks, no dynamic imports, no CORS workarounds — the app runs exactly as it does in development |
| **Free, no credit card** | Quick tunnels require zero signup. Named tunnels require a free Cloudflare account (no credit card) |
| **Encrypted** | All traffic between users and your PC is encrypted via Cloudflare's QUIC protocol |
| **No port forwarding** | Unlike traditional hosting, you don't need to open ports on your router or configure firewall rules |

### How Cloudflare Tunnel Works (Simplified)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE INTERNET                                 │
│                                                                     │
│  👤 User's Browser                                                  │
│       │                                                             │
│       │ HTTPS request to ng-sentra.trycloudflare.com                │
│       ▼                                                             │
│  ☁️  Cloudflare Edge Server (nearest to user)                       │
│       │                                                             │
│       │ Encrypted QUIC tunnel (outbound from your PC, so no         │
│       │ port forwarding needed — your PC initiated this connection)  │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  🖥️  YOUR WINDOWS PC                                        │    │
│  │                                                             │    │
│  │  cloudflared daemon ──► Express Server (localhost:3000)     │    │
│  │                              │                              │    │
│  │                    ┌─────────┼─────────┐                    │    │
│  │                    ▼         ▼         ▼                    │    │
│  │              SSH:22     HTTPS:9200   MySQL:4000             │    │
│  │           VirtualBox    Wazuh/ES    TiDB Cloud              │    │
│  │          192.168.1.14  192.168.1.14  (public)               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight**: `cloudflared` makes an **outbound** connection from your PC to Cloudflare. Since it's outbound, your router/firewall allows it (just like a web browser). Cloudflare then routes incoming web traffic through this established tunnel. This is why no port forwarding or firewall changes are needed.

---

## Prerequisites

Before deployment, ensure you have:

- [x] **Node.js** v22+ installed
- [x] **pnpm** package manager installed
- [x] **cloudflared** installed (we installed v2026.5.0 via `winget`)
- [x] **`.env.local`** file configured with:
  - `DATABASE_URL` — TiDB Cloud connection string
  - `LOCAL_AUTH_ENABLED=true` — enables login without OAuth
  - `JWT_SECRET` — session signing key
  - Wazuh, Google Auth, and other settings
- [x] **VirtualBox VM** running at `192.168.1.14` (for SSH/Wazuh features)

---

## Step-by-Step Deployment

### Step 1: Install `cloudflared`

Open PowerShell and run:

```powershell
winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
```

Verify installation (you may need to restart your terminal for PATH to update):

```powershell
cloudflared --version
# Expected output: cloudflared version 2026.5.0
```

> [!NOTE]
> If `cloudflared` is not recognized after installation, refresh your PATH:
> ```powershell
> $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
> ```

---

### Step 2: Build the Production App

Navigate to the project directory and build:

```powershell
cd C:\Users\ZIAD\ng-sentra
pnpm build
```

This runs two build steps (defined in `package.json`):
1. **`vite build`** — Compiles the React frontend into optimized static files at `dist/public/`
2. **`esbuild server/_core/index.ts`** — Bundles the Express backend into a single `dist/index.js`

Expected output:
```
vite v7.1.9 building for production...
✓ 2798 modules transformed.
../dist/public/index.html                     0.91 kB
../dist/public/assets/index-D58usdkP.css    173.75 kB
../dist/public/assets/index-C7c3V-BN.js   1,658.07 kB
✓ built in 8.12s

  dist\index.js  97.5kb
Done in 114ms
```

---

### Step 3: Start the Production Server

```powershell
$env:NODE_ENV="production"
node dist/index.js
```

Expected output:
```
[dotenv@17.2.3] injecting env (19) from .env.local
Server running on http://localhost:3000/
```

> [!TIP]
> If port 3000 is already in use (e.g., by `pnpm dev`), the server will automatically find the next available port (3001, 3002, etc.). Note which port it chooses — you'll need it for the next step.

---

### Step 4: Start the Cloudflare Tunnel

Open a **second terminal** (keep the server running in the first one) and run:

```powershell
cloudflared tunnel --url http://localhost:3000
```

> [!IMPORTANT]
> Replace `3000` with whatever port the server is actually running on (from Step 3).

Expected output:
```
INF Requesting new quick Tunnel on trycloudflare.com...
INF +--------------------------------------------------------------------------------------------+
INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
INF |  https://smallest-compression-lecture-work.trycloudflare.com                               |
INF +--------------------------------------------------------------------------------------------+
INF Registered tunnel connection connIndex=0 location=mrs06 protocol=quic
```

### Step 5: Access Your Dashboard! 🎉

Open the URL from the tunnel output in any browser:

**https://smallest-compression-lecture-work.trycloudflare.com**

You will see the NG-SENTRA login page. Click "Login" to authenticate via Local Auth, and the full dashboard will load with all features working:

| Feature | Status | How It Works |
|---|---|---|
| Dashboard UI | ✅ Working | React frontend served from `dist/public/` |
| Login/Auth | ✅ Working | Local auth creates a session cookie via `/api/local-auth/login` |
| Database (TiDB) | ✅ Working | Backend connects to TiDB Cloud over public internet |
| SSH Terminal | ✅ Working | Backend SSH's to `192.168.1.14` on your LAN |
| Wazuh Alerts | ✅ Working | Backend queries Elasticsearch at `192.168.1.14:9200` |
| AI Health Checks | ✅ Working | Backend probes systemd/docker on VM via SSH |
| Security Scanner | ✅ Working | Backend runs scans against targets on your network |
| SOAR Telemetry | ✅ Working | Webhook endpoint receives n8n automation data |

---

## How to Restart the Deployment

Every time you restart your PC or close the terminals, you need to run two commands:

### Terminal 1 — Start the Server
```powershell
cd C:\Users\ZIAD\ng-sentra
$env:NODE_ENV="production"
node dist/index.js
```

### Terminal 2 — Start the Tunnel
```powershell
cloudflared tunnel --url http://localhost:3000
```

> [!WARNING]
> Quick tunnels generate a **new random URL** each time you restart `cloudflared`. If you need a **permanent, unchanging URL**, see the next section.

---

## Permanent Setup (Named Tunnel)

If you want a fixed URL (e.g., `ng-sentra.yourdomain.com`) that never changes:

### 1. Create a Free Cloudflare Account
Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up. No credit card required.

### 2. Add a Domain
You need a domain name. Options:
- **Buy one**: Cloudflare Registrar offers domains at cost (~$10/year for `.com`)
- **Free domain**: Register at [nic.eu.org](https://nic.eu.org) (free `.eu.org` subdomains) or [freedns.afraid.org](https://freedns.afraid.org)

Add the domain to your Cloudflare account and update your domain's nameservers to Cloudflare's.

### 3. Authenticate `cloudflared`
```powershell
cloudflared tunnel login
```
This opens a browser where you authorize `cloudflared` with your Cloudflare account.

### 4. Create a Named Tunnel
```powershell
cloudflared tunnel create ng-sentra
```

### 5. Map DNS to the Tunnel
```powershell
cloudflared tunnel route dns ng-sentra ng-sentra.yourdomain.com
```

### 6. Create a Config File
Create `C:\Users\ZIAD\.cloudflared\config.yml`:
```yaml
tunnel: <tunnel-id-from-step-4>
credentials-file: C:\Users\ZIAD\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: ng-sentra.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 7. Run the Named Tunnel
```powershell
cloudflared tunnel run ng-sentra
```

### 8. (Optional) Install as Windows Service
To auto-start on boot:
```powershell
cloudflared service install
```

Now `ng-sentra.yourdomain.com` will always point to your local server, and it will automatically reconnect even after PC restarts.

---

## Troubleshooting

### "cloudflared is not recognized"
Refresh your terminal's PATH:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
Or restart your terminal/VS Code.

### "Port 3000 is busy"
Your development server (`pnpm dev`) is still running. Either:
- Stop it and use port 3000 for production
- Let the production server use port 3001 and point the tunnel to `http://localhost:3001`

### Tunnel URL is not loading
- Wait 10-30 seconds after creating the tunnel — DNS propagation takes a moment
- Check that the server is actually running (Terminal 1 should show "Server running on http://localhost:3000/")
- Try refreshing the page

### "502 Bad Gateway" on the tunnel URL
The tunnel is working, but the backend server is not running or crashed. Check Terminal 1 for errors.

### SSH Terminal not connecting
- Ensure your VirtualBox VM is running and accessible at `192.168.1.14`
- Verify SSH credentials are configured in the dashboard Settings page
- Test with: `ssh user@192.168.1.14` from PowerShell

### Database errors
- Verify `DATABASE_URL` in `.env.local` is correct
- TiDB Cloud requires SSL — the connection string should include `ssl={"rejectUnauthorized":true}`

---

## Files Modified During This Process

| File | Change | Reason |
|---|---|---|
| `server/_core/index.ts` | Removed Vercel conditional export | Reverted to standard server startup |
| `server/ai-health-service.ts` | Reverted dynamic `ssh2` import to static | No longer needed without Vercel's restricted runtime |
| `package.json` | Reverted build script | Removed Vercel API bundling step |
| `vercel.json` | **Deleted** | No longer deploying to Vercel |
| `api/_index.ts` | **Deleted** | Vercel serverless entry point no longer needed |

---

> [!TIP]
> **Quick Reference — Deploy in 30 Seconds:**
> ```powershell
> cd C:\Users\ZIAD\ng-sentra
> pnpm build                                        # Build frontend + backend
> $env:NODE_ENV="production"; node dist/index.js     # Terminal 1: Start server
> cloudflared tunnel --url http://localhost:3000      # Terminal 2: Start tunnel
> ```
> Share the generated `*.trycloudflare.com` URL with anyone!
