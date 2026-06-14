import { getProvider } from './agents/core/registry.js';
import { dataDxAgent } from './agents/definitions/data_dx.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running Data & DX Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  const mockSandbox = {
    id: 'sb_test_data_dx_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = dataDxAgent.createTools(mockSandbox);

  const runConfig: AgentRunConfig = {
    agentId: dataDxAgent.id,
    systemPrompt: dataDxAgent.systemPrompt,
    taskPrompt: `
      EXECUTION TRIGGER
      {
        "type": "DATA_DX_SCAN",
        "repoPath": "/tmp/sandbox/repo",
        "runId": "run_dx_999",
        "repoId": "repo_888",
        "weekStartDate": "2026-06-08",
        "priorRunId": "prior_run_uuid"
      }
    `,
    tools: tools,
    maxSteps: dataDxAgent.maxSteps,
    model: 'claude-3.5-haiku'
  };

  console.log(`Provider executing ${dataDxAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log(`Score: ${result.score}`);
    console.log('Findings Data:');
    console.log(JSON.stringify(result.findings, null, 2));

  } catch (err) {
    console.error('Failed to execute Data & DX agent:', err);
  }
}

main().catch(console.error);
