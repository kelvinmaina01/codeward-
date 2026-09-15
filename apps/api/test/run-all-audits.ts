/**
 * Master Test Runner for Pre-Launch Audit Verification
 * Executes all 3 phases sequentially and provides an aggregate score.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Phase 1: Database & Safety Hardening', file: 'test-phase1-db-audit.ts' },
  { name: 'Phase 2: Core Security & Endpoints', file: 'test-phase2-security-audit.ts' },
  { name: 'Phase 3: AI Engine & Worker Reliability', file: 'test-phase3-ai-workers-audit.ts' },
];

console.log('================================================================');
console.log('🚀 MASTER PRE-LAUNCH AUDIT TEST RUNNER');
console.log('================================================================\n');

let allPassed = true;
const summary: Array<{ name: string; exitCode: number }> = [];

for (const suite of suites) {
  const filePath = path.resolve(__dirname, suite.file);
  console.log(`\n▶ Running ${suite.name} (${suite.file})...\n`);

  const proc = spawnSync('npx.cmd', ['tsx', `"${filePath}"`], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'test', NO_SERVER_START: 'true' },
  });

  const exitCode = proc.status ?? 1;
  summary.push({ name: suite.name, exitCode });

  if (exitCode !== 0) {
    allPassed = false;
  }
}

console.log('\n================================================================');
console.log('📋 AUDIT EXECUTION SUMMARY');
console.log('================================================================');

for (const res of summary) {
  const statusIcon = res.exitCode === 0 ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${statusIcon} — ${res.name} (exit code: ${res.exitCode})`);
}

console.log('================================================================\n');

if (!allPassed) {
  console.error('💥 Some audit verification test suites failed.');
  process.exit(1);
} else {
  console.log('🎉 ALL 3 PHASES PASSED WITH ZERO FAILURES. 100% EMPIRICALLY VERIFIED.');
  process.exit(0);
}
