import assert from 'node:assert';
import { createSecurityTools } from '../src/agents/tools/security.tools.js';
import { securityAgent } from '../src/agents/definitions/security.agent.js';
import type { SandboxHandle } from '../src/core/provider.js';

console.log('=== PART C: SEMGREP / GITLEAKS CONSOLIDATION TESTS ===\n');

// 1. Budget reconciliation
assert.strictEqual(securityAgent.maxSteps, 15, 'maxSteps must be 15');
assert.ok(
  securityAgent.systemPrompt.includes('TOKEN BUDGET: You have a maximum of 15 tool call steps'),
  'Constitution must declare 15 steps'
);
console.log('✓ PASS: Budget reconciled — maxSteps is 15 and matches Constitution literally.');

// 2. Mock sandbox where binaries are missing
const missingBinarySandbox: SandboxHandle = {
  exec: async (cmd: string) => {
    if (cmd.startsWith('which')) {
      return { exitCode: 1, stdout: '', stderr: 'not found' };
    }
    return { exitCode: 0, stdout: '', stderr: '' };
  },
  destroy: async () => {},
};

const tools = createSecurityTools(missingBinarySandbox);

// Confirm dead DAST steps are not present
assert.strictEqual(tools.run_owasp_zap, undefined, 'run_owasp_zap must be gated off');
assert.strictEqual(tools.check_auth_on_routes, undefined, 'check_auth_on_routes must be gated off');
assert.strictEqual(tools.check_rate_limiting, undefined, 'check_rate_limiting must be gated off');
assert.strictEqual(tools.probe_ssrf_endpoints, undefined, 'probe_ssrf_endpoints must be gated off');
assert.strictEqual(tools.check_mfa_on_destructive_routes, undefined, 'check_mfa_on_destructive_routes must be gated off');
assert.strictEqual(tools.test_error_information_leakage, undefined, 'test_error_information_leakage must be gated off');
assert.strictEqual(tools.check_business_logic_bypass, undefined, 'check_business_logic_bypass must be gated off');
console.log('✓ PASS: All 7 dead DAST steps are gated off from active tools.');

// Confirm retired legacy regex tools are not returned in createSecurityTools
assert.strictEqual(tools.scan_env_files, undefined, 'scan_env_files must be retired from active tools');
assert.strictEqual(tools.check_crypto_patterns, undefined, 'check_crypto_patterns must be retired from active tools');
assert.strictEqual(tools.scan_for_sqli_patterns, undefined, 'scan_for_sqli_patterns must be retired from active tools');
assert.strictEqual(tools.scan_nhi_tokens, undefined, 'scan_nhi_tokens must be retired from active tools');
console.log('✓ PASS: 4 legacy regex tools retired from active tools.');

// Confirm kept tools are present
assert.ok(tools.run_trufflehog, 'run_trufflehog must be present');
assert.ok(tools.run_trivy, 'run_trivy must be present');
assert.ok(tools.run_npm_audit, 'run_npm_audit must be present');
assert.ok(tools.check_auth_patterns, 'check_auth_patterns must be present');
assert.ok(tools.scan_ci_logs_for_leaks, 'scan_ci_logs_for_leaks must be present');
assert.ok(tools.check_sbom_integrity, 'check_sbom_integrity must be present');
assert.ok(tools.check_rls_policies, 'check_rls_policies must be present');
console.log('✓ PASS: Kept tools are active and correctly registered.');

// 3. Skip honestly when binary is missing
async function testBinarySkipping() {
  const semgrepRes = await tools.run_semgrep.execute({});
  assert.strictEqual(semgrepRes.applicable, false);
  assert.ok(semgrepRes.reason.includes('not found'));
  console.log('✓ PASS: run_semgrep skips honestly when binary is missing.');

  const gitleaksRes = await tools.run_gitleaks.execute({});
  assert.strictEqual(gitleaksRes.applicable, false);
  assert.ok(gitleaksRes.reason.includes('not found'));
  console.log('✓ PASS: run_gitleaks skips honestly when binary is missing.');
}

// 4. Output shape parsing with populated findings
async function testFindingsParsing() {
  const mockSandbox: SandboxHandle = {
    exec: async (cmd: string) => {
      if (cmd.startsWith('which semgrep')) return { exitCode: 0, stdout: '/usr/local/bin/semgrep\n', stderr: '' };
      if (cmd.startsWith('which gitleaks')) return { exitCode: 0, stdout: '/usr/local/bin/gitleaks\n', stderr: '' };
      if (cmd.includes('semgrep scan')) {
        const semgrepOutput = JSON.stringify({
          results: [{
            check_id: 'javascript.express.security.audit.sqli.raw-query-sqli',
            path: 'src/db/users.ts',
            start: { line: 42, col: 15 },
            extra: {
              message: 'Detected string concatenation in SQL query.',
              severity: 'ERROR',
              lines: 'await db.query("SELECT * FROM users WHERE id = " + userId)'
            }
          }]
        });
        return { exitCode: 0, stdout: semgrepOutput, stderr: '' };
      }
      if (cmd.includes('gitleaks detect')) {
        const gitleaksOutput = JSON.stringify([{
          File: 'src/config.ts',
          StartLine: 14,
          RuleID: 'stripe-api-key',
          Description: 'Stripe API Key',
          Commit: 'a1b2c3d',
          Match: 'sk_live_1234567890abcdef'
        }]);
        return { exitCode: 0, stdout: gitleaksOutput, stderr: '' };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    destroy: async () => {},
  };

  const activeTools = createSecurityTools(mockSandbox);

  const semgrepRes = await activeTools.run_semgrep.execute({});
  assert.strictEqual(semgrepRes.applicable, true);
  assert.strictEqual(semgrepRes.findingsCount, 1);
  const sFinding = semgrepRes.findings[0];
  assert.strictEqual(sFinding.file, 'src/db/users.ts');
  assert.strictEqual(sFinding.line, 42);
  assert.strictEqual(sFinding.toolName, 'semgrep');
  assert.ok(sFinding.rawEvidence.includes('SELECT * FROM users'));
  console.log('✓ PASS: run_semgrep parses findings into exact expected shape.');

  const gitleaksRes = await activeTools.run_gitleaks.execute({});
  assert.strictEqual(gitleaksRes.applicable, true);
  assert.strictEqual(gitleaksRes.secretsCount, 1);
  const gFinding = gitleaksRes.findings[0];
  assert.strictEqual(gFinding.file, 'src/config.ts');
  assert.strictEqual(gFinding.line, 14);
  assert.strictEqual(gFinding.toolName, 'gitleaks');
  assert.ok(gFinding.rawEvidence.includes('sk_live_1234567890abcdef'));
  console.log('✓ PASS: run_gitleaks parses findings into exact expected shape.');
}

async function runAll() {
  await testBinarySkipping();
  await testFindingsParsing();
  console.log('\nALL PART C TESTS PASSED SUCCESSFULLY!');
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
