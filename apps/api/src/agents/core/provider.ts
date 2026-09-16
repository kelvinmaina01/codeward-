/**
 * ============================================================================
 * Codeward Agent Provider — The Model-Agnostic Abstraction Layer
 * ============================================================================
 * 
 * THE GOLDEN RULE:
 * No agent file may ever import @anthropic-ai/sdk, openai, @ai-sdk/anthropic,
 * or any provider SDK directly. All agent logic imports from THIS file only.
 * 
 * This ensures Codeward is never locked to a single LLM vendor.
 * Adding a new provider (OpenAI, Ollama, custom) means adding ONE file
 * in providers/ — zero changes to any agent or orchestrator code.
 * ============================================================================
 */

import type { ZodType } from 'zod';

/**
 * A tool definition that the Vercel AI SDK can consume.
 * We define tools as plain objects (not via the tool() helper) to avoid
 * TypeScript overload resolution issues across SDK versions.
 * The AI SDK accepts this shape natively.
 */
export interface ToolDefinition {
  description: string;
  parameters: ZodType;
  execute: (...args: any[]) => Promise<any>;
}

/** A map of tool names to their definitions */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolMap = Record<string, ToolDefinition>;

// ---------------------------------------------------------------------------
// Sandbox Execution Interface
// ---------------------------------------------------------------------------

/** Result from executing a command inside the Fly.io sandbox */
export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** The sandbox interface injected into every agent run */
export interface SandboxHandle {
  exec: (command: string) => Promise<ExecResult>;
  destroy: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Agent Finding — A single issue discovered by an agent
// ---------------------------------------------------------------------------

export interface AgentFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;          // e.g. 'leaked-secret', 'n+1-query', 'dead-code'
  file?: string;             // Relative file path, if applicable
  line?: number;             // Line number, if applicable
  title: string;             // Short human-readable title
  description: string;       // Detailed explanation
  suggestedFix?: string;     // Code or instruction to remediate
}

// ---------------------------------------------------------------------------
// Agent Result — The structured output every agent must produce
// ---------------------------------------------------------------------------

export interface AgentResult {
  agentId: string;           // 'security' | 'bloat' | 'architecture' | etc.
  status: 'passed' | 'failed' | 'error' | 'incomplete';
  findings: AgentFinding[];
  score: number | null;      // 0–100 (100 = perfect, 0 = critical failures, null if incomplete)
  truncated?: boolean;
  duration: number;          // Wall-clock ms
  modelUsed: string;         // e.g. 'claude-3-5-haiku-latest' — for audit trail
  tokenUsage: {
    input: number;
    output: number;
    total?: number;
    /** Portion of `input` billed at the provider's cached-input rate. */
    cachedInput?: number;
    /**
     * Steps that reported usage vs. steps that did not. When unreportedSteps > 0 the recorded
     * counts are a floor, not the real cost — the served provider omitted its usage block.
     */
    reportedSteps?: number;
    unreportedSteps?: number;
  };
  /** Which cascade candidate actually served the run, for per-provider cost attribution. */
  servedBy?: { provider: string; model: string; isFallback: boolean };
  // The rest of the agent's submit_*_report call beyond findings/score — the LLM already
  // generates this every run, it just wasn't being persisted anywhere until now.
  gateDecision?: string;     // 'PASS' | 'WARN' | 'BLOCK' | 'HIGH' etc. — varies per agent's schema
  toolsExecuted?: Array<{ toolName: string; calledAt: string; durationMs: number; resultSummary: string }>;
  summary?: Record<string, unknown>;
  /**
   * The rest of the agent's submit_*_report payload, minus the findings array (which is carried
   * separately and would double the row size). Every agent's schema already asks for structured
   * top-level facts the model produces on every run — broken_code's testSuiteResult and
   * migrationRollbackPassed, architecture's performanceMetrics, ai_era's promptInjectionVulnerable,
   * bloat's fallowHealthScore, data_dx's teamMetrics — and all of it was being discarded at this
   * boundary, which is why the orchestrator's Hard Rules could never see a red test suite.
   */
  report?: Record<string, unknown>;
  /**
   * What the backend finding policy made of this agent's findings. Recorded per-agent so a
   * prompt or threshold change can be evaluated against real runs: a sudden jump in
   * suppressedCount is the signal that a change went too far and started hiding real work.
   */
  policy?: {
    surfacedCount: number;
    suppressedCount: number;
    suppressionBreakdown: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Agent Run Config — Everything an agent needs to execute
// ---------------------------------------------------------------------------

export interface AgentRunConfig {
  /** Which agent is running: 'security', 'bloat', 'broken_code', etc. */
  agentId: string;

  /** The system prompt defining the agent's role, constraints, and output format */
  systemPrompt: string;

  /** The initial user message / task description sent to the model */
  taskPrompt: string;

  /** Zod-schema'd tools the model can call (Vercel AI SDK CoreTool format) */
  tools: ToolMap;

  /** Max tool-call rounds before the agent is force-stopped */
  maxSteps: number;

  /** Which model to use (provider-specific string, e.g. 'claude-3-5-haiku-latest') */
  model?: string;

  /** The commit being analyzed */
  commitSHA: string;

  /** The repository being analyzed (e.g. 'acme-corp/my-api') */
  repoFullName: string;

  /** Optional database runId for log tracking */
  runId?: number;

  /** Restored conversation history from a failed previous run */
  checkpointState?: any[];
}

// ---------------------------------------------------------------------------
// Agent Provider — The interface every LLM provider must implement
// ---------------------------------------------------------------------------

/**
 * The contract between Codeward's agent system and any LLM provider.
 * 
 * To add a new provider:
 * 1. Create a new file in agents/core/providers/ (e.g. openai.provider.ts)
 * 2. Implement this interface
 * 3. Register it in agents/core/registry.ts
 * 
 * That's it. Zero changes to any agent code.
 */
export interface AgentProvider {
  /** Human-readable provider name for audit logs */
  readonly name: string;

  /**
   * Execute an agent run.
   * 
   * The provider is responsible for:
   * - Calling the LLM with the system prompt, task prompt, and tools
   * - Managing the multi-step tool-use loop
   * - Tracking token usage
   * - Returning a structured AgentResult
   * 
   * The provider is NOT responsible for:
   * - Deciding which tools to define (that's the agent definition's job)
   * - Writing results to the database (that's the queue worker's job)
   * - Spinning up sandboxes (that's the orchestrator's job)
   */
  execute(config: AgentRunConfig): Promise<AgentResult>;
}

// ---------------------------------------------------------------------------
// Agent Definition — The blueprint for a specific agent
// ---------------------------------------------------------------------------

/**
 * Every agent (Security, Bloat, Architecture, etc.) exports one of these.
 * It declares what the agent needs; the orchestrator provides it.
 */
export interface AgentDefinition {
  /** Unique agent identifier */
  id: string;

  /** Human-readable name for the dashboard */
  displayName: string;

  /** The system prompt that defines this agent's role */
  systemPrompt: string;

  /** Default model preference (can be overridden per-repo in config) */
  defaultModel: string;

  /** Max tool-call rounds */
  maxSteps: number;

  /** 
   * Factory function that creates the tool set for this agent.
   * Receives a sandbox handle so tools can execute commands.
   */
  createTools: (sandbox: SandboxHandle) => ToolMap;
}
