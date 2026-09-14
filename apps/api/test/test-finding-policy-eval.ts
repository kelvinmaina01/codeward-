/**
 * Finding-policy regression evaluation.
 *
 * Runs the labeled corpus through the real policy engine and reports precision, recall and
 * blocking accuracy. Fully deterministic and offline — no LLM, no database, no network — so
 * it runs in CI on every change and answers the only question that matters when a prompt or
 * threshold moves: did we cut noise, or did we start missing real vulnerabilities?
 *
 *   npm run test:policy:eval
 */

import {
  applyFindingPolicy,
  assessFinding,
  decideGate,
} from '../src/agents/policy/finding-policy.js';
import { FINDING_CORPUS, ACCUMULATION_CASE, type CorpusCase } from './fixtures/finding-corpus.js';

/** Targets. Precision is the product promise; recall guards against over-suppression. */
const MIN_PRECISION = 1.0;
const MIN_RECALL = 1.0;

interface CaseOutcome {
  testCase: CorpusCase;
  actual: 'BLOCK' | 'SURFACE' | 'SUPPRESS';
  detail: string;
  passed: boolean;
}

function runCase(testCase: CorpusCase): CaseOutcome {
  const a = assessFinding(testCase.finding);
  const actual = a.blocking ? 'BLOCK' : a.surfaced ? 'SURFACE' : 'SUPPRESS';
  return {
    testCase,
    actual,
    detail: `severity=${a.severity} confidence=${a.confidence} evidence=${a.evidence}${a.suppressionReason ? ` reason=${a.suppressionReason}` : ''}`,
    passed: actual === testCase.expect,
  };
}

function main(): void {
  console.log('\n═══ Codeward finding-policy evaluation ═══\n');

  const outcomes = FINDING_CORPUS.map(runCase);

  for (const o of outcomes) {
    const mark = o.passed ? '✅' : '❌';
    console.log(`${mark} ${o.testCase.id.padEnd(30)} expected=${o.testCase.expect.padEnd(8)} actual=${o.actual.padEnd(8)} ${o.detail}`);
    if (!o.passed) console.log(`      ↳ ${o.testCase.rationale}`);
  }

  // Surfacing is the developer-visible event, so precision/recall are measured on it.
  const shouldSurface = (d: string) => d === 'BLOCK' || d === 'SURFACE';
  const truePositives = outcomes.filter((o) => shouldSurface(o.testCase.expect) && shouldSurface(o.actual)).length;
  const falsePositives = outcomes.filter((o) => o.testCase.expect === 'SUPPRESS' && shouldSurface(o.actual)).length;
  const falseNegatives = outcomes.filter((o) => shouldSurface(o.testCase.expect) && o.actual === 'SUPPRESS').length;

  const precision = truePositives + falsePositives === 0 ? 1 : truePositives / (truePositives + falsePositives);
  const recall = truePositives + falseNegatives === 0 ? 1 : truePositives / (truePositives + falseNegatives);

  const blockExpected = outcomes.filter((o) => o.testCase.expect === 'BLOCK');
  const blockCorrect = blockExpected.filter((o) => o.actual === 'BLOCK').length;
  const overBlocked = outcomes.filter((o) => o.testCase.expect !== 'BLOCK' && o.actual === 'BLOCK');

  console.log('\n─── Metrics ───');
  console.log(`  Precision:        ${(precision * 100).toFixed(1)}%  (${truePositives} TP / ${falsePositives} FP)`);
  console.log(`  Recall:           ${(recall * 100).toFixed(1)}%  (${falseNegatives} missed real issues)`);
  console.log(`  Block accuracy:   ${blockCorrect}/${blockExpected.length} correct, ${overBlocked.length} over-blocked`);

  // Accumulation property: many medium findings must never become a merge block.
  const accumulation = applyFindingPolicy(ACCUMULATION_CASE);
  const accumulationGate = decideGate(accumulation.assessed);
  const accumulationOk = accumulationGate.decision !== 'BLOCK';
  console.log(`\n─── Gate properties ───`);
  console.log(`  ${accumulationOk ? '✅' : '❌'} 12 MEDIUM findings do not accumulate into a BLOCK (got ${accumulationGate.decision})`);

  // A clean run must be an unambiguous PASS.
  const cleanGate = decideGate(applyFindingPolicy([]).assessed);
  const cleanOk = cleanGate.decision === 'PASS';
  console.log(`  ${cleanOk ? '✅' : '❌'} Zero findings yields PASS (got ${cleanGate.decision})`);

  // A single strongly-evidenced critical must block even when everything else is quiet.
  const loneCritical = decideGate(
    applyFindingPolicy([...ACCUMULATION_CASE, FINDING_CORPUS.find((c) => c.id === 'tp-sql-injection')!.finding]).assessed
  );
  const loneCriticalOk = loneCritical.decision === 'BLOCK';
  console.log(`  ${loneCriticalOk ? '✅' : '❌'} One real critical still blocks amid noise (got ${loneCritical.decision})`);

  const failures = outcomes.filter((o) => !o.passed);
  const gateOk = accumulationOk && cleanOk && loneCriticalOk;
  const metricsOk = precision >= MIN_PRECISION && recall >= MIN_RECALL;

  console.log('');
  if (failures.length === 0 && gateOk && metricsOk) {
    console.log(`✅ PASS — ${outcomes.length}/${outcomes.length} corpus cases, all gate properties hold.\n`);
    process.exit(0);
  }

  console.log(`❌ FAIL — ${failures.length} corpus case(s) wrong; precision ${(precision * 100).toFixed(1)}% (min ${MIN_PRECISION * 100}%), recall ${(recall * 100).toFixed(1)}% (min ${MIN_RECALL * 100}%).`);
  if (falseNegatives > 0) {
    console.log('   Missed real issues are the more dangerous failure — check whether a threshold was raised too far.');
  }
  console.log('');
  process.exit(1);
}

main();
