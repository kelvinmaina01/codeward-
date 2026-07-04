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

export type ReviewResult =
  | { reviewed: true; event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'; viaFormalReview: boolean; reviewId: number; htmlUrl: string }
  | { reviewed: false; reason: string };

/**
 * Real Phase 2: guardian reviews a bot-generated (or human) PR the same way it would review
 * anyone's PR — reads the real diff, checks it against the findings that motivated it, and
 * submits a real formal GitHub review. Runs guardian through the genuine agentic loop (not a
 * fixed rule), because the whole point per the product plan is guardian *reasoning* about
 * whether the fix is correct and minimal, not a hardcoded rubber stamp — it shares memory with
 * the agent that generated the fix, which is the actual value being built here.
 */
export async function reviewFixPR(params: ReviewFixPRParams): Promise<ReviewResult> {
  const tools = guardianAgent.createTools(params.sandbox);
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
      if (name === submitToolName) {
        reviewArgs = args;
        reviewResult = result;
      }
      return result;
    },
  }));

  const provider = new NativeOpenAIProvider();
  const fixSummary = params.appliedFixes.map((f) => `- ${f.filePath}: ${f.rationale}`).join('\n');

  // NativeOpenAIProvider calls OpenAI's real API directly — it has no knowledge of
  // guardianAgent.defaultModel's 'claude-3.5-sonnet' string (that remapping only exists inside
  // the OpenAIProvider wrapper class used by agent.queue.ts's getProvider(), which this
  // function bypasses on purpose to run a scoped review loop). Apply the same real rule here:
  // every "claude-*" default model actually runs on gpt-4o-mini in this codebase today.
  const model = !guardianAgent.defaultModel.startsWith('claude') ? guardianAgent.defaultModel : 'gpt-4o-mini';

  try {
    await runAgentLoop({
      model,
      systemPrompt: guardianAgent.systemPrompt,
      maxSteps: 10,
      tools: toolArray,
      messages: [{
        role: 'user',
        content: `Review PR #${params.pullRequestNumber} on repoId ${params.repoId}. This PR was opened automatically by Codeward's own auto-fix pipeline (run #${params.runId}, ${params.agentId} agent) based on these real, already-confirmed-safe findings:\n${fixSummary}\n\nUse get_pull_request_files to read the REAL diff. Verify it correctly and ONLY addresses the stated findings — no unrelated changes, no correctness regressions you can spot from the diff alone. Then call submit_pr_review: APPROVE if the diff is correct and minimal, REQUEST_CHANGES if you see something wrong or out of scope, COMMENT if you're uncertain and want a human to look. You MUST call submit_pr_review to finish — this is your terminal action.`
      }],
    }, provider);
  } catch (e) {
    return { reviewed: false, reason: `Guardian review run threw: ${(e as Error).message}` };
  }

  if (!reviewArgs) return { reviewed: false, reason: 'Guardian did not submit a review within its step budget.' };
  if (!reviewResult?.success) return { reviewed: false, reason: `submit_pr_review's real GitHub call failed: ${reviewResult?.error ?? 'unknown error'}` };

  return { reviewed: true, event: reviewArgs.event, viaFormalReview: !!reviewResult.viaFormalReview, reviewId: reviewResult.reviewId, htmlUrl: reviewResult.htmlUrl };
}
