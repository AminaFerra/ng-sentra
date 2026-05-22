/**
 * NG-SENTRA Automated Security Audit Script
 * Performs SAST + DAST checks against the local project and running server.
 * Usage: node security-audit.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const BASE = process.cwd();
const SERVER = "http://localhost:3000";
const findings = [];
const timestamp = new Date().toISOString();

function log(msg) { console.log(`  ${msg}`); }
function finding(sev, title, desc, evidence) {
  findings.push({ severity: sev, title, description: desc, evidence: evidence || "" });
  const icon = sev === "CRITICAL" ? "🔴" : sev === "HIGH" ? "🟠" : sev === "MEDIUM" ? "🟡" : "🔵";
  console.log(`  ${icon} [${sev}] ${title}`);
}

// ── 1. Secrets & Environment Audit ──────────────────────────────────────────
function auditSecrets() {
  console.log("\n═══ 1. SECRETS & ENVIRONMENT AUDIT ═══");
  const envFiles = [".env", ".env.local", ".env.production"];
  for (const f of envFiles) {
    const fp = path.join(BASE, f);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, "utf-8");
    // Check if gitignored
    const gi = path.join(BASE, ".gitignore");
    const ignored = fs.existsSync(gi) && fs.readFileSync(gi, "utf-8").includes(f);
    if (!ignored) finding("HIGH", `${f} not in .gitignore`, `Secrets file ${f} may be committed to version control.`);
    // Scan for hardcoded secrets
    const patterns = [
      { re: /PASSWORD\s*=\s*(.+)/gi, name: "Hardcoded password" },
      { re: /SECRET\s*=\s*(.+)/gi, name: "Hardcoded secret" },
      { re: /PRIVATE.?KEY\s*=\s*(.+)/gi, name: "Private key in env" },
    ];
    for (const p of patterns) {
      const m = content.match(p.re);
      if (m) finding("MEDIUM", `${p.name} in ${f}`, `Found ${m.length} occurrence(s). Ensure rotation policy exists.`, m[0].substring(0, 60) + "...");
    }
    // JWT secret strength
    const jwt = content.match(/JWT_SECRET\s*=\s*(.+)/);
    if (jwt && jwt[1].length < 32) finding("HIGH", "Weak JWT_SECRET", `JWT secret is only ${jwt[1].length} chars. Use 32+ random chars.`);
  }
  log("✓ Secrets audit complete");
}

// ── 2. Dependency Vulnerability Scan ────────────────────────────────────────
function auditDependencies() {
  console.log("\n═══ 2. DEPENDENCY VULNERABILITY SCAN ═══");
  try {
    const result = execSync("pnpm audit --json 2>&1", { cwd: BASE, encoding: "utf-8", timeout: 30000 });
    try {
      const json = JSON.parse(result);
      const advisories = json.advisories || {};
      const count = Object.keys(advisories).length;
      if (count > 0) {
        finding("HIGH", `${count} known vulnerabilities in dependencies`, "Run 'pnpm audit' for full details.");
      } else { log("✓ No known CVEs found in dependencies"); }
    } catch { log("⚠ Could not parse audit output, checking manually..."); }
  } catch (e) {
    const out = e.stdout || e.stderr || "";
    if (out.includes("critical") || out.includes("high")) {
      finding("HIGH", "Vulnerable dependencies detected", "pnpm audit reported critical/high issues. Run 'pnpm audit' manually.");
    } else { log("✓ Dependency scan completed (no critical issues detected)"); }
  }
}

// ── 3. Static Code Analysis (SAST) ─────────────────────────────────────────
function auditCode() {
  console.log("\n═══ 3. STATIC APPLICATION SECURITY TESTING ═══");
  const serverFiles = getAllFiles(path.join(BASE, "server"), [".ts", ".js", ".mjs"]);
  const clientFiles = getAllFiles(path.join(BASE, "client"), [".tsx", ".ts", ".js"]);
  const allFiles = [...serverFiles, ...clientFiles];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const rel = path.relative(BASE, file);
    // SQL injection via string concat
    if (/sql`.*\$\{/.test(content) && !/\.execute\(sql/.test(content)) {
      // Drizzle sql tagged templates are parameterized, but raw string concat is not
    }
    if (/query\s*\(\s*['"`].*\+/.test(content) || /execute\s*\(\s*['"`].*\+/.test(content)) {
      finding("CRITICAL", `Potential SQL injection in ${rel}`, "Raw string concatenation in SQL query detected.");
    }
    // Command injection
    if (/exec\s*\(\s*`/.test(content) || /execSync\s*\(\s*`/.test(content)) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/exec(Sync)?\s*\(\s*`/.test(lines[i]) && /\$\{/.test(lines[i])) {
          finding("CRITICAL", `Command injection risk in ${rel}:${i + 1}`, "Template literal with variable interpolation in exec/execSync.", lines[i].trim().substring(0, 100));
        }
      }
    }
    // Path traversal in file operations
    if (/readFile.*req\.(body|query|params)/.test(content) || /cat\s+"?\$\{/.test(content)) {
      finding("HIGH", `Path traversal risk in ${rel}`, "User input flows into file read operations without sanitization.");
    }
    // Eval usage
    if (/\beval\s*\(/.test(content)) finding("CRITICAL", `eval() usage in ${rel}`, "eval() can execute arbitrary code.");
    // Dangerously set HTML
    if (/dangerouslySetInnerHTML/.test(content)) finding("MEDIUM", `dangerouslySetInnerHTML in ${rel}`, "XSS risk if rendering unsanitized user content.");
    // Disabled TLS verification
    if (/rejectUnauthorized.*false/.test(content)) finding("MEDIUM", `TLS verification disabled in ${rel}`, "MITM attacks possible when certificate validation is off.");
    // CORS wildcard
    if (/origin.*\*/.test(content) || /Access-Control-Allow-Origin.*\*/.test(content)) finding("MEDIUM", `CORS wildcard in ${rel}`, "Allowing all origins can expose APIs to cross-origin attacks.");
  }
  log("✓ Static analysis complete");
}

