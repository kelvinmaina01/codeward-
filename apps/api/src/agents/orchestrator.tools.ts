import { tool } from "ai";
import { z } from "zod";

export const phase1Tools = {
  submit_phase1_result: tool({
    description: "Submit the initial repository assessment and dispatch plan",
    parameters: z.object({
      agents_to_spawn: z.array(z.string()).describe("List of analyzer agents to run, e.g. ['security', 'bloat']"),
      diff_summary: z.string().describe("A summary of the codebase diff/commit"),
    }),
    execute: async (args) => args,
  }),
};

export const phase3Tools = {
  submit_orchestrator_decision: tool({
    description: "Submit the final gate decision",
    parameters: z.object({
      gateDecision: z.enum(["PASS", "BLOCK"]),
      score: z.number().min(0).max(100),
      reason: z.string(),
      runId: z.string(),
    }),
    execute: async (args) => args,
  }),
};
