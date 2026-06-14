import { getProvider } from './agents/core/registry.js';
import { brokenCodeAgent } from './agents/definitions/broken_code.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running Broken Code Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  // 1. Setup a dummy sandbox handle with the tools for the Broken Code Agent
  const mockSandbox = {
    id: 'sb_test_broken_code_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}\n\n// TODO: Fix this\nconsole.log(process.env.SECRET);`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = brokenCodeAgent.createTools(mockSandbox);

  // 2. Prepare the execution configuration
  const runConfig: AgentRunConfig = {
    agentId: brokenCodeAgent.id,
    systemPrompt: brokenCodeAgent.systemPrompt,
    taskPrompt: `
      EXECUTION TRIGGER
      {
        "type": "BROKEN_CODE_SCAN",
        "repoPath": "/tmp/sandbox/repo",
        "commitSha": "abc12345",
        "runId": "run_999",
        "repoId": "repo_888",
        "testCommand": "npm test",
        "language": "typescript"
      }
    `,
    tools: tools,
    maxSteps: brokenCodeAgent.maxSteps,
    model: brokenCodeAgent.defaultModel
  };

  // 3. Execute via the Provider directly
  console.log(`Provider executing ${brokenCodeAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log(`Score: ${result.score}`);
    console.log('Findings Data:');
    console.log(JSON.stringify(result.findings, null, 2));

  } catch (err) {
    console.error('Failed to execute broken code agent:', err);
  }
}

main().catch(console.error);
