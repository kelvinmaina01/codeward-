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
  createPhase1Tools,
  phase3Tools,
} from "./agents/orchestrator.tools.js";

import { Phase1Schema, Phase3Schema } from "./schemas/orchestrator.schemas.js";
import { NativeOpenAIProvider } from "./providers/openai.provider.js";
import { runAgentLoop } from "./agents/agent-loop.js";
import { LocalExecSandbox } from "./sandbox/local-exec.js";

const REPO_URL  = "https://github.com/kelvinmaina01/lawlify-ai.git";
const REPO_PATH = "./tmp-lawlify";

async function main() {
  const runId = crypto.randomUUID();
  console.log(`\n=== CODEWARD TEST RUN: ${runId} ===\n`);

  // ── PHASE 1: INGESTION ──────────────────────────────────────────
  console.log("=== PHASE 1: INGESTION ===");
  
  const provider = new NativeOpenAIProvider();
  
  // Create sandbox
  const sandbox = new LocalExecSandbox();
  await sandbox.init(REPO_URL, "baseline");
  
  const phase1Tools = createPhase1Tools(sandbox);
  
  let phase1Result: any = null;
  const interceptPhase1Tools = phase1Tools.map(t => {
    if (t.name === "submit_phase1_result") {
      return {
        ...t,
        execute: async (args: any) => {
          phase1Result = args;
          return { success: true };
        }
      };
    }
    return t;
  });

  try {
    await runAgentLoop({
      model: "gpt-4o-mini",
      systemPrompt: orchestratorPhase1Prompt,
      tools: interceptPhase1Tools,
      messages: [{ role: "user", content: `Repo: ${REPO_PATH} | RunID: ${runId}` }]
    }, provider);
  } catch (err: any) {
    console.error("Phase 1 Orchestrator error:", err);
    process.exit(1);
  }

  if (!phase1Result) {
    throw new Error("Phase 1 Orchestrator failed to call submit_phase1_result");
  }

  phase1Result = Phase1Schema.parse(phase1Result);
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
    phase1Result.diff_summary,
    sandbox
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
  
  let finalDecisionRaw: any = null;
  const interceptPhase3Tools = phase3Tools.map(t => {
    if (t.name === "submit_orchestrator_decision") {
      return {
        ...t,
        execute: async (args: any) => {
          finalDecisionRaw = args;
          return { success: true };
        }
      };
    }
    return t;
  });

  await runAgentLoop({
    model: "gpt-4o-mini",
    systemPrompt: orchestratorPhase3Prompt(allReports),
    tools: interceptPhase3Tools,
    messages: [{ role: "user", content: `All reports received. Make your final decision. RunID: ${runId}` }]
  }, provider);

  if (!finalDecisionRaw) {
    throw new Error("Phase 3 Orchestrator failed to call submit_orchestrator_decision");
  }

  const finalDecision = Phase3Schema.parse(finalDecisionRaw);

  console.log("\n=== FINAL DECISION ===");
  console.log(JSON.stringify(finalDecision, null, 2));
  console.log(`\nStatus: ${finalDecision.gateDecision}`);
  console.log(`Score:  ${finalDecision.score}/100`);

  // Cleanup
  await sandbox.destroy();
}

main().catch(console.error);