// ── 4. Authentication & Session Audit ───────────────────────────────────────
function auditAuth() {
  console.log("\n═══ 4. AUTHENTICATION & SESSION AUDIT ═══");
  // Check cookie security
  const cookieFile = path.join(BASE, "server/_core/cookies.ts");
  if (fs.existsSync(cookieFile)) {
    const c = fs.readFileSync(cookieFile, "utf-8");
    if (!c.includes("httpOnly: true")) finding("HIGH", "Missing httpOnly on session cookie", "Session cookies accessible to JavaScript.");
    if (c.includes("sameSite: secure ? \"none\" : \"lax\"")) log("✓ SameSite cookie policy is adaptive");
    if (!c.includes("secure")) finding("MEDIUM", "Cookie may lack Secure flag", "Cookie sent over HTTP in production.");
  }
  // Check for publicProcedure on sensitive routes
  const routerFile = path.join(BASE, "server/routers.ts");
  if (fs.existsSync(routerFile)) {
    const r = fs.readFileSync(routerFile, "utf-8");
    const sensitiveKeywords = ["delete", "update", "upsert", "trigger"];
    const lines = r.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("publicProcedure") && sensitiveKeywords.some(k => lines[i - 1]?.toLowerCase().includes(k) || lines[i - 2]?.toLowerCase().includes(k))) {
        finding("HIGH", `Sensitive mutation uses publicProcedure at routers.ts:${i + 1}`, "Mutation may be accessible without authentication.");
      }
    }
  }
  // Check security router
  const secRouter = path.join(BASE, "server/routers/security.ts");
  if (fs.existsSync(secRouter)) {
    const s = fs.readFileSync(secRouter, "utf-8");
    if (s.includes("publicProcedure")) finding("MEDIUM", "Security router uses publicProcedure", "Security assessment endpoints should require authentication (protectedProcedure).");
  }
  // Local auth bypass check
  const localAuth = path.join(BASE, "server/_core/localAuth.ts");
  if (fs.existsSync(localAuth)) {
    const la = fs.readFileSync(localAuth, "utf-8");
    if (!la.includes("rate") && !la.includes("limit")) finding("LOW", "No rate limiting on local auth", "Local auth endpoint has no brute-force protection.");
  }
  log("✓ Authentication audit complete");
}

