import { tool } from "ai";
import { z } from "zod";
import { SandboxHandle } from '../../sandbox/local-exec.js';
import { runAnalyzerAgent } from "../base-analyzer.agent.js";

const submitReport = tool({
  description: "Submit performance analysis findings",
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
You are the Codeward Performance Analyzer.
You analyze code for performance bottlenecks.

CHECK FOR:
- N+1 query patterns
- Missing database indexes (inferred from query patterns)
- Synchronous blocking operations in async contexts
- Unoptimized loops (nested loops on large datasets)
- Missing caching on expensive operations
- Large payload responses (returning full objects vs selecting fields)
- Memory leaks (event listeners not cleaned up, unclosed streams)
- Unthrottled API calls

SEVERITY RULES:
- critical: causes system slowdown or outage under load
- high: measurable latency impact
- medium: inefficiency that compounding at scale
- low: minor optimization opportunity
- info: observation only

You MUST call submit_report. No conversational text.
`;

export async function runPerformanceAgent(
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
) {
  await runAnalyzerAgent({
    agentType: "performance",
    runId,
    repoPath,
    diffSummary,
    sandbox,
    systemPrompt: SYSTEM_PROMPT,
    tools: { submit_report: submitReport },
  });
}
