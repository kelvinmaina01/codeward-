import { getProvider } from './agents/core/registry.js';
import { aiEraAgent } from './agents/definitions/ai_era.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running AI-Era Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  // 1. Setup a dummy sandbox handle with the tools
  const mockSandbox = {
    id: 'sb_test_ai_era_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = aiEraAgent.createTools(mockSandbox);

  // 2. Prepare the execution configuration
  const runConfig: AgentRunConfig = {
    agentId: aiEraAgent.id,
    systemPrompt: aiEraAgent.systemPrompt,
    taskPrompt: `
      EXECUTION TRIGGER
      {
        "type": "AI_ERA_SCAN",
        "repoPath": "/tmp/sandbox/repo",
        "commitSha": "ai12345",
        "runId": "run_ai_999",
        "repoId": "repo_888",
        "language": "typescript",
        "baseUrl": "http://localhost:3000"
      }
    `,
    tools: tools,
    maxSteps: aiEraAgent.maxSteps,
    model: 'claude-3.5-haiku' // Override to Haiku for faster, cheaper offline testing
  };

  // 3. Execute via the Provider directly
  console.log(`Provider executing ${aiEraAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log(`Score: ${result.score}`);
    console.log('Findings Data:');
    console.log(JSON.stringify(result.findings, null, 2));

  } catch (err) {
    console.error('Failed to execute AI-Era agent:', err);
  }
}

main().catch(console.error);
