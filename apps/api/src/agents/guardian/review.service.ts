import { guardianAgent } from '../definitions/guardian.agent.js';
import { NativeOpenAIProvider } from '../../providers/openai.provider.js';
import { runAgentLoop } from '../agent-loop.js';
import type { SandboxHandle } from '../core/provider.js';
import { renderGuardianFinalReview } from './github-renderer.js';

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
  findings: Array<{ agentId: string; severity: string; title: string; file?: string | null; line?: number | null }>;
  gateDecision: string | null;
}

export type ReviewResult =
  | {
      reviewed: true;
      event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
      viaFormalReview: boolean;
      reviewId: number;
      htmlUrl: string;
      body: string;
      comments?: Array<{ path: string; line: number; body: string }>;
    }
  | { reviewed: false; reason: string };

async function runGuardianReview(sandbox: SandboxHandle, taskMessage: string): Promise<ReviewResult> {
  const tools = guardianAgent.createTools(sandbox);
  const submitToolName = 'submit_pr_review';
  if (!(submitToolName in tools)) {
    return { reviewed: false, reason: `guardian's toolset is missing ${submitToolName} - cannot review.` };
  }

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

  const model = !guardianAgent.defaultModel.startsWith('claude') ? guardianAgent.defaultModel : 'gpt-4o-mini';

  try {
    await runAgentLoop({
      model,
      systemPrompt: guardianAgent.systemPrompt,
      maxSteps: 10,
      tools: toolArray,
      messages: [{ role: 'user', content: taskMessage }],
    }, new NativeOpenAIProvider());
  } catch (e) {
    return { reviewed: false, reason: `Guardian review run threw: ${(e as Error).message}` };
  }

  if (!reviewArgs) return { reviewed: false, reason: 'Guardian did not submit a review within its step budget.' };
  if (!reviewResult?.success) {
    return { reviewed: false, reason: `submit_pr_review's real GitHub call failed: ${reviewResult?.error ?? 'unknown error'}` };
  }

  return {
    reviewed: true,
    event: reviewArgs.event,
    viaFormalReview: !!reviewResult.viaFormalReview,
    reviewId: reviewResult.reviewId,
    htmlUrl: reviewResult.htmlUrl,
    body: String(reviewArgs.body ?? ''),
    comments: Array.isArray(reviewArgs.comments) ? reviewArgs.comments : [],
  };
}

export async function reviewFixPR(params: ReviewFixPRParams): Promise<ReviewResult> {
  const fixSummary = params.appliedFixes.map((f) => `- ${f.filePath}: ${f.rationale}`).join('\n');
  const reviewTemplate = renderGuardianFinalReview({
    repoFullName: `repoId:${params.repoId}`,
    runId: params.runId,
    commitSha: 'unknown',
    gateDecision: 'COMMENT',
    summary: `Guardian is verifying a Codeward auto-fix PR opened by the ${params.agentId} agent.`,
    findings: params.appliedFixes.map((f) => ({
      agentId: params.agentId,
      severity: 'INFO',
      title: f.rationale,
      file: f.filePath,
      fixStatus: 'pr_opened',
    })),
    checks: [{ name: 'PR diff review', status: 'skipped', summary: 'Guardian must inspect the live GitHub diff before choosing a verdict' }],
  });

  return runGuardianReview(params.sandbox, [
    `Review PR #${params.pullRequestNumber} on repoId ${params.repoId}.`,
    `This PR was opened automatically by Codeward's own auto-fix pipeline (run #${params.runId}, ${params.agentId} agent).`,
    '',
    'Already-confirmed-safe findings:',
    fixSummary,
    '',
    'Use get_pull_request_files to read the real diff. Verify it correctly and only addresses the stated findings: no unrelated changes and no correctness regressions visible from the diff.',
    '',
    'Use this GitHub review structure for your body, updating the details after you inspect the real diff:',
    reviewTemplate,
    '',
    'Then call submit_pr_review. Use APPROVE if the diff is correct and minimal, REQUEST_CHANGES if something is wrong or out of scope, and COMMENT if a human should look.',
    'You must call submit_pr_review to finish.',
  ].join('\n'));
}

export async function reviewHumanPR(params: ReviewHumanPRParams): Promise<ReviewResult> {
  const findingsSummary = params.findings.length === 0
    ? "Codeward's agents found no issues in this PR."
    : params.findings.map((f) => `- [${f.severity}] (${f.agentId}) ${f.title}${f.file ? ` - ${f.file}${f.line != null ? `:${f.line}` : ''}` : ''}`).join('\n');

  const hasBlocker = params.findings.some((f) => ['CRITICAL', 'HIGH'].includes(String(f.severity).toUpperCase()));
  const reviewTemplate = renderGuardianFinalReview({
    repoFullName: `repoId:${params.repoId}`,
    runId: params.runId,
    commitSha: 'unknown',
    gateDecision: params.gateDecision ?? (hasBlocker ? 'BLOCK' : 'COMMENT'),
    summary: 'Codeward analyzed this human-opened PR and Guardian is publishing the verified outcome.',
    findings: params.findings.map((f) => ({
      agentId: f.agentId,
      severity: f.severity,
      title: f.title,
      file: f.file,
      line: f.line,
    })),
    checks: [{ name: 'PR diff review', status: 'skipped', summary: 'Guardian must inspect the live GitHub diff before choosing a verdict' }],
  });

  return runGuardianReview(params.sandbox, [
    `Review human-opened PR #${params.pullRequestNumber} on repoId ${params.repoId}.`,
    `Codeward's agents analyzed this PR's changes and reached an overall gate decision of ${params.gateDecision ?? 'UNKNOWN'}.`,
    '',
    'Agent findings:',
    findingsSummary,
    '',
    'Use get_pull_request_files to read the real diff. Post inline comments via submit_pr_review only when the exact line is present in the GitHub diff and corresponds to real evidence. If a finding is outside the current diff, keep it in the review body instead of forcing an invalid inline comment.',
    '',
    'Use this GitHub review structure for your body, updating the details after you inspect the real diff:',
    reviewTemplate,
    '',
    'Then set the review event. Use REQUEST_CHANGES only if there is a Critical or High finding backed by evidence; APPROVE if the changes look sound and findings are low or none; COMMENT if there is feedback but nothing blocking.',
    'You must call submit_pr_review to finish.',
  ].join('\n'));
}
