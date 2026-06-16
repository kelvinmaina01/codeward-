import { z } from "zod";

export const Phase1Schema = z.object({
  agents_to_spawn: z.array(z.string()),
  diff_summary: z.string(),
});

export const Phase3Schema = z.object({
  gateDecision: z.enum(["PASS", "BLOCK"]),
  score: z.number().min(0).max(100),
  reason: z.string(),
  runId: z.string(),
});
