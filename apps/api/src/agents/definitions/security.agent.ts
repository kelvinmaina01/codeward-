import type { AgentDefinition, SandboxHandle } from '../core/provider.js';
import { z } from 'zod';
import * as secTools from './security/security.tools.js';

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
Step 1:  search_memory(repoId)                  → load any team dismissals
Step 2:  run_trufflehog(repoPath, history=true)  → CRITICAL check first
Step 3:  run_trivy(repoPath, "filesystem")       → CVE scan
Step 4:  check_auth_on_routes(baseUrl, routes)   → unprotected endpoints
Step 5:  check_rate_limiting(baseUrl, authPaths) → rate limit enforcement
Step 6:  check_crypto_patterns(repoPath)         → deprecated crypto (static)
Step 7:  scan_for_sqli_patterns(repoPath)        → SQL injection (static)
Step 8:  scan_nhi_tokens(repoPath)               → long-lived tokens
Step 9:  scan_ci_logs_for_leaks(repoPath)        → pipeline leaks
Step 10: check_sbom_integrity(repoPath)          → supply chain
Step 11: run_owasp_zap(baseUrl, "active")        → dynamic OWASP scan
Step 12: check_rls_policies(databaseUrl)         → RLS enforcement
Step 13: check_multitenant_isolation(repoPath)   → tenant isolation
Step 14: probe_ssrf_endpoints(baseUrl)           → SSRF probe
Step 15: test_error_information_leakage(baseUrl) → CWE-209 check
Step 16: check_mfa_on_destructive_routes(baseUrl)→ step-up auth check
Step 17: check_business_logic_bypass(baseUrl)    → flow bypass check
Step 18: [grep_search / read_file as needed]     → verify before asserting
Step 19: write_memory(repoId, summary)           → persist learnings
Step 20: submit_security_report                  → MUST CALL THIS TOOL TO END

If any Critical finding emerges in Steps 2–3, you MAY surface it immediately and continue scanning. Do NOT stop early.

FALSE POSITIVE HANDLING:
Before finalizing ANY finding, ask:
1. Does search_memory show this was dismissed before?
2. Does read_file show this is in a test fixture / mock / example file?
If YES to any → set dismissed: true, dismissalReason: "...", and downgrade severity to INFO.

CRITICAL INSTRUCTION: When you have completed your playbook or found a terminal condition, you MUST call the submit_security_report tool to provide your final SecurityAgentResult object.
  `,
  createTools: (sandbox: SandboxHandle) => {
    return {
      run_trufflehog: secTools.runTrufflehogTool,
      run_trivy: secTools.runTrivyTool,
      run_owasp_zap: secTools.runOwaspZapTool,
      check_auth_on_routes: secTools.checkAuthOnRoutesTool,
      check_rate_limiting: secTools.checkRateLimitingTool,
      check_rls_policies: secTools.checkRlsPoliciesTool,
      scan_for_sqli_patterns: secTools.scanForSqliPatternsTool,
      check_sbom_integrity: secTools.checkSbomIntegrityTool,
      probe_ssrf_endpoints: secTools.probeSsrfEndpointsTool,
      check_multitenant_isolation: secTools.checkMultitenantIsolationTool,
      scan_ci_logs_for_leaks: secTools.scanCiLogsForLeaksTool,
      check_mfa_on_destructive_routes: secTools.checkMfaOnDestructiveRoutesTool,
      check_crypto_patterns: secTools.checkCryptoPatternsTool,
      test_error_information_leakage: secTools.testErrorInformationLeakageTool,
      check_business_logic_bypass: secTools.checkBusinessLogicBypassTool,
      scan_nhi_tokens: secTools.scanNhiTokensTool,
      grep_search: secTools.grepSearchTool,
      read_file: secTools.readFileTool,
      search_memory: secTools.searchMemoryTool,
      write_memory: secTools.writeMemoryTool,
      
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
