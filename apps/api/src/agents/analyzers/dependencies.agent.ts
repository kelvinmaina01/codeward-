import { tool } from "ai";
import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit dependencies analysis findings",
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
You are the Codeward Dependencies Analyzer.

CHECK FOR:
- New packages added without justification
- Known vulnerable package versions (flag outdated majors)
- Packages duplicating existing project dependencies
- Dev dependencies incorrectly in production dependencies
- Very large packages where lighter alternatives exist
- Packages with no maintenance (flag if clearly abandoned)

SEVERITY RULES:
- critical: known CVE in a newly added package
- high: major version behind with known vulnerabilities
- medium: unnecessary or redundant dependency
- low: minor package hygiene issue
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runDependenciesAgent(
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "dependencies",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
