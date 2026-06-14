import { orchestratorAgent } from './agents/definitions/orchestrator.agent.js';
import { getProvider } from './agents/core/registry.js';
import type { SandboxHandle, AgentRunConfig } from './agents/core/provider.js';
import 'dotenv/config';

async function main() {
  console.log('Running Orchestrator Agent offline test directly via Anthropic Provider (Bypassing Redis)...');

  const sandbox: SandboxHandle = {
    exec: async (cmd: string) => {
      console.log(`[Sandbox Exec] ${cmd}`);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    destroy: async () => {},
  };

  const tools = orchestratorAgent.createTools(sandbox);

  const config: AgentRunConfig = {
    agentId: orchestratorAgent.id,
    systemPrompt: orchestratorAgent.systemPrompt,
    taskPrompt: `Analyze commit main on repository kelvinmaina01/codeward-. Coordinate the pipeline.`,
    tools,
    maxSteps: orchestratorAgent.maxSteps,
    model: orchestratorAgent.defaultModel,
    commitSHA: 'main',
    repoFullName: 'kelvinmaina01/codeward-',
  };

  const provider = getProvider('anthropic');
  
  console.log('Provider executing Orchestrator Agent loop (This may take a minute or two)...');
  const result = await provider.execute(config);

  console.log(`\n\n=== AGENT RUN COMPLETED ===`);
  console.log(`Status: ${result.status}`);
  console.log(`Score: ${result.score}`);
  console.log(`Findings Data:\n${JSON.stringify(result.findings, null, 2)}`);
  
  process.exit(0);
}

main().catch(console.error);
