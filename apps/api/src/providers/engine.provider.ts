/**
 * ============================================================================
 * Inference Engine Cascade — Bedrock primary, OpenAI failover
 * ============================================================================
 *
 * Codeward has two provider layers and they are easy to confuse:
 *
 *   Layer 1  agents/core/provider.ts        AgentProvider.execute(AgentRunConfig) -> AgentResult
 *            "run this agent": owns the tool loop, findings extraction, the policy engine
 *            and token telemetry. Registered by name in agents/core/registry.ts.
 *
 *   Layer 2  providers/openai.provider.ts   AgentProvider.execute(config) -> { text, toolCalls, usage }
 *            "make one model call": pure transport. NativeOpenAIProvider and BedrockProvider
 *            both live here, and this is what runAgentLoop() drives.
 *
 * BedrockProvider is a LAYER 2 engine, so registering it directly in the layer-1 registry would
 * be a category error — it produces no findings, no score and no gate decision. This module is
 * the correct seam: it selects which layer-2 engine the layer-1 provider drives, leaving every
 * agent definition, prompt and behaviour untouched.
 * ============================================================================
 */

import type { AgentProvider, AgentRunConfig, AgentResult } from './openai.provider.js';
import { NativeOpenAIProvider } from './openai.provider.js';
import { BedrockProvider } from './bedrock.provider.js';

export type EngineName = 'bedrock' | 'openai';

/**
 * Bedrock is Priority 1 whenever it is configured. It is opt-in rather than unconditional for
 * one deliberate reason: credentials on ECS arrive from the task role, so there is no key to
 * probe for, and defaulting to Bedrock in an environment without it would make every request
 * pay a failed AWS round trip before failing over. Set AI_ENGINE=bedrock (or BEDROCK_ENABLED=
 * true) on the AWS deployment; everywhere else the cascade behaves exactly as it did before.
 */
export function isBedrockEnabled(): boolean {
  const explicit = (process.env.AI_ENGINE || '').trim().toLowerCase();
  if (explicit === 'bedrock') return true;
  if (explicit === 'openai') return false;
  return process.env.BEDROCK_ENABLED === 'true';
}

/**
 * Tries each engine in priority order. A Bedrock failure — throttling, an expired model id, a
 * missing task-role permission — falls through to the existing OpenAI path rather than failing
 * the agent run, so an AWS incident degrades cost rather than availability.
 *
 * Note the two layers of resilience: NativeOpenAIProvider already runs its own multi-candidate
 * cascade internally (openai_direct -> agentrouter -> tokenrouter), so reaching it here means
 * the whole non-AWS fleet is still available underneath.
 */
export class CascadingInferenceEngine implements AgentProvider {
  id = 'cascade';
  private engines: Array<{ name: EngineName; engine: AgentProvider }> = [];

  constructor(forced?: EngineName) {
    const useBedrock = forced ? forced === 'bedrock' : isBedrockEnabled();

    if (useBedrock) {
      try {
        this.engines.push({ name: 'bedrock', engine: new BedrockProvider() });
      } catch (err) {
        console.error('[InferenceEngine] Bedrock engine could not be constructed, continuing without it:', (err as Error).message);
      }
    }

    // Always present as the terminal fallback unless Bedrock was explicitly forced alone.
    if (forced !== 'bedrock') {
      this.engines.push({ name: 'openai', engine: new NativeOpenAIProvider() });
    }

    if (this.engines.length === 0) {
      this.engines.push({ name: 'openai', engine: new NativeOpenAIProvider() });
    }

    this.id = this.engines.map((e) => e.name).join('>');
  }

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const failures: string[] = [];

    for (let i = 0; i < this.engines.length; i++) {
      const { name, engine } = this.engines[i];
      try {
        const result = await engine.execute(config);
        if (i > 0) {
          console.warn(`[InferenceEngine] Served by fallback engine "${name}" after ${failures.length} failure(s).`);
        }
        return result;
      } catch (err) {
        const message = (err as Error).message;
        failures.push(`${name}: ${message}`);
        const isLast = i === this.engines.length - 1;
        if (isLast) {
          throw new Error(`All inference engines failed — ${failures.join(' | ')}`);
        }
        console.warn(`[InferenceEngine] Engine "${name}" failed, falling through to next: ${message}`);
      }
    }

    // Unreachable: the loop either returns or throws on the final engine.
    throw new Error('No inference engine available');
  }
}

/** Builds the engine cascade. `forced` overrides env selection, used by named registry entries. */
export function resolveInferenceEngine(forced?: EngineName): AgentProvider {
  return new CascadingInferenceEngine(forced);
}
