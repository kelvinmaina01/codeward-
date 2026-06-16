import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = {
  description: "Submit testing analysis findings",
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
You are the Codeward Testing Analyzer.
You analyze code for test coverage gaps and test quality.

CHECK FOR:
- New functions/routes with zero test coverage
- Tests with no assertions (empty test bodies)
- Hardcoded test data that should be mocked
- Missing edge case coverage (null, empty, boundary values)
- No integration tests for critical paths
- Tests that test implementation not behavior

SEVERITY RULES:
- critical: core business logic with zero tests
- high: important path untested
- medium: partial coverage gap
- low: test quality suggestion
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runTestingAgent(
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "testing",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
