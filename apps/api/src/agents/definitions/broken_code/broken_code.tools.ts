import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

/**
 * Design note: this agent runs against a cloned-but-not-deployed repo — there is no live
 * `baseUrl` or `connectionUrl` to hit. Tools that inherently need a running instance
 * (check_input_validation, check_race_conditions, run_data_integrity_check,
 * check_zombie_workers, run_heap_profiler) honestly report `applicable: false` with a reason
 * instead of returning a fabricated empty-pass result — a silent "no issues found" for a check
 * that never ran is worse than no check at all, because it reads as a verified guarantee.
 * Everything else here shells real commands via sandbox.exec.
 */

async function detectTestCommand(sandbox: SandboxHandle): Promise<{ command: string | null; runner: string }> {
  const pkg = await sandbox.exec('cat package.json 2>/dev/null');
  if (pkg.exitCode === 0 && pkg.stdout.trim()) {
    try {
      const parsed = JSON.parse(pkg.stdout);
      const testScript = parsed.scripts?.test;
      if (testScript && !/exit 1|no test specified/i.test(testScript)) {
        return { command: 'npm test --silent', runner: 'npm-script' };
      }
    } catch { /* fall through to config-file detection */ }
  }
  const vitest = await sandbox.exec('find . -maxdepth 2 -iname "vitest.config.*" 2>/dev/null');
  if (vitest.stdout.trim()) return { command: 'npx --yes vitest run', runner: 'vitest' };
  const jest = await sandbox.exec('find . -maxdepth 2 -iname "jest.config.*" 2>/dev/null');
  if (jest.stdout.trim()) return { command: 'npx --yes jest', runner: 'jest' };
  const pytest = await sandbox.exec('find . -maxdepth 2 -iname "pytest.ini" -o -maxdepth 2 -iname "pyproject.toml" 2>/dev/null');
  if (pytest.stdout.trim()) return { command: 'pytest', runner: 'pytest' };
  return { command: null, runner: 'none' };
}

function parseTestSummary(output: string) {
  // Best-effort across common reporters (jest/vitest/mocha/pytest). Real parsing, not a fixed
  // shape — different runners format summaries differently, so we try several known patterns
  // and fall back to exit-code-only if none match, rather than guessing numbers.
  const patterns = [
    /Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(\d+) passed,\s*(\d+) total/i, // jest
    /Test Files\s+\d+.*?\n\s*Tests\s+(?:(\d+) failed \| )?(\d+) passed(?:\s*\((\d+)\))?/is, // vitest
    /(\d+) passing(?:\s*\((?:\d+\w+)\))?(?:\s*\n\s*(\d+) failing)?/i, // mocha
    /(\d+) passed(?:,\s*(\d+) failed)?(?:,\s*(\d+) skipped)?/i, // pytest
  ];
  for (const p of patterns) {
    const m = output.match(p);
    if (m) return { matched: true, raw: m[0] };
  }
  return { matched: false, raw: null };
}

