import { runArchitectureAgent } from "./analyzers/architecture.agent.js";
import { runSecurityAgent }     from "./analyzers/security.agent.js";
import { runBloatAgent }        from "./analyzers/bloat.agent.js";
import { runPerformanceAgent }  from "./analyzers/performance.agent.js";
import { runTestingAgent }      from "./analyzers/testing.agent.js";
import { runDocumentationAgent } from "./analyzers/documentation.agent.js";
import { runDependenciesAgent } from "./analyzers/dependencies.agent.js";
import { runStyleAgent }        from "./analyzers/style.agent.js";
import { runAiEraAgent }        from "./analyzers/ai_era.agent.js";
import { runBrokenCodeAgent }   from "./analyzers/broken_code.agent.js";
import { runComplianceAgent }   from "./analyzers/compliance.agent.js";
import { runDataDxAgent }       from "./analyzers/data_dx.agent.js";

import { SandboxHandle } from "../sandbox/local-exec.js";

const AGENT_MAP: Record<string, (runId: string, repoPath: string, diffSummary: string, sandbox?: SandboxHandle) => Promise<void>> = {
  architecture:  runArchitectureAgent,
  security:      runSecurityAgent,
  bloat:         runBloatAgent,
  performance:   runPerformanceAgent,
  testing:       runTestingAgent,
  documentation: runDocumentationAgent,
  dependencies:  runDependenciesAgent,
  style:         runStyleAgent,
  ai_era:        runAiEraAgent,
  broken_code:   runBrokenCodeAgent,
  compliance:    runComplianceAgent,
  data_dx:       runDataDxAgent,
};

export async function dispatchAgents(
  agentsToSpawn: string[],
  runId: string,
  repoPath: string,
  diffSummary: string,
  sandbox?: SandboxHandle
): Promise<void> {
  console.log(`[Dispatcher] Spawning ${agentsToSpawn.length} agents in parallel`);

  // All agents run in parallel — no awaiting between them
  await Promise.all(
    agentsToSpawn.map(agentType => {
      const runner = AGENT_MAP[agentType];
      if (!runner) {
        console.warn(`[Dispatcher] Unknown agent type: ${agentType}`);
        return Promise.resolve();
      }
      return runner(runId, repoPath, diffSummary, sandbox);
    })
  );

  console.log(`[Dispatcher] All agents finished`);
}
