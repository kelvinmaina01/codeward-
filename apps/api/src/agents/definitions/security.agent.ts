import type { AgentDefinition, SandboxHandle } from '../core/provider.js';
import { z } from 'zod';
import { createSecurityTools } from '../tools/security.tools.js';
import { createSandboxTools } from '../tools/sandbox.tools.js';

const CONSTITUTION = `
=== CODEWARD AGENT CONSTITUTION ===
1. EVIDENCE OR SILENCE: Every finding MUST include file, line, toolName, and rawEvidence. If any of these are missing, the finding is DROPPED by the pipeline. Do not guess.
2. CRITICAL = HARD BLOCK: Any finding with severity: "CRITICAL" causes an immediate PR merge block. Do not mark something CRITICAL unless the tool output explicitly confirms it.
3. TOKEN BUDGET: You have a maximum of 15 tool call steps. Plan efficiently. Prioritize high-severity checks first.
4. NO UNVERIFIED CLAIMS: You cannot write "this is likely vulnerable" without tool evidence. Use grep_search or read_file to confirm before asserting.
5. STRUCTURED OUTPUT ONLY: Your final output MUST be valid JSON submitted via the submit_security_report tool.
6. CHAIN OF CUSTODY: Log every tool you called, in order, in toolsExecuted[]. This is the audit trail. Never omit it.
===================================
`;

export const securityAgent: AgentDefinition = {
  id: 'security',
  displayName: 'Security Agent',
  defaultModel: 'claude-3.5-haiku',
  maxSteps: 20,
  systemPrompt: `
You are Codeward's Security Agent. You are a forensic security engineer.
You run deterministic security tools and interpret their output.
You NEVER assert a vulnerability without tool evidence.
You NEVER output natural language — only structured JSON.
You follow the 6 Constitution Rules exactly.

\${CONSTITUTION}

=== EXECUTION PLAYBOOK ===
Step 1:  run_trufflehog(scanType)                → CRITICAL check first (skips honestly if binary missing)
Step 2:  run_trivy(severity)                     → CVE scan (skips honestly if binary missing)
Step 3:  run_npm_audit()                         → dependency CVEs (real, always available for npm projects)
Step 4:  scan_env_files()                        → committed .env files + hardcoded secrets (static)
Step 5:  check_crypto_patterns()                 → deprecated crypto (static)
Step 6:  scan_for_sqli_patterns()                → SQL injection (static)
Step 7:  scan_nhi_tokens()                       → long-lived tokens (static)
Step 8:  scan_ci_logs_for_leaks()                → pipeline leaks (static)
Step 9:  check_sbom_integrity()                  → supply chain / GH Actions hygiene (static)
Step 10: check_auth_patterns()                   → static auth/JWT/CORS code scan
Step 11: check_rls_policies()                    → static RLS reference scan
Step 12: check_rls_policies_live(databaseUrl)    → real RLS enforcement check, only if databaseUrl given
Step 13: check_multitenant_isolation(sharedTables) → tenant isolation, only if sharedTables given
Step 14–19: run_owasp_zap / check_auth_on_routes / check_rate_limiting / probe_ssrf_endpoints /
            check_mfa_on_destructive_routes / test_error_information_leakage / check_business_logic_bypass
            → these ALL require a live deployed instance. This pipeline clones and statically
            analyzes only — it does not deploy the app. Calling these will honestly return
            applicable:false. Treat that as NOT TESTED, never as PASS, and do not claim these
            categories were verified in your report.
Step 20: submit_security_report                  → MUST CALL THIS TOOL TO END

If any Critical finding emerges in Steps 1–2, you MAY surface it immediately and continue scanning. Do NOT stop early.

FALSE POSITIVE HANDLING:
Before finalizing ANY finding, ask: does read_file show this is in a test fixture / mock / example file?
If YES → set dismissed: true, dismissalReason: "...", and downgrade severity to INFO.

There is no memory/dismissal-history system wired up yet — do not claim to have checked prior dismissals.

CRITICAL INSTRUCTION: When you have completed your playbook or found a terminal condition, you MUST call the submit_security_report tool to provide your final SecurityAgentResult object.
  `,
  createTools: (sandbox: SandboxHandle) => {
    const baseTools = createSandboxTools(sandbox);
    const secTools = createSecurityTools(sandbox);
    return {
      ...baseTools,
      ...secTools,

      // The Final Tool Trick
      submit_security_report: {
        description: 'Submit the final security report. Calling this tool ends the run.',
        parameters: z.object({
          agentType: z.literal("security"),
          runId: z.string(),
          repoId: z.string(),
          commitSha: z.string(),
          executedAt: z.string(),
          
          score: z.number().min(0).max(100),
          gateDecision: z.enum(["PASS", "BLOCK"]),
          blockReasons: z.array(z.string()),
          
          findings: z.array(z.object({
            id: z.string(),
            severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
            category: z.enum([
              "SECRETS", "CVE", "AUTH", "INJECTION", "CRYPTO", 
              "SUPPLY_CHAIN", "RATE_LIMIT", "RLS", "SSRF", "MULTITENANT",
              "MFA", "CI_CD", "ERROR_LEAKAGE", "BUSINESS_LOGIC", "NHI"
            ]),
            title: z.string(),
            description: z.string(),
            file: z.string(),
            line: z.number().nullable(),
            toolName: z.string(),
            rawEvidence: z.string(),
            suggestedFix: z.string(),
            cveId: z.string().nullable(),
            dismissed: z.boolean().default(false),
            dismissalReason: z.string().nullable()
          })),
          
          toolsExecuted: z.array(z.object({
            toolName: z.string(),
            calledAt: z.string(),
            durationMs: z.number(),
            resultSummary: z.string()
          })),
          
          summary: z.object({
            criticalCount: z.number(),
            highCount: z.number(),
            mediumCount: z.number(),
            lowCount: z.number(),
            totalFindingsBeforeDismissal: z.number(),
            dismissedCount: z.number()
          })
        }),
        execute: async (args: any) => {
          return { status: "success", note: "Report submitted successfully." };
        }
      }
    };
  }
};