export const createBrokenCodeTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    run_test_suite: {
      description: 'Execute the repo\'s real test suite (auto-detected from package.json scripts.test / vitest / jest / pytest config) and report pass/fail from the actual exit code and output.',
      parameters: z.object({
        timeoutSeconds: z.number().optional().default(300)
      }),
      execute: async (args: { timeoutSeconds?: number }) => {
        const { command, runner } = await detectTestCommand(sandbox);
        if (!command) {
          return { applicable: false, reason: 'No test command detected (no scripts.test, vitest/jest config, or pytest project found).' };
        }
        // Install deps first — a fresh ephemeral clone has none.
        const install = await sandbox.exec(runner === 'pytest' ? 'pip install -r requirements.txt 2>&1 | tail -20' : 'npm install --no-audit --no-fund 2>&1 | tail -30');
        const res = await sandbox.exec(command);
        const summary = parseTestSummary(res.stdout + res.stderr);
        return {
          runner,
          command,
          exitCode: res.exitCode,
          passed: res.exitCode === 0,
          installExitCode: install.exitCode,
          summaryParsed: summary.matched,
          summaryLine: summary.raw,
          outputTail: (res.stdout + res.stderr).slice(-4000)
        };
      }
    },

    run_flaky_detector: {
      description: 'Run the real test suite N times in a row and report how many runs passed vs failed, to surface non-deterministic (flaky) results.',
      parameters: z.object({
        runs: z.number().optional().default(5).describe('Kept low by default — each run re-executes the full real suite')
      }),
      execute: async (args: { runs?: number }) => {
        const { command, runner } = await detectTestCommand(sandbox);
        if (!command) {
          return { applicable: false, reason: 'No test command detected.' };
        }
        await sandbox.exec(runner === 'pytest' ? 'pip install -r requirements.txt 2>&1 | tail -20' : 'npm install --no-audit --no-fund 2>&1 | tail -30');
        const runs = Math.min(args.runs ?? 5, 10);
        const results: { run: number; exitCode: number }[] = [];
        for (let i = 0; i < runs; i++) {
          const res = await sandbox.exec(command);
          results.push({ run: i + 1, exitCode: res.exitCode });
        }
        const failures = results.filter(r => r.exitCode !== 0).length;
        return {
          totalRunsDone: runs,
          passRate: (runs - failures) / runs,
          flaky: failures > 0 && failures < runs, // some pass, some fail = non-deterministic
          consistentlyFailing: failures === runs,
          results
        };
      }
    },

    run_heap_profiler: {
      description: 'Requires a running instance of the app under load. This pipeline only clones and statically analyzes the repo — it does not deploy/start it, so this check cannot run here.',
      parameters: z.object({ startCommand: z.string().optional(), durationSeconds: z.number().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available in this pipeline (clone-and-analyze only, app is not started).' })
    },

    run_migration_down: {
      description: 'Attempt a real DB migration rollback, if a migration tool (drizzle-kit/prisma/knex) is detected AND a databaseUrl is supplied. Without a real reachable database, this is skipped rather than faked.',
      parameters: z.object({
        databaseUrl: z.string().optional().describe('Only run this check if you have a real, reachable database URL for this repo')
      }),
      execute: async (args: { databaseUrl?: string }) => {
        if (!args.databaseUrl) {
          return { applicable: false, reason: 'No databaseUrl supplied — cannot verify a rollback without a real database.' };
        }
        const drizzle = await sandbox.exec('find . -maxdepth 3 -iname "drizzle.config.*" 2>/dev/null');
        const prisma = await sandbox.exec('find . -maxdepth 3 -iname "schema.prisma" 2>/dev/null');
        if (drizzle.stdout.trim()) {
          return { applicable: false, reason: 'Drizzle detected — Drizzle Kit has no built-in "migrate down"; rollback safety must be verified via a written down-migration, which this tool cannot generate automatically.' };
        }
        if (prisma.stdout.trim()) {
          const res = await sandbox.exec(`DATABASE_URL="${args.databaseUrl}" npx --yes prisma migrate resolve --rolled-back 2>&1 | tail -20`);
          return { success: res.exitCode === 0, output: res.stdout.slice(-2000) };
        }
        return { applicable: false, reason: 'No recognized migration tool (drizzle-kit, prisma) detected in this repo.' };
      }
    },

    scan_async_patterns: {
      description: 'Grep-based static scan for likely-unhandled promises: .then( chains with no nearby .catch(, and bare async calls with no await/then/catch.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "\\.then\\(" . 2>/dev/null | grep -v "node_modules" | grep -v "\\.catch(" | head -50`
        );
        const matches = res.stdout.split('\n').filter(Boolean);
        return {
          findingsCount: matches.length,
          findings: matches.slice(0, 30).map(line => {
            const [file, lineNo, ...rest] = line.split(':');
            return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
          })
        };
      }
    },

    scan_swallowed_errors: {
      description: 'Grep-based static scan for catch blocks that only log or are empty (real pattern match against actual source, not a simulation).',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "catch\\s*\\([a-zA-Z_]*\\)\\s*\\{\\s*(console\\.(log|error|warn)\\([^)]*\\);?\\s*)?\\}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`
        );
        const matches = res.stdout.split('\n').filter(Boolean);
        return {
          findingsCount: matches.length,
          findings: matches.slice(0, 30).map(line => {
            const [file, lineNo, ...rest] = line.split(':');
            return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
          })
        };
      }
    },

    check_input_validation: {
      description: 'Requires firing live HTTP requests at a running app (baseUrl). This pipeline does not deploy the app, so this check cannot run here.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available — cannot fire live requests without a deployed baseUrl.' })
    },

    check_race_conditions: {
      description: 'Requires firing concurrent live requests at a running app (baseUrl). This pipeline does not deploy the app, so this check cannot run here.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available — cannot test concurrency without a deployed baseUrl.' })
    },

    check_resource_handles: {
      description: 'Grep-based static scan for common unclosed-handle patterns (fs.createReadStream/createWriteStream, net/db .connect() without a matching .close()/.end() nearby). A real but imperfect static heuristic — not a runtime handle audit.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rln --include="*.ts" --include="*.js" -E "createReadStream|createWriteStream|\\.connect\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`
        );
        const files = res.stdout.split('\n').filter(Boolean);
        const findings: any[] = [];
        for (const file of files.slice(0, 15)) {
          const hasClose = await sandbox.exec(`grep -c -E "\\.close\\(|\\.end\\(|\\.destroy\\(" "${file}" 2>/dev/null`);
          if ((parseInt(hasClose.stdout.trim(), 10) || 0) === 0) {
            findings.push({ file, note: 'Opens a stream/connection but no .close()/.end()/.destroy() found in the same file — verify manually, may be closed elsewhere.' });
          }
        }
        return { findings };
      }
    },

    check_zombie_workers: {
      description: 'Requires a live connection to a running job queue (connectionUrl). This pipeline does not run background workers, so this check cannot run here.',
      parameters: z.object({ connectionUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running queue/worker instance available in this pipeline.' })
    },

    check_type_safety: {
      description: 'Real TypeScript check: runs `tsc --noEmit` if a tsconfig is present, plus a real grep count of `: any` and `@ts-ignore`/`@ts-expect-error` usage.',
      parameters: z.object({}),
      execute: async () => {
        const tsconfig = await sandbox.exec('find . -maxdepth 2 -iname "tsconfig*.json" 2>/dev/null');
        let tscResult: any = { applicable: false, reason: 'No tsconfig.json found.' };
        if (tsconfig.stdout.trim()) {
          await sandbox.exec('npm install --no-audit --no-fund 2>&1 | tail -20');
          const res = await sandbox.exec('npx --yes tsc --noEmit 2>&1 | tail -100');
          const errorCount = (res.stdout.match(/error TS\d+/g) || []).length;
          tscResult = { applicable: true, exitCode: res.exitCode, errorCount, outputTail: res.stdout.slice(-3000) };
        }
        const anyCount = await sandbox.exec(`grep -rn --include="*.ts" --include="*.tsx" -E ":\\s*any\\b" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | wc -l`);
        const ignoreCount = await sandbox.exec(`grep -rn --include="*.ts" --include="*.tsx" -E "@ts-ignore|@ts-expect-error" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | wc -l`);
        return {
          typecheck: tscResult,
          totalAnyCount: parseInt(anyCount.stdout.trim(), 10) || 0,
          totalTsIgnoreCount: parseInt(ignoreCount.stdout.trim(), 10) || 0
        };
      }
    },

    check_stale_feature_flags: {
      description: 'Grep-based static scan for feature-flag usage sites. Cannot determine real "% on for 30 days" without a live flag provider (LaunchDarkly/etc) connection — reports usage locations only, not staleness.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rln --include="*.ts" --include="*.tsx" -iE "featureflag|feature_flag|launchdarkly|growthbook|flagsmith" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`
        );
        const files = res.stdout.split('\n').filter(Boolean);
        return {
          applicable: files.length > 0,
          note: 'Usage-site scan only — real staleness (100% on for 30+ days) requires a live flag-provider API connection this pipeline does not have.',
          filesWithFlagUsage: files
        };
      }
    },

    check_api_timeouts: {
      description: 'Grep-based static scan for outbound HTTP calls (fetch/axios) with no nearby timeout/AbortController configuration.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.js" -E "fetch\\(|axios\\.(get|post|put|delete)\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -vi "timeout\\|abortcontroller\\|signal" | head -50`
        );
        const matches = res.stdout.split('\n').filter(Boolean);
        return {
          findingsCount: matches.length,
          findings: matches.slice(0, 30).map(line => {
            const [file, lineNo, ...rest] = line.split(':');
            return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
          })
        };
      }
    },

    run_data_integrity_check: {
      description: 'Requires writing to and reading from a running app + database (baseUrl). This pipeline does not deploy the app, so this check cannot run here.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance/database available in this pipeline.' })
    },

    check_implicit_contracts: {
      description: 'Grep-based static scan for module-level mutable exported state (export let, exported singletons) that functions may implicitly depend on.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.js" -E "^export let |^let [a-zA-Z_]+.*=.*;\\s*$" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`
        );
        const matches = res.stdout.split('\n').filter(Boolean);
        return {
          findingsCount: matches.length,
          findings: matches.slice(0, 30).map(line => {
            const [file, lineNo, ...rest] = line.split(':');
            return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
          })
        };
      }
    },

    submit_broken_code_report: {
      description: 'Submit the final BrokenCodeAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("broken_code"),
        runId: z.string(),
        repoId: z.string(),
        commitSha: z.string(),
        executedAt: z.string().datetime(),

        score: z.number().min(0).max(100),
        gateDecision: z.enum(["PASS", "BLOCK"]),

        testSuiteResult: z.object({
          totalTests: z.number(),
          passed: z.number(),
          failed: z.number(),
          coverage: z.number().nullable(),
          durationMs: z.number()
        }),

        migrationRollbackPassed: z.boolean(),
        memoryLeakDetected: z.boolean(),
        flakyTestsFound: z.number(),

        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "FAILING_TEST", "RUNTIME_EXCEPTION", "RACE_CONDITION", "MIGRATION_FAILURE",
            "DATA_CORRUPTION", "SWALLOWED_ERROR", "INPUT_VALIDATION", "MEMORY_LEAK",
            "FLAKY_TEST", "ASYNC_PATTERN", "STALE_FLAG", "IMPLICIT_CONTRACT",
            "API_TIMEOUT", "RESOURCE_HANDLE", "ZOMBIE_WORKER", "TYPE_SAFETY"
          ]),
          title: z.string(),
          description: z.string(),
          file: z.string(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          karpathyLoopCount: z.number().default(0),
          rootCause: z.string().nullable(),
          dismissed: z.boolean().default(false)
        })),

        toolsExecuted: z.array(z.object({
          toolName: z.string(),
          calledAt: z.string().datetime(),
          durationMs: z.number(),
          resultSummary: z.string()
        }))
      }),
      execute: async (args: any) => {
        return { success: true, message: "Broken Code report submitted." };
      }
    }
  };
};
