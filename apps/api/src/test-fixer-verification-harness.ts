import assert from 'node:assert/strict';
import type { SandboxHandle } from './agents/core/provider.js';
import { verifyFixDoesNotRegress, type VerificationBaseline } from './agents/fixer/fix-verification.js';

class ScriptedSandbox implements SandboxHandle {
  writes: Array<{ filePath: string; content: string }> = [];
  private tscOutputs: string[];
  private testExitCodes: number[];

  constructor(opts: { tscOutputs?: string[]; testExitCodes?: number[] } = {}) {
    this.tscOutputs = [...(opts.tscOutputs ?? [])];
    this.testExitCodes = [...(opts.testExitCodes ?? [])];
  }

  async exec(command: string) {
    if (command.startsWith('echo ') && command.includes(' | base64 -d > ')) {
      const b64 = command.slice('echo '.length, command.indexOf(' | base64 -d > '));
      const rawPath = command.slice(command.indexOf(' | base64 -d > ') + ' | base64 -d > '.length);
      const filePath = rawPath.startsWith("'") && rawPath.endsWith("'")
        ? rawPath.slice(1, -1).replace(/'\\''/g, "'")
        : rawPath;
      this.writes.push({ filePath, content: Buffer.from(b64, 'base64').toString('utf8') });
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    if (command === 'npx --yes tsc --noEmit 2>&1') {
      return { exitCode: this.tscOutputs[0] ? 1 : 0, stdout: this.tscOutputs.shift() ?? '', stderr: '' };
    }
    if (command === 'cat package.json 2>/dev/null') {
      return { exitCode: 0, stdout: JSON.stringify({ scripts: { test: 'vitest run' } }), stderr: '' };
    }
    if (command === 'npm test --silent 2>&1') {
      const exitCode = this.testExitCodes.shift() ?? 0;
      return { exitCode, stdout: exitCode === 0 ? 'tests passed' : 'tests failed', stderr: '' };
    }
    return { exitCode: 0, stdout: '', stderr: '' };
  }

  async destroy() {}
}

const baseline: VerificationBaseline = {
  installOk: true,
  hasTypecheck: true,
  typecheckErrorCount: 1,
  hasTests: true,
  testsPassed: true,
};

async function main() {
  {
    const sandbox = new ScriptedSandbox();
    const result = await verifyFixDoesNotRegress(
      sandbox,
      'src/auth.ts',
      'original',
      'candidate',
      { ...baseline, hasTests: false, testsPassed: null },
      'tests',
    );
    assert.deepEqual(result, {
      verified: false,
      reason: 'This category requires tests to verify the fix, but the repo has no detectable test suite — cannot prove the fix is safe, so refusing to auto-open a PR.',
    });
    assert.equal(sandbox.writes.length, 0, 'tests-required/no-suite path should reject before writing candidate content');
  }

  {
    const sandbox = new ScriptedSandbox();
    const result = await verifyFixDoesNotRegress(
      sandbox,
      'src/auth.ts',
      'original',
      'candidate',
      { ...baseline, testsPassed: false },
      'tests',
    );
    assert.deepEqual(result, {
      verified: false,
      reason: 'This category requires a passing test suite to verify the fix, but the repo\'s tests were already failing at baseline — cannot prove the fix is safe.',
    });
    assert.equal(sandbox.writes.length, 0, 'tests-required/failing-baseline path should reject before writing candidate content');
  }

  {
    const sandbox = new ScriptedSandbox({ tscOutputs: ['a.ts(1,1): error TS1001: old\nb.ts(2,1): error TS1002: new\n'] });
    const result = await verifyFixDoesNotRegress(sandbox, 'src/auth.ts', 'original', 'candidate', baseline, 'typecheck');
    assert.deepEqual(result, {
      verified: false,
      reason: 'Fix introduces new TypeScript errors (1 -> 2) — refusing to commit.',
    });
    assert.deepEqual(sandbox.writes.map((w) => w.content), ['candidate', 'original']);
  }

  {
    const sandbox = new ScriptedSandbox({ tscOutputs: ['a.ts(1,1): error TS1001: old\n'] });
    const result = await verifyFixDoesNotRegress(sandbox, 'src/auth.ts', 'original', 'candidate', baseline, 'typecheck');
    assert.deepEqual(result, { verified: true, method: 'typecheck (no new errors vs baseline of 1)' });
    assert.deepEqual(sandbox.writes.map((w) => w.content), ['candidate', 'original']);
  }

  {
    const sandbox = new ScriptedSandbox({ tscOutputs: ['a.ts(1,1): error TS1001: old\n'], testExitCodes: [1] });
    const result = await verifyFixDoesNotRegress(sandbox, 'src/auth.ts', 'original', 'candidate', baseline, 'tests');
    assert.deepEqual(result, {
      verified: false,
      reason: 'Fix breaks the previously-passing test suite — refusing to commit.',
    });
    assert.deepEqual(sandbox.writes.map((w) => w.content), ['candidate', 'original']);
  }

  {
    const sandbox = new ScriptedSandbox({ tscOutputs: ['a.ts(1,1): error TS1001: old\n'], testExitCodes: [0] });
    const result = await verifyFixDoesNotRegress(sandbox, 'src/auth.ts', 'original', 'candidate', baseline, 'tests');
    assert.deepEqual(result, { verified: true, method: 'typecheck + full test suite (both still green after applying the fix)' });
    assert.deepEqual(sandbox.writes.map((w) => w.content), ['candidate', 'original']);
  }

  console.log('PASS: Fixer verification harness proved rejection, acceptance, and sandbox restore behavior.');
}

main().catch((e) => {
  console.error('FAIL: Fixer verification harness failed.');
  console.error(e);
  process.exit(1);
});
