import { generateText } from "ai";
import { db } from "../db/index.js";
import { agentReports } from "../db/schema.js";
import { getModel } from "../providers/model.provider.js";
import { extractToolArgs } from "../utils/extract-tool-args.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export interface AnalyzerConfig {
  agentType: string;
  runId: string;
  repoPath: string;
  diffSummary: string;
  systemPrompt: string;
  tools: Record<string, any>;
}

export async function runAnalyzerAgent(config: AnalyzerConfig): Promise<void> {
  const { agentType, runId, repoPath, diffSummary, systemPrompt, tools } = config;

  // Mark as pending in DB immediately
  await db.insert(agentReports).values({
    runId,
    agentType,
    status: "pending",
    createdAt: new Date(),
  });

  try {
    console.log(`[${agentType}] Starting analysis...`);

    const result = await generateText({
      model: getModel("analyzer"),
      system: systemPrompt,
      tools,
      toolChoice: "required",
      maxSteps: 5,
      messages: [{
        role: "user",
        content: `
          Analyze this repository.
          Repo path: ${repoPath}
          Diff summary: ${diffSummary}
          Run ID: ${runId}
          Submit your findings using the submit_report tool.
        `
      }]
    });

    // Extract submit_report tool call result
    const reportCall = result.toolCalls?.find(c => c.toolName === "submit_report") ||
                       result.steps?.flatMap(s => s.toolCalls ?? []).find(c => c.toolName === "submit_report");

    if (!reportCall) {
      throw new Error("Agent never called submit_report");
    }

    const reportArgs = extractToolArgs(reportCall);
    const { severity, findings } = z.object({
      severity: z.string().catch("info"),
      findings: z.array(z.any()).catch([]),
    }).parse(reportArgs);

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

    console.log(`[${agentType}] ✓ Complete. Severity: ${severity}. Findings: ${findings.length}`);

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
