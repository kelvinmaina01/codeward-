import "dotenv/config";
import crypto from "crypto";
import { generateText } from "ai";
import { getModel } from "./providers/model.provider.js";
import { dispatchAgents } from "./agents/dispatcher.js";
import { waitForAgentReports } from "./utils/wait-for-agent-reports.js";
import { extractToolResult } from "./utils/extract-tool-result.js";
import { z } from "zod";
import {
  orchestratorPhase1Prompt,
  orchestratorPhase3Prompt,
} from "./agents/orchestrator.agent.js";
import {
  phase1Tools,
  phase3Tools,
} from "./agents/orchestrator.tools.js";

const Phase1Schema = z.preprocess((val: any) => ({
  ...val,
  agents_to_spawn: val?.agents_to_spawn || val?.agents || val?.agents_to_dispatch || [],
}), z.object({
  agents_to_spawn: z.array(z.string()),
  diff_summary: z.string(),
  risk_level: z.enum(["low", "medium", "high"]).optional(),
}));

const Phase3Schema = z.preprocess((val: any) => ({
  ...val,
  gateDecision: val?.gateDecision || val?.decision || "BLOCK",
  score: val?.score !== undefined ? val.score : (val?.overallWeightedScore || 0),
  reason: val?.reason || val?.summary || "",
}), z.object({
  gateDecision: z.enum(["PASS", "BLOCK"]),
  score: z.number().min(0).max(100),
  reason: z.string(),
  runId: z.string().optional(),
}));

const REPO_URL  = "https://github.com/kelvinmaina01/lawlify-ai.git";
const REPO_PATH = "./tmp-lawlify";

async function main() {
  const runId = crypto.randomUUID();
  console.log(`\n=== CODEWARD TEST RUN: ${runId} ===\n`);

  // ── PHASE 1: INGESTION ──────────────────────────────────────────
  console.log("=== PHASE 1: INGESTION ===");
  const p1 = await generateText({
    model: getModel("orchestrator"),
    system: orchestratorPhase1Prompt,
    tools: phase1Tools,
    toolChoice: "required",
    maxSteps: 5,
    messages: [{ role: "user", content: `Repo: ${REPO_PATH} | RunID: ${runId}` }]
  });

  console.log("Phase 1 toolCalls:", JSON.stringify(p1.toolCalls, null, 2));
  const phase1Result = Phase1Schema.parse(
    extractToolResult(p1, "submit_phase1_result")
  );
  console.log("Phase 1 result:", JSON.stringify(phase1Result, null, 2));

  // ── PHASE 2: DISPATCH ───────────────────────────────────────────
  console.log("\n=== PHASE 2: DISPATCH ===");

  // Force all 12 agents for proof
  const allAgents = [
    "architecture", "security", "bloat", "performance",
    "testing", "documentation", "dependencies", "style",
    "ai_era", "broken_code", "compliance", "data_dx"
  ];

  // Dispatch all agents in parallel (no LLM needed — direct dispatch)
  await dispatchAgents(
    allAgents,
    runId,
    REPO_PATH,
    phase1Result.diff_summary
  );

  // ── WAIT FOR REPORTS ────────────────────────────────────────────
  console.log("\n=== WAITING FOR AGENT REPORTS ===");
  const allReports = await waitForAgentReports(
    allAgents,
    runId
  );
  console.log(`Collected ${allReports.length} reports`);

  // ── PHASE 3: DECISION ───────────────────────────────────────────
  console.log("\n=== PHASE 3: DECISION ===");
  const p3 = await generateText({
    model: getModel("orchestrator"),
    system: orchestratorPhase3Prompt(allReports),
    tools: phase3Tools,
    toolChoice: "required",
    maxSteps: 5,
    messages: [{ role: "user", content: `All reports received. Make your final decision. RunID: ${runId}` }]
  });

  const finalDecision = Phase3Schema.parse(
    extractToolResult(p3, "submit_orchestrator_decision")
  );

  console.log("\n=== FINAL DECISION ===");
  console.log(JSON.stringify(finalDecision, null, 2));
  console.log(`\nStatus: ${finalDecision.gateDecision}`);
  console.log(`Score:  ${finalDecision.score}/100`);
}

main().catch(console.error);
