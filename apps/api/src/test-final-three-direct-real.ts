/**
 * Direct tool-level validation (not a full autonomous LLM loop, which hung earlier on
 * data_dx's check_build_test_latency doing a real npm install+build+test on this large
 * monorepo). Sandbox execs against THIS already-installed project directory for speed.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createComplianceTools } from './agents/definitions/compliance/compliance.tools.js';
import { createDataDXTools } from './agents/definitions/data_dx/data_dx.tools.js';
import { createAIEraTools } from './agents/definitions/ai_era/ai_era.tools.js';
import type { SandboxHandle } from './agents/core/provider.js';
import 'dotenv/config';

const execAsync = promisify(exec);
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const sandbox: SandboxHandle = {
  exec: async (cmd: string) => {
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 50, shell: process.platform === 'win32' ? 'bash.exe' : undefined });
      return { exitCode: 0, stdout, stderr };
    } catch (err: any) {
      return { exitCode: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? err.message };
    }
  },
  destroy: async () => {},
};

async function run(label: string, fn: () => Promise<any>) {
  const t = Date.now();
  try {
    const res = await fn();
    console.log(`[${label}] ${((Date.now() - t) / 1000).toFixed(1)}s -> ${JSON.stringify(res).slice(0, 250)}`);
  } catch (e: any) {
    console.log(`[${label}] ERROR: ${e.message}`);
  }
}

async function main() {
  console.log('=== COMPLIANCE (real static + honest-inapplicable checks) ===');
  const compliance: any = createComplianceTools(sandbox);
  await run('check_nhi_compliance', () => compliance.check_nhi_compliance.execute({}));
  await run('check_shadow_ai_usage', () => compliance.check_shadow_ai_usage.execute({ allowedAIProviders: ['api.openai.com'] }));
  await run('check_eu_ai_act_compliance', () => compliance.check_eu_ai_act_compliance.execute({}));
  await run('check_audit_trail_integrity', () => compliance.check_audit_trail_integrity.execute({}));
  await run('check_rtbf_implementation (should be honest false)', () => compliance.check_rtbf_implementation.execute({}));
  await run('scan_data_retention (no databaseUrl, should be honest false)', () => compliance.scan_data_retention.execute({ piiTableNames: ['user'], retentionPolicies: [] }));
  await run('scan_data_retention (real DB, real "user" table)', () => compliance.scan_data_retention.execute({
    databaseUrl: process.env.DATABASE_URL, piiTableNames: ['user'], retentionPolicies: [{ tableName: 'user', maxRetentionDays: 1 }]
  }));

  console.log('\n=== DATA_DX (real static + real DB + real GitHub API) ===');
  const dataDx: any = createDataDXTools(sandbox);
  await run('audit_tooling_fragmentation', () => dataDx.audit_tooling_fragmentation.execute({}));
  await run('check_local_env_parity', () => dataDx.check_local_env_parity.execute({}));
  await run('check_golden_paths', () => dataDx.check_golden_paths.execute({}));
  await run('audit_dark_data (real Postgres pg_stat_user_tables)', () => dataDx.audit_dark_data.execute({ databaseUrl: process.env.DATABASE_URL }));
  await run('measure_ci_reliability (real GitHub API, repoId=12)', () => dataDx.measure_ci_reliability.execute({ repoId: '12', lookbackDays: 30 }));
  await run('measure_onboarding_time (should be honest false)', () => dataDx.measure_onboarding_time.execute({}));

  console.log('\n=== AI_ERA (real static + honest-inapplicable checks) ===');
  const aiEra: any = createAIEraTools(sandbox);
  await run('check_model_version_lock', () => aiEra.check_model_version_lock.execute({}));
  await run('check_ai_attribution (real git log)', () => aiEra.check_ai_attribution.execute({ lookbackCommits: 30 }));
  await run('check_evasive_ai_tests', () => aiEra.check_evasive_ai_tests.execute({}));
  await run('check_token_spend_controls', () => aiEra.check_token_spend_controls.execute({}));
  await run('inject_prompt_payloads (should be honest false)', () => aiEra.inject_prompt_payloads.execute({}));
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
