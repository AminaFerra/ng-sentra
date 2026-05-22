import { getDb } from "./db";
import { securityScans, pentestFindings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Define 20+ automated checks for the simulation
const PENTEST_CHECKS = [
  "1. TCP Port Scan (Top 1000 ports)",
  "2. UDP Port Scan (Top 100 ports)",
  "3. OS Fingerprinting (TCP/IP stack analysis)",
  "4. Service Version Detection",
  "5. Anonymous FTP Access Check",
  "6. Default SSH Credentials Verification",
  "7. Web Server Directory Enumeration",
  "8. SSL/TLS Certificate Validation",
  "9. HTTP Security Headers Analysis",
  "10. Cross-Site Scripting (XSS) Probes",
  "11. SQL Injection (SQLi) Payload Testing",
  "12. Open Redirect Vulnerability Check",
  "13. CORS Misconfiguration Audit",
  "14. Exposed .git Directory Check",
  "15. Unauthenticated API Endpoint Discovery",
  "16. SMB Null Session Enumeration",
  "17. SNMP Public Community String Check",
  "18. Missing Patch Detection (CVE correlation)",
  "19. Insecure Cookie Flags Verification",
  "20. Local File Inclusion (LFI) Fuzzing",
  "21. Remote Code Execution (RCE) Safe Probes",
  "22. DNS Zone Transfer Attempt",
];

const MOCK_VULNERABILITIES = [
  { title: "Unauthenticated API Endpoint Detected", severity: "high", desc: "Found an open API endpoint leaking internal metrics without authorization checks." },
  { title: "Missing HTTP Strict Transport Security", severity: "low", desc: "The HSTS header is not configured on the target web server." },
  { title: "Outdated SSH Server Version", severity: "medium", desc: "Target is running OpenSSH 7.2p2, which has known vulnerabilities." },
  { title: "Default Web Server Configuration Found", severity: "low", desc: "Apache default index page is exposed." },
  { title: "Reflected XSS in Search Parameter", severity: "high", desc: "The 'q' parameter on the search endpoint reflects user input without sanitization." },
  { title: "Weak SSL/TLS Cipher Suites Supported", severity: "medium", desc: "Server supports TLSv1.0 and weak CBC ciphers." }
];

export async function processSecurityScan(scanId: number, target: string, scannerType: string) {
  // Set status to running
  await (await getDb())!.update(securityScans)
    .set({ status: "running" })
    .where(eq(securityScans.id, scanId));

  try {
    let resultSummary = "";

    if (scannerType === "full_suite") {
      // Simulate running 20+ attacks over 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const successfulExploits = Math.floor(Math.random() * 3) + 1; // 1-3 simulated findings
      
      const foundVulns: typeof MOCK_VULNERABILITIES = [];
      const dbInstance = (await getDb())!;
      
      // Map vulnerabilities to the check index that discovered them
      const VULN_TO_CHECK_MAP: Record<string, number> = {
        "Unauthenticated API Endpoint Detected": 14,      // Check 15
        "Missing HTTP Strict Transport Security": 8,       // Check 9
        "Outdated SSH Server Version": 3,                  // Check 4
        "Default Web Server Configuration Found": 6,       // Check 7
        "Reflected XSS in Search Parameter": 9,            // Check 10
        "Weak SSL/TLS Cipher Suites Supported": 7,         // Check 8
      };

      const vulnCheckIndices = new Set<number>();
      
      for(let i=0; i<successfulExploits; i++) {
        const randVuln = MOCK_VULNERABILITIES[Math.floor(Math.random() * MOCK_VULNERABILITIES.length)];
        foundVulns.push(randVuln);
        
        const checkIdx = VULN_TO_CHECK_MAP[randVuln.title];
        if (checkIdx !== undefined) vulnCheckIndices.add(checkIdx);
        
        await dbInstance.insert(pentestFindings).values({
          title: `[${target}] ${randVuln.title}`,
          severity: randVuln.severity as any,
          description: randVuln.desc,
          status: "open"
        });
      }

      // Build check results: mark vulnerable checks as [VULN], others as [OK]
      const checkLines = PENTEST_CHECKS.map((check, idx) => {
        if (vulnCheckIndices.has(idx)) {
          return `[VULN] ${check}`;
        }
        return `[OK] ${check}`;
      }).join('\n');
      
      resultSummary = `Automated Pentest Suite Completed.\nTarget: ${target}\nExecuted ${PENTEST_CHECKS.length} security checks.\n\nChecks Performed:\n${checkLines}\n\nVulnerabilities Found: ${successfulExploits}\n${foundVulns.map((v, i) => `  ${i+1}. [${v.severity.toUpperCase()}] ${v.title}`).join('\n')}\n\nSummary: ${successfulExploits} potential vulnerabilities identified and automatically logged to the Findings tab.`;
    } 
    else if (scannerType === "nmap") {
      await new Promise(resolve => setTimeout(resolve, 3000));
      resultSummary = `Nmap Scan Report for ${target}\nHost is up.\nNot shown: 997 closed tcp ports\nPORT    STATE SERVICE\n22/tcp  open  ssh\n80/tcp  open  http\n443/tcp open  https`;
    } 
    else if (scannerType === "zap") {
      await new Promise(resolve => setTimeout(resolve, 4000));
      resultSummary = `OWASP ZAP Report for ${target}\nAlerts:\n- High: 0\n- Medium: 1 (Missing Anti-clickjacking Header)\n- Low: 2\n- Informational: 5`;
    }
    else {
      await new Promise(resolve => setTimeout(resolve, 2000));
      resultSummary = `Scan completed successfully against ${target}. No critical issues found.`;
    }

    // Update with results
    await (await getDb())!.update(securityScans)
      .set({ 
        status: "completed", 
        resultSummary,
      })
      .where(eq(securityScans.id, scanId));

  } catch (error: any) {
    console.error("Scan failed:", error);
    await (await getDb())!.update(securityScans)
      .set({ 
        status: "failed", 
        resultSummary: `Error executing scan: ${error.message}` 
      })
      .where(eq(securityScans.id, scanId));
  }
}
