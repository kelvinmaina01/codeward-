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
        const cmd = type === 'git'
          ? 'trufflehog git file:///repo --json --no-update 2>/dev/null | head -50'
          : 'trufflehog filesystem /repo --json --no-update 2>/dev/null | head -50';
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
        const sev = severity === 'ALL' ? '' : `--severity ${severity || 'HIGH,CRITICAL'}`;
        const cmd = `trivy fs /repo ${sev} --format json --quiet 2>/dev/null | head -200`;
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
        const result = await sandbox.exec('cd /repo && npm audit --json 2>/dev/null | head -200');
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
          sandbox.exec('find /repo -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name ".env.example" -not -name ".env.template" 2>/dev/null'),
          sandbox.exec('grep -rn "password\\s*=\\|api_key\\s*=\\|secret\\s*=\\|DATABASE_URL\\s*=\\|PRIVATE_KEY" /repo --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.java" --include="*.rb" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -50'),
        ]);
        return {
          envFilesFound: envFiles.stdout.trim().split('\n').filter(Boolean),
          hardcodedSecrets: hardcoded.stdout.substring(0, 6000),
          envFilesCommitted: envFiles.stdout.trim().length > 0,
        };
      },
    },

    check_auth_patterns: {
      description: 'Analyze the codebase for authentication and authorization vulnerabilities.',
      parameters: z.object({
        framework: z.enum(['express', 'hono', 'fastify', 'django', 'flask', 'rails', 'unknown']).optional()
          .describe('The web framework used. Default: auto-detect.'),
      }),
      execute: async ({ framework }: { framework?: string }) => {
        const checks = await Promise.all([
          sandbox.exec('grep -rn "app.get\\|app.post\\|app.put\\|app.delete\\|router.get\\|router.post" /repo/src --include="*.ts" --include="*.js" 2>/dev/null | head -30'),
          sandbox.exec('grep -rn "jwt\\|jsonwebtoken\\|sign(\\|verify(" /repo/src --include="*.ts" --include="*.js" 2>/dev/null | head -20'),
          sandbox.exec('grep -rn "\\${\\|\\`.*SELECT\\|\\`.*INSERT\\|\\`.*UPDATE\\|\\`.*DELETE\\|raw(\\|rawQuery" /repo/src --include="*.ts" --include="*.js" --include="*.py" 2>/dev/null | head -20'),
          sandbox.exec('grep -rn "cors\\|Access-Control\\|origin:" /repo/src --include="*.ts" --include="*.js" 2>/dev/null | head -10'),
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
      description: 'Check for Supabase Row Level Security (RLS) configuration.',
      parameters: z.object({}),
      execute: async () => {
        const result = await sandbox.exec('grep -rn "pgTable\\|createTable\\|create_table\\|rls\\|policy\\|enable_rls\\|Row Level" /repo --include="*.ts" --include="*.js" --include="*.sql" --include="*.py" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -30');
        return {
          rlsReferences: result.stdout.substring(0, 6000),
          matchCount: result.stdout.split('\n').filter(Boolean).length,
        };
      },
    },
  };
}
