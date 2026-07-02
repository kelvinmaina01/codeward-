/**
 * ============================================================================
 * Security Tools — Specialized tools for the Security Agent
 * ============================================================================
 * 
 * These tools give the Security Agent access to industry-standard scanners
 * running inside the Fly.io sandbox.
 * 
 * Defined with Zod schemas — works with ANY provider.
 * ============================================================================
 */

import { z } from 'zod';
import type { SandboxHandle } from '../core/provider.js';

/**
 * Create security-specific tools for a given sandbox instance.
 */
export function createSecurityTools(sandbox: SandboxHandle) {
  return {

    run_trufflehog: {
      description: 'Scan the repository for leaked secrets, API keys, tokens, and passwords using TruffleHog. Run this FIRST.',
      parameters: z.object({
        scanType: z.enum(['filesystem', 'git']).optional()
          .describe('Scan type: "filesystem" or "git" for full history. Default: filesystem.'),
      }),
      execute: async ({ scanType }: { scanType?: string }) => {
        const type = scanType || 'filesystem';
        const which = await sandbox.exec('which trufflehog 2>/dev/null');
        if (!which.stdout.trim()) {
          return { applicable: false, reason: 'trufflehog binary not found in this sandbox image.' };
        }
        const cmd = type === 'git'
          ? 'trufflehog git file://. --json --no-update 2>/dev/null | head -50'
          : 'trufflehog filesystem . --json --no-update 2>/dev/null | head -50';
        const result = await sandbox.exec(cmd);
        return {
          raw: result.stdout.substring(0, 8000),
          exitCode: result.exitCode,
          secretsFound: result.stdout.split('\n').filter((l: string) => l.trim().startsWith('{')).length,
        };
      },
    },

    run_trivy: {
      description: 'Scan for known CVE vulnerabilities in dependencies using Trivy.',
      parameters: z.object({
        severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL']).optional()
          .describe('Minimum severity. Default: HIGH.'),
      }),
      execute: async ({ severity }: { severity?: string }) => {
        const which = await sandbox.exec('which trivy 2>/dev/null');
        if (!which.stdout.trim()) {
          return { applicable: false, reason: 'trivy binary not found in this sandbox image.' };
        }
        const sev = severity === 'ALL' ? '' : `--severity ${severity || 'HIGH,CRITICAL'}`;
        const cmd = `trivy fs . ${sev} --format json --quiet 2>/dev/null | head -200`;
        const result = await sandbox.exec(cmd);
        return {
          raw: result.stdout.substring(0, 10000),
          exitCode: result.exitCode,
        };
      },
    },

    run_npm_audit: {
      description: 'Run npm audit to check for known vulnerabilities in Node.js dependencies.',
      parameters: z.object({}),
      execute: async () => {
        const hasPkg = await sandbox.exec('cat package.json 2>/dev/null');
        if (!hasPkg.stdout.trim()) {
          return { applicable: false, reason: 'No package.json — not an npm project.' };
        }
        const result = await sandbox.exec('npm audit --json 2>/dev/null | head -200');
        return {
          raw: result.stdout.substring(0, 8000),
          exitCode: result.exitCode,
        };
      },
    },

    scan_env_files: {
      description: 'Scan for .env files committed to the repo and hardcoded sensitive patterns in source code.',
      parameters: z.object({}),
      execute: async () => {
        const [envFiles, hardcoded] = await Promise.all([
          sandbox.exec('find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".env.example" -not -name ".env.template" 2>/dev/null'),
          sandbox.exec('grep -rn "password\\s*=\\|api_key\\s*=\\|secret\\s*=\\|DATABASE_URL\\s*=\\|PRIVATE_KEY" . --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.java" --include="*.rb" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -50'),
        ]);
        return {
          envFilesFound: envFiles.stdout.trim().split('\n').filter(Boolean),
          hardcodedSecrets: hardcoded.stdout.substring(0, 6000),
          envFilesCommitted: envFiles.stdout.trim().length > 0,
        };
      },
    },

    check_auth_patterns: {
      description: 'Static grep-based analysis of the codebase for authentication/authorization anti-patterns (route definitions, JWT usage, string-built SQL, CORS config).',
      parameters: z.object({
        framework: z.enum(['express', 'hono', 'fastify', 'django', 'flask', 'rails', 'unknown']).optional()
          .describe('The web framework used. Default: auto-detect.'),
      }),
      execute: async ({ framework }: { framework?: string }) => {
        const checks = await Promise.all([
          sandbox.exec('grep -rn "app.get\\|app.post\\|app.put\\|app.delete\\|router.get\\|router.post" . --include="*.ts" --include="*.js" --exclude-dir=node_modules 2>/dev/null | head -30'),
          sandbox.exec('grep -rn "jwt\\|jsonwebtoken\\|sign(\\|verify(" . --include="*.ts" --include="*.js" --exclude-dir=node_modules 2>/dev/null | head -20'),
          sandbox.exec('grep -rn "\\${\\|\\`.*SELECT\\|\\`.*INSERT\\|\\`.*UPDATE\\|\\`.*DELETE\\|raw(\\|rawQuery" . --include="*.ts" --include="*.js" --include="*.py" --exclude-dir=node_modules 2>/dev/null | head -20'),
          sandbox.exec('grep -rn "cors\\|Access-Control\\|origin:" . --include="*.ts" --include="*.js" --exclude-dir=node_modules 2>/dev/null | head -10'),
        ]);
        return {
          routes: checks[0].stdout.substring(0, 4000),
          jwtUsage: checks[1].stdout.substring(0, 3000),
          sqlPatterns: checks[2].stdout.substring(0, 3000),
          corsConfig: checks[3].stdout.substring(0, 2000),
          framework: framework || 'unknown',
        };
      },
    },

    check_rls_policies: {
      description: 'Static grep for Supabase/Postgres Row Level Security (RLS) references in schema/migration files. Does NOT verify RLS is actually enabled on a live database — that requires check_rls_policies_live with a real databaseUrl.',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec('grep -rn "pgTable\\|createTable\\|create_table\\|rls\\|policy\\|enable_rls\\|Row Level" . --include="*.ts" --include="*.js" --include="*.sql" --include="*.py" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -30');
        return {
          rlsReferences: result.stdout.substring(0, 6000),
          matchCount: result.stdout.split('\n').filter(Boolean).length,
        };
      },
    },

    check_rls_policies_live: {
      description: 'Query live Postgres system catalogs to verify Row Level Security is actually ENABLED on every user-facing table. Needs a real, reachable databaseUrl.',
      parameters: z.object({
        databaseUrl: z.string().optional(),
        schemaName: z.string().optional().default('public')
      }),
      execute: async (args: { databaseUrl?: string; schemaName?: string }) => {
        if (!args.databaseUrl) {
          return { applicable: false, reason: 'No databaseUrl supplied.' };
        }
        const postgres = (await import('postgres')).default;
        const isLocal = args.databaseUrl.includes('localhost') || args.databaseUrl.includes('127.0.0.1');
        const sql = postgres(args.databaseUrl, { prepare: false, ssl: isLocal ? false : 'require', connect_timeout: 10 });
        try {
          const rows = await sql`
            SELECT relname AS table_name, relrowsecurity AS rls_enabled
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = ${args.schemaName ?? 'public'} AND c.relkind = 'r'
          `;
          const withoutRls = rows.filter((r: any) => !r.rls_enabled).map((r: any) => r.table_name);
          return { tables: rows.map((r: any) => ({ tableName: r.table_name, rlsEnabled: r.rls_enabled })), tablesWithoutRls: withoutRls };
        } finally {
          await sql.end({ timeout: 5 });
        }
      },
    },

    check_crypto_patterns: {
      description: 'Static grep for deprecated/weak cryptographic algorithms (MD5, SHA1, DES, RC4) in real code.',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" --include="*.py" -E "createHash\\(.(md5|sha1)|DES|RC4|Math\\.random\\(\\).*password|Math\\.random\\(\\).*token" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`);
        const matches = result.stdout.split('\n').filter(Boolean);
        return { findingsCount: matches.length, findings: matches.map(line => { const [file, lineNo, ...rest] = line.split(':'); return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) }; }) };
      },
    },

    scan_for_sqli_patterns: {
      description: 'Static grep for raw string-concatenated/template-literal SQL queries (potential SQL injection), as opposed to parameterized queries.',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" --include="*.py" -E "(query|execute)\\(\\s*\`.*\\\\\\$\\{|(query|execute)\\(\\s*['\\"].*['\\"]\\s*\\+" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -50`);
        const matches = result.stdout.split('\n').filter(Boolean);
        return { findingsCount: matches.length, findings: matches.map(line => { const [file, lineNo, ...rest] = line.split(':'); return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) }; }) };
      },
    },

    check_sbom_integrity: {
      description: 'Static check of GitHub Actions workflows for excessive permissions and unpinned third-party actions (real supply-chain hygiene signal).',
      parameters: z.object({}),
      execute: async () => {
        const workflows = await sandbox.exec('find .github/workflows -maxdepth 1 \\( -name "*.yml" -o -name "*.yaml" \\) 2>/dev/null');
        const files = workflows.stdout.split('\n').filter(Boolean);
        const findings: any[] = [];
        for (const file of files.slice(0, 20)) {
          const perms = await sandbox.exec(`grep -n "permissions:\\|contents: write\\|id-token: write" "${file}" 2>/dev/null`);
          const unpinned = await sandbox.exec(`grep -nE "uses:.*@(main|master|v[0-9]+)\\s*$" "${file}" 2>/dev/null`);
          if (unpinned.stdout.trim()) {
            findings.push({ file, note: 'Uses a third-party action pinned to a branch/major-version tag rather than a commit SHA.', evidence: unpinned.stdout.slice(0, 500) });
          }
          if (perms.stdout.trim()) {
            findings.push({ file, note: 'Elevated permissions declared.', evidence: perms.stdout.slice(0, 300) });
          }
        }
        return { workflowsScanned: files.length, findings };
      },
    },

    scan_nhi_tokens: {
      description: 'Static grep for likely long-lived non-human-identity tokens/PATs hardcoded in CI config or source (not secret-manager references).',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec(`grep -rn --include="*.yml" --include="*.yaml" --include="*.ts" --include="*.js" -E "gh[pousr]_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        const matches = result.stdout.split('\n').filter(Boolean);
        return { findingsCount: matches.length, findings: matches.map(line => { const [file, lineNo] = line.split(':'); return { file, line: Number(lineNo) || null }; }) };
      },
    },

    scan_ci_logs_for_leaks: {
      description: 'Static grep of CI/CD config files for accidentally leaked secrets or dangerous echo/print of secret env vars.',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec(`grep -rn --include="*.yml" --include="*.yaml" -iE "echo.*secret|print.*token|echo.*\\\$\\{\\{.*secrets\\." --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | head -30`);
        const matches = result.stdout.split('\n').filter(Boolean);
        return { findingsCount: matches.length, findings: matches.map(line => { const [file, lineNo, ...rest] = line.split(':'); return { file, line: Number(lineNo) || null, snippet: rest.join(':').trim().slice(0, 200) }; }) };
      },
    },

    run_owasp_zap: {
      description: 'Requires a running deployed instance to actively scan. This pipeline only clones and statically analyzes the repo.',
      parameters: z.object({ targetUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available — this pipeline does not deploy the app.' })
    },

    check_auth_on_routes: {
      description: 'Requires firing live unauthenticated HTTP requests at every route. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to fire live requests at.' })
    },

    check_rate_limiting: {
      description: 'Requires firing rapid live requests at a running app. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test rate limiting against.' })
    },

    probe_ssrf_endpoints: {
      description: 'Requires firing live SSRF probe payloads at a running app. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to probe.' })
    },

    check_multitenant_isolation: {
      description: 'Static grep for DB queries against caller-supplied shared table names missing a tenant/org filter — a real but imperfect static heuristic (cannot verify runtime enforcement).',
      parameters: z.object({
        sharedTables: z.array(z.string()).optional(),
        tenantIdColumn: z.string().optional().default('tenant_id')
      }),
      execute: async (args: { sharedTables?: string[]; tenantIdColumn?: string }) => {
        if (!args.sharedTables || args.sharedTables.length === 0) {
          return { applicable: false, reason: 'No sharedTables supplied to check.' };
        }
        const violations: any[] = [];
        for (const table of args.sharedTables) {
          const res = await sandbox.exec(`grep -rn --include="*.ts" --include="*.js" "from(${table}" --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v "${args.tenantIdColumn}" | head -10`);
          const matches = res.stdout.split('\n').filter(Boolean);
          if (matches.length) violations.push({ table, matches });
        }
        return { violations };
      }
    },

    check_mfa_on_destructive_routes: {
      description: 'Requires firing live requests at admin/destructive routes to verify step-up auth. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test against.' })
    },

    test_error_information_leakage: {
      description: 'Requires fuzzing a running app to trigger 500s and inspect responses. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to fuzz.' })
    },

    check_business_logic_bypass: {
      description: 'Requires firing live requests against a running app to test flow-skip attempts. Not available without a deployed instance.',
      parameters: z.object({ baseUrl: z.string().optional() }),
      execute: async () => ({ applicable: false, reason: 'No running instance available to test against.' })
    },
  };
}
