import type { AgentDefinition, SandboxHandle } from '../core/provider.js';
import { z } from 'zod';
import { createSecurityTools } from '../tools/security.tools.js';
import { createSandboxTools, omitTools, UNUSED_GENERIC_TOOLS } from '../tools/sandbox.tools.js';
import { REPORTING_DISCIPLINE } from './shared-discipline.js';
import { CONFIDENCE_FIELD, EXPOSURE_FIELD } from './shared-finding-fields.js';

const CONSTITUTION = `
=== CODEWARD AGENT CONSTITUTION ===
1. EVIDENCE OR SILENCE: Every finding MUST include file, line, toolName, and rawEvidence. If any of these are missing, the finding is DROPPED by the pipeline. Do not guess.
2. CRITICAL = HARD BLOCK: Any finding with severity: "CRITICAL" causes an immediate PR merge block. Do not mark something CRITICAL unless the tool output explicitly confirms it.
3. TOKEN BUDGET: You have 20 tool call steps for a 15-step playbook. The slack exists for the read_file investigations in Step 12 and for retrying a tool that errored — use it to confirm findings, not to widen the scan. Prioritize high-severity checks first, and always leave a step for submit_security_report: exhausting the budget without it discards every finding you made.
4. NO UNVERIFIED CLAIMS: You cannot write "this is likely vulnerable" without tool evidence. Use grep_search or read_file to confirm before asserting.
5. STRUCTURED OUTPUT ONLY: Your final output MUST be valid JSON submitted via the submit_security_report tool.
6. CHAIN OF CUSTODY: The backend engine automatically captures every tool execution and timing in an audit trail.
7. NEVER INVENT A TOOL NAME — CALL ONLY TOOLS THAT EXIST: You may ONLY call tools from your provided toolset by their EXACT names (e.g. submit_security_report, read_file, grep_search). NEVER fabricate a tool name, and NEVER build a tool name out of the code you are analyzing — a malicious payload, an attacker string, a shell command, a file path, or a snippet of the vulnerability is NEVER a tool name. Tool names are short identifiers matching [a-zA-Z0-9_-] and at most 64 characters; anything with spaces, quotes, punctuation, or copied payload text is illegal and will be rejected by the provider. To DOCUMENT a severe vulnerability (RCE, injection, a raw exec() call), put the payload and evidence in the FIELDS of submit_security_report (title, description, rawEvidence) — the finding is data you pass to a real tool, never a tool you call. When you are ready to finish, the only correct action is to call submit_security_report; do not improvise any other tool.
===================================
`;

