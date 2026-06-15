import { db } from "../db/index.js";
import { agentReports, Finding } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";

export interface AgentReport {
  agentType: string;
  status: "passed" | "failed" | "error";
  severity: "info" | "low" | "medium" | "high" | "critical";
  findings: Finding[];
  completedAt: string;
}

const POLL_INTERVAL_MS = 3000;   // check every 3s
const MAX_WAIT_MS = 300_000;     // 5 minute timeout

export async function waitForAgentReports(
  spawnedAgents: string[],  // array of agentType strings from Phase 2
  runId: string
): Promise<AgentReport[]> {
  console.log(`[WaitForReports] Waiting for ${spawnedAgents.length} agents:`, spawnedAgents);

  const start = Date.now();
  const pending = new Set(spawnedAgents);
  const collected: AgentReport[] = [];

  while (pending.size > 0) {
    // Timeout guard
    if (Date.now() - start > MAX_WAIT_MS) {
      console.error(`[WaitForReports] TIMEOUT. Still pending:`, [...pending]);
      
      // Fill missing agents with error reports so Phase 3 can still run
      for (const agentType of pending) {
        collected.push(makeErrorReport(agentType, "Agent timed out"));
      }
      break;
    }

    // Poll DB for completed reports
    const rows = await db
      .select()
      .from(agentReports)
      .where(
        inArray(agentReports.agentType, [...pending])
      )
      // We must map where properly, wait, using array directly might fail if pending is empty, but we check pending.size > 0
      // wait, inArray with array of size > 0
    // Actually, inArray doesn't take Set, it takes array
    // Wait, Drizzle `where` chain needs multiple condition handling, I'll use `and(..., ...)` if needed but `.where(eq(runId)).where(inArray)` is fine or use `and`. Let's use `and`.

    const allRows = await db
      .select()
      .from(agentReports)
      .where(
        eq(agentReports.runId, runId)
      );

    for (const row of allRows) {
      if (pending.has(row.agentType) && (row.status === "completed" || row.status === "error")) {
        console.log(`[WaitForReports] ✓ ${row.agentType} finished (${row.status})`);
        collected.push({
          agentType: row.agentType,
          status: row.status === "completed" ? "passed" : "error",
          severity: (row.severity as any) ?? "info",
          findings: row.findings ?? [],
          completedAt: row.completedAt?.toISOString() || new Date().toISOString(),
        });
        pending.delete(row.agentType);
      }
    }

    if (pending.size > 0) {
      console.log(`[WaitForReports] Still waiting on:`, [...pending]);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log(`[WaitForReports] All agents resolved. Total: ${collected.length}`);
  return collected;
}

// --- Helpers ---

function makeErrorReport(agentType: string, reason: string): AgentReport {
  return {
    agentType,
    status: "error",
    severity: "info",
    findings: [{
      severity: "info",
      category: "system",
      title: `${agentType} did not complete`,
      description: reason,
    }],
    completedAt: new Date().toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
