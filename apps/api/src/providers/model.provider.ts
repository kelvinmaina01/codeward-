import { createOpenAI } from "@ai-sdk/openai";

export function getModel(phase?: "orchestrator" | "analyzer") {
  const primaryKey = process.env.OPENAI_API_KEY;
  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;

  const useAgentRouterDirectly = process.env.USE_AGENTROUTER_DIRECTLY === 'true';
  const isAgentRouter = useAgentRouterDirectly || (!primaryKey && Boolean(agentRouterKey));

  let baseURL = process.env.OPENAI_BASE_URL;
  let apiKey = primaryKey || agentRouterKey || openRouterKey || kimiKey;
  let headers: Record<string, string> | undefined = undefined;

  if (isAgentRouter) {
    baseURL = "https://agentrouter.org/v1";
    apiKey = agentRouterKey || apiKey;
    headers = { "User-Agent": "Cline/3.0.0" };
  } else if (!baseURL) {
    if (openRouterKey && !primaryKey) {
      baseURL = "https://openrouter.ai/api/v1";
    } else if (kimiKey && !primaryKey) {
      baseURL = "https://api.moonshot.cn/v1";
    }
  }

  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    ...(headers ? { headers } : {}),
    ...(baseURL ? { baseURL } : {})
  });

  const customModel = process.env.OPENAI_MODEL;
  if (customModel) {
    return openai(customModel);
  }

  if (isAgentRouter) {
    return openai("gpt-5.6-sol");
  }

  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) {
    return openai("moonshot-v1-8k");
  }

  if (phase === "orchestrator") {
    // Best tool-calling reliability for multi-step orchestration
    return openai("gpt-4o");
  }
  // Analyzers: fast + cheap, each only needs 1 tool call
  return openai("gpt-4o-mini");
}
