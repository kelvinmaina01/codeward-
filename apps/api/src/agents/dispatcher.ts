import { runSecurityAgent }     from "./analyzers/security.agent.js";
import { runPerformanceAgent }  from "./analyzers/performance.agent.js";
import { runTestingAgent }      from "./analyzers/testing.agent.js";
import { runDocumentationAgent } from "./analyzers/documentation.agent.js";
import { runDependenciesAgent } from "./analyzers/dependencies.agent.js";
import { runStyleAgent }        from "./analyzers/style.agent.js";
import { runAiEraAgent }        from "./analyzers/ai_era.agent.js";
import { runComplianceAgent }   from "./analyzers/compliance.agent.js";
import { runDataDxAgent }       from "./analyzers/data_dx.agent.js";

// Advanced definition-based agents (Phase 4 — full tool-calling loops)
import { runDefinitionAgent }   from "./definition-runner.js";
import { bloatAgent }           from "./definitions/bloat.agent.js";
import { brokenCodeAgent }      from "./definitions/broken_code.agent.js";
import { architectureAgent }    from "./definitions/architecture.agent.js";

import { SandboxHandle } from "../sandbox/local-exec.js";

// Agents that still use the simpler base-analyzer pattern
const SIMPLE_AGENT_MAP: Record<string, (runId: string, repoPath: string, diffSummary: string, sandbox?: SandboxHandle) => Promise<void>> = {
  security:      runSecurityAgent,
  performance:   runPerformanceAgent,
  testing:       runTestingAgent,
  documentation: runDocumentationAgent,
  dependencies:  runDependenciesAgent,
  style:         runStyleAgent,
  ai_era:        runAiEraAgent,
  compliance:    runComplianceAgent,
  data_dx:       runDataDxAgent,
};

// Agents that use the advanced definition-based runner with full tool-calling
const DEFINITION_AGENT_MAP: Record<string, typeof bloatAgent> = {
  bloat:         bloatAgent,
  broken_code:   brokenCodeAgent,
  architecture:  architectureAgent,
};

export async function dispatchAgents(
  agentsToSpawn: string[],
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
): Promise<void> {
  console.log(`[Dispatcher] Spawning ${agentsToSpawn.length} agents in parallel`);

  await Promise.all(
    agentsToSpawn.map(agentType => {
      // Check if this is an advanced definition-based agent
      const definition = DEFINITION_AGENT_MAP[agentType];
      if (definition && sandbox) {
        return runDefinitionAgent(definition, runId, repoPath, diffSummary, sandbox);
      }

      // Fallback to the simple analyzer pattern
      const runner = SIMPLE_AGENT_MAP[agentType];
      if (!runner) {
        console.warn(`[Dispatcher] Unknown agent type: ${agentType}`);
        return Promise.resolve();
      }
      return runner(runId, repoPath, diffSummary, sandbox);
    })
  );

  console.log(`[Dispatcher] All agents finished`);
}

