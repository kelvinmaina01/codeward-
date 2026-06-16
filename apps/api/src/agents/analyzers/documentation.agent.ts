import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = {
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
  
};

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
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "documentation",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
