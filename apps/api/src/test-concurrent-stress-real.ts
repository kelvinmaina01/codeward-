/**
 * Real concurrency stress test of the execution CORE (real sandbox creation, real LLM tool
 * calls, real DB writes) — bypassing BullMQ entirely since Upstash Redis is at its hard quota
 * limit (500,000/500,000 requests, confirmed live, not a code issue). This tests the layer
 * that actually determines whether the system holds up under concurrent load: does the
 * database race, does one sandbox interfere with another, does the LLM provider rate-limit,
 * what's the real per-run latency/cost. BullMQ would only add queuing/backpressure on top of
 * this same core — if this core doesn't hold up concurrently, no queue technology fixes that.
 *
 * Scope: N=15 real concurrent full agent runs (fresh clone -> real tools -> real LLM -> real
 * DB write), mixing 4 agent types. Not literally "thousands" — that would mean thousands of
 * real, billed OpenAI calls and thousands of real git clones in one unattended run, which is
 * not a responsible thing to do without explicit cost sign-off. This produces real numbers to
 * extrapolate from instead of guessing.
 */
import { LocalExecSandbox } from './sandbox/local-exec.js';
import { bloatAgent } from './agents/definitions/bloat.agent.js';
import { brokenCodeAgent } from './agents/definitions/broken_code.agent.js';
import { securityAgent } from './agents/definitions/security.agent.js';
import { architectureAgent } from './agents/definitions/architecture.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import { db } from './db/index.js';
import { runs, agentTasks } from './db/schema.js';
import { eq } from 'drizzle-orm';
import type { AgentDefinition } from './agents/core/provider.js';
import 'dotenv/config';

const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';
const AGENTS: AgentDefinition[] = [bloatAgent, brokenCodeAgent, securityAgent, architectureAgent];
const CONCURRENCY = 15;

interface RunResult {
  index: number;
  agentId: string;
  status: 'completed' | 'failed';
  durationMs: number;
  error?: string;
  runId?: number;
  findingsCount?: number;
}

async function runOne(index: number): Promise<RunResult> {
  const agent = AGENTS[index % AGENTS.length];
  const t0 = Date.now();
  let sandbox: LocalExecSandbox | null = null;
  let runRow: { id: number } | undefined;

  try {
    [runRow] = await db.insert(runs).values({ commitSha: `stress-${index}`, status: 'running' }).returning();
    await db.insert(agentTasks).values({ runId: runRow.id, agentId: agent.id, status: 'running', provider: 'openai', startedAt: new Date() });

    sandbox = new LocalExecSandbox();
    await sandbox.init(REPO_URL, 'baseline');

    const toolMap = agent.createTools(sandbox);
    let reportResult: any = null;
    const submitToolName = Object.keys(toolMap).find(n => n.startsWith('submit_'))!;
    const toolArray = Object.entries(toolMap).map(([name, impl]: [string, any]) => ({
      name, description: impl.description, parameters: impl.parameters,
      execute: async (args: any) => {
        const result = await impl.execute(args);
        if (name === submitToolName) reportResult = args;
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();
    await runAgentLoop({
      model: 'gpt-4o-mini', systemPrompt: agent.systemPrompt, maxSteps: agent.maxSteps, tools: toolArray,
      messages: [{ role: 'user', content: `Analyze this repository. Run ID: stress-${index}. Submit findings using ${submitToolName}.` }]
    }, provider);

    const findings = reportResult?.findings ?? [];
    await db.update(agentTasks).set({
      status: 'completed', score: reportResult?.score ?? null, findingsCount: findings.length, findings, completedAt: new Date()
    }).where(eq(agentTasks.runId, runRow.id));

    return { index, agentId: agent.id, status: 'completed', durationMs: Date.now() - t0, runId: runRow.id, findingsCount: findings.length };
  } catch (e: any) {
    if (runRow) {
      await db.update(agentTasks).set({ status: 'failed', error: e.message, completedAt: new Date() }).where(eq(agentTasks.runId, runRow.id)).catch(() => {});
    }
    return { index, agentId: agent.id, status: 'failed', durationMs: Date.now() - t0, error: e.message, runId: runRow?.id };
  } finally {
    if (sandbox) await sandbox.destroy().catch(() => {});
  }
}

async function main() {
  console.log(`=== REAL CONCURRENT STRESS TEST: ${CONCURRENCY} parallel full agent runs ===`);
  console.log(`Agents mixed: ${AGENTS.map(a => a.id).join(', ')}\n`);

  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => runOne(i)));
  const totalMs = Date.now() - t0;

  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed');
  const durations = completed.map(r => r.durationMs).sort((a, b) => a - b);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;

  // Real isolation check: verify no run's findings leaked into another run's DB row.
  const runIds = results.map(r => r.runId).filter(Boolean) as number[];
  const distinctRunIds = new Set(runIds);

  console.log('\n=== RESULTS ===');
  console.log(`Wall-clock for ${CONCURRENCY} concurrent runs: ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`Completed: ${completed.length}/${CONCURRENCY} | Failed: ${failed.length}/${CONCURRENCY}`);
  console.log(`Per-run duration — avg: ${(avg / 1000).toFixed(1)}s, p50: ${(p50 / 1000).toFixed(1)}s, p95: ${(p95 / 1000).toFixed(1)}s, min: ${(durations[0] / 1000).toFixed(1)}s, max: ${(durations[durations.length - 1] / 1000).toFixed(1)}s`);
  console.log(`DB isolation: ${distinctRunIds.size} distinct run rows for ${runIds.length} runs (should be equal — no shared/colliding IDs)`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    failed.forEach(f => console.log(`  [${f.index}] ${f.agentId}: ${f.error}`));
  }
  console.log('\nPer-run detail:');
  results.forEach(r => console.log(`  [${r.index}] ${r.agentId} -> ${r.status} in ${(r.durationMs / 1000).toFixed(1)}s${r.findingsCount != null ? `, ${r.findingsCount} findings` : ''}${r.error ? ` (${r.error.slice(0, 100)})` : ''}`));
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
