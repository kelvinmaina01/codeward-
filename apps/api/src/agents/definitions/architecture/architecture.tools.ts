import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

/**
 * Same design note as broken_code.tools.ts: this agent runs against a cloned-but-not-deployed
 * repo. Tools needing a live baseUrl/running app (instrument_query_counter,
 * check_unbounded_results, check_idempotency, measure_cold_start, run_k6_load_test,
 * check_backpressure, check_distributed_tracing) honestly report `applicable: false` instead
 * of a fabricated pass — this pipeline never starts an arbitrary customer app (unknown port,
 * unknown env requirements, unknown health endpoint; doing that safely needs a declared start
 * command from repo config, which doesn't exist yet).
 *
 * run_explain_analyze and check_data_archival_debt only need a reachable Postgres connection
 * (not a running app), so those ARE made real when a databaseUrl is supplied.
 */

function grepLines(stdout: string) {
  return stdout.split('\n').filter(Boolean).map(line => {
    const [file, lineNo, ...rest] = line.split(':');
    return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
  });
}

async function withPg<T>(databaseUrl: string, fn: (sql: any) => Promise<T>): Promise<T> {
  const postgres = (await import('postgres')).default;
  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const sql = postgres(databaseUrl, { prepare: false, ssl: isLocal ? false : 'require', connect_timeout: 10 });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export const createArchitectureTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    trace_import_graph: {
      description: 'Find circular dependencies via the real Fallow CLI (`fallow dead-code`), which already builds the module graph — no need to reimplement an import tracer.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec('npx --yes fallow dead-code --format json');
        const jsonStart = res.stdout.indexOf('{');
        if (jsonStart === -1) {
          throw new Error(`fallow produced no JSON output. stdout: ${res.stdout.slice(0, 500)} stderr: ${res.stderr.slice(0, 500)}`);
        }
        const parsed = JSON.parse(res.stdout.slice(jsonStart));
        return {
          circularDependencyCount: parsed.summary?.circular_dependencies ?? 0,
          reExportCycleCount: parsed.summary?.re_export_cycles ?? 0,
          // Per-cycle detail array name isn't guaranteed across fallow versions — pass through if present.
          details: parsed.circular_dependencies ?? []
        };
      }
    },

    run_explain_analyze: {
      description: 'Run real PostgreSQL EXPLAIN ANALYZE on supplied queries via a direct DB connection. Needs a real, reachable databaseUrl — this pipeline does not guess or seed one.',
      parameters: z.object({
        databaseUrl: z.string().optional(),
        queries: z.array(z.string()).describe('Read-only SELECT queries only')
      }),
      execute: async (args: { databaseUrl?: string; queries: string[] }) => {
        if (!args.databaseUrl) {
          return { applicable: false, reason: 'No databaseUrl supplied.' };
        }
        return withPg(args.databaseUrl, async (sql) => {
          const analyses = [];
          for (const query of args.queries.slice(0, 10)) {
            if (!/^\s*select/i.test(query)) {
              analyses.push({ query, error: 'Refused: only SELECT queries are allowed for EXPLAIN ANALYZE in this tool.' });
              continue;
            }
            try {
              const plan = await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) ${query}`);
              const node = plan[0]['QUERY PLAN'][0].Plan;
              analyses.push({
                query,
                planType: node['Node Type'],
                actualDurationMs: node['Actual Total Time'],
                rowsScanned: node['Actual Rows'],
                isSeqScan: node['Node Type'] === 'Seq Scan',
                relationName: node['Relation Name'] ?? null
              });
            } catch (e: any) {
              analyses.push({ query, error: e.message });
            }
          }
          return { analyses };
        });
      }
    },

    run_k6_load_test: {
      description: 'Requires a running deployed instance to load-test. This pipeline only clones and statically analyzes the repo — it does not deploy/start it.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available — this pipeline does not start arbitrary apps (unknown port/env/health-check).' })
    },

    measure_cold_start: {
      description: 'Requires actually starting the app process. This pipeline does not start arbitrary apps without a declared, trusted start command.',
      parameters: z.object({ startCommand: z.string().optional(), healthCheckUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'This pipeline does not start arbitrary customer apps — no safe, declared start command available.' })
    },

    check_unbounded_results: {
      description: 'Requires a running instance with seeded data to test pagination behavior. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance/seeded data available in this pipeline.' })
    },

    check_caching_opportunities: {
      description: 'Detect identical DB queries fired multiple times within a request lifecycle. Operates on a real supplied query log (from instrument_query_counter, which requires a live instance) — with no live instance, there is nothing to analyze yet.',
      parameters: z.object({
        queryLog: z.array(z.object({ sql: z.string(), durationMs: z.number() })).optional()
      }),
      execute: async (args: { queryLog?: { sql: string; durationMs: number }[] }) => {
        if (!args.queryLog || args.queryLog.length === 0) {
          return { applicable: false, reason: 'No queryLog supplied (would come from instrument_query_counter, which needs a live instance this pipeline does not have).' };
        }
        const counts = new Map<string, { count: number; totalMs: number }>();
        for (const q of args.queryLog) {
          const key = q.sql.trim();
          const cur = counts.get(key) ?? { count: 0, totalMs: 0 };
          cur.count++;
          cur.totalMs += q.durationMs;
          counts.set(key, cur);
        }
        const cacheOpportunities = [...counts.entries()]
          .filter(([, v]) => v.count > 1)
          .map(([query, v]) => ({ query, occurrences: v.count, totalWastedMs: v.totalMs - v.totalMs / v.count }));
        return { cacheOpportunities };
      }
    },

    check_coupling_score: {
      description: 'Real grep-based check for DB access code directly inside route handler files (a common tight-coupling pattern), using the caller-supplied glob patterns.',
      parameters: z.object({
        routesGlob: z.string().describe('e.g. "src/routes/**/*.ts"'),
        dbGlob: z.string().optional()
      }),
      execute: async (args: { routesGlob: string; dbGlob?: string }) => {
        const routeDir = args.routesGlob.split('*')[0] || '.';
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.js" -E "\\.query\\(|\\.execute\\(|SELECT |db\\.(select|insert|update|delete)\\(" "${routeDir}" 2>/dev/null | head -50`
        );
        const findings = grepLines(res.stdout).map(f => ({ ...f, fromLayer: 'route', toLayer: 'db', pattern: 'db_in_route' }));
        return { couplingViolations: findings, overallCouplingScore: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 5) };
      }
    },

    check_retry_logic: {
      description: 'Real grep-based scan for outbound HTTP calls with no retry/backoff wrapper nearby.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.js" -E "axios\\.(get|post|put|delete)\\(|fetch\\(" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -viE "retry|backoff" | head -50`
        );
        return { findings: grepLines(res.stdout) };
      }
    },

    check_distributed_tracing: {
      description: 'Requires live inter-service requests to verify trace propagation. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ services: z.array(z.object({ name: z.string(), baseUrl: z.string() })).optional() }),
      execute: async () => ({ applicable: false, reason: 'No running services available to trace a live request through.' })
    },

    check_idempotency: {
      description: 'Requires firing live write requests at a running app. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test write idempotency.' })
    },

    check_backpressure: {
      description: 'Requires load-testing a running app to failure. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to load-test.' })
    },

    check_data_archival_debt: {
      description: 'Real table-size/row-count query against Postgres system catalogs. Needs a real, reachable databaseUrl.',
      parameters: z.object({
        databaseUrl: z.string().optional(),
        sizeThresholdMb: z.number().optional().default(100)
      }),
      execute: async (args: { databaseUrl?: string; sizeThresholdMb?: number }) => {
        if (!args.databaseUrl) {
          return { applicable: false, reason: 'No databaseUrl supplied.' };
        }
        return withPg(args.databaseUrl, async (sql) => {
          const rows = await sql`
            SELECT relname AS table_name,
                   n_live_tup AS row_count,
                   pg_total_relation_size(relid) / 1024 / 1024 AS size_mb
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC
            LIMIT 20
          `;
          const threshold = args.sizeThresholdMb ?? 100;
          const largeTables = rows
            .filter((r: any) => Number(r.size_mb) >= threshold)
            .map((r: any) => ({ tableName: r.table_name, rowCount: Number(r.row_count), sizeMb: Number(r.size_mb) }));
          return { largeTables, allTableSizes: rows.map((r: any) => ({ tableName: r.table_name, sizeMb: Number(r.size_mb) })) };
        });
      }
    },

    check_sync_blocking: {
      description: 'Real grep-based scan for synchronous I/O calls (readFileSync, writeFileSync, execSync) that block Node\'s event loop.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(
          `grep -rn --include="*.ts" --include="*.js" -E "\\b(readFileSync|writeFileSync|execSync|spawnSync)\\b" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`
        );
        return { findings: grepLines(res.stdout) };
      }
    },

    check_distributed_monolith: {
      description: 'Real check for cross-service coupling: for each supplied service path pair, greps whether one service\'s files import from the other\'s path.',
      parameters: z.object({
        services: z.array(z.object({ name: z.string(), path: z.string() }))
      }),
      execute: async (args: { services: { name: string; path: string }[] }) => {
        const coupledPairs: any[] = [];
        for (let i = 0; i < args.services.length; i++) {
          for (let j = 0; j < args.services.length; j++) {
            if (i === j) continue;
            const a = args.services[i];
            const b = args.services[j];
            const res = await sandbox.exec(`grep -rln --include="*.ts" --include="*.js" "${b.path}" "${a.path}" 2>/dev/null | head -5`);
            const hits = res.stdout.split('\n').filter(Boolean);
            if (hits.length > 0) {
              coupledPairs.push({ serviceA: a.name, serviceB: b.name, couplingType: 'cross_import', files: hits });
            }
          }
        }
        return { coupledPairs, isDistributedMonolith: coupledPairs.length > 0 };
      }
    },

    instrument_query_counter: {
      description: 'Requires attaching middleware to a running app and firing real requests. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to instrument and count live queries against.' })
    },

    submit_architecture_report: {
      description: 'Submit the final ArchitectureAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("architecture"),
        runId: z.string(),
        repoId: z.string(),
        commitSha: z.string(),
        executedAt: z.string().datetime(),

        score: z.number().min(0).max(100),
        gateDecision: z.enum(["PASS", "WARN", "BLOCK"]),

        performanceMetrics: z.object({
          coldStartMs: z.number().nullable(),
          p99LatencyMs: z.number().nullable(),
          maxSustainableVus: z.number().nullable(),
          behaviorUnderLoad: z.string().nullable()
        }),

        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum([
            "N_PLUS_1", "MISSING_INDEX", "UNBOUNDED_RESULTS", "CIRCULAR_DEPS",
            "NO_CACHING", "TIGHT_COUPLING", "SYNC_BLOCKING", "MISSING_RETRY",
            "DISTRIBUTED_MONOLITH", "MISSING_TRACING", "DEPENDENCY_CHAIN",
            "DATABASE_INTEGRATION", "DATA_ARCHIVAL", "HARDCODED_ENV",
            "WRITE_IDEMPOTENCY", "COLD_START", "BACKPRESSURE"
          ]),
          title: z.string(),
          description: z.string(),
          file: z.string().nullable(),
          line: z.number().nullable(),
          toolName: z.string(),
          rawEvidence: z.string(),
          suggestedFix: z.string(),
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
        return { success: true, message: "Architecture report submitted." };
      }
    }
  };
};