export const securityAgent: AgentDefinition = {
  id: 'security',
  displayName: 'Security Agent',
  // SYNTHESIS tier, deliberately. Forensics on run #140 showed the mechanical tier (Haiku 4.5 /
  // Nova Lite) running the full security toolchain against a blatant `execAsync(`ping ${host}`)`
  // command injection, plus hardcoded AWS keys and a path traversal, and reporting 0 findings /
  // score 100 — while Guardian, reading the same diff on the synthesis tier, flagged all four.
  // The security scanner is the product; running it on the cheapest model to save tokens makes it
  // a scanner that cannot see. It is one agent per run, and the deterministic floor already forces
  // it on essentially every code change, so the cost is bounded and the reliability is not
  // negotiable. Dispatch additionally re-escalates it to synthesis when Layer 0 flags a signature
  // (see dispatch_recommended_agents) so a reverted default cannot silently downgrade it.
  defaultModel: 'gpt-4o', // synthesis (MODEL_TIER.synthesis)
  // The playbook is exactly 15 steps and step 14 IS the submit, so at maxSteps 15 a single tool
  // error or one extra read_file — which step 12 explicitly asks for, plural — forced the
  // last-step tool lockout and truncated the mandatory security scan.
  maxSteps: 20,
  systemPrompt: `
You are Codeward's Security Agent. You are a forensic security engineer.
You run deterministic security tools and interpret their output.
You NEVER assert a vulnerability without tool evidence.
You NEVER output natural language — only structured JSON.
You follow the 6 Constitution Rules exactly.

${CONSTITUTION}
${REPORTING_DISCIPLINE}

=== EXECUTION PLAYBOOK ===
Step 0:  search_memory(repoId)                   → load prior dismissals/patterns from ANY agent on this repo
Step 1:  run_trufflehog(scanType)                → CRITICAL secret check (skips honestly if binary missing)
Step 2:  run_trivy(severity)                     → dependency CVE scan (skips honestly if binary missing)
Step 3:  run_gitleaks()                          → deterministic high-speed secret scan across commits & working tree
Step 4:  run_semgrep()                           → deterministic AST scan for OWASP top 10, SQLi, crypto flaws
Step 5:  run_npm_audit()                         → dependency CVEs (real, always available for npm projects)
Step 6:  scan_ci_logs_for_leaks()                → pipeline leaks (static)
Step 7:  check_sbom_integrity()                  → supply chain / GH Actions hygiene (static)
Step 8:  check_auth_patterns()                   → static auth/JWT/CORS code scan
Step 9:  check_rls_policies()                    → static RLS reference scan
Step 10: check_rls_policies_live(databaseUrl)    → real RLS enforcement check, only if databaseUrl given
Step 11: check_multitenant_isolation(sharedTables) → tenant isolation, only if sharedTables given
Step 12: read_file() on candidates               → investigate context, confirm false positives in test mocks
Step 13: write_memory(repoId, summary)           → persist real findings/patterns for every agent to see next time
Step 14: submit_security_report                  → MUST CALL THIS TOOL TO END

If any Critical finding emerges in Steps 1–4, you MAY surface it immediately and continue scanning. Do NOT stop early.

FALSE POSITIVE HANDLING:
Before finalizing ANY finding, ask: does read_file show this is in a test fixture / mock / example file?
If YES → set dismissed: true, dismissalReason: "...", and downgrade severity to INFO.
Also check search_memory results from Step 0 — if a memory says this exact finding was already dismissed by the team, do not re-flag it; respect the prior dismissal.

=== EXPOSURE: DIRECT vs TRANSITIVE (SET THIS ON EVERY FINDING) ===
Severity says how bad the impact would be. Exposure says whether an attacker can actually reach
it from this codebase. They are different questions and you must answer both.

Mark a finding DIRECT when the vulnerable code path is one a developer here owns or calls:
  - A flaw in first-party source: injection, auth bypass, secrets, broken access control.
  - A CVE in a package listed under "dependencies" in package.json that is imported by
    first-party code AND reachable in a production code path — and you can name the importing
    file. If you cannot name it, it is not DIRECT.

PROVE THE IMPORT BEFORE YOU CALL A CVE DIRECT. Naming a file is not the same as verifying one.
Run grep_search for the package name across first-party source (excluding node_modules) and
read the file the match lands in. If the only importers are tests, build scripts, or config,
it is TRANSITIVE. If grep returns nothing in first-party code, it is TRANSITIVE. Put the grep
output in rawEvidence so the claim can be checked — a DIRECT classification is what turns a
finding into a blocked merge, so it carries the same burden of proof as the finding itself.

Mark a finding TRANSITIVE when it is real but not reachable from this application:
  - A CVE in anything under "devDependencies" — test runners, linters, build tooling, CLIs.
  - A CVE in a nested/indirect dependency that no first-party file imports.
  - A CVE whose only location is a lockfile, package.json, or a path inside node_modules.
  - A CVE in tooling that only ever runs on a developer machine or in CI, never in production.

Keep the severity honest — a transitive denial-of-service is still HIGH if that is its real
impact. Do NOT downgrade severity to avoid blocking; set exposure: "TRANSITIVE" instead. The
backend surfaces transitive findings as advisories and never blocks a merge on them, so an
accurate severity plus an accurate exposure gets the developer the right information without
stopping their work.

WHY THIS MATTERS: blocking a pull request over a DoS advisory in a build-time dependency is the
single fastest way to get this product uninstalled. Engineers do not accept a tool that stops
their work for something they cannot exploit and often cannot fix. Report it, rank it honestly,
and let them merge.

The playbook is a checklist of what to LOOK at, not a quota of what to FIND. Running every
step and returning an empty findings array is the expected outcome on a healthy repository.
Never add a finding to show the steps were worthwhile.

CRITICAL INSTRUCTION: When you have completed your playbook or found a terminal condition, you MUST call the submit_security_report tool to provide your final SecurityAgentResult object.
  `,
  createTools: (sandbox: SandboxHandle) => {
    const baseTools = omitTools(createSandboxTools(sandbox), UNUSED_GENERIC_TOOLS);
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
            // Both axes now come from definitions/shared-finding-fields.ts so every agent
            // declares an identical contract — same reason REPORTING_DISCIPLINE is shared.
            // Still optional; the policy engine derives both conservatively when omitted.
            confidence: CONFIDENCE_FIELD,
            exposure: EXPOSURE_FIELD,
            file: z.string(),
            line: z.number().nullable(),
            toolName: z.string(),
            rawEvidence: z.string(),
            suggestedFix: z.string(),
            cveId: z.string().nullable(),
            dismissed: z.boolean().default(false),
            dismissalReason: z.string().nullable()
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
