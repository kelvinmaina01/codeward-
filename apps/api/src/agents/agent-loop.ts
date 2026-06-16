import { AgentProvider, AgentRunConfig } from "../providers/openai.provider.js";

export async function runAgentLoop(config: AgentRunConfig, provider: AgentProvider): Promise<string> {
  let currentMessages = [...(config.messages || [])];
  const maxSteps = config.maxSteps || 15;

  for (let step = 0; step < maxSteps; step++) {
    const result = await provider.execute({ ...config, messages: currentMessages });
    
    // Push the raw assistant message which contains the proper tool_calls field
    if (result.rawContent) {
      currentMessages.push(result.rawContent);
    } else {
      currentMessages.push({ role: "assistant", content: result.text || "" });
    }

    if (result.toolCalls.length === 0) {
      return result.text;
    }
    
    // Check if the agent called a terminal tool like submit_report
    const isTerminal = result.toolCalls.some(call => call.name === "submit_report" || call.name === "submit_phase1_result" || call.name === "submit_orchestrator_decision");
    
    // Execute each tool call
    const toolResults = await Promise.all(
      result.toolCalls.map(async (call) => {
        const tool = config.tools?.find(t => t.name === call.name);
        if (!tool) {
          return { id: call.id, name: call.name, content: `Unknown tool: ${call.name}` };
        }
        try {
          const res = await tool.execute(call.input);
          return { id: call.id, name: call.name, content: JSON.stringify(res) };
        } catch (e: any) {
          return { id: call.id, name: call.name, content: `Error: ${e.message}` };
        }
      })
    );

    if (isTerminal) {
      return result.text; // Exit early if report submitted
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

  return "Max steps reached";
}
