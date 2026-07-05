import { db } from '../../db/index.js';
import { mergeApprovals, repositories } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { resolveOctokit } from '../definitions/guardian/guardian.tools.js';

export interface MergeSettings {
  mode: 'manual' | 'auto';
  timeoutMinutes: number; // only meaningful for mode='auto'
}

export const DEFAULT_MERGE_SETTINGS: MergeSettings = { mode: 'manual', timeoutMinutes: 120 };

// Anything at/above this severity always requires an explicit human click, regardless of the
// repo's auto-mode setting — a code-level gate, same philosophy as merge_pull_request's
// humanApproved check.
const AUTO_INELIGIBLE_SEVERITIES = new Set(['HIGH', 'CRITICAL']);

export function readMergeSettings(repoConfig: unknown): MergeSettings {
  const merge = (repoConfig as any)?.merge;
  if (!merge || (merge.mode !== 'auto' && merge.mode !== 'manual')) return DEFAULT_MERGE_SETTINGS;
  const timeoutMinutes = Number(merge.timeoutMinutes);
  return {
    mode: merge.mode,
    timeoutMinutes: Number.isFinite(timeoutMinutes) && timeoutMinutes >= 1 ? Math.min(timeoutMinutes, 7 * 24 * 60) : DEFAULT_MERGE_SETTINGS.timeoutMinutes,
  };
}

export function isAutoMergeEligible(maxSeverity: string | null, guardianVerdict: string | null): boolean {
  if (guardianVerdict !== 'APPROVE') return false;
  if (maxSeverity && AUTO_INELIGIBLE_SEVERITIES.has(maxSeverity.toUpperCase())) return false;
  return true;
}

export type MergeOutcome =
  | { merged: true; sha: string }
  | { merged: false; reason: string };

/**
 * Executes the real merge for an approval row. decidedBy is the real user id for button
 * approvals, or the literal 'timeout' for auto-mode deadline merges (where the standing
 * authorization is the user's earlier opt-in to auto mode). Guarded: only a still-pending row
 * merges; everything else is a real no-op with the reason reported, never a double-merge.
 */
export async function executeMerge(approvalId: number, decidedBy: string): Promise<MergeOutcome> {
  // Atomic compare-and-set claim: flip pending -> merging in ONE statement and only proceed if
  // THIS call is the one that flipped it. Without this, two concurrent merges of the same
  // approval (e.g. a user click racing the timeout job) could both read 'pending' and both hit
  // the GitHub merge API. Verified under real concurrency (test-merge-concurrency-real).
  const claimed = await db.update(mergeApprovals)
    .set({ status: 'merging' })
    .where(and(eq(mergeApprovals.id, approvalId), eq(mergeApprovals.status, 'pending')))
    .returning();
  if (claimed.length === 0) {
    const [existing] = await db.select().from(mergeApprovals).where(eq(mergeApprovals.id, approvalId));
    return { merged: false, reason: existing ? `Approval #${approvalId} is already '${existing.status}' — refusing to act twice.` : `No approval row #${approvalId} exists.` };
  }
  const approval = claimed[0];

  // Timeout merges re-check the gates at fire time, not just at scheduling time — settings may
  // have changed, or the row may have been created before a rule tightened.
  if (decidedBy === 'timeout') {
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, approval.repoId));
    const settings = readMergeSettings(repo?.config);
    if (settings.mode !== 'auto') return await markFailed(approvalId, 'Repo is no longer in auto mode — timeout merge cancelled.');
    if (!isAutoMergeEligible(approval.maxSeverity, approval.guardianVerdict)) {
      return await markFailed(approvalId, `Not auto-eligible (severity=${approval.maxSeverity}, verdict=${approval.guardianVerdict}) — timeout merge refused.`);
    }
  }

  const ctx = await resolveOctokit(String(approval.repoId));
  if ('error' in ctx) return await markFailed(approvalId, `Could not resolve GitHub client: ${ctx.error}`);

  // Retry on TRANSIENT merge failures. A real concurrency test surfaced "Base branch was
  // modified" when several approved PRs merge to the same base near-simultaneously — the base
  // advances between GitHub computing mergeability and the merge landing. GitHub recomputes
  // against the new base, so a short backoff-and-retry succeeds. This is safe because the row
  // is already atomically claimed ('merging') — no other caller can act on it during retries.
  // A genuine merge CONFLICT is not transient and fails honestly on the first try.
  const commitMessage = decidedBy === 'timeout'
    ? `Auto-merged by Codeward after the configured approval window elapsed with no response (standing auto-mode authorization).`
    : `Merged via Codeward dashboard approval.`;
  const MAX_ATTEMPTS = 5;
  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await ctx.octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
        owner: ctx.owner, repo: ctx.repo, pull_number: approval.pullRequestNumber,
        commit_title: `${approval.prTitle ?? `Codeward auto-fix PR #${approval.pullRequestNumber}`} (#${approval.pullRequestNumber})`,
        commit_message: commitMessage, merge_method: 'squash',
      });
      await db.update(mergeApprovals).set({
        status: decidedBy === 'timeout' ? 'auto_merged' : 'approved', decidedBy, decidedAt: new Date(),
      }).where(eq(mergeApprovals.id, approvalId));
      return { merged: true, sha: res.data.sha };
    } catch (e) {
      lastError = (e as Error).message;
      const transient = /base branch was modified|not mergeable|try (the merge )?again|mergeability/i.test(lastError) && !/conflict/i.test(lastError);
      if (!transient || attempt === MAX_ATTEMPTS) break;
      console.log(`[Merge] Approval #${approvalId} transient merge failure (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastError.split(' - ')[0]} — retrying...`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return await markFailed(approvalId, `Real GitHub merge call failed after retries: ${lastError}`);
}

async function markFailed(approvalId: number, reason: string): Promise<MergeOutcome> {
  await db.update(mergeApprovals).set({ status: 'merge_failed', decisionNote: reason, decidedAt: new Date() }).where(eq(mergeApprovals.id, approvalId));
  return { merged: false, reason };
}

/**
 * Rejects an approval: real PR close + real explanatory comment, row marked rejected.
 */
export async function rejectApproval(approvalId: number, decidedBy: string, note?: string): Promise<{ rejected: boolean; reason?: string }> {
  const [approval] = await db.select().from(mergeApprovals).where(eq(mergeApprovals.id, approvalId));
  if (!approval) return { rejected: false, reason: `No approval row #${approvalId} exists.` };
  if (approval.status !== 'pending') return { rejected: false, reason: `Approval #${approvalId} is already '${approval.status}'.` };

  const ctx = await resolveOctokit(String(approval.repoId));
  if ('error' in ctx) return { rejected: false, reason: ctx.error };

  try {
    await ctx.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: ctx.owner, repo: ctx.repo, issue_number: approval.pullRequestNumber,
      body: `Closed via Codeward dashboard: the repository owner rejected this auto-fix.${note ? `\n\n> ${note}` : ''}`,
    });
    await ctx.octokit.request('PATCH /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: ctx.owner, repo: ctx.repo, pull_number: approval.pullRequestNumber, state: 'closed',
    });
  } catch (e) {
    return { rejected: false, reason: `Real GitHub close failed: ${(e as Error).message}` };
  }

  await db.update(mergeApprovals).set({
    status: 'rejected', decidedBy, decisionNote: note ?? null, decidedAt: new Date(),
  }).where(eq(mergeApprovals.id, approvalId));
  return { rejected: true };
}
