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
    const url = "https://api.openai.com/v1/chat/completions";
    
    const messages = [
      { role: "system", content: config.systemPrompt },
      ...config.messages
    ];

    const payload: any = {
      model: config.model,
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

    const operation = async () => {
      console.log(`-> Calling OpenAI API...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`<- OpenAI API responded with status ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    };

    const { default: pRetry } = await import('p-retry');
    
    return pRetry(operation, {
      retries: 3,
      onFailedAttempt: (error: any) => {
        console.error(`[NativeOpenAIProvider] API Error (Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left): ${error.message}`);
      }
    });
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
