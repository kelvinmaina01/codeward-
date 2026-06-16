import { tool } from "ai";
import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit bloat analysis findings",
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
You are the Codeward Bloat Analyzer.
You analyze code for unnecessary complexity and dead weight.

CHECK FOR:
- Unused imports, variables, functions
- Dead code blocks
- Duplicate logic (copy-paste violations)
- Oversized functions (>50 lines)
- Oversized files (>500 lines)
- Unnecessary dependencies in package.json
- Console.log / debug statements left in production code
- Commented-out code blocks

SEVERITY RULES:
- critical: bloat causing measurable performance degradation
- high: significant dead code affecting bundle size
- medium: notable duplication or unused exports
- low: minor cleanup suggestion
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runBloatAgent(
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "bloat",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
