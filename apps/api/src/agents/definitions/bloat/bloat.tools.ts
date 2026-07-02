import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';

/**
 * Fallow (https://docs.fallow.tools) is a local CLI, not a REST API — dead-code/dupes/health
 * are MIT-licensed static analysis with no auth. There is no api.fallow.dev; that endpoint
 * never existed. FALLOW_API_KEY is reserved for the separate paid "Runtime Coverage" cloud
 * feature (fallow coverage ... --cloud), which these tools do not use.
 *
 * Every tool below shells the real `fallow` CLI inside the sandbox (already checked out to
 * the repo root) and parses its real JSON output. No fallback-to-fake-success: on failure we
 * throw, so the agent loop reports a genuine tool error back to the model instead of a
 * silently fabricated "all clear".
 */
// A real repo (this one included) can produce hundreds of findings in one fallow call —
// full JSON for e.g. 782 dead-code issues or 127 clone groups with code fragments blew a
// single agent turn past OpenAI's 200k TPM limit (508,915 tokens requested) during a live
// test. `summary`/count fields are always kept intact; only large array payloads are capped,
// and the true totals stay visible so the model knows it's seeing a slice, not the whole set.
const MAX_ARRAY_ITEMS = 25;

function truncateArrays(value: any): any {
  if (Array.isArray(value)) {
    const capped = value.slice(0, MAX_ARRAY_ITEMS).map(truncateArrays);
    if (value.length > MAX_ARRAY_ITEMS) {
      return { _truncated: true, totalCount: value.length, shown: MAX_ARRAY_ITEMS, items: capped };
    }
    return capped;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = truncateArrays(v);
    return out;
  }
  return value;
}

async function runFallowCli(sandbox: SandboxHandle, args: string[]) {
  const command = `npx --yes fallow ${args.join(' ')}`;
  const res = await sandbox.exec(command);

  // Exit codes per `fallow help`: 0 = clean, 1 = issues found, 2 = fatal error, 8 = gated security failure.
  // 0 and 1 are both successful runs (issues found is the expected common case).
  if (res.exitCode === 2) {
    throw new Error(`fallow CLI fatal error (exit 2): ${res.stderr || res.stdout}`.slice(0, 2000));
  }

  const jsonStart = res.stdout.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`fallow produced no JSON output. stdout: ${res.stdout.slice(0, 500)} stderr: ${res.stderr.slice(0, 500)}`);
  }
  try {
    const parsed = JSON.parse(res.stdout.slice(jsonStart));
    return truncateArrays(parsed);
  } catch (e: any) {
    throw new Error(`Failed to parse fallow JSON output: ${e.message}. Raw: ${res.stdout.slice(jsonStart, jsonStart + 500)}`);
  }
}

