import { guardianAgent } from '../definitions/guardian.agent.js';
import { NativeOpenAIProvider } from '../../providers/openai.provider.js';
import { runAgentLoop } from '../agent-loop.js';
import type { SandboxHandle } from '../core/provider.js';

export interface ReviewFixPRParams {
  sandbox: SandboxHandle;
  repoId: string;
  pullRequestNumber: number;
  runId: number;
  agentId: string;
  appliedFixes: Array<{ filePath: string; rationale: string }>;
}

export interface ReviewHumanPRParams {
  sandbox: SandboxHandle;
  repoId: string;
  pullRequestNumber: number;
  runId: number;
  // Findings from the run that analyzed this PR's head commit, grouped for guardian's context.
  findings: Array<{ agentId: string; severity: string; title: string; file?: string | null; line?: number | null }>;
  gateDecision: string | null;
}

export type ReviewResult =
  | { reviewed: true; event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'; viaFormalReview: boolean; reviewId: number; htmlUrl: string }
  | { reviewed: false; reason: string };

/**
 * Shared review core: runs guardian through the genuine agentic loop against one PR, with a
 * caller-supplied task message, and returns the real GitHub review outcome. Both the auto-fix
 * PR review and the human-PR review use this — guardian reasons about the real diff either way,
 * it just gets different context about WHY it's reviewing.
 */
async function runGuardianReview(sandbox: SandboxHandle, taskMessage: string): Promise<ReviewResult> {
  const tools = guardianAgent.createTools(sandbox);
  const submitToolName = 'submit_pr_review';
  if (!(submitToolName in tools)) return { reviewed: false, reason: `guardian's toolset is missing ${submitToolName} — cannot review.` };

  let reviewArgs: any = null;
  let reviewResult: any = null;
  const toolArray = Object.entries(tools).map(([name, def]: [string, any]) => ({
    name,
    description: def.description,
    parameters: def.parameters,
    execute: async (args: any) => {
      const result = await def.execute(args);
      if (name === submitToolName) { reviewArgs = args; reviewResult = result; }
      return result;
    },
  }));

  // NativeOpenAIProvider calls OpenAI directly and doesn't know guardianAgent.defaultModel's
  // 'claude-3.5-sonnet' string (that remap lives in the OpenAIProvider wrapper, bypassed here).
  const model = !guardianAgent.defaultModel.startsWith('claude') ? guardianAgent.defaultModel : 'gpt-4o-mini';

  try {
    await runAgentLoop({
      model, systemPrompt: guardianAgent.systemPrompt, maxSteps: 10, tools: toolArray,
      messages: [{ role: 'user', content: taskMessage }],
    }, new NativeOpenAIProvider());
  } catch (e) {
    return { reviewed: false, reason: `Guardian review run threw: ${(e as Error).message}` };
  }

  if (!reviewArgs) return { reviewed: false, reason: 'Guardian did not submit a review within its step budget.' };
  if (!reviewResult?.success) return { reviewed: false, reason: `submit_pr_review's real GitHub call failed: ${reviewResult?.error ?? 'unknown error'}` };
  return { reviewed: true, event: reviewArgs.event, viaFormalReview: !!reviewResult.viaFormalReview, reviewId: reviewResult.reviewId, htmlUrl: reviewResult.htmlUrl };
}

/**
 * Guardian reviews one of Codeward's OWN auto-fix PRs — verifying the generated diff correctly
 * and minimally addresses the findings that motivated it.
 */
export async function reviewFixPR(params: ReviewFixPRParams): Promise<ReviewResult> {
  const fixSummary = params.appliedFixes.map((f) => `- ${f.filePath}: ${f.rationale}`).join('\n');
  return runGuardianReview(params.sandbox,
    `Review PR #${params.pullRequestNumber} on repoId ${params.repoId}. This PR was opened automatically by Codeward's own auto-fix pipeline (run #${params.runId}, ${params.agentId} agent) based on these real, already-confirmed-safe findings:\n${fixSummary}\n\nUse get_pull_request_files to read the REAL diff. Verify it correctly and ONLY addresses the stated findings — no unrelated changes, no correctness regressions you can spot from the diff alone. Then call submit_pr_review: APPROVE if the diff is correct and minimal, REQUEST_CHANGES if you see something wrong or out of scope, COMMENT if you're uncertain and want a human to look. You MUST call submit_pr_review to finish — this is your terminal action.`);
}

/**
 * Guardian reviews a HUMAN-opened PR, using the findings from Codeward's analysis of that PR's
 * head commit. This is the same reasoning it applies to its own PRs, now pointed at a
 * developer's work — the real "reviews human PRs too" capability.
 */
export async function reviewHumanPR(params: ReviewHumanPRParams): Promise<ReviewResult> {
  const findingsSummary = params.findings.length === 0
    ? 'Codeward\'s agents found no issues in this PR.'
    : params.findings.map((f) => `- [${f.severity}] (${f.agentId}) ${f.title}${f.file ? ` — ${f.file}${f.line != null ? `:${f.line}` : ''}` : ''}`).join('\n');
  return runGuardianReview(params.sandbox,
    `Review human-opened PR #${params.pullRequestNumber} on repoId ${params.repoId}. Codeward's agents analyzed this PR's changes and reached an overall gate decision of ${params.gateDecision ?? 'UNKNOWN'}. Their findings:\n${findingsSummary}\n\nUse get_pull_request_files to read the REAL diff. Post inline comments (via submit_pr_review's comments array) on the exact lines that correspond to real findings, referencing the tool evidence. Then set the review event: REQUEST_CHANGES ONLY if there is a Critical or High finding backed by evidence (per your constitution — never block on speculation); APPROVE if the changes look sound and findings are low/none; COMMENT if you have feedback but nothing blocking. You MUST call submit_pr_review to finish — this is your terminal action.`);
}
