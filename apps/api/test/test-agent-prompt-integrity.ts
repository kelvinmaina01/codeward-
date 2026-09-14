/**
 * Agent prompt integrity checks.
 *
 * Exists because of a real, silent, total failure: nine of ten agents wrote their system
 * prompt as `\${CONSTITUTION}` inside a template literal, which escapes the interpolation.
 * Every one of those agents shipped the literal text "${CONSTITUTION}" to the model and none
 * of them ever received the rules meant to govern them — including the orchestrator, which
 * was making merge/block decisions with its entire reasoning framework missing. Nothing in
 * the type system, the build, or any test caught it, because an escaped placeholder is
 * perfectly valid TypeScript.
 *
 *   npm run test:prompt:integrity
 */

import { securityAgent } from '../src/agents/definitions/security.agent.js';
import { bloatAgent } from '../src/agents/definitions/bloat.agent.js';
import { brokenCodeAgent } from '../src/agents/definitions/broken_code.agent.js';
import { architectureAgent } from '../src/agents/definitions/architecture.agent.js';
import { complianceAgent } from '../src/agents/definitions/compliance.agent.js';
import { dataDxAgent } from '../src/agents/definitions/data_dx.agent.js';
import { aiEraAgent } from '../src/agents/definitions/ai_era.agent.js';
import { guardianAgent } from '../src/agents/definitions/guardian.agent.js';
import { chatAgent } from '../src/agents/definitions/chat.agent.js';
import {
  orchestratorPhase1Agent,
  orchestratorPhase2Agent,
  orchestratorPhase3Agent,
} from '../src/agents/definitions/orchestrator.agent.js';
import type { AgentDefinition } from '../src/agents/core/provider.js';

const ALL_AGENTS: AgentDefinition[] = [
  securityAgent, bloatAgent, brokenCodeAgent, architectureAgent, complianceAgent,
  dataDxAgent, aiEraAgent, guardianAgent, chatAgent,
  orchestratorPhase1Agent, orchestratorPhase2Agent, orchestratorPhase3Agent,
];

/** Every agent whose prompt is built from a CONSTITUTION block must actually contain it. */
const REQUIRES_CONSTITUTION = new Set([
  'security', 'bloat', 'broken_code', 'architecture', 'compliance', 'data_dx',
  'ai_era', 'guardian', 'chat', 'orchestrator_phase1', 'orchestrator_phase2', 'orchestrator_phase3',
]);

interface Failure { agentId: string; problem: string }

function main(): void {
  console.log('\n═══ Agent prompt integrity ═══\n');
  const failures: Failure[] = [];

  for (const agent of ALL_AGENTS) {
    const prompt = agent.systemPrompt;
    const problems: string[] = [];

    // 1. No unresolved template placeholder may survive into a shipped prompt.
    const leaked = prompt.match(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g);
    if (leaked) problems.push(`unresolved placeholder(s): ${[...new Set(leaked)].join(', ')}`);

    // 2. Agents that declare a constitution must actually be governed by one.
    if (REQUIRES_CONSTITUTION.has(agent.id) && !/CONSTITUTION\b/.test(prompt)) {
      problems.push('declares a constitution but no constitution text is present in the prompt');
    }

    // 3. A prompt short enough to be just the preamble means the blocks did not interpolate.
    if (prompt.trim().length < 200) problems.push(`prompt suspiciously short (${prompt.trim().length} chars)`);

    const mark = problems.length === 0 ? '✅' : '❌';
    console.log(`${mark} ${agent.id.padEnd(22)} ${prompt.trim().length.toString().padStart(5)} chars${problems.length ? `  — ${problems.join('; ')}` : ''}`);
    for (const p of problems) failures.push({ agentId: agent.id, problem: p });
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`✅ PASS — all ${ALL_AGENTS.length} agent prompts resolve cleanly.\n`);
    process.exit(0);
  }
  console.log(`❌ FAIL — ${failures.length} prompt integrity problem(s) across ${new Set(failures.map((f) => f.agentId)).size} agent(s).\n`);
  process.exit(1);
}

main();
