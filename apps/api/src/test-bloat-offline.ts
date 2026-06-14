import { bloatAgent } from './agents/definitions/bloat.agent.js';
import { getProvider } from './agents/core/registry.js';
import type { SandboxHandle, AgentRunConfig } from './agents/core/provider.js';
import 'dotenv/config';

async function main() {
  console.log('Running Bloat Agent offline test directly via Anthropic Provider (Bypassing Redis)...');

  const sandbox: SandboxHandle = {
    exec: async (cmd: string) => {
      console.log(`[Sandbox Exec] ${cmd}`);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    destroy: async () => {},
  };

  const tools = bloatAgent.createTools(sandbox);

  const config: AgentRunConfig = {
    agentId: bloatAgent.id,
    systemPrompt: bloatAgent.systemPrompt,
    taskPrompt: `Analyze commit main on repository kelvinmaina01/codeward-. Follow your instructions precisely and report all findings as a JSON array.`,
    tools,
    maxSteps: bloatAgent.maxSteps,
    model: bloatAgent.defaultModel,
    commitSHA: 'main',
    repoFullName: 'kelvinmaina01/codeward-',
  };

  const provider = getProvider('anthropic');
  
  console.log('Provider executing Bloat Agent loop (This may take a minute or two)...');
  const result = await provider.execute(config);

  console.log(`\n\n=== AGENT RUN COMPLETED ===`);
  console.log(`Status: ${result.status}`);
  console.log(`Score: ${result.score}`);
  console.log(`Findings Count: ${result.findings.length}`);
  console.log(`Findings Data:\n${JSON.stringify(result.findings, null, 2)}`);
  
  process.exit(0);
}

main().catch(console.error);
