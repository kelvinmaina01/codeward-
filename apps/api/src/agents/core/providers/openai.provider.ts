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
import { logAndBroadcast } from '../../queue/agent.queue.js';

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
        if (config.runId) {
          logAndBroadcast('agent_active', {
            repo: config.repoFullName,
            sha: config.commitSHA,
            agent: config.agentId,
            status: `Executing tool ${t.name}`,
            step: 'tool',
            runId: config.runId,
            logType: 'run',
            level: 'inf',
            message: `  ├─ ⚡ Executing tool: ${t.name}`,
          });
        }
        const result = await t.execute(args);
        if (t.name.startsWith('submit_')) {
          reportArgs = args;
          if (config.runId && args?.findings && Array.isArray(args.findings)) {
            for (const f of args.findings) {
              const sev = String(f.severity ?? 'INFO').toUpperCase();
              const icon = sev === 'CRITICAL' || sev === 'HIGH' ? '🚨' : (sev === 'MEDIUM' ? '⚠️' : 'ℹ️');
              logAndBroadcast('agent_active', {
                repo: config.repoFullName,
                sha: config.commitSHA,
                agent: config.agentId,
                status: `Reported finding: ${f.title}`,
                step: 'finding',
                runId: config.runId,
                logType: 'run',
                level: sev === 'CRITICAL' || sev === 'HIGH' ? 'err' : (sev === 'MEDIUM' ? 'warn' : 'plain'),
                message: `  ├─ ${icon} [${sev}] ${f.title}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`,
              });
            }
          }
        }
        return result;
      }
    }));

    try {
      await runAgentLoop({
        model,
        systemPrompt: config.systemPrompt,
        maxSteps: config.maxSteps,
        tools: toolArray,
        messages: config.checkpointState || [{ role: 'user', content: config.taskPrompt }],
      }, provider);

      // Orchestrator's submit_orchestrator_decision schema uses overallWeightedScore/
      // criticalFindings, not score/findings like every other agent — this generic extraction
      // silently fell back to a hardcoded 100 for every orchestrator run regardless of its
      // real computed score or even a BLOCK decision (found via a real discrepancy: the same
      // run showed runs.score=0 via store_orchestrator_result but repositories.baselineScore=
      // 100 via this exact fallback). Check the orchestrator-specific field name first.
      const findings = reportArgs?.findings ?? reportArgs?.criticalFindings ?? [];
      const score = reportArgs?.score ?? reportArgs?.overallWeightedScore ?? (findings.length === 0 ? 100 : null) ?? 0;
      const gateDecision = reportArgs?.gateDecision ?? reportArgs?.riskLevel;

      return {
        agentId: config.agentId,
        status: gateDecision === 'BLOCK' || findings.some((f: any) => (f.severity ?? '').toUpperCase() === 'CRITICAL') ? 'failed' : 'passed',
        findings,
        score,
        duration: Date.now() - startTime,
        modelUsed: model,
        tokenUsage: { input: 0, output: 0 }, // runAgentLoop/NativeOpenAIProvider don't currently surface usage; real 0, not fabricated
        gateDecision,
        toolsExecuted: reportArgs?.toolsExecuted,
        summary: reportArgs?.summary,
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[OpenAIProvider] Agent "${config.agentId}" failed:`, err.message);
      throw error; // Re-throw so BullMQ and the worker's catch block can handle retries and checkpointing
    }
  }
}
