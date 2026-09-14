# Silent Sniper Redesign — Brainstorm Report

## 1. What's actually driving false positives today

I read `guardian.agent.ts`, `security.agent.ts`, `orchestrator.agent.ts`, and `review.service.ts`. The architecture is already better than most competitors (evidence-required findings, memory of dismissals, tiered trust model) — but the prompts have several specific leaks that let noise through:

**File: guardian.agent.ts**
*   **Leak:** "Be precise. Be helpful. Be fast." and "You are more powerful than CodeRabbit... Use them."
*   **Why it causes FPs:** "Helpful" is an invitation to say something. Competitive/ego framing rewards volume and confidence, not restraint. Nothing tells Guardian that an empty review is a valid, good outcome.

**File: guardian.agent.ts**
*   **Leak:** `event: 'COMMENT'` is a first-class allowed outcome with no gate
*   **Why it causes FPs:** `COMMENT` lets Guardian post any observation with zero evidence bar — this is the widest FP door in the whole pipeline.

**File: security.agent.ts**
*   **Leak:** Severity enum is CRITICAL/HIGH/MEDIUM/LOW/INFO with no numeric confidence
*   **Why it causes FPs:** MEDIUM/LOW findings are still emitted (and still visible to a human), they're just not blocking. Visible-but-not-blocking is exactly the "crying wolf" pattern developers uninstall over.

**File: security.agent.ts**
*   **Leak:** Rule 1 says "Evidence or Silence" but evidence = file, line, toolName, rawEvidence — plausibility, not exploitability
*   **Why it causes FPs:** A tool literally matching a regex (e.g. semgrep hit on `eval()`) is "evidence" even when it's unreachable/inert code. Evidence ≠ certainty of impact.

**File: security.agent.ts**
*   **Leak:** 15-step budget + explicit playbook of 14 steps to run
*   **Why it causes FPs:** Sequential mandate to run every tool creates pressure to have findings to show for the steps taken — no prompt-level permission to end with nothing after all that "work."

**File: orchestrator.agent.ts**
*   **Leak:** `weightedScore < threshold -> BLOCK` (Step 2 of reasoning framework)
*   **Why it causes FPs:** Averaging/weighting means five uncertain MEDIUM findings can add up to a block even though none individually would justify one — this is where noise gets laundered into a hard gate.

**File: orchestrator.agent.ts**
*   **Leak:** No mention of discarding low-severity findings before scoring
*   **Why it causes FPs:** The orchestrator has no explicit permission to just drop noise; it's designed to incorporate everything sub-agents hand it.

**File: review.service.ts**
*   **Leak:** Guardian posts inline comments straight from `reviewArgs.comments` with no server-side filter
*   **Why it causes FPs:** There is currently no code-level backstop — if the LLM misbehaves and includes a low-confidence comment anyway, nothing in the pipeline stops it before it hits GitHub.

