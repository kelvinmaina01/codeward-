import { z } from 'zod';
import { NativeOpenAIProvider } from '../../providers/openai.provider.js';
import type { SandboxHandle } from '../core/provider.js';
import { createGuardianTools } from '../definitions/guardian/guardian.tools.js';

export interface FixableFinding {
  id?: string | null;
  category?: string | null;
  title: string;
  description: string;
  file?: string | null;
  line?: number | null;
  rawEvidence?: string | null;
  refactorSafe?: boolean | null;
  suggestedFix?: string | null;
  suggestedRefactor?: string | null;
  dismissed?: boolean;
}

/**
 * Per-agent auto-fix policies. Only categories where a single-file content replacement is
 * provably low-risk are listed — anything touching control flow, architecture, or needing a
 * test run to validate (RACE_CONDITION, MEMORY_LEAK, TYPE_SAFETY, COMPLEXITY, GOD_FILE, ...)
 * stays human-only until a real post-fix verification step exists.
 *
 * requireRefactorSafe: bloat's schema carries an explicit refactorSafe flag (its constitution
 * requires test coverage before setting it) — honor it. broken_code's schema has no such
 * field, so its one allowed category (SWALLOWED_ERROR: add logging inside an empty catch,
 * never alter flow) is gated purely by category + the instruction constraints below.
 */
const AGENT_FIX_POLICIES: Record<string, { categories: Set<string>; requireRefactorSafe: boolean; extraInstruction?: string }> = {
  bloat: {
    categories: new Set(['DEAD_CODE', 'UNUSED_DEPENDENCY', 'POLYFILL', 'DOCUMENTATION_DRIFT']),
    requireRefactorSafe: true,
  },
  broken_code: {
    categories: new Set(['SWALLOWED_ERROR']),
    requireRefactorSafe: false,
    extraInstruction: 'For SWALLOWED_ERROR: add minimal error logging (console.error or the file\'s existing logger) inside the empty catch block. NEVER rethrow, NEVER change control flow, NEVER alter what the catch block returns — logging visibility only.',
  },
};

export const AUTO_FIX_ELIGIBLE_AGENTS = new Set(Object.keys(AGENT_FIX_POLICIES));

// Keep the first real auto-fix PR small and easy to review by hand — not a hard technical
// limit, a deliberate trust-building constraint for the first capability of this kind.
const MAX_FIXES_PER_PR = 3;

// Confirmed via a real run: bloat sometimes reports a summary finding across many files (e.g.
// "Unused Files: 12 files") with file set to the literal placeholder "N/A" rather than a real
// path — truthy, but not a real single-file target this fixer can act on. Reject those
// explicitly rather than relying on truthiness alone.
const PLACEHOLDER_FILE_VALUES = new Set(['n/a', 'none', 'multiple', 'various', '']);

export function isEligibleForAutoFix(finding: FixableFinding, agentId: string): finding is FixableFinding & { file: string; category: string } {
  const policy = AGENT_FIX_POLICIES[agentId];
  if (!policy) return false;
  if (policy.requireRefactorSafe && finding.refactorSafe !== true) return false;
  return !finding.dismissed
    && !!finding.category
    && policy.categories.has(finding.category)
    && !!finding.file
    && !PLACEHOLDER_FILE_VALUES.has(finding.file.trim().toLowerCase());
}

/**
 * Real syntax gate on generated content — a fix that doesn't parse must never reach a commit.
 * TypeScript's parser handles .ts/.tsx/.js/.jsx/.mjs/.cjs; JSON.parse covers .json. Other file
 * types (markdown, yaml, ...) pass through — they can't break a build the way unparseable
 * code can.
 */
export async function syntaxCheck(filePath: string, content: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.json')) {
    try { JSON.parse(content); return { ok: true }; }
    catch (e) { return { ok: false, error: `Generated JSON does not parse: ${(e as Error).message}` }; }
  }
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(lower)) {
    const ts = await import('typescript');
    const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true,
      /\.(tsx|jsx)$/.test(lower) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const parseErrors = (source as any).parseDiagnostics as { messageText: unknown }[] | undefined;
    if (parseErrors && parseErrors.length > 0) {
      const first = parseErrors[0];
      const msg = typeof first.messageText === 'string' ? first.messageText : JSON.stringify(first.messageText);
      return { ok: false, error: `Generated code has ${parseErrors.length} syntax error(s), first: ${msg}` };
    }
  }
  return { ok: true };
}

export interface GeneratedFix {
  filePath: string;
  newContent: string;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
  originalLineCount: number;
  newLineCount: number;
}

export type FixResult = { ok: true; fix: GeneratedFix } | { ok: false; file: string; error: string };

