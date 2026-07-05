import type { SandboxHandle } from '../core/provider.js';

/**
 * The keystone safety gate: before an auto-generated fix is ever committed to a PR, this
 * proves the fix does not BREAK the repo, by applying it inside the ephemeral sandbox and
 * re-running the repo's own real checks (TypeScript compile + test suite) — then comparing
 * against a baseline captured from the untouched repo. A fix is only allowed through if it
 * introduces no NEW compile errors and breaks no previously-passing tests.
 *
 * Baseline comparison (not absolute pass) is deliberate: real repos often have pre-existing
 * type errors or failing tests. We must not block a valid dead-code removal just because the
 * repo was already red — we only block a fix that makes it *redder*.
 */

export interface VerificationBaseline {
  installOk: boolean;
  hasTypecheck: boolean;
  typecheckErrorCount: number | null; // null = couldn't run tsc at all
  hasTests: boolean;
  testsPassed: boolean | null;        // null = couldn't run tests at all
}

// Verification strength required per fix category. 'syntax' = parser-only (done in
// fixer.service before this runs); 'typecheck' = must not add TS errors; 'tests' = must not
// break a previously-passing test suite (and if no tests exist, the fix is REJECTED because
// its safety cannot be proven).
export type VerificationLevel = 'syntax' | 'typecheck' | 'tests';

const MAX_WRITE_BYTES = 400_000; // base64-through-shell is fine for source files; guard against a pathological giant file

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Writes exact content into a sandbox file via base64 (no quoting/escaping hazards from the content itself). */
async function writeSandboxFile(sandbox: SandboxHandle, filePath: string, content: string): Promise<boolean> {
  if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) return false;
  const b64 = Buffer.from(content, 'utf8').toString('base64');
  const res = await sandbox.exec(`echo ${b64} | base64 -d > ${shQuote(filePath)}`);
  return res.exitCode === 0;
}

async function detectTestCommand(sandbox: SandboxHandle): Promise<string | null> {
  const pkg = await sandbox.exec('cat package.json 2>/dev/null');
  if (pkg.exitCode === 0 && pkg.stdout.trim()) {
    try {
      const testScript = JSON.parse(pkg.stdout).scripts?.test;
      if (testScript && !/exit 1|no test specified/i.test(testScript)) return 'npm test --silent';
    } catch { /* fall through */ }
  }
  const vitest = await sandbox.exec('find . -maxdepth 2 -iname "vitest.config.*" 2>/dev/null');
  if (vitest.stdout.trim()) return 'npx --yes vitest run';
  const jest = await sandbox.exec('find . -maxdepth 2 -iname "jest.config.*" 2>/dev/null');
  if (jest.stdout.trim()) return 'npx --yes jest';
  return null;
}

async function hasTsconfig(sandbox: SandboxHandle): Promise<boolean> {
  const res = await sandbox.exec('find . -maxdepth 2 -name "tsconfig.json" -not -path "*/node_modules/*" 2>/dev/null');
  return !!res.stdout.trim();
}

function countTsErrors(output: string): number {
  const m = output.match(/error TS\d+/g);
  return m ? m.length : 0;
}

/**
 * Runs the expensive setup ONCE per fix batch: npm install, a baseline typecheck, and a
 * baseline test run against the untouched repo. Every subsequent per-fix verification reuses
 * this baseline instead of re-installing.
 */