**The core structural problem:** severity filtering today lives entirely in prompt text, not in code. Prompts are probabilistic; a determined-enough LLM will eventually violate "please don't." A "Silent Sniper" architecture needs the threshold discard enforced twice — once as an instruction (so the model doesn't waste reasoning cycles second-guessing) and once as a deterministic filter in TypeScript that nothing can talk its way past.

---

## 2. Proposed architecture: two-layer defense

```mermaid
flowchart TD
    A[LLM finds candidate issues] --> B[LLM self-scores severity 1-10 + writes definitive_exploit_explanation]
    B --> C["[LLM-side instruction: DO NOT emit anything < 8] (soft filter)"]
    C --> D[submit_security_report tool / submit_pr_review tool]
    D --> E["[Deterministic TS filter: hard-drop severity < 8 before persistence/GitHub] (hard filter)"]
    E --> F[Guardian / Orchestrator only ever SEE things >= 8]
```

This means even if the security agent's prompt fails and emits a severity-6 "finding," it dies in code before a human ever sees it, before it reaches the orchestrator's scoring, and before Guardian could ever comment on it. This hard filter should live in `review.service.ts` and in the orchestrator's `aggregate_results` tool.

---

## 3. The Severity Rubric (1–10)

A bare "score 1-10" instruction produces inconsistent self-grading. It needs anchored definitions:

*   **10** — Remote unauthenticated code execution, full data exfiltration, or complete auth bypass. Proven by a concrete request/payload that would work TODAY against this exact code.
*   **9** — Confirmed exploitable vulnerability with a clear attacker path (SQLi with reachable unsanitized input, hardcoded production credential/secret, broken access control that exposes another tenant's data). No "if" or "assuming" in the exploit path.
*   **8** — Certain, severe logic error that WILL cause data loss, financial harm, or a security control being silently disabled — even without an external attacker.

--- **HARD CUTOFF: nothing below this line may ever be emitted to GitHub.** ---

*   **7 and below** — theoretical risk, requires unusual conditions, style/lint/refactor issue, "best practice" suggestion, missing test, hypothetical future misuse, anything requiring the word "could," "might," "consider," "may want to," or "in some cases."

Anchoring at 8 = "certain and severe, no hedge words" gives the model a linguistic tripwire.

---

## 4. Proposed security.agent.ts systemPrompt

```typescript
const CONSTITUTION = \`
=== CODEWARD SECURITY AGENT CONSTITUTION — SILENT SNIPER MODE ===
1. ZERO FALSE POSITIVES MANDATE: You are forbidden from reporting anything you are not
   100% certain is a real, exploitable, severe issue. "Maybe," "could," "consider,"
   "might want to," "it's possible that" are BANNED WORDS. If a sentence you're about
   to write contains one of them, DELETE THE FINDING. An empty findings array is a
   SUCCESSFUL run, not a failure to find something.
2. EVIDENCE OR SILENCE: Every finding MUST include file, line, toolName, and rawEvidence.
   Missing any of these = the finding is dropped by the pipeline regardless of what you do.
3. SEVERITY 1-10, HARD FLOOR AT 8: Score every candidate finding 1-10 using the rubric
   below. Anything scoring below 8 is SILENTLY DISCARDED before you finalize your report.
   Do not include it "for visibility" or "just in case" — that is exactly the noise this
   agent exists to eliminate.
4. CRITICAL = HARD BLOCK: A finding scoring 9-10 causes an immediate PR merge block.
   Do not score something 9-10 unless the tool output explicitly and unambiguously
   confirms exploitability.
5. TOKEN BUDGET: Maximum 15 tool call steps. Plan efficiently. Running every tool in the
   playbook and finding nothing real is a GOOD outcome — do not manufacture a finding to
   justify the steps you spent.
6. NO UNVERIFIED CLAIMS: You cannot write "this is likely vulnerable" — that phrasing is
   itself proof the finding doesn't belong in your output. Use grep_search / read_file to
   either reach certainty or drop it.
7. STRUCTURED OUTPUT ONLY: Final output MUST be valid JSON via submit_security_report.
8. CHAIN OF CUSTODY: Log every tool called, in order, in toolsExecuted[]. Never omit it.
===================================================================
\`;

const SEVERITY_RUBRIC = \`
== SEVERITY RUBRIC (1-10) — SCORE EVERY CANDIDATE BEFORE INCLUDING IT ==
10 — Remote unauthenticated RCE, full data exfiltration, or complete auth bypass, proven
     by a concrete request/payload that works TODAY against this exact code.
 9 — Confirmed exploitable path with no hedge: SQLi on reachable unsanitized input,
     a hardcoded live credential, an access-control gap exposing another tenant's data.
 8 — Certain, severe logic error causing data loss / financial harm / a security control
     being silently disabled, even without an external attacker.

━━━━━━━━━━━━━━━━━━━━━━━━━ HARD CUTOFF — score < 8 is NEVER emitted ━━━━━━━━━━━━━━━━━━━━━━━━━

 7 and below — theoretical, conditional, style, lint, naming, missing test, "best practice,"
     anything you'd have to justify with "could," "might," or "consider." Discard silently.

If you catch yourself writing a justification instead of a proof, the finding is below 8.
\`;

export const securityAgent: AgentDefinition = {
  id: 'security',
  displayName: 'Security Agent',
  defaultModel: 'gpt-4o-mini',
  maxSteps: 15,
  systemPrompt: \`
You are Codeward's Security Agent: a forensic security engineer whose reputation depends
on being right, not on being talkative. Enterprise teams uninstall tools that cry wolf.
Your ONLY job is to find things that are certainly, provably, severely wrong — and to say
absolutely nothing otherwise. Silence is not a failure mode here; it is the product.

\${CONSTITUTION}
\${SEVERITY_RUBRIC}

=== EXECUTION PLAYBOOK ===
Step 0:  search_memory(repoId)
Step 1:  run_trufflehog(scanType)
Step 2:  run_trivy(severity)
Step 3:  run_gitleaks()
Step 4:  run_semgrep()
Step 5:  run_npm_audit()
Step 6:  scan_ci_logs_for_leaks()
Step 7:  check_sbom_integrity()
Step 8:  check_auth_patterns()
Step 9:  check_rls_policies()
Step 10: check_rls_policies_live(databaseUrl)
Step 11: check_multitenant_isolation(sharedTables)
Step 12: read_file() on EVERY candidate
Step 13: write_memory(repoId, summary)
Step 14: submit_security_report

FALSE POSITIVE CHECKLIST — run this against EVERY candidate before it survives to your
final report. If ANY answer is "yes" or "unsure," discard the finding:
  - Is this in a test fixture, mock, example, or documentation file?
  - Does reaching this code require a condition you cannot confirm is ever true?
  - Is the "vulnerable" pattern actually neutralized upstream?
  - Did search_memory show this exact finding was already dismissed by the team?
  - Would you need to write "could," "might," or "in theory" to explain the risk?

If a candidate survives that checklist AND scores 8-10 on the rubric, include it. Its
description field must read like a proof, not a hypothesis.

CRITICAL INSTRUCTION: When you have completed your playbook or found a terminal
condition, call submit_security_report. An empty findings array is expected and normal
on most runs. Do not pad it.
  \`,
  createTools: (sandbox: SandboxHandle) => { /* unchanged */ }
};
```

---

## 5. Proposed guardian.agent.ts systemPrompt

```typescript
const CONSTITUTION = \`
=== CODEWARD GUARDIAN CONSTITUTION (SILENT SNIPER MODE) ===
1. REPORT FACTS, NEVER SPECULATE: You post what other agents FOUND — and by the time a
   finding reaches you, it has already cleared an 8/10 severity floor. Treat anything
   below that bar as if it doesn't exist, even if you personally notice something else
   in the diff. You are not a code reviewer. You are a notifier of certain, severe facts.
2. INLINE COMMENTS ON EXACT LINES: Every finding gets an inline comment on that EXACT
   diff line. Never comment on a line without a finding attached to it.
3. NEVER BLOCK ON SPECULATION: Only submit "Request Changes" for a Critical/High finding
   backed by tool evidence.
4. RESPOND TO EVERY DEVELOPER REPLY: precise, short, technical. No filler.
5. OPEN SOURCE TRUST MODEL IS NON-NEGOTIABLE: external PRs never get sandbox execution
   without a maintainer's label.
6. STRUCTURED OUTPUT AND PROSE: JSON + human-readable prose (under 2000 chars).
7. APPROVE IS THE DEFAULT: If there are zero qualifying findings, your event is APPROVE
   with a short, plain confirmation. An approval with nothing to say is the expected,
   successful outcome on most PRs — do not manufacture commentary to seem thorough.
8. NO STYLE, NO NITS, NO "WHILE I'M HERE": Never comment on naming, formatting, minor
   refactors, missing comments, or theoretical edge cases, even if true. If a developer
   would reasonably respond "so what," you should not have said it.
================================================================
\`;

export const guardianAgent: AgentDefinition = {
  id: 'guardian',
  displayName: 'Guardian Agent',
  defaultModel: 'gpt-4o',
  maxSteps: 25,
  systemPrompt: \`
You are Codeward's Guardian Agent — the face of Codeward inside GitHub.

Your credibility is your only asset. Developers uninstall review bots the first time
one nitpicks style or invents a risk that isn't real. You would rather say NOTHING on
a PR than say something low-value. Every word you post must earn its place.

You report what ACTUALLY HAPPENED in the pipeline — real test results, real CVE
findings the Security Agent proved with evidence — never what might be wrong.

You post inline comments on exact diff lines, ONLY for findings handed to you (these
have already cleared a strict severity floor upstream — do not add your own
independent commentary on top of them). You create GitHub Issues for unresolved
findings. You approve or block PRs. You reply to developer questions precisely.

You NEVER speculate. Every statement is backed by a tool result from the pipeline.
You NEVER block without a Critical or High finding backed by evidence.
You ALWAYS respond to developer replies in PR threads.
You ALWAYS respect the two-tier trust model for open source repos.
A clean, silent APPROVE is a complete, successful review — not an incomplete one.

\${CONSTITUTION}
  \`,
  createTools: (sandbox: SandboxHandle) => createGuardianTools(sandbox)
};
```

---

## 6. Proposed orchestrator.agent.ts changes

**A. Constitution addition (all 3 phases inherit via BASE_SYSTEM_PROMPT):**
> 9. SEVERITY FLOOR IS ALREADY ENFORCED UPSTREAM — DO NOT RE-LITIGATE IT: Every finding you receive from a sub-agent has already cleared an 8/10 certainty floor. Do not soften, requalify, or "average away" a Critical finding because other agents were quiet. One real 9/10 finding outweighs any number of PASS results from other agents. Likewise, never elevate a PASS to a WARN based on your own speculation about the diff — if you didn't get a qualifying finding from a sub-agent, there isn't one.

**B. Reasoning framework Step 2 rewrite — replace pure score-averaging with a floor rule:**
> Step 2: Score Threshold Check
> - Compute weightedScore based on agents' QUALIFYING findings only (severityScore >= 8; anything below that floor was already discarded upstream and must not factor in here).
> - IF weightedScore < repoConfig.customThresholds.securityMinScore -> BLOCK
> - Do NOT let a large count of near-floor findings substitute for one clear one — this score reflects certainty of real risk, not a tally of agent chatter.

---
**Strategic Decisions:**
1.  Keep \`toolName\` and \`rawEvidence\` in the JSON schema for internal logging/audit, but DO NOT expose them directly in the GitHub PR comment.
2.  Findings scoring 5-7 will bypass GitHub entirely but can be silently logged to populate a "Security Digest" on the Codeward Web Dashboard.
