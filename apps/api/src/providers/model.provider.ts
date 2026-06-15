import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic }  from "@ai-sdk/anthropic";

// Initialize OpenRouter using the OpenAI compatibility layer
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getModel(phase?: "orchestrator" | "analyzer") {
  // Use direct Anthropic for orchestrator phases (better tool loop reliability)
  if (phase === "orchestrator" && process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic("claude-3-5-sonnet-20241022");
  }

  // Analyzers can use OpenRouter / haiku (each only needs 1 tool call)
  // And Orchestrator will fallback to this if Anthropic key is missing
  return openrouter("anthropic/claude-3.5-haiku");
}
