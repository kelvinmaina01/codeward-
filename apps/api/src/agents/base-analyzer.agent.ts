import { db } from "../db/index.js";
import { agentReports } from "../db/schema.js";
import { NativeOpenAIProvider, AgentTool } from "../providers/openai.provider.js";
import { runAgentLoop } from "./agent-loop.js";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { SandboxHandle } from "../sandbox/local-exec.js";

export interface AnalyzerConfig {
  agentType: string;
  runId: string;
  repoPath: string;
  diffSummary: string;
  systemPrompt: string;
  sandbox?: SandboxHandle;
}

export async function runAnalyzerAgent(config: AnalyzerConfig): Promise<void> {
  const { agentType, runId, repoPath, diffSummary, systemPrompt, sandbox } = config;

  // Mark as pending in DB immediately
  await db.insert(agentReports).values({
    runId,
    agentType,
    status: "pending",
    createdAt: new Date(),
  });

  try {
    console.log(`[${agentType}] Starting analysis...`);

    // Define the native tool, ignoring the Vercel AI SDK tools passed in
    let reportArgs: any = null;
    const nativeTools: AgentTool[] = [{
      name: "submit_report",
      description: "Submit security analysis findings",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["info", "low", "medium", "high", "critical"] },
                category: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                file: { type: "string" },
                line: { type: "number" }
              },
              required: ["severity", "category", "title", "description"],
              additionalProperties: false
            }
          }
        },
        required: ["severity", "findings"],
        additionalProperties: false
      },
      execute: async (args) => {
        reportArgs = args;
        return { success: true };
      }
    }];

    if (sandbox) {
      nativeTools.push(
        {
          name: "read_file",
          description: "Read a specific file for context from the connected repository",
          parameters: {
            type: "object",
            properties: {
              filePath: { type: "string", description: "Path relative to repo root" },
            },
            required: ["filePath"],
            additionalProperties: false
          },
          execute: async (args: any) => {
            const res = await sandbox.exec(`cat ${args.filePath}`);
            return { success: res.exitCode === 0, content: res.stdout, error: res.stderr };
          }
        },
        {
          name: "execute_shell_command",
          description: "Execute a bash command in the repository to explore the codebase (e.g. ls, grep, find)",
          parameters: {
            type: "object",
            properties: {
              command: { type: "string", description: "The bash command to run" }
            },
            required: ["command"],
            additionalProperties: false
          },
          execute: async (args: any) => {
            const res = await sandbox.exec(args.command);
            return { exitCode: res.exitCode, stdout: res.stdout, stderr: res.stderr };
          }
        }
      );
    }

    const provider = new NativeOpenAIProvider();
    
    await runAgentLoop({
      model: "gpt-4o-mini", // Analyzers use mini
      systemPrompt,
      tools: nativeTools,
      messages: [{
        role: "user",
        content: `
          Analyze this repository.
          Repo path: ${repoPath}
          Diff summary: ${diffSummary}
          Run ID: ${runId}
          Use your file reading and shell execution tools to investigate the codebase if needed.
          Submit your findings using the submit_report tool.
        `
      }]
    }, provider);

    if (!reportArgs) {
      throw new Error("Agent never called submit_report");
    }

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
