# NG-SENTRA SOC Dashboard — Project Overview

This document provides a condensed state-of-the-project summary for AI assistants to quickly understand the architecture, database, and logic of the NG-SENTRA dashboard.

## 1. Project Identity & Architecture
*   **Purpose**: A unified Security Operations Center (SOC) dashboard for managing infrastructure, monitoring AI health, and orchestrating IR workflows.
*   **Stack**: 
    *   **Frontend**: React + Vite + Tailwind CSS + Lucide Icons.
    *   **Backend**: Node.js + Express + tRPC (for API).
    *   **Database**: Drizzle ORM + MySQL (TiDB Cloud).
    *   **Real-time**: WebSockets (SSH2) for browser-based terminals.
*   **Target Machine**: 192.168.1.14 (VirtualBox running Ubuntu) holds the actual security tools (Dockerized).

## 2. Core Features
*   **Dynamic SOC Components**: 11+ tools (Wazuh, Snort, n8n, etc.) managed via a `components` table. Supports `iframe`, `config-file`, and `terminal` access types.
*   **Dynamic SSH Terminal**: A "one-click" shell access system. Every component can have a `customCommand` stored in the DB. Current specific configurations:
    *   **Snort**: `docker exec -it snort /bin/bash`
    *   **UFW**: `sudo ufw status verbose && bash`
    *   **Filebeat**: `sudo systemctl status filebeat && bash`
    *   **Digital Forensics**: `docker start sift 2>/dev/null; docker exec -it sift /bin/bash`
*   **AI Health Monitoring**: 
    *   **Local Probes**: Backend uses `ssh2` to run `systemctl is-active` or `docker inspect`.
    *   **Remote Probes**: HTTP polling of model endpoints.
*   **Local Auth System**: Custom login bypass for local development/deployment (`LOCAL_AUTH_ENABLED=true`).

## 3. Database Schema (Drizzle)
Found in `drizzle/schema.ts`:
*   `components`: Storage for all SOC tools. Key fields: `slug`, `accessType`, `customCommand`, `url`, `port`.
*   `users`: RBAC support (Admin/Analyst/Viewer).
*   `system_settings`: Global config like `SSH_HOST`, `SSH_USER`, `SSH_PASS`.
*   `ssh_credentials`: Component-specific credentials (legacy/alternative).
*   `ai_models`: Health status and endpoint tracking for AI sensors.

## 4. Key Files & Services
*   `server/db.ts`: Connection singleton. **CRITICAL**: Uses `mysql2/promise` with `drizzle({ connection: opts })` to handle SSL JSON in the URL.
*   `server/_core/terminalHandler.ts`: WebSocket bridge to SSH. Handles dynamic command injection from the DB.
*   `server/ai-health-service.ts`: Logic for probing AI model health via SSH/HTTP. Timeouts are set to 30s to accommodate VirtualBox network latency.
*   `server/routers.ts`: The main tRPC router definition.

## 5. Deployment & Configuration
*   **Env File**: `.env.local` contains `DATABASE_URL`, `JWT_SECRET`, and tool-specific URLs.
*   **Start Command**: `pnpm dev` (runs both Vite and the Express backend).
*   **Port**: Backend runs on `3000`.

## 6. Current Status
*   **Fixed Issues**: 
    *   Database connection hangs (Fixed by using proper Drizzle pool initialization).
    *   Missing `customCommand` column (Migrated manually).
    *   SSH Timeouts (Increased to 30s for slow VM connections).
*   **Active Features**: Dashboard successfully displays all components and fetches AI health status via SSH probes.

---
*Use this file as a primary context source when starting a new session.*
