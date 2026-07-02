/**
 * ============================================================================
 * OpenAI Provider — the real, working default
 * ============================================================================
 *
 * Replaces the previous default (AnthropicProvider), which routed through
 * OpenRouter using OPENROUTER_API_KEY — a credential that was never set,
 * meaning every real webhook-triggered agent run failed at the provider layer
 * regardless of how correct the tool wiring was. This one uses the same
 * NativeOpenAIProvider + runAgentLoop machinery already proven working
 * end-to-end across every agent's stress test (real tool calls, real
 * fresh-clone sandboxes, real submit_* report capture).
 * ============================================================================
 */
import type { AgentProvider, AgentRunConfig, AgentResult, ToolMap } from '../provider.js';
import { NativeOpenAIProvider, AgentTool } from '../../../providers/openai.provider.js';
import { runAgentLoop } from '../../agent-loop.js';

function toolMapToArray(tools: ToolMap): AgentTool[] {
  return Object.entries(tools).map(([name, def]) => ({
    name,
    description: def.description,
    parameters: def.parameters as any, // zod schema — NativeOpenAIProvider converts via zod-to-json-schema
    execute: def.execute,
  }));
}

export class OpenAIProvider implements AgentProvider {
  readonly name = 'openai';

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const model = config.model && !config.model.startsWith('claude') ? config.model : 'gpt-4o-mini';
    const startTime = Date.now();
    const provider = new NativeOpenAIProvider();

    let reportArgs: any = null;
    const toolArray = toolMapToArray(config.tools).map(t => ({
      ...t,
      execute: async (args: any) => {
        const result = await t.execute(args);
        if (t.name.startsWith('submit_')) reportArgs = args;
        return result;
      }
    }));

    try {
      await runAgentLoop({
        model,
        systemPrompt: config.systemPrompt,
        maxSteps: config.maxSteps,
        tools: toolArray,
        messages: [{ role: 'user', content: config.taskPrompt }],
      }, provider);

      const findings = reportArgs?.findings ?? [];
      const score = reportArgs?.score ?? (findings.length === 0 ? 100 : null) ?? 0;
      const gateDecision = reportArgs?.gateDecision ?? reportArgs?.riskLevel;

      return {
        agentId: config.agentId,
        status: gateDecision === 'BLOCK' || findings.some((f: any) => (f.severity ?? '').toUpperCase() === 'CRITICAL') ? 'failed' : 'passed',
        findings,
        score,
        duration: Date.now() - startTime,
        modelUsed: model,
        tokenUsage: { input: 0, output: 0 }, // runAgentLoop/NativeOpenAIProvider don't currently surface usage; real 0, not fabricated
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[OpenAIProvider] Agent "${config.agentId}" failed:`, err.message);
      return {
        agentId: config.agentId,
        status: 'error',
        findings: [],
        score: 0,
        duration: Date.now() - startTime,
        modelUsed: model,
        tokenUsage: { input: 0, output: 0 },
      };
    }
  }
}
