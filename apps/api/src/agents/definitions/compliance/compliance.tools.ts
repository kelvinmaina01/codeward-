import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createSandboxTools } from '../../tools/sandbox.tools.js';

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

export const createComplianceTools = (sandbox: SandboxHandle) => {
  const baseTools = createSandboxTools(sandbox);

  return {
    ...baseTools,

    scan_data_retention: {
      description: 'Real check: for each supplied PII table, query real row count and oldest-record age via a real DB connection. Needs databaseUrl. Assumes a created_at timestamp column.',
      parameters: z.object({
        databaseUrl: z.string().optional(),
        piiTableNames: z.array(z.string()),
        retentionPolicies: z.array(z.object({ tableName: z.string(), maxRetentionDays: z.number() }))
      }),
      execute: async (args: { databaseUrl?: string; piiTableNames: string[]; retentionPolicies: { tableName: string; maxRetentionDays: number }[] }) => {
        if (!args.databaseUrl) return { applicable: false, reason: 'No databaseUrl supplied.' };
        return withPg(args.databaseUrl, async (sql) => {
          const findings = [];
          for (const table of args.piiTableNames) {
            const policy = args.retentionPolicies.find(p => p.tableName === table);
            try {
              const [row] = await sql`SELECT COUNT(*) as count, EXTRACT(DAY FROM NOW() - MIN(created_at)) as oldest_age_days FROM ${sql(table)}`;
              const ageDays = Number(row.oldest_age_days) || 0;
              if (policy && ageDays > policy.maxRetentionDays) {
                findings.push({ tableName: table, oldestRecordAgeDays: ageDays, policyMaxDays: policy.maxRetentionDays, rowCount: Number(row.count) });
              }
            } catch (e: any) {
              findings.push({ tableName: table, error: e.message });
            }
          }
          return { findings };
        });
      }
    },

    check_rtbf_implementation: {
      description: 'Requires exercising a real deletion flow against a running app across backups/logs/vectors. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test end-to-end deletion coverage.' })
    },

    check_consent_versioning: {
      description: 'Real DB check: count records whose consent_version differs from currentConsentVersion. Needs databaseUrl and consentTableName.',
      parameters: z.object({ databaseUrl: z.string().optional(), consentTableName: z.string().optional(), currentConsentVersion: z.string() }),
      execute: async (args: { databaseUrl?: string; consentTableName?: string; currentConsentVersion: string }) => {
        if (!args.databaseUrl || !args.consentTableName) return { applicable: false, reason: 'No databaseUrl/consentTableName supplied.' };
        return withPg(args.databaseUrl, async (sql) => {
          try {
            const rows = await sql`SELECT consent_version, COUNT(*) as count FROM ${sql(args.consentTableName!)} WHERE consent_version != ${args.currentConsentVersion} GROUP BY consent_version`;
            return { staleConsentGroups: rows.map((r: any) => ({ version: r.consent_version, affectedUserCount: Number(r.count) })) };
          } catch (e: any) {
            return { error: e.message };
          }
        });
      }
    },

    run_wcag_accessibility_scan: {
      description: 'Requires rendering the live app and running axe-core against it. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance to render and scan.' })
    },

    check_eu_ai_act_compliance: {
      description: 'Real grep for AI/oversight-related keywords near LLM integration code — a weak static signal for risk-classification/human-oversight presence, not a substitute for a real compliance review.',
      parameters: z.object({}),
      execute: async () => {
        const llmFiles = await sandbox.exec(`grep -rln --include="*.ts" --include="*.js" -E "openai|anthropic|generateText|chat\\.completions" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20`);
        const files = llmFiles.stdout.split('\n').filter(Boolean);
        const oversight = await sandbox.exec(`grep -rln --include="*.ts" --include="*.js" -iE "human.?review|human.?approval|risk.?assessment|transparency.?log" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -20`);
        return {
          aiSystemFilesFound: files.length,
          filesWithOversightKeywords: oversight.stdout.split('\n').filter(Boolean).length,
          note: 'Static keyword signal only — does not constitute a real EU AI Act risk classification.'
        };
      }
    },

    check_audit_trail_integrity: {
      description: 'Real grep for audit-logging library usage. Cannot statically verify immutability/cryptographic signing — that needs live DB introspection.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -iE "audit.?log|auditLog" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        const matches = grepLines(res.stdout);
        return { auditLoggingReferences: matches, note: 'Presence-only check. Immutability/signing not verifiable without a live database connection and schema introspection.' };
      }
    },

    check_nhi_compliance: {
      description: 'Real grep for hardcoded API keys / service-account credentials in K8s and cloud config files.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec(`grep -rn --include="*.yml" --include="*.yaml" --include="*.ts" --include="*.js" -E "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{20,}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        return { findings: grepLines(res.stdout) };
      }
    },

    check_shadow_ai_usage: {
      description: 'Real grep for calls to AI provider API domains not in the caller-supplied allowlist.',
      parameters: z.object({ allowedAIProviders: z.array(z.string()).optional().default(['api.openai.com', 'api.anthropic.com']) }),
      execute: async (args: { allowedAIProviders?: string[] }) => {
        const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" -E "api\\.(openai|anthropic|mistral|cohere|together|groq|perplexity)\\.(com|ai)" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        const matches = grepLines(res.stdout);
        const allowed = args.allowedAIProviders ?? [];
        const unauthorized = matches.filter(m => !allowed.some(a => m.snippet.includes(a)));
        return { findings: unauthorized };
      }
    },

    check_data_minimization: {
      description: 'Real check: lists real DB columns via information_schema, greps code for references to each, flags columns never referenced. Needs databaseUrl.',
      parameters: z.object({ databaseUrl: z.string().optional(), tableName: z.string().optional() }),
      execute: async (args: { databaseUrl?: string; tableName?: string }) => {
        if (!args.databaseUrl || !args.tableName) return { applicable: false, reason: 'No databaseUrl/tableName supplied.' };
        return withPg(args.databaseUrl, async (sql) => {
          const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${args.tableName}`;
          const unusedColumns = [];
          for (const c of cols) {
            const res = await sandbox.exec(`grep -rl --include="*.ts" --include="*.js" "${c.column_name}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -1`);
            if (!res.stdout.trim()) unusedColumns.push(c.column_name);
          }
          return { unusedColumns };
        });
      }
    },

    check_cross_border_data: {
      description: 'Requires live cloud provider region configuration and user geo-location data. Not available in this clone-and-analyze pipeline.',
      parameters: z.object({ databaseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No live cloud/region/user-geo data available.' })
    },

    check_algorithmic_impact: {
      description: 'Real grep for scoring/ranking/classification function names in caller-supplied high-risk domain paths (e.g. credit, hiring, insurance).',
      parameters: z.object({ highRiskDomains: z.array(z.string()).optional().default([]) }),
      execute: async (args: { highRiskDomains?: string[] }) => {
        if (!args.highRiskDomains || args.highRiskDomains.length === 0) {
          return { applicable: false, reason: 'No highRiskDomains supplied to scope the search.' };
        }
        const findings = [];
        for (const domain of args.highRiskDomains) {
          const res = await sandbox.exec(`grep -rln --include="*.ts" --include="*.js" -iE "score|rank|classif" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -i "${domain}" | head -10`);
          const files = res.stdout.split('\n').filter(Boolean);
          if (files.length) findings.push({ domain, files });
        }
        return { findings };
      }
    },

    compare_with_prior_run: {
      description: 'Real check: query the most recent completed compliance run for this repo from Postgres and diff finding IDs against the current run.',
      parameters: z.object({ repoId: z.string(), currentFindings: z.array(z.object({}).passthrough()) }),
      execute: async (args: { repoId: string; currentFindings: any[] }) => {
        const { db } = await import('../../../db/index.js');
        const { runs, agentTasks } = await import('../../../db/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        const runRows = await db.select({ id: runs.id }).from(runs).where(eq(runs.repoId, Number(args.repoId))).orderBy(desc(runs.createdAt)).limit(10);
        let priorFindingIds = new Set<string>();
        for (const r of runRows) {
          const [task] = await db.select().from(agentTasks).where(eq(agentTasks.runId, r.id));
          if (task?.agentId === 'compliance' && task.status === 'completed') {
            priorFindingIds = new Set((task.findings as any[] ?? []).map((f: any) => f.id));
            break;
          }
        }
        const currentIds = args.currentFindings.map((f: any) => f.id);
        return {
          newFindings: args.currentFindings.filter((f: any) => !priorFindingIds.has(f.id)),
          resolvedFindingIds: [...priorFindingIds].filter(id => !currentIds.includes(id)),
          unchangedFindingsCount: currentIds.filter(id => priorFindingIds.has(id)).length
        };
      }
    },

    submit_compliance_report: {
      description: 'Submit the final ComplianceAgentResult JSON to end the run.',
      parameters: z.object({
        agentType: z.literal("compliance"),
        runId: z.string(), repoId: z.string(), triggerType: z.enum(["scheduled", "on_push"]), executedAt: z.string().datetime(),
        score: z.number().min(0).max(100),
        riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"]),
        newFindingsSinceLastRun: z.number(), resolvedSinceLastRun: z.number(),
        findings: z.array(z.object({
          id: z.string(),
          severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
          category: z.enum(["DATA_RETENTION", "RTBF", "CONSENT_VERSIONING", "ACCESSIBILITY", "EU_AI_ACT", "AUDIT_TRAIL", "NHI", "SHADOW_AI", "DATA_MINIMIZATION", "CROSS_BORDER", "ALGORITHMIC_IMPACT"]),
          legalFramework: z.string().nullable(), title: z.string(), description: z.string(),
          file: z.string().nullable(), line: z.number().nullable(), toolName: z.string(), rawEvidence: z.string(),
          estimatedFinePotential: z.string().nullable(), remediationSteps: z.array(z.string()), dismissed: z.boolean().default(false), isNewThisRun: z.boolean()
        })),
        toolsExecuted: z.array(z.object({ toolName: z.string(), calledAt: z.string().datetime(), durationMs: z.number(), resultSummary: z.string() }))
      }),
      execute: async (args: any) => ({ success: true, message: "Compliance report submitted." })
    }
  };
};
