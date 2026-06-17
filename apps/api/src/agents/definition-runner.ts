/**
 * ============================================================================
 * Definition Agent Runner
 * ============================================================================
 * 
 * Bridges the AgentDefinition interface (definitions/) with the agent-loop.ts
 * execution engine and the NativeOpenAIProvider.
 * 
 * This replaces the old base-analyzer pattern for agents that have full
 * constitutions and specialized tool sets (bloat, broken_code, architecture).
 * ============================================================================
 */

import { db } from "../db/index.js";
import { agentReports } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { NativeOpenAIProvider } from "../providers/openai.provider.js";
import { runAgentLoop } from "./agent-loop.js";
import type { AgentDefinition } from "./core/provider.js";
import type { SandboxHandle } from "../sandbox/local-exec.js";

export async function runDefinitionAgent(
  definition: AgentDefinition,
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox: SandboxHandle
): Promise<void> {
  const { id: agentType, systemPrompt, maxSteps } = definition;

  // Mark as pending in DB
  await db.insert(agentReports).values({
    runId,
    agentType,
    status: "pending",
    createdAt: new Date(),
  });

  try {
    console.log(`[${agentType}] Starting advanced agent with ${maxSteps} max steps...`);

    // Create the full toolset from the definition
    const toolMap = definition.createTools(sandbox);

    // Convert ToolMap (Record<string, ToolDefinition>) to the flat array format
    // that NativeOpenAIProvider / agent-loop expects
    let reportResult: any = null;
    const toolArray = Object.entries(toolMap).map(([name, impl]) => ({
      name,
      description: impl.description,
      parameters: impl.parameters,
      execute: async (args: any) => {
        const result = await impl.execute(args);
        // Intercept submit_* tools to capture the report
        if (name.startsWith("submit_")) {
          reportResult = args;
        }
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();

    await runAgentLoop({
      model: "gpt-4o-mini",
      systemPrompt,
      maxSteps,
      tools: toolArray,
      messages: [{
        role: "user",
        content: `Analyze this repository.
Repo path: ${repoPath}
Diff summary: ${diffSummary}
Run ID: ${runId}
Use your tools to investigate the codebase. Submit your findings using the submit_* tool.`
      }]
    }, provider);

    // Extract severity and findings from the captured report
    const severity = reportResult?.gateDecision === "BLOCK" ? "critical"
      : reportResult?.score != null && reportResult.score < 60 ? "high"
      : reportResult?.score != null && reportResult.score < 80 ? "medium"
      : "info";

    const findings = reportResult?.findings || [];

    await db
      .update(agentReports)
      .set({
        status: "completed",
        severity,
        findings,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(agentReports.runId, runId),
          eq(agentReports.agentType, agentType)
        )
      );

    console.log(`[${agentType}] ✓ Complete. Score: ${reportResult?.score ?? 'N/A'}. Findings: ${findings.length}`);

  } catch (err: any) {
    console.error(`[${agentType}] ✗ Error:`, err.message);

    await db
      .update(agentReports)
      .set({
        status: "error",
        severity: "info",
        findings: [{
          severity: "info",
          category: "system",
          title: `${agentType} agent crashed`,
          description: err.message,
        }],
        completedAt: new Date(),
      })
      .where(
        and(
          eq(agentReports.runId, runId),
          eq(agentReports.agentType, agentType)
        )
      );
  }
}
