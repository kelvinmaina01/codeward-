import { createOpenAI } from "@ai-sdk/openai";

export function getModel(phase?: "orchestrator" | "analyzer", requestedModel?: string) {
  const tokenRouterKey = process.env.TOKENROUTER_API_KEY;
  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  const primaryKey = process.env.OPENAI_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;

  const isTokenRouter = Boolean(tokenRouterKey) || Boolean(process.env.OPENAI_BASE_URL?.includes('tokenrouter'));
  const useAgentRouterDirectly = process.env.USE_AGENTROUTER_DIRECTLY === 'true';
  const isAgentRouter = !isTokenRouter && (useAgentRouterDirectly || (!primaryKey && Boolean(agentRouterKey)));

  let baseURL = process.env.OPENAI_BASE_URL;
  let apiKey = tokenRouterKey || primaryKey || agentRouterKey || kimiKey;
  let headers: Record<string, string> | undefined = undefined;

  if (isTokenRouter) {
    baseURL = baseURL || "https://api.tokenrouter.com/v1";
    apiKey = tokenRouterKey || apiKey;
    headers = { "User-Agent": "Cline/3.0.0" };
  } else if (isAgentRouter) {
    baseURL = "https://agentrouter.org/v1";
    apiKey = agentRouterKey || apiKey;
    headers = { "User-Agent": "Cline/3.0.0" };
  } else if (!baseURL) {
    if (kimiKey && !primaryKey) {
      baseURL = "https://api.moonshot.cn/v1";
    }
  }

  const openai = createOpenAI({
    apiKey: apiKey || "dummy-key",
    ...(headers ? { headers } : {}),
    ...(baseURL ? { baseURL } : {})
  });

  const selectedModel = requestedModel || process.env.OPENAI_MODEL;
  if (selectedModel) {
    return openai(selectedModel);
  }

  if (isTokenRouter) {
    return openai(process.env.TOKENROUTER_MODEL || "z-ai/glm-5.3-free");
  }

  if (isAgentRouter) {
    return openai(process.env.AGENTROUTER_MODEL || "gpt-5.6-sol");
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

