/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CODEWARD AUTONOMOUS AGENTS REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 * Central barrel file exposing all specialized review agents, the orchestrator
 * phases, the guardian PR fixer agent, and execution runtime types.
 */

// 1. Core Coordinator / Orchestrator (Phases 1, 2, 3)
export {
  orchestratorPhase1Agent,
  orchestratorPhase2Agent,
  orchestratorPhase3Agent,
} from './definitions/orchestrator.agent.js';

// 2. The 8 Specialized Autonomous Review Agents
export { securityAgent } from './definitions/security.agent.js';
export { bloatAgent } from './definitions/bloat.agent.js';
export { brokenCodeAgent } from './definitions/broken_code.agent.js';
export { architectureAgent } from './definitions/architecture.agent.js';
export { aiEraAgent } from './definitions/ai_era.agent.js';
export { complianceAgent } from './definitions/compliance.agent.js';
export { dataDxAgent } from './definitions/data_dx.agent.js';

// 3. Automated PR Fixer & Interactive Agents
export { guardianAgent } from './definitions/guardian.agent.js';
export { chatAgent } from './definitions/chat.agent.js';

// 4. Execution Core & Types
export { runAgentLoop } from './agent-loop.js';
export { getProvider } from './core/registry.js';
export type {
  AgentDefinition,
  AgentResult,
  AgentRunConfig,
  SandboxHandle,
  ToolDefinition,
  ToolMap,
} from './core/provider.js';
