import { tool } from "ai";
import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit style analysis findings",
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
You are the Codeward Style Analyzer.

CHECK FOR:
- Inconsistent naming conventions (camelCase vs snake_case mixing)
- Magic numbers/strings (hardcoded values with no named constant)
- Deeply nested code (>4 levels)
- Inconsistent error handling patterns across the codebase
- Mixed async patterns (callbacks mixed with async/await)
- Inconsistent file/folder naming

SEVERITY RULES:
- critical: style inconsistency causing runtime bugs
- high: widespread inconsistency across the codebase
- medium: notable pattern violation
- low: minor style suggestion
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runStyleAgent(
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "style",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
