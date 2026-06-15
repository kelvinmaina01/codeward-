import { tool } from "ai";
import { z } from "zod";
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit documentation analysis findings",
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
You are the Codeward Documentation Analyzer.

CHECK FOR:
- Public functions/classes with no JSDoc/TSDoc
- README missing setup or usage instructions
- API routes with no description comments
- Complex algorithms with no inline explanation
- Env variables used but not documented in .env.example

SEVERITY RULES:
- critical: public API with zero documentation
- high: core module undocumented
- medium: important function missing docs
- low: minor doc gap
- info: suggestion only

You MUST call submit_report. No conversational text.
`;

export async function runDocumentationAgent(
  runId: string,
  repoPath: string,
  diffSummary: string
) {
  await runAnalyzerAgent({
    agentType: "documentation",
    runId,
    repoPath,
    diffSummary,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
