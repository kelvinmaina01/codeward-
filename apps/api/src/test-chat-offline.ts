import { getProvider } from './agents/core/registry.js';
import { chatAgent } from './agents/definitions/chat.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running Chat Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  const mockSandbox = {
    id: 'sb_test_chat_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = chatAgent.createTools(mockSandbox);

  const runConfig: AgentRunConfig = {
    agentId: chatAgent.id,
    systemPrompt: chatAgent.systemPrompt,
    taskPrompt: `
      USER CHAT MESSAGE
      Repo ID: repo_888
      Message: "What is the biggest risk in our repository right now?"
      
      CRITICAL INSTRUCTION: Respond directly to the user based on the results of query_run_history. Do not output JSON. This is a chat interface.
    `,
    tools: tools,
    maxSteps: chatAgent.maxSteps,
    model: 'claude-3.5-haiku'
  };

  console.log(`Provider executing ${chatAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log('Chat Response:');
    
    // For the Chat Agent, we want to look at the unstructured text output in findings if available
    const chatOutput = result.findings?.find((f: any) => f.category === 'raw-output');
    if (chatOutput) {
      console.log(chatOutput.description);
    } else {
      console.log(JSON.stringify(result.findings, null, 2));
    }

  } catch (err) {
    console.error('Failed to execute Chat agent:', err);
  }
}

main().catch(console.error);
