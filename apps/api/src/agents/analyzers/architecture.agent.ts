import { tool } from "ai";
import { z } from "zod";
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit architecture analysis findings",
  parameters: z.object({
    severity: z.enum(["info", "low", "medium", "high", "critical"]),
    findings: z.array(z.object({
      severity: z.enum(["info", "low", "medium", "high", "critical"]),
      category: z.string(),
      title: z.string(),
      description: z.string(),
      file: z.string().optional(),
      line: z.number().optional(),
    }))
  }),
  execute: async (args) => args,
});

const SYSTEM_PROMPT = `
You are the Codeward Architecture Analyzer.
You analyze code for structural and design issues.

CHECK FOR:
- Circular dependencies
- Violation of separation of concerns
- God classes / god functions (>300 lines)
- Missing abstraction layers
- Tight coupling between modules
- Anti-patterns (singleton abuse, deep inheritance)

SEVERITY RULES:
- critical: systemic architectural breakdown
- high: significant design violation affecting maintainability
- medium: notable smell, should be addressed
- low: minor suggestion
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runArchitectureAgent(
  runId: string,
  repoPath: string,
  diffSummary: string
) {
  await runAnalyzerAgent({
    agentType: "architecture",
    runId,
    repoPath,
    diffSummary,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
