import { tool } from "ai";
import { z } from "zod";
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit security analysis findings",
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
You are the Codeward Security Analyzer.
You analyze code for security vulnerabilities.

CHECK FOR:
- SQL injection vectors
- XSS vulnerabilities
- Hardcoded secrets / API keys / passwords
- Insecure direct object references (IDOR)
- Missing authentication/authorization checks
- Unsafe deserialization
- Dependency vulnerabilities (flag suspicious imports)
- Prompt injection vectors (for AI pipelines)
- Exposed environment variables

SEVERITY RULES:
- critical: exploitable vulnerability, block immediately
- high: serious risk, likely exploitable
- medium: potential risk under certain conditions
- low: best practice violation
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runSecurityAgent(
  runId: string,
  repoPath: string,
  diffSummary: string
) {
  await runAnalyzerAgent({
    agentType: "security",
    runId,
    repoPath,
    diffSummary,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