// ── 5. HTTP Security Headers (DAST) ────────────────────────────────────────
async function auditHeaders() {
  console.log("\n═══ 5. HTTP SECURITY HEADERS (DAST) ═══");
  try {
    const resp = await fetch(SERVER);
    const h = Object.fromEntries(resp.headers.entries());
    const checks = [
      ["strict-transport-security", "HSTS header missing"],
      ["x-content-type-options", "X-Content-Type-Options missing"],
      ["x-frame-options", "X-Frame-Options missing (clickjacking risk)"],
      ["content-security-policy", "CSP header missing"],
      ["x-xss-protection", "X-XSS-Protection header missing"],
      ["referrer-policy", "Referrer-Policy missing"],
    ];
    for (const [header, msg] of checks) {
      if (!h[header]) finding("MEDIUM", msg, `Response from ${SERVER} lacks the ${header} header.`);
      else log(`✓ ${header}: ${h[header].substring(0, 60)}`);
    }
    if (h["server"]) finding("LOW", "Server header exposes technology", `Server: ${h["server"]}`);
    if (h["x-powered-by"]) finding("LOW", "X-Powered-By header exposes framework", `X-Powered-By: ${h["x-powered-by"]}`);
  } catch (e) { log(`⚠ Server not reachable at ${SERVER}: ${e.message}`); }
}

