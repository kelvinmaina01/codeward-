import { AgentProvider, AgentRunConfig } from "../providers/openai.provider.js";

export interface AgentLoopResult {
  text: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

export async function runAgentLoop(config: AgentRunConfig, provider: AgentProvider): Promise<AgentLoopResult> {
  let currentMessages = [...(config.messages || [])];
  const maxSteps = config.maxSteps || 15;
  const tokenUsage = { input: 0, output: 0, total: 0 };

  const addUsage = (usage?: { input: number; output: number; total: number }) => {
    if (!usage) return;
    tokenUsage.input += usage.input ?? 0;
    tokenUsage.output += usage.output ?? 0;
    tokenUsage.total += usage.total ?? ((usage.input ?? 0) + (usage.output ?? 0));
  };

  for (let step = 0; step < maxSteps; step++) {
    const isLastStep = step === maxSteps - 1;

    // On the very last step, inject a system nudge and restrict tools to terminal submission only
    const stepConfig = { ...config, messages: currentMessages };
    if (isLastStep) {
      const terminalTools = config.tools?.filter(t => t.name.startsWith("submit_"));
      if (terminalTools && terminalTools.length > 0) {
        stepConfig.tools = terminalTools;
      }
      currentMessages.push({
        role: "user",
        content: "⚠️ SYSTEM: You have reached the maximum allowed steps. You MUST call your submit_* tool NOW with whatever findings you have. All exploration tools are now closed."
      });
    }

    let result;
    try {
      result = await provider.execute(stepConfig);
      addUsage(result.usage);
    } catch (error: any) {
      error.checkpointState = currentMessages;
      throw error;
    }
    
    // Push the raw assistant message which contains the proper tool_calls field
    if (result.rawContent) {
      currentMessages.push(result.rawContent);
    } else {
      currentMessages.push({ role: "assistant", content: result.text || "" });
    }

    if (result.toolCalls.length === 0) {
      return { text: result.text, tokenUsage };
    }
    
    // Dynamic terminal detection: any tool starting with "submit_" is terminal
    const isTerminal = result.toolCalls.some(call => call.name.startsWith("submit_"));
    
    // Execute each tool call
    const toolResults = await Promise.all(
      result.toolCalls.map(async (call) => {
        const tool = config.tools?.find(t => t.name === call.name);
        if (!tool) {
          console.warn(`[AgentLoop] Unknown tool called: ${call.name}`);
          return { id: call.id, name: call.name, content: `Unknown tool: ${call.name}` };
        }
        try {
          const res = await tool.execute(call.input);
          return { id: call.id, name: call.name, content: JSON.stringify(res) };
        } catch (e: any) {
          console.error(`[AgentLoop] Tool "${call.name}" error:`, e.message);
          return { id: call.id, name: call.name, content: `Error: ${e.message}` };
        }
      })
    );

    if (isTerminal) {
      console.log(`[AgentLoop] Terminal tool called at step ${step + 1}/${maxSteps}. Exiting.`);
      return { text: result.text, tokenUsage };
    }

    // Format tool results as proper role: 'tool' messages
    for (const res of toolResults) {
      currentMessages.push({
        role: "tool",
        tool_call_id: res.id,
        name: res.name,
        content: res.content
      });
    }
  }

  console.warn(`[AgentLoop] Max steps (${maxSteps}) exhausted without terminal tool call.`);
  return { text: "Max steps reached without submission", tokenUsage };
}