export async function computeVerificationBaseline(sandbox: SandboxHandle): Promise<VerificationBaseline> {
  // Never pipe these through `tail` — a pipeline's exit code is the LAST command's (tail, always
  // 0), which masks whether install/tsc/tests actually failed. A real test caught exactly this.
  // Capture full output, judge from the real exit code / real error-line count.
  const install = await sandbox.exec('npm install --no-audit --no-fund 2>&1');
  const installOk = install.exitCode === 0;

  let hasTypecheck = false, typecheckErrorCount: number | null = null;
  if (await hasTsconfig(sandbox)) {
    hasTypecheck = true;
    const tc = await sandbox.exec('npx --yes tsc --noEmit 2>&1');
    // Count real "error TSxxxx" lines in the actual output, independent of exit code.
    typecheckErrorCount = countTsErrors(tc.stdout + tc.stderr);
  }

  let hasTests = false, testsPassed: boolean | null = null;
  const testCmd = await detectTestCommand(sandbox);
  if (testCmd) {
    hasTests = true;
    const t = await sandbox.exec(`${testCmd} 2>&1`);
    testsPassed = t.exitCode === 0;
  }

  console.log(`[FixVerify] Baseline: installOk=${installOk} typecheck=${hasTypecheck ? `${typecheckErrorCount} errors` : 'n/a'} tests=${hasTests ? (testsPassed ? 'passing' : 'failing') : 'none'}`);
  return { installOk, hasTypecheck, typecheckErrorCount, hasTests, testsPassed };
}

export type VerifyResult = { verified: true; method: string } | { verified: false; reason: string };

/**
 * Applies newContent to filePath in the sandbox, runs the checks required by `level`, compares
 * to the baseline, then restores originalContent (so the batch's other fixes and a rejected
 * fix both leave the sandbox untouched). The commit itself happens later via the GitHub API
 * from fix.newContent — the sandbox write here is purely to test.
 */
export async function verifyFixDoesNotRegress(
  sandbox: SandboxHandle,
  filePath: string,
  originalContent: string,
  newContent: string,
  baseline: VerificationBaseline,
  level: VerificationLevel,
): Promise<VerifyResult> {
  if (level === 'syntax') return { verified: true, method: 'syntax-only (parser check already passed upstream)' };

  // 'tests' level requires a real, previously-passing suite to prove safety against. No such
  // suite → we cannot prove the fix is safe → reject (this is the whole point of Bucket 2).
  if (level === 'tests' && (!baseline.hasTests || baseline.testsPassed !== true)) {
    return { verified: false, reason: baseline.hasTests
      ? 'This category requires a passing test suite to verify the fix, but the repo\'s tests were already failing at baseline — cannot prove the fix is safe.'
      : 'This category requires tests to verify the fix, but the repo has no detectable test suite — cannot prove the fix is safe, so refusing to auto-open a PR.' };
  }

  if (!(await writeSandboxFile(sandbox, filePath, newContent))) {
    return { verified: false, reason: `Could not write the candidate fix into the sandbox to test it (file too large or write failed).` };
  }

  try {
    // Typecheck gate (for both 'typecheck' and 'tests' levels, when a tsconfig exists).
    // No pipe — count real error lines from full output, not a masked pipeline exit code.
    if (baseline.hasTypecheck && baseline.typecheckErrorCount !== null) {
      const tc = await sandbox.exec('npx --yes tsc --noEmit 2>&1');
      const after = countTsErrors(tc.stdout + tc.stderr);
      if (after > baseline.typecheckErrorCount) {
        return { verified: false, reason: `Fix introduces new TypeScript errors (${baseline.typecheckErrorCount} -> ${after}) — refusing to commit.` };
      }
    }

    // Test gate (only for 'tests' level; baseline already confirmed passing above).
    if (level === 'tests') {
      const testCmd = await detectTestCommand(sandbox);
      if (testCmd) {
        const t = await sandbox.exec(`${testCmd} 2>&1`); // real exit code, not masked by a pipe
        if (t.exitCode !== 0) {
          return { verified: false, reason: `Fix breaks the previously-passing test suite — refusing to commit.` };
        }
        return { verified: true, method: 'typecheck + full test suite (both still green after applying the fix)' };
      }
    }

    if (baseline.hasTypecheck) return { verified: true, method: `typecheck (no new errors vs baseline of ${baseline.typecheckErrorCount})` };
    // No tsconfig and level was 'typecheck' — we couldn't do more than the upstream syntax check.
    return { verified: true, method: 'syntax-only (repo has no TypeScript config to typecheck against)' };
  } finally {
    // Always restore, whether we passed, failed, or threw.
    await writeSandboxFile(sandbox, filePath, originalContent);
  }
}
