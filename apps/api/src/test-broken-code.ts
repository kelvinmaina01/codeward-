import "dotenv/config";
import crypto from "crypto";
import { NativeOpenAIProvider } from "./providers/openai.provider.js";
import { runAgentLoop } from "./agents/agent-loop.js";
import { LocalExecSandbox } from "./sandbox/local-exec.js";
import { brokenCodeAgent } from "./agents/definitions/broken_code.agent.js";
import { AnthropicProvider } from "./agents/core/providers/anthropic.provider.js";

async function main() {
  const runId = crypto.randomUUID();
  console.log(`\n=== CODEWARD TEST BROKEN CODE AGENT: ${runId} ===\n`);

  const provider = new NativeOpenAIProvider();

  const sandbox = new LocalExecSandbox();
  // Using an empty path for sandbox.init so it just creates the dir without cloning a massive repo
  await sandbox.init("file:///c:/Users/Maxkryie Networks/Desktop/codeward project/apps/api", "baseline");
  
  const tools = brokenCodeAgent.createTools(sandbox);
  const toolArray = Object.entries(tools).map(([name, impl]: [string, any]) => ({
    name,
    description: impl.description,
    parameters: impl.parameters,
    execute: impl.execute
  }));

  console.log("Starting Broken Code Agent...");
  
  try {
    const result = await runAgentLoop({
      model: "gpt-4o-mini", // fast model for test
      systemPrompt: brokenCodeAgent.systemPrompt,
      tools: toolArray,
      messages: [{ role: "user", content: `Run broken code analysis. RepoPath is /repo. RunID: ${runId}` }]
    }, provider);
    
    console.log("Agent Loop Finished:", result);
  } catch (err) {
    console.error("Error running agent:", err);
  } finally {
    await sandbox.destroy();
  }
}

main().catch(console.error);
