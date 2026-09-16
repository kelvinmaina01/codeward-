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
import type { AgentProvider as InferenceEngine, AgentTool } from '../../../providers/openai.provider.js';
import { resolveInferenceEngine, type EngineName } from '../../../providers/engine.provider.js';
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

  /**
   * Which low-level engine drives the tool loop. Left undefined, the cascade resolves from the
   * environment (Bedrock first when enabled, OpenAI otherwise). The registry passes an explicit
   * value to expose force-Bedrock and force-OpenAI entries by name. Everything above this line —
   * agent definitions, prompts, findings extraction, the policy engine — is engine-agnostic and
   * unchanged.
   */
  constructor(private readonly forcedEngine?: EngineName) {}

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const model = config.model || 'gpt-4o-mini';
    const startTime = Date.now();
    const provider: InferenceEngine = resolveInferenceEngine(this.forcedEngine);

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
      const loopResult = await runAgentLoop({
        model,
        systemPrompt: config.systemPrompt,
        maxSteps: config.maxSteps,
        tools: toolArray,
        messages: config.checkpointState || [{ role: 'user', content: config.taskPrompt }],
      }, provider);

      // B-1 Fix: If loop was truncated (exhausted maxSteps without report submission)
      const isTruncated = loopResult.truncated === true || (!reportArgs && loopResult.text?.includes("Max steps reached"));

      let findings: any[] = [];
      let score: number | null = null;
      let status: 'passed' | 'failed' | 'incomplete' = 'passed';
      const gateDecision = reportArgs?.gateDecision ?? reportArgs?.riskLevel;

      if (isTruncated) {
        status = 'incomplete';
        score = null;
        findings = [];
        console.warn(`[OpenAIProvider] ${config.agentId}: Agent run truncated / incomplete (maxSteps reached). Status: incomplete, score: null.`);
      } else {
        // Orchestrator's submit_orchestrator_decision schema uses overallWeightedScore/
        // criticalFindings, not score/findings like every other agent. Check the orchestrator-specific field name first.
        findings = reportArgs?.findings ?? reportArgs?.criticalFindings ?? [];
        score = reportArgs?.score ?? reportArgs?.overallWeightedScore ?? (findings.length === 0 ? 100 : null) ?? 0;
        status = gateDecision === 'BLOCK' || findings.some((f: any) => (f.severity ?? '').toUpperCase() === 'CRITICAL') ? 'failed' : 'passed';
      }

      // Assess every finding against the backend policy. Nothing is dropped here — the full
      // set is still persisted and still drives the dashboard — but the assessment travels
      // with the result so the developer-facing surfaces downstream (guardian's PR review,
      // escalation's GitHub issues, the run's gate) can act on validated data rather than
      // re-deriving trust from the model's self-reported severity.
      const { applyFindingPolicy } = await import('../../policy/finding-policy.js');
      const policyResult = applyFindingPolicy(findings);
      if (policyResult.suppressed.length > 0) {
        console.log(
          `[OpenAIProvider] ${config.agentId}: policy surfaced ${policyResult.surfaced.length}/${findings.length} finding(s); suppressed ${policyResult.suppressed.length} (${Object.entries(policyResult.suppressionBreakdown).map(([k, v]) => `${k}=${v}`).join(', ')}).`
        );
      }

      return {
        agentId: config.agentId,
        status,
        findings,
        score,
        truncated: isTruncated,
        duration: Date.now() - startTime,
        modelUsed: model,
        tokenUsage: loopResult.tokenUsage,
        servedBy: loopResult.servedBy,
        gateDecision,
        toolsExecuted: (loopResult.toolsExecuted && loopResult.toolsExecuted.length > 0)
          ? loopResult.toolsExecuted
          : (reportArgs?.toolsExecuted ?? []),
        summary: reportArgs?.summary,
        policy: {
          surfacedCount: policyResult.surfaced.length,
          suppressedCount: policyResult.suppressed.length,
          suppressionBreakdown: policyResult.suppressionBreakdown,
        },
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[OpenAIProvider] Agent "${config.agentId}" failed:`, err.message);
      throw error; // Re-throw so BullMQ and the worker's catch block can handle retries and checkpointing
    }
  }
}
