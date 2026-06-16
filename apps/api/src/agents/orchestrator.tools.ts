import { AgentTool } from "../providers/openai.provider.js";
import { SandboxHandle } from "../sandbox/local-exec.js";

export const createPhase1Tools = (sandbox: SandboxHandle): AgentTool[] => [
  {
    name: "submit_phase1_result",
    description: "Submit the initial repository assessment and dispatch plan",
    parameters: {
      type: "object",
      properties: {
        agents_to_spawn: { type: "array", items: { type: "string" } },
        diff_summary: { type: "string" }
      },
      required: ["agents_to_spawn", "diff_summary"],
      additionalProperties: false
    },
    execute: async (args) => args,
  },
  {
    name: "read_file",
    description: "Read a specific file for context from the connected repository",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "Path relative to repo root" },
      },
      required: ["filePath"],
      additionalProperties: false
    },
    execute: async (args: any) => {
      const res = await sandbox.exec(`cat ${args.filePath}`);
      return { success: res.exitCode === 0, content: res.stdout, error: res.stderr };
    }
  },
  {
    name: "execute_shell_command",
    description: "Execute a bash command in the repository to explore the codebase (e.g. ls, grep, find)",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The bash command to run" }
      },
      required: ["command"],
      additionalProperties: false
    },
    execute: async (args: any) => {
      const res = await sandbox.exec(args.command);
      return { exitCode: res.exitCode, stdout: res.stdout, stderr: res.stderr };
    }
  }
];

export const phase3Tools: AgentTool[] = [
  {
    name: "submit_orchestrator_decision",
    description: "Submit the final gate decision",
    parameters: {
      type: "object",
      properties: {
        gateDecision: { type: "string", enum: ["PASS", "BLOCK"] },
        score: { type: "number" },
        reason: { type: "string" },
        runId: { type: "string" }
      },
      required: ["gateDecision", "score", "reason", "runId"],
      additionalProperties: false
    },
    execute: async (args) => args,
  }
];