/**
 * Generates the real new content for one confirmed-safe finding. A single deterministic
 * structured-output call (temperature 0) — not an agentic loop. This is a bounded, auditable
 * transformation ("remove exactly this dead code, nothing else"), not an open-ended task, so a
 * fixed sequence with hard safety gates is more trustworthy than letting a model choose its own
 * steps. Any failure mode here returns an error instead of throwing — one bad finding must not
 * abort fixes for the rest of the batch.
 */
export async function generateFix(sandbox: SandboxHandle, finding: FixableFinding & { file: string }, agentId: string): Promise<FixResult> {
  const fileRes = await sandbox.exec(`cat "${finding.file}"`);
  if (fileRes.exitCode !== 0 || !fileRes.stdout) {
    return { ok: false, file: finding.file, error: `Could not read ${finding.file} from the sandbox: ${fileRes.stderr || 'empty file'}` };
  }
  const originalContent = fileRes.stdout;
  const originalLineCount = originalContent.split('\n').length;
  const extraInstruction = AGENT_FIX_POLICIES[agentId]?.extraInstruction ?? '';

  const provider = new NativeOpenAIProvider();
  let result;
  try {
    result = await provider.execute({
      model: 'gpt-4o-mini',
      temperature: 0,
      systemPrompt: `You are a precise, conservative code-fixing tool. You are given ONE confirmed, already-reviewed-safe finding about a single file, and the file's exact current content. Your ONLY job is to return the complete new file content with JUST that specific issue resolved. Change NOTHING else: no reformatting, no renaming, no unrelated cleanup, no added comments explaining the change. If you cannot confidently make ONLY this change, set confidence to "low" and return the original content unchanged.${extraInstruction ? `\n${extraInstruction}` : ''}`,
      messages: [{
        role: 'user',
        content: `File: ${finding.file}\nFinding category: ${finding.category}\nTitle: ${finding.title}\nDescription: ${finding.description}\nEvidence: ${finding.rawEvidence ?? 'none provided'}\n${finding.suggestedFix || finding.suggestedRefactor ? `Suggested approach: ${finding.suggestedFix ?? finding.suggestedRefactor}\n` : ''}\n--- CURRENT FILE CONTENT ---\n${originalContent}`
      }],
      tools: [{
        name: 'submit_fix',
        description: 'Submit the corrected full file content.',
        parameters: z.object({
          newFileContent: z.string().describe('The COMPLETE new file content — nothing omitted, nothing truncated.'),
          rationale: z.string().describe('One or two sentences on exactly what was removed and why.'),
          confidence: z.enum(['high', 'medium', 'low']),
        }),
        // Never actually invoked — this call reads the tool-call args directly (see below),
        // it doesn't run an agent loop. Required only to satisfy AgentTool's shape.
        execute: async () => ({}),
      }],
    });
  } catch (e) {
    return { ok: false, file: finding.file, error: `Fix generation call failed: ${(e as Error).message}` };
  }

  const call = result.toolCalls.find((t) => t.name === 'submit_fix');
  if (!call) return { ok: false, file: finding.file, error: 'Model did not return a fix.' };
  const { newFileContent, rationale, confidence } = call.input;

  if (confidence === 'low') return { ok: false, file: finding.file, error: `Model reported low confidence — refusing to auto-apply: ${rationale}` };
  if (!newFileContent || newFileContent.trim().length === 0) return { ok: false, file: finding.file, error: 'Model returned empty content — refusing to apply.' };
  if (newFileContent === originalContent) return { ok: false, file: finding.file, error: 'Generated content is identical to the original — nothing to fix.' };

  const newLineCount = newFileContent.split('\n').length;
  const shrinkRatio = 1 - newLineCount / originalLineCount;
  // A confirmed safe fix in these categories is a small, bounded change — not a rewrite.
  // Guard against a runaway generation that guts or balloons the file.
  if (shrinkRatio > 0.5 || newLineCount > originalLineCount * 1.2) {
    return { ok: false, file: finding.file, error: `Generated content changed file size too drastically (${originalLineCount} -> ${newLineCount} lines) for a "${finding.category}" fix — refusing to apply.` };
  }

  const syntax = await syntaxCheck(finding.file, newFileContent);
  if (!syntax.ok) return { ok: false, file: finding.file, error: `${syntax.error} — refusing to commit unparseable content.` };

  return { ok: true, fix: { filePath: finding.file, newContent: newFileContent, rationale, confidence, originalLineCount, newLineCount } };
}

export interface OpenFixPRParams {
  sandbox: SandboxHandle;
  repoId: string;
  repoFullName: string;
  runId: number;
  agentId: string;
  findings: FixableFinding[];
}

export type OpenFixPRResult =
  | { opened: true; pullRequestNumber: number; htmlUrl: string; branchName: string; appliedFixes: GeneratedFix[]; skipped: FixResult[] }
  | { opened: false; reason: string; skipped?: FixResult[] };

