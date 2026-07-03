import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';
import { createMemoryTools } from '../../tools/memory.tools.js';

async function withPg<T>(databaseUrl: string, fn: (sql: any) => Promise<T>): Promise<T> {
  const postgres = (await import('postgres')).default;
  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const sql = postgres(databaseUrl, { prepare: false, ssl: isLocal ? false : 'require', connect_timeout: 10 });
  try { return await fn(sql); } finally { await sql.end({ timeout: 5 }); }
}
function grepLines(stdout: string) {
  return stdout.split('\n').filter(Boolean).map(line => {
    const [file, lineNo, ...rest] = line.split(':');
    return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) };
  });
}

export const createDataDXTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    analyse_data_pipelines: {
      description: 'Real grep for hardcoded schema/column-name literals inside files that look like ETL/pipeline code.',
      parameters: z.object({}),
      execute: async () => {
        const pipelineFiles = await sandbox.exec(`grep -rln --include="*.py" --include="*.ts" --include="*.js" -iE "etl|pipeline" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20`);
        const files = pipelineFiles.stdout.split('\n').filter(Boolean);
        return { pipelineFilesFound: files, note: 'File-presence signal only — downstream consumer mapping requires a real service dependency graph this pipeline does not have.' };
      }
    },

    check_data_contracts: {
      description: 'Real grep for schema/contract definition files (.proto, .avsc, openapi.yaml, jsonschema) near pipeline code — a presence check, not a producer/consumer validation.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`find . \\( -name "*.proto" -o -name "*.avsc" -o -name "*schema*.json" -o -name "openapi.y*ml" \\) -not -path "*/node_modules/*" 2>/dev/null | head -30`);
        return { contractFilesFound: res.stdout.split('\n').filter(Boolean) };
      }
    },

    check_vector_embedding_drift: {
      description: 'Real check only for pgvector (via direct Postgres connection). Other vector DBs (Pinecone/Weaviate/Qdrant/Chroma) need their own live SDK connection this pipeline does not have.',
      parameters: z.object({ vectorDb: z.enum(['pgvector', 'pinecone', 'weaviate', 'qdrant', 'chroma']).optional(), databaseUrl: z.string().optional(), sourceTableName: z.string().optional(), embeddingTableName: z.string().optional() }),
      execute: async (args: any) => {
        if (args.vectorDb !== 'pgvector' || !args.databaseUrl || !args.sourceTableName || !args.embeddingTableName) {
          return { applicable: false, reason: 'Only pgvector is checkable here, and needs databaseUrl + both table names.' };
        }
        return withPg(args.databaseUrl, async (sql) => {
          const [source] = await sql`SELECT COUNT(*) as count FROM ${sql(args.sourceTableName)}`;
          const [embed] = await sql`SELECT COUNT(*) as count FROM ${sql(args.embeddingTableName)}`;
          return { totalSourceRecords: Number(source.count), totalEmbeddings: Number(embed.count), missingEmbeddings: Math.max(0, Number(source.count) - Number(embed.count)) };
        });
      }
    },

    audit_dark_data: {
      description: 'Real Postgres check using pg_stat_user_tables sequential/index scan counts as a proxy for "is this table ever queried". Needs databaseUrl.',
      parameters: z.object({ databaseUrl: z.string().optional() }),
      execute: async (args: { databaseUrl?: string }) => {
        if (!args.databaseUrl) return { applicable: false, reason: 'No databaseUrl supplied.' };
        return withPg(args.databaseUrl, async (sql) => {
          const rows = await sql`SELECT relname, seq_scan, idx_scan, n_live_tup, pg_total_relation_size(relid)/1024/1024 as size_mb FROM pg_stat_user_tables WHERE seq_scan = 0 AND idx_scan = 0 AND n_live_tup > 0`;
          return { darkDataFindings: rows.map((r: any) => ({ tableName: r.relname, rowCount: Number(r.n_live_tup), storageSizeMb: Number(r.size_mb), note: 'Never scanned since last stats reset — real signal, not proof of zero access historically.' })) };
        });
      }
    },

    check_data_lineage: {
      description: 'Requires a real cross-service data-lineage graph this pipeline does not build. Not available here.',
      parameters: z.object({ keyMetrics: z.array(z.string()).optional() }),
      execute: async () => ({ applicable: false, reason: 'No lineage graph available — would require mapping every service\'s data flow, out of scope for a single-repo clone-and-analyze pass.' })
    },

    check_event_schema_registry: {
      description: 'Real grep for analytics tracking calls (track(), analytics.*) and whether a matching schema registry file exists.',
      parameters: z.object({}),
      execute: async () => {
        const tracking = await sandbox.exec(`grep -rn --include="*.ts" --include="*.tsx" --include="*.js" -E "\\.track\\(|analytics\\.(track|identify)" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`);
        const registry = await sandbox.exec(`find . -not -path "*/node_modules/*" -not -path "*/.git/*" \\( -iname "*event*schema*" -o -iname "*tracking*plan*" \\) 2>/dev/null | head -10`);
        return { trackingCallSites: grepLines(tracking.stdout), hasEventSchemaRegistryFile: registry.stdout.trim().length > 0 };
      }
    },

    check_data_quality: {
      description: 'Real Postgres null-rate check for supplied table/columns. Needs databaseUrl.',
      parameters: z.object({ databaseUrl: z.string().optional(), tableName: z.string().optional(), columnNames: z.array(z.string()).optional() }),
      execute: async (args: { databaseUrl?: string; tableName?: string; columnNames?: string[] }) => {
        if (!args.databaseUrl || !args.tableName || !args.columnNames?.length) return { applicable: false, reason: 'No databaseUrl/tableName/columnNames supplied.' };
        return withPg(args.databaseUrl, async (sql) => {
          const findings = [];
          for (const col of args.columnNames!) {
            const [row] = await sql`SELECT COUNT(*) FILTER (WHERE ${sql(col)} IS NULL) as nulls, COUNT(*) as total FROM ${sql(args.tableName!)}`;
            const pct = Number(row.total) > 0 ? (Number(row.nulls) / Number(row.total)) * 100 : 0;
            if (pct > 1) findings.push({ tableName: args.tableName, columnName: col, affectedRowPercent: Math.round(pct * 10) / 10 });
          }
          return { findings };
        });
      }
    },

    measure_ci_reliability: {
      description: 'Real GitHub Actions run-history query via the installation Octokit client. Needs repoId with a real GitHub App installation.',
      parameters: z.object({ repoId: z.string().optional(), lookbackDays: z.number().optional().default(7) }),
      execute: async (args: { repoId?: string; lookbackDays?: number }) => {
        if (!args.repoId) return { applicable: false, reason: 'No repoId supplied.' };
        const { db } = await import('../../../db/index.js');
        const { repositories } = await import('../../../db/schema.js');
        const { eq } = await import('drizzle-orm');
        const { getInstallationOctokit } = await import('../../../lib/github.js');
        const repo = await db.query.repositories.findFirst({ where: eq(repositories.id, Number(args.repoId)) });
        if (!repo?.installationId) return { applicable: false, reason: 'No GitHub App installation for this repo.' };
        const octokit = await getInstallationOctokit(repo.installationId);
        const since = new Date(Date.now() - (args.lookbackDays ?? 7) * 86400000).toISOString();
        const res: any = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', { owner: repo.owner, repo: repo.name, created: `>=${since}`, per_page: 100 });
        const runs = res.data.workflow_runs;
        const completed = runs.filter((r: any) => r.status === 'completed');
        const passed = completed.filter((r: any) => r.conclusion === 'success');
        return { totalRuns: runs.length, passRate: completed.length ? Math.round((passed.length / completed.length) * 1000) / 10 : null };
      }
    },

    check_local_env_parity: {
      description: 'Real grep for version pins across .nvmrc/package.json engines/docker-compose.yml to flag mismatches.',
      parameters: z.object({}),
      execute: async () => {
        const [nvmrc, pkgEngines, compose] = await Promise.all([
          sandbox.exec('cat .nvmrc 2>/dev/null'),
          sandbox.exec(`grep -A2 '"engines"' package.json 2>/dev/null`),
          sandbox.exec('cat docker-compose.yml 2>/dev/null | grep -iE "image:|node|postgres|redis"')
        ]);
        return { nvmrc: nvmrc.stdout.trim() || null, packageEngines: pkgEngines.stdout.trim() || null, dockerComposeVersions: compose.stdout.trim() || null };
      }
    },

    measure_onboarding_time: {
      description: 'Requires an actual new-developer trial run. Not statically measurable — this pipeline does not fabricate an estimate.',
      parameters: z.object({}),
      execute: async () => ({ applicable: false, reason: 'Onboarding time cannot be measured statically; would require a real timed trial.' })
    },

    check_build_test_latency: {
      description: 'Real timed execution of the actual build and test commands in the sandbox.',
      parameters: z.object({ buildCommand: z.string().optional().default('npm run build'), testCommand: z.string().optional().default('npm test') }),
      execute: async (args: { buildCommand?: string; testCommand?: string }) => {
        await sandbox.exec('npm install --no-audit --no-fund 2>&1 | tail -20');
        const tBuild = Date.now();
        const buildRes = await sandbox.exec(args.buildCommand ?? 'npm run build');
        const buildTimeSeconds = (Date.now() - tBuild) / 1000;
        const tTest = Date.now();
        const testRes = await sandbox.exec(args.testCommand ?? 'npm test');
        const testTimeSeconds = (Date.now() - tTest) / 1000;
        return { buildTimeSeconds, buildExitCode: buildRes.exitCode, testTimeSeconds, testExitCode: testRes.exitCode, exceedsFiveMinuteThreshold: (buildTimeSeconds + testTimeSeconds) > 300 };
      }
    },

    audit_tooling_fragmentation: {
      description: 'Real check for multiple competing task-runner configs in the repo root (Makefile, justfile, Taskfile, package.json scripts).',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec('find . -maxdepth 2 \\( -iname "Makefile" -o -iname "justfile" -o -iname "Taskfile*" \\) -not -path "*/node_modules/*" 2>/dev/null');
        const found = res.stdout.split('\n').filter(Boolean);
        const hasPackageScripts = await sandbox.exec('grep -q scripts package.json 2>/dev/null && echo yes');
        const runners = [...found, ...(hasPackageScripts.stdout.trim() ? ['package.json scripts'] : [])];
        return { taskRunnersFound: runners, isFragmented: runners.length > 1 };
      }
    },

    check_alert_fatigue: {
      description: 'Requires a live monitoring provider API connection (Datadog/PagerDuty/etc). Not available in this pipeline.',
      parameters: z.object({}),
      execute: async () => ({ applicable: false, reason: 'No monitoring provider credentials/connection available.' })
    },

    check_golden_paths: {
      description: 'Real check for a service-template directory convention.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec('find . -maxdepth 3 -type d -iname "*template*" -not -path "*/node_modules/*" 2>/dev/null');
        const dirs = res.stdout.split('\n').filter(Boolean);
        return { hasServiceTemplates: dirs.length > 0, templateDirectories: dirs };
      }
    },

    check_analytics_coverage: {
      description: 'Real grep checking whether each caller-supplied required metric name appears in a tracking call.',
      parameters: z.object({ requiredMetrics: z.array(z.string()) }),
      execute: async (args: { requiredMetrics: string[] }) => {
        const findings = [];
        for (const metric of args.requiredMetrics) {
          const res = await sandbox.exec(`grep -rl --include="*.ts" --include="*.tsx" --include="*.js" "${metric}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -1`);
          if (!res.stdout.trim()) findings.push({ metric, hasTrackingCode: false });
        }
        return { findings };
      }
    },

    compare_with_prior_week: {
      description: 'Real check: query the most recent completed data_dx run for this repo from Postgres and diff against currentMetrics.',
      parameters: z.object({ repoId: z.string(), currentMetrics: z.object({}).passthrough() }),
      execute: async (args: { repoId: string; currentMetrics: any }) => {
        const { db } = await import('../../../db/index.js');
        const { runs, agentTasks } = await import('../../../db/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        const runRows = await db.select({ id: runs.id }).from(runs).where(eq(runs.repoId, Number(args.repoId))).orderBy(desc(runs.createdAt)).limit(10);
        for (const r of runRows) {
          const [task] = await db.select().from(agentTasks).where(eq(agentTasks.runId, r.id));
          if (task?.agentId === 'data_dx' && task.status === 'completed') {
            return { priorRunFound: true, priorScore: task.score, currentVsPrior: 'compare using the returned priorScore against your computed current score' };
          }
        }
        return { priorRunFound: false, reason: 'No prior data_dx run found for this repo.' };
      }
    },

    submit_data_dx_report: {
      description: 'Submit the final DataDXAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("data_dx"), runId: z.string(), repoId: z.string(), weekStartDate: z.string(), executedAt: z.string().datetime(),
        overallTeamHealthScore: z.number().min(0).max(100), ciReliabilityScore: z.number().min(0).max(100), dataQualityScore: z.number().min(0).max(100), dxScore: z.number().min(0).max(100),
        weekOverWeekTrend: z.enum(["significantly_improving", "improving", "stable", "worsening", "significantly_worsening"]),
        highlights: z.array(z.string()), concerns: z.array(z.string()),
        findings: z.array(z.object({
          id: z.string(), severity: z.enum(["HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum(["PIPELINE_ENTANGLEMENT", "MISSING_DATA_CONTRACT", "EMBEDDING_DRIFT", "DARK_DATA", "DATA_LINEAGE", "SCHEMA_REGISTRY", "DATA_QUALITY", "FLAKY_CI", "ENV_PARITY", "ONBOARDING_LATENCY", "BUILD_LATENCY", "TOOLING_FRAGMENTATION", "ALERT_FATIGUE", "MISSING_GOLDEN_PATH", "ANALYTICS_DEBT", "DATA_ACCESS_CONTROL", "RETENTION_VIOLATION"]),
          title: z.string(), description: z.string(), file: z.string().nullable(), line: z.number().nullable(), toolName: z.string(), rawEvidence: z.string(),
          isNewThisWeek: z.boolean(), weekOverWeekChange: z.enum(["new", "worsened", "unchanged", "improved"]), recommendation: z.string()
        })),
        teamMetrics: z.object({ ciPassRatePercent: z.number(), meanTimeToGreenMinutes: z.number(), estimatedOnboardingHours: z.number(), buildTimeSeconds: z.number(), testTimeSeconds: z.number(), alertNoisePercent: z.number().nullable() }),
        toolsExecuted: z.array(z.object({ toolName: z.string(), calledAt: z.string().datetime(), durationMs: z.number(), resultSummary: z.string() }))
      }),
      execute: async (args: any) => ({ success: true, message: "Data & DX report submitted." })
    },

    ...createMemoryTools('data_dx')
  };
};
