import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = {
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
  
};

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
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "architecture",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