/**
 * The real end-to-end auto-fix flow: filter eligible findings -> generate real new file content
 * for each -> branch off the real default-branch head -> commit each real fix -> open a real
 * PR. Uses guardian's already-proven GitHub tools directly (no LLM in this half — branching,
 * committing, and opening a PR are mechanical once the content is decided, and a deterministic
 * sequence is more auditable here than letting a model choose the steps).
 */
export async function openFixPR(params: OpenFixPRParams): Promise<OpenFixPRResult> {
  const policy = AGENT_FIX_POLICIES[params.agentId];
  if (!policy) return { opened: false, reason: `Agent '${params.agentId}' has no auto-fix policy — only ${[...AUTO_FIX_ELIGIBLE_AGENTS].join('/')} may auto-fix.` };

  const eligible = params.findings.filter((f) => isEligibleForAutoFix(f, params.agentId)).slice(0, MAX_FIXES_PER_PR);
  if (eligible.length === 0) {
    return { opened: false, reason: `No findings in this run are eligible for auto-fix (${params.agentId} policy: categories ${[...policy.categories].join('/')}${policy.requireRefactorSafe ? ', refactorSafe:true required' : ''}, not dismissed, real single-file path).` };
  }

  const guardianTools = createGuardianTools(params.sandbox);

  const generated: FixResult[] = [];
  for (const finding of eligible) {
    generated.push(await generateFix(params.sandbox, finding as FixableFinding & { file: string }, params.agentId));
  }
  const applied = generated.filter((r): r is { ok: true; fix: GeneratedFix } => r.ok);
  const skipped = generated.filter((r): r is { ok: false; file: string; error: string } => !r.ok);

  if (applied.length === 0) {
    return { opened: false, reason: 'Every candidate fix failed generation or safety checks — see skipped[] for why.', skipped };
  }

  const head: any = await guardianTools.get_repo_head.execute({ repoId: params.repoId });
  if ('error' in head) return { opened: false, reason: `Could not read repo head: ${head.error}`, skipped };

  const branchName = `codeward/auto-fix-${params.agentId}-run${params.runId}-${Date.now()}`;
  const branchRes: any = await guardianTools.create_branch.execute({ repoId: params.repoId, branchName, fromSha: head.headSha });
  if (!branchRes.success) return { opened: false, reason: `Could not create branch: ${branchRes.error ?? 'unknown error'}`, skipped };

  const committed: GeneratedFix[] = [];
  for (const { fix } of applied) {
    const existing: any = await guardianTools.get_file_contents.execute({ repoId: params.repoId, filePath: fix.filePath, ref: branchName });
    if ('error' in existing) {
      skipped.push({ ok: false, file: fix.filePath, error: `Could not read current sha on new branch: ${existing.error}` });
      continue;
    }
    const commitRes: any = await guardianTools.create_or_update_file.execute({
      repoId: params.repoId, branch: branchName, filePath: fix.filePath, content: fix.newContent, sha: existing.sha,
      commitMessage: `fix(auto): ${fix.filePath} — ${fix.rationale}`.slice(0, 200),
    });
    if (!commitRes.success) {
      skipped.push({ ok: false, file: fix.filePath, error: `Commit failed: ${commitRes.error ?? 'unknown error'}` });
      continue;
    }
    committed.push(fix);
  }

  if (committed.length === 0) {
    return { opened: false, reason: 'Branch was created but every commit failed — see skipped[] for why. Leaving the empty branch for manual inspection rather than silently deleting it.', skipped };
  }

  const prBody = [
    `Codeward auto-generated this fix from real findings on run #${params.runId} (${params.agentId} agent).`,
    '',
    '### Changes',
    ...committed.map((f) => `- **${f.filePath}** — ${f.rationale} (${f.originalLineCount} -> ${f.newLineCount} lines)`),
    '',
    skipped.length > 0 ? `### Skipped (${skipped.length})\n${skipped.map((s) => `- ${s.file}: ${s.error}`).join('\n')}\n` : '',
    '_This PR was opened automatically. It still requires review before merging — nothing here auto-merges._',
  ].join('\n');

  const prRes: any = await guardianTools.create_pull_request.execute({
    repoId: params.repoId,
    title: `[Codeward] Auto-fix: ${committed.length} ${params.agentId} finding${committed.length === 1 ? '' : 's'} on run #${params.runId}`,
    body: prBody,
    head: branchName,
    base: head.defaultBranch,
  });
  if (!prRes.success) return { opened: false, reason: `Branch and commits succeeded but PR creation failed: ${prRes.error ?? 'unknown error'}`, skipped };

  return { opened: true, pullRequestNumber: prRes.pullRequestNumber, htmlUrl: prRes.htmlUrl, branchName, appliedFixes: committed, skipped };
}
