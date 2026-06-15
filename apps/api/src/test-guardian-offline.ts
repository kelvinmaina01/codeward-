import { getProvider } from './agents/core/registry.js';
import { guardianAgent } from './agents/definitions/guardian.agent.js';
import type { AgentRunConfig } from './agents/core/provider.js';

async function main() {
  console.log('Running Guardian Agent offline test directly via Anthropic Provider (Bypassing Redis)...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }

  const mockSandbox = {
    id: 'sb_test_guardian_001',
    executeCommand: async (cmd: string) => ({ exitCode: 0, stdout: 'Mock output', stderr: '' }),
    readFile: async (path: string) => `Mock file content for ${path}`,
    writeFile: async (path: string, content: string) => {},
    destroy: async () => {},
  };

  const tools = guardianAgent.createTools(mockSandbox);

  const runConfig: AgentRunConfig = {
    agentId: guardianAgent.id,
    systemPrompt: guardianAgent.systemPrompt,
    taskPrompt: `
      EXECUTION TRIGGER
      {
        "type": "GUARDIAN_REPORT",
        "repoId": "repo_999",
        "runId": "run_guardian_001",
        "pullRequestNumber": 47,
        "commitSha": "abc1234",
        "branch": "feat/payment-webhook",
        "authorLogin": "dev-max",
        "agentResults": {
          "security": { "score": 72, "gateDecision": "BLOCK", "criticalCount": 1, "findings": [{ "severity": "CRITICAL", "file": "src/webhooks/stripe.ts", "line": 14, "title": "Stripe secret found", "rawEvidence": "sk-live-test" }] },
          "bloat": { "score": 88, "findings": [] },
          "broken_code": { "score": 100, "testsPassed": 142, "coverage": 84 },
          "architecture": { "score": 91, "findings": [] }
        },
        "orchestratorDecision": "BLOCK",
        "orchestratorRationale": "Critical security finding: verified Stripe key"
      }
      
      Instructions: Read the trigger. Call get_pull_request to read PR details. Then post an inline comment for the Stripe key, create a PR review blocking the PR, and output GuardianAgentResult JSON.
    `,
    tools: tools,
    maxSteps: guardianAgent.maxSteps,
    model: 'claude-3.5-haiku'
  };

  console.log(`Provider executing ${guardianAgent.displayName} loop (This may take a minute or two)...`);
  
  try {
    const provider = getProvider('anthropic');
    const result = await provider.execute(runConfig);
    
    console.log('\n\n=== AGENT RUN COMPLETED ===');
    console.log(`Status: ${result.status}`);
    console.log('Guardian Output JSON:');
    
    const unstructuredOutput = result.findings?.find((f: any) => f.category === 'raw-output');
    if (unstructuredOutput) {
      // The provider wrapper might have fallen back to unstructured if JSON parsing failed.
      console.log(unstructuredOutput.description);
    } else {
      console.log(JSON.stringify(result.findings, null, 2));
    }

  } catch (err) {
    console.error('Failed to execute Guardian agent:', err);
  }
}

main().catch(console.error);