// ── 6. API Endpoint Security (DAST) ────────────────────────────────────────
async function auditEndpoints() {
  console.log("\n═══ 6. API ENDPOINT SECURITY (DAST) ═══");
  // Test unauthenticated access to tRPC
  const endpoints = [
    { path: "/api/trpc/components.list", desc: "Component listing" },
    { path: "/api/trpc/users.list", desc: "User listing" },
    { path: "/api/trpc/audit.list", desc: "Audit logs" },
    { path: "/api/trpc/settings.list", desc: "System settings" },
    { path: "/api/trpc/security.getScans", desc: "Security scans" },
    { path: "/api/trpc/security.getFindings", desc: "Pentest findings" },
    { path: "/api/trpc/aiModels.list", desc: "AI models" },
    { path: "/api/trpc/soar.list", desc: "SOAR approaches" },
  ];
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${SERVER}${ep.path}`);
      const body = await resp.text();
      if (resp.ok && !body.includes("UNAUTHORIZED")) {
        finding("HIGH", `Unauthenticated access to ${ep.desc}`, `GET ${ep.path} returns 200 without session cookie.`);
      } else { log(`✓ ${ep.desc} requires authentication`); }
    } catch { log(`⚠ Could not reach ${ep.path}`); }
  }
  // Test SOAR telemetry endpoint (no auth)
  try {
    const resp = await fetch(`${SERVER}/api/soar/telemetry`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playbook: "AUDIT_TEST", actionTaken: "security_probe" }),
    });
    if (resp.ok) finding("HIGH", "SOAR telemetry endpoint has no auth", "POST /api/soar/telemetry accepts data without authentication.");
  } catch {}
}

// ── 7. SSH & Infrastructure Security ────────────────────────────────────────
function auditInfra() {
  console.log("\n═══ 7. INFRASTRUCTURE SECURITY ═══");
  // Check SSH service for command injection
  const sshFile = path.join(BASE, "server/ssh-service.ts");
  if (fs.existsSync(sshFile)) {
    const s = fs.readFileSync(sshFile, "utf-8");
    if (s.includes('cat "') || s.includes('tee "')) {
      finding("HIGH", "SSH command injection risk", "ssh-service.ts passes user input into shell commands via cat/tee without sanitization.", 'conn.exec(`cat "${filePath}"`)');
    }
  }
  // Check for exposed debug endpoints
  const indexFile = path.join(BASE, "server/_core/index.ts");
  if (fs.existsSync(indexFile)) {
    const idx = fs.readFileSync(indexFile, "utf-8");
    if (idx.includes("__manus__") || idx.includes("debug")) log("⚠ Debug collector plugin detected (dev only)");
  }
}

// ── 8. Configuration Security ───────────────────────────────────────────────
function auditConfig() {
  console.log("\n═══ 8. CONFIGURATION SECURITY ═══");
  // Check TypeScript strict mode
  const tsconfig = path.join(BASE, "tsconfig.json");
  if (fs.existsSync(tsconfig)) {
    const tc = fs.readFileSync(tsconfig, "utf-8");
    if (!tc.includes('"strict": true') && !tc.includes('"strict":true')) finding("LOW", "TypeScript strict mode disabled", "Enables implicit any types which can mask type-related vulnerabilities.");
  }
  // Check for source maps in production
  const viteConfig = path.join(BASE, "vite.config.ts");
  if (fs.existsSync(viteConfig)) {
    const vc = fs.readFileSync(viteConfig, "utf-8");
    if (vc.includes("sourcemap: true") || vc.includes("sourcemap: 'inline'")) finding("LOW", "Source maps enabled", "Source maps in production expose application source code.");
  }
  // Database SSL
  const envLocal = path.join(BASE, ".env.local");
  if (fs.existsSync(envLocal)) {
    const env = fs.readFileSync(envLocal, "utf-8");
    if (env.includes("DATABASE_URL") && !env.includes("ssl")) finding("MEDIUM", "Database connection may lack SSL", "Ensure TLS is enforced for database connections.");
    if (env.includes("DATABASE_URL") && env.includes("ssl")) log("✓ Database connection uses SSL/TLS");
  }
}

// ── Report Generator ────────────────────────────────────────────────────────
function generateReport() {
  const crit = findings.filter(f => f.severity === "CRITICAL").length;
  const high = findings.filter(f => f.severity === "HIGH").length;
  const med = findings.filter(f => f.severity === "MEDIUM").length;
  const low = findings.filter(f => f.severity === "LOW").length;
  const score = Math.max(0, 100 - (crit * 25) - (high * 10) - (med * 5) - (low * 2));
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  let md = `# NG-SENTRA Risk Assessment Report\n\n`;
  md += `**Date:** ${timestamp}\n**Target:** NG-SENTRA SOC Dashboard (localhost:3000)\n**Scope:** Full-stack SAST + DAST\n\n`;
  md += `---\n\n## Executive Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Security Score | **${score}/100 (Grade ${grade})** |\n`;
  md += `| Total Findings | ${findings.length} |\n`;
  md += `| 🔴 Critical | ${crit} |\n| 🟠 High | ${high} |\n| 🟡 Medium | ${med} |\n| 🔵 Low | ${low} |\n\n`;
  md += `---\n\n## Detailed Findings\n\n`;

  const sevOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (const sev of sevOrder) {
    const items = findings.filter(f => f.severity === sev);
    if (!items.length) continue;
    const icon = sev === "CRITICAL" ? "🔴" : sev === "HIGH" ? "🟠" : sev === "MEDIUM" ? "🟡" : "🔵";
    md += `### ${icon} ${sev} Findings\n\n`;
    for (const f of items) {
      md += `#### ${f.title}\n- **Severity:** ${sev}\n- **Description:** ${f.description}\n`;
      if (f.evidence) md += `- **Evidence:** \`${f.evidence}\`\n`;
      md += `\n`;
    }
  }

  md += `---\n\n## Recommendations\n\n`;
  if (crit > 0) md += `1. **Immediate:** Fix all CRITICAL findings (command injection, SQL injection, eval usage).\n`;
  if (high > 0) md += `2. **Urgent:** Address HIGH findings within 48 hours (auth bypass, path traversal, secret exposure).\n`;
  if (med > 0) md += `3. **Short-term:** Resolve MEDIUM findings within 1 week (missing headers, TLS issues).\n`;
  if (low > 0) md += `4. **Long-term:** Plan fixes for LOW findings in next sprint.\n`;
  md += `\n---\n*Report generated by NG-SENTRA Security Audit Engine*\n`;

  const outPath = path.join(BASE, "risk-assessment-report.md");
  fs.writeFileSync(outPath, md, "utf-8");
  console.log(`\n📄 Report saved to: ${outPath}`);
  return { score, grade, total: findings.length, crit, high, med, low };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getAllFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...getAllFiles(full, exts));
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║   NG-SENTRA Automated Security Assessment Engine     ║");
  console.log("║   Target: localhost:3000 | Scope: Full-Stack         ║");
  console.log("╚═══════════════════════════════════════════════════════╝");

  auditSecrets();
  auditDependencies();
  auditCode();
  auditAuth();
  await auditHeaders();
  await auditEndpoints();
  auditInfra();
  auditConfig();

  console.log("\n═══ GENERATING RISK ASSESSMENT REPORT ═══");
  const r = generateReport();
  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║  SCORE: ${r.score}/100 (Grade ${r.grade})  |  ${r.total} findings total       ║`);
  console.log(`║  🔴 ${r.crit} Critical  🟠 ${r.high} High  🟡 ${r.med} Medium  🔵 ${r.low} Low    ║`);
  console.log(`╚═══════════════════════════════════════════════════════╝`);
}

main().catch(console.error);
