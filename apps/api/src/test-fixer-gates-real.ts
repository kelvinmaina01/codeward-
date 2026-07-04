/**
 * Real verification of Phase C's widened policies and the new syntax gate. The eligibility
 * matrix is pure logic; the syntax gate exercises the REAL TypeScript parser and JSON.parse —
 * no mocks. generateFix's live path was already proven twice on GitHub (PR #3, PR #6); what's
 * new here is per-agent policy + parse-refusal, which these cases pin down.
 */
import { isEligibleForAutoFix } from './agents/fixer/fixer.service.js';

const base = { title: '', description: '', dismissed: false };
const cases: Array<[string, any, string, boolean]> = [
  ['bloat DEAD_CODE refactorSafe -> eligible', { ...base, file: 'a.ts', category: 'DEAD_CODE', refactorSafe: true }, 'bloat', true],
  ['bloat POLYFILL refactorSafe (new category) -> eligible', { ...base, file: 'a.ts', category: 'POLYFILL', refactorSafe: true }, 'bloat', true],
  ['bloat DOCUMENTATION_DRIFT refactorSafe (new category) -> eligible', { ...base, file: 'README.md', category: 'DOCUMENTATION_DRIFT', refactorSafe: true }, 'bloat', true],
  ['bloat COMPLEXITY refactorSafe -> NOT eligible (unsafe category)', { ...base, file: 'a.ts', category: 'COMPLEXITY', refactorSafe: true }, 'bloat', false],
  ['bloat DEAD_CODE without refactorSafe -> NOT eligible', { ...base, file: 'a.ts', category: 'DEAD_CODE', refactorSafe: false }, 'bloat', false],
  ['broken_code SWALLOWED_ERROR (no refactorSafe field) -> eligible', { ...base, file: 'a.ts', category: 'SWALLOWED_ERROR' }, 'broken_code', true],
  ['broken_code RACE_CONDITION -> NOT eligible (behavior-changing)', { ...base, file: 'a.ts', category: 'RACE_CONDITION' }, 'broken_code', false],
  ['broken_code TYPE_SAFETY -> NOT eligible', { ...base, file: 'a.ts', category: 'TYPE_SAFETY' }, 'broken_code', false],
  ['security SECRETS -> NOT eligible (no policy for agent)', { ...base, file: '.env', category: 'SECRETS' }, 'security', false],
  ['bloat DEAD_CODE file "N/A" -> NOT eligible (placeholder)', { ...base, file: 'N/A', category: 'DEAD_CODE', refactorSafe: true }, 'bloat', false],
];

let failed = 0;
for (const [label, finding, agentId, expected] of cases) {
  const actual = isEligibleForAutoFix(finding, agentId);
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${label}`);
  if (!pass) failed++;
}

// Syntax gate: not exported directly, so exercise it through the real module boundary by
// importing the module and reaching the private via a targeted re-implementation? No — never
// test a copy. Export it properly instead: this file assumes fixer.service exports syntaxCheck.
import { syntaxCheck } from './agents/fixer/fixer.service.js';

async function syntaxCases() {
  const good = await syntaxCheck('x.ts', 'export const a: number = 1;\n');
  console.log(`${good.ok ? 'PASS' : 'FAIL'} — valid TS accepted`);
  if (!good.ok) failed++;

  const bad = await syntaxCheck('x.ts', 'export const a: = {{{;\n');
  console.log(`${!bad.ok ? 'PASS' : 'FAIL'} — broken TS refused (${!bad.ok ? (bad as any).error.slice(0, 60) : 'was accepted!'})`);
  if (bad.ok) failed++;

  const goodJson = await syntaxCheck('package.json', '{"name":"x"}');
  console.log(`${goodJson.ok ? 'PASS' : 'FAIL'} — valid JSON accepted`);
  if (!goodJson.ok) failed++;

  const badJson = await syntaxCheck('package.json', '{"name": x}');
  console.log(`${!badJson.ok ? 'PASS' : 'FAIL'} — broken JSON refused`);
  if (badJson.ok) failed++;

  const md = await syntaxCheck('README.md', '# anything goes');
  console.log(`${md.ok ? 'PASS' : 'FAIL'} — markdown passes through`);
  if (!md.ok) failed++;
}

syntaxCases().then(() => {
  if (failed > 0) { console.error(`\n${failed} case(s) FAILED.`); process.exit(1); }
  console.log('\nALL GATE CASES PASSED — per-agent policies and the real parser-backed syntax gate behave exactly as specified.');
  process.exit(0);
});