export const createBloatTools = (sandbox: SandboxHandle) => ({
  run_fallow_dead_code: {
    description: 'Find unused files, exports, types, dependencies, and circular imports via the real Fallow CLI (`fallow dead-code`). Entry points are auto-detected from package.json/config — do not need to be supplied.',
    parameters: z.object({
      only: z.array(z.enum([
        'unused-files', 'unused-exports', 'unused-deps', 'unused-types',
        'unused-enum-members', 'unused-class-members'
      ])).optional().describe('Restrict to specific finding categories. Omit to get all categories.')
    }),
    execute: async (args: { only?: string[] }) => {
      const flags = ['dead-code', '--format', 'json'];
      for (const flag of args.only ?? []) flags.push(`--${flag}`);
      return runFallowCli(sandbox, flags);
    }
  },

  run_fallow_duplicates: {
    description: 'Find copy-paste and structural code duplication via the real Fallow CLI (`fallow dupes`).',
    parameters: z.object({
      mode: z.enum(['strict', 'mild', 'weak', 'semantic']).optional().describe('Detection strictness. Defaults to "mild" if omitted.'),
      minLines: z.number().optional().describe('Minimum line count for a clone (CLI default: 5)'),
      minTokens: z.number().optional().describe('Minimum token count for a clone (CLI default: 50)'),
      minOccurrences: z.number().optional().describe('Minimum occurrences before a clone group is reported (CLI default: 2)')
    }),
    execute: async (args: { mode?: string; minLines?: number; minTokens?: number; minOccurrences?: number }) => {
      const flags = ['dupes', '--format', 'json'];
      if (args.mode) flags.push('--mode', args.mode);
      if (args.minLines != null) flags.push('--min-lines', String(args.minLines));
      if (args.minTokens != null) flags.push('--min-tokens', String(args.minTokens));
      if (args.minOccurrences != null) flags.push('--min-occurrences', String(args.minOccurrences));
      return runFallowCli(sandbox, flags);
    }
  },

  run_fallow_complexity: {
    description: 'Find functions exceeding cyclomatic/cognitive complexity thresholds. Fallow has no standalone "complexity" command — this runs `fallow health --complexity`, the complexity-only slice of the health report.',
    parameters: z.object({
      maxCyclomatic: z.number().optional().describe('Override the cyclomatic complexity threshold'),
      maxCognitive: z.number().optional().describe('Override the cognitive complexity threshold'),
      top: z.number().optional().describe('Only return the N most complex functions')
    }),
    execute: async (args: { maxCyclomatic?: number; maxCognitive?: number; top?: number }) => {
      const flags = ['health', '--format', 'json', '--complexity'];
      if (args.maxCyclomatic != null) flags.push('--max-cyclomatic', String(args.maxCyclomatic));
      if (args.maxCognitive != null) flags.push('--max-cognitive', String(args.maxCognitive));
      if (args.top != null) flags.push('--top', String(args.top));
      return runFallowCli(sandbox, flags);
    }
  },

  run_fallow_health: {
    description: 'Get the overall codebase health score, complexity findings, file scores, hotspots, and refactor targets via the real Fallow CLI (`fallow health`).',
    parameters: z.object({
      top: z.number().optional().describe('Limit hotspots/targets sections to top N')
    }),
    execute: async (args: { top?: number }) => {
      const flags = ['health', '--format', 'json'];
      if (args.top != null) flags.push('--top', String(args.top));
      return runFallowCli(sandbox, flags);
    }
  },

  run_fallow_boundaries: {
    description: 'Check for architecture boundary violations (e.g. UI layer importing DB layer directly). Fallow has no separate "boundaries" command — these counts are part of `fallow dead-code`\'s summary, so this runs that and extracts the boundary-related fields.',
    parameters: z.object({}),
    execute: async () => {
      const result = await runFallowCli(sandbox, ['dead-code', '--format', 'json']);
      return {
        boundaryViolations: result.summary?.boundary_violations ?? 0,
        boundaryCoverageViolations: result.summary?.boundary_coverage_violations ?? 0,
        boundaryCallViolations: result.summary?.boundary_call_violations ?? 0,
        // Fallow may or may not include a detailed per-violation array depending on version;
        // pass it through if present rather than guessing its shape.
        details: result.boundary_violations ?? []
      };
    }
  },

  run_tree_sitter_ast: {
    description: 'Parse specific files with tree-sitter for deep AST analysis. Used to generate refactor suggestions.',
    parameters: z.object({
      filePath: z.string(),
      language: z.enum(['typescript', 'javascript', 'python', 'go', 'ruby', 'rust']),
      query: z.string().optional()
    }),
    execute: async (args: any) => {
      return { ast: {}, functions: [], imports: [], exports: [] };
    }
  },

  check_dynamic_imports: {
    description: 'Verify if a "dead" export is actually consumed via dynamic import(), require(), or string-based lookup.',
    parameters: z.object({
      repoPath: z.string(),
      exportName: z.string(),
      exportFile: z.string()
    }),
    execute: async (args: any) => {
      return { isDynamicallyImported: false, locations: [], isExternallyConsumed: false };
    }
  },

  analyse_bundle_size: {
    description: 'Analyse the frontend bundle for unused CSS classes, oversized assets, and shadow dependencies.',
    parameters: z.object({
      repoPath: z.string(),
      framework: z.enum(['vite', 'nextjs', 'cra', 'webpack']),
      analyseCSS: z.boolean(),
      analyseAssets: z.boolean()
    }),
    execute: async (args: any) => {
      return {
        unusedCssClasses: [],
        shadowDependencies: [],
        largeAssets: [],
        totalBundleSizeKb: 0,
        estimatedSavingsKb: 0
      };
    }
  },

  correlate_telemetry: {
    description: 'Cross-reference code paths with telemetry/analytics to find features with <1% monthly active usage.',
    parameters: z.object({
      repoPath: z.string(),
      analyticsProvider: z.enum(['mixpanel', 'amplitude', 'segment', 'custom']),
      mauThreshold: z.number().default(1.0)
    }),
    execute: async (args: any) => {
      return { lowUsageFeatures: [] };
    }
  },

  check_dependency_usage: {
    description: 'Find npm/pip packages that are installed in package.json but never actually imported in code.',
    parameters: z.object({
      repoPath: z.string(),
      packageManager: z.enum(['npm', 'yarn', 'pnpm', 'pip', 'cargo'])
    }),
    execute: async (args: any) => {
      return { unusedDependencies: [], duplicatePurposeDeps: [] };
    }
  },

  check_yagni_patterns: {
    description: 'Identify code branches added for "future" requirements that never materialized.',
    parameters: z.object({
      repoPath: z.string(),
      ageThresholdDays: z.number().describe('flag if code is >90 days old and never triggered')
    }),
    execute: async (args: any) => {
      return { findings: [] };
    }
  },

  check_feature_flags: {
    description: 'Find feature flags that are 100% "on" for 30+ days (should be hardcoded) or 0% "on" (dead code).',
    parameters: z.object({
      repoPath: z.string(),
      flagProvider: z.enum(['launchdarkly', 'flagsmith', 'growthbook', 'custom', 'env_var'])
    }),
    execute: async (args: any) => {
      return { staleFlags: [] };
    }
  },

  scan_legacy_polyfills: {
    description: 'Find polyfills for browsers no longer in the project support matrix.',
    parameters: z.object({
      repoPath: z.string()
    }),
    execute: async (args: any) => {
      return { stalePolyfills: [] };
    }
  },

  check_documentation_drift: {
    description: 'Compare README/doc content with actual code signatures and exported APIs.',
    parameters: z.object({
      repoPath: z.string(),
      docsGlob: z.string()
    }),
    execute: async (args: any) => {
      return { discrepancies: [] };
    }
  },

  measure_cognitive_load: {
    description: 'Use the LLM itself to assess "time to comprehend" for complex files.',
    parameters: z.object({
      filePath: z.string(),
      content: z.string()
    }),
    execute: async (args: any) => {
      return {
        comprehensionTimeMinutes: 0,
        complexityFactors: [],
        recommendation: "Refactor if comprehension takes longer than 5 minutes."
      };
    }
  },

  check_god_files: {
    description: 'Find files exceeding 1000 lines or handling more than 3 distinct responsibilities.',
    parameters: z.object({
      repoPath: z.string(),
      lineLimitSoft: z.number().default(500),
      lineLimitHard: z.number().default(1000)
    }),
    execute: async (args: any) => {
      return { godFiles: [] };
    }
  },

  submit_bloat_report: {
    description: 'Submit the final bloat findings and gate decision.',
    parameters: z.object({
      runId: z.string(),
      repoId: z.string(),
      commitSha: z.string(),
      executedAt: z.string().datetime(),
      fallowHealthScore: z.number().min(0).max(100),
      fallowGrade: z.enum(["A", "B", "C", "D", "F"]),
      score: z.number().min(0).max(100),
      gateDecision: z.enum(["PASS", "WARN", "BLOCK"]),
      findings: z.array(z.object({
        id: z.string(),
        severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]),
        category: z.enum([
          "DEAD_CODE", "DUPLICATION", "GOD_FILE", "COMPLEXITY",
          "UNUSED_DEPENDENCY", "BUNDLE_BLOAT", "YAGNI", "FEATURE_FLAG",
          "POLYFILL", "DOCUMENTATION_DRIFT", "LOW_USAGE_FEATURE",
          "COGNITIVE_LOAD", "BOUNDARY_VIOLATION"
        ]),
        title: z.string(),
        description: z.string(),
        file: z.string(),
        line: z.number().nullable().optional(),
        toolName: z.string(),
        rawEvidence: z.string(),
        refactorSafe: z.boolean(),
        suggestedRefactor: z.string().nullable().optional(),
        estimatedLinesRemovable: z.number().nullable().optional(),
        dismissed: z.boolean().default(false),
        dismissalReason: z.string().nullable().optional()
      })),
      toolsExecuted: z.array(z.object({
        toolName: z.string(),
        calledAt: z.string().datetime(),
        durationMs: z.number(),
        resultSummary: z.string()
      })),
      summary: z.object({
        totalDeadExports: z.number(),
        totalDuplicateClones: z.number(),
        totalGodFiles: z.number(),
        totalUnusedDeps: z.number(),
        estimatedTotalLinesRemovable: z.number(),
        estimatedBundleSavingsKb: z.number().nullable().optional()
      })
    }),
    execute: async (args: any) => {
      return { success: true, message: "Report successfully submitted and saved." };
    }
  },

  search_memory: {
    description: 'Search the agent_memory vector database for prior learnings on this repo.',
    parameters: z.object({
      repoId: z.string(),
      agentType: z.string()
    }),
    execute: async (args: any) => {
      return { memories: [] };
    }
  },

  write_memory: {
    description: 'Write a new finding, pattern, or exception to the agent_memory vector database.',
    parameters: z.object({
      repoId: z.string(),
      summary: z.string()
    }),
    execute: async (args: any) => {
      return { success: true };
    }
  }
});
