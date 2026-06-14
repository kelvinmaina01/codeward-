import { getProvider } from './agents/core/registry.js';
import { complianceAgent } from './agents/definitions/compliance.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running Compliance Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  const mockSandbox = {
    id: 'sb_test_compliance_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = complianceAgent.createTools(mockSandbox);

  const runConfig: AgentRunConfig = {
    agentId: complianceAgent.id,
    systemPrompt: complianceAgent.systemPrompt,
    taskPrompt: `
      EXECUTION TRIGGER
      {
        "type": "COMPLIANCE_SCAN",
        "repoPath": "/tmp/sandbox/repo",
        "runId": "run_comp_999",
        "repoId": "repo_888",
        "triggerType": "scheduled",
        "changedFiles": ["src/auth/session.ts"]
      }
    `,
    tools: tools,
    maxSteps: complianceAgent.maxSteps,
    model: 'claude-3.5-haiku' // Using Haiku for fast offline testing
  };

  console.log(`Provider executing ${complianceAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log(`Score: ${result.score}`);
    console.log('Findings Data:');
    console.log(JSON.stringify(result.findings, null, 2));

  } catch (err) {
    console.error('Failed to execute Compliance agent:', err);
  }
}

main().catch(console.error);
