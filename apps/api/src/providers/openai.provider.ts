export interface AgentTool {
  name: string;
  description: string;
  parameters: any; // Raw JSON schema
  execute: (args: any) => Promise<any> | any;
}

export interface AgentRunConfig {
  model: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  tools?: AgentTool[];
  maxSteps?: number;
  messages: any[];
}

export interface AgentResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; input: any }>;
  rawContent: any; // For appending back to history if needed
}

export interface AgentProvider {
  id: string;
  execute(config: AgentRunConfig): Promise<AgentResult>;
}

export class NativeOpenAIProvider implements AgentProvider {
  id = 'openai';

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const callEndpoint = async (targetBaseUrl: string, apiKey: string, modelName: string, isAgentRouter = false) => {
      const url = `${targetBaseUrl.replace(/\/+$/, '')}/chat/completions`;
      const messages = [
        { role: "system", content: config.systemPrompt },
        ...config.messages
      ];

      const payload: any = {
        model: modelName,
        messages,
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0,
      };

      if (config.tools && config.tools.length > 0) {
        const { zodToJsonSchema } = await import("zod-to-json-schema");
        payload.tools = config.tools.map(t => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: (t.parameters && t.parameters._def) ? zodToJsonSchema(t.parameters) : t.parameters
          }
        }));
        payload.tool_choice = "required";
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300s timeout for massive context windows

      const headers: any = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      };
      if (isAgentRouter) {
        headers["User-Agent"] = "Cline/3.0.0";
      }

      console.log(`-> Calling AI API (${url}, model: ${modelName})...`);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    };

    const primaryKey = process.env.OPENAI_API_KEY;
    const agentRouterKey = process.env.AGENTROUTER_API_KEY;
    const primaryBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    // 1. Try Primary (OpenAI) if key exists
    if (primaryKey && !process.env.USE_AGENTROUTER_DIRECTLY) {
      try {
        console.log(`[NativeOpenAIProvider] Trying Primary OpenAI Key (${config.model})...`);
        return await callEndpoint(primaryBaseUrl, primaryKey, config.model, false);
      } catch (primaryErr: any) {
        console.warn(`[NativeOpenAIProvider] ⚠️ Primary OpenAI Key failed: ${primaryErr.message}`);
        if (agentRouterKey) {
          console.log(`[NativeOpenAIProvider] 🔄 Falling back to AgentRouter Reverse Proxy (gpt-5.6-sol)...`);
          return await callEndpoint("https://agentrouter.org/v1", agentRouterKey, "gpt-5.6-sol", true);
        }
        throw primaryErr;
      }
    }

    // 2. Fallback to AgentRouter if Primary Key is missing or disabled
    if (agentRouterKey) {
      console.log(`[NativeOpenAIProvider] Using AgentRouter Key directly...`);
      return await callEndpoint("https://agentrouter.org/v1", agentRouterKey, "gpt-5.6-sol", true);
    }

    throw new Error("No valid AI API Key configured (OPENAI_API_KEY or AGENTROUTER_API_KEY).");
  }

  private parseResponse(data: any): AgentResult {
    const choice = data.choices[0];
    const message = choice.message;

    const toolCalls = (message.tool_calls || []).map((call: any) => ({
      id: call.id,
      name: call.function.name,
      input: JSON.parse(call.function.arguments)
    }));

    return {
      text: message.content || "",
      toolCalls,
      rawContent: message // The raw message block to pass back in multi-turn
    };
  }
}
