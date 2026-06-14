/**
 * ============================================================================
 * Anthropic Provider — Claude via the Vercel AI SDK
 * ============================================================================
 * 
 * THIS IS THE ONLY FILE IN THE ENTIRE CODEBASE THAT IMPORTS @ai-sdk/anthropic.
 * 
 * If you ever need to change how we talk to Claude (prompt caching, extended
 * thinking, different API version), you change THIS file and nothing else.
 * 
 * If you want to replace Claude entirely, you write a new provider file
 * and swap the import in registry.ts. Zero agent code changes.
 * ============================================================================
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { AgentProvider, AgentRunConfig, AgentResult, AgentFinding } from '../provider.js';

// Initialize OpenRouter using the OpenAI compatibility layer
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});


export class AnthropicProvider implements AgentProvider {
  readonly name = 'anthropic';

  async execute(config: AgentRunConfig): Promise<AgentResult> {
    const model = config.model || 'claude-3-5-haiku-latest';
    const startTime = Date.now();

    let finalModel = model;
    if (finalModel === 'claude-3-5-haiku-latest') {
      finalModel = 'claude-3.5-haiku';
    }

    // OpenRouter requires the provider prefix (e.g., anthropic/claude-3.5-haiku)
    const openRouterModelName = finalModel.startsWith('anthropic/') ? finalModel : `anthropic/${finalModel}`;

    try {
      const result = await generateText({
        model: openrouter(openRouterModelName),
        system: config.systemPrompt,
        prompt: config.taskPrompt,
        tools: config.tools as any,
        maxSteps: config.maxSteps,
      });

      // Check if the agent successfully used the 'submit_security_report' final tool
      let rawFindings: any[] = [];
      const submitToolCall = result.toolCalls?.find(tc => tc.toolName === 'submit_security_report');
      
      if (submitToolCall) {
        // @ts-ignore
        const report = submitToolCall.args as any;
        rawFindings = report.findings || [];
        console.log(`[AnthropicProvider] Captured structured report from 'submit_security_report' tool.`);
      } else {
        // Fallback: Parse the JSON array from the final text
        rawFindings = this.extractFindings(result.text);
      }
      const strictFindings = rawFindings.filter((f) => {
        // Drop any finding that doesn't provide hard evidence
        if (f.severity !== 'info' && (!f.file && !f.toolName)) {
          console.warn(`[Constitution] Dropped unverified finding: ${f.title}`);
          return false;
        }
        return true;
      });

      const score = this.computeScore(strictFindings);

      return {
        agentId: config.agentId,
        status: strictFindings.some(f => f.severity === 'critical') ? 'failed' : 'passed',
        findings: strictFindings,
        score,
        duration: Date.now() - startTime,
        modelUsed: finalModel,
        tokenUsage: {
          input: (result.usage as any)?.promptTokens ?? 0,
          output: (result.usage as any)?.completionTokens ?? 0,
        },
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[AnthropicProvider] Agent "${config.agentId}" failed:`, err.message);

      return {
        agentId: config.agentId,
        status: 'error',
        findings: [],
        score: 0,
        duration: Date.now() - startTime,
        modelUsed: finalModel,
        tokenUsage: { input: 0, output: 0 },
      };
    }
  }

  // -------------------------------------------------------------------------
  // Private: Parse the model's final text output into structured findings
  // -------------------------------------------------------------------------

  private extractFindings(text: string): AgentFinding[] {
    if (!text) return [];

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((f: any) => ({
            severity: f.severity || 'info',
            category: f.category || 'unknown',
            file: f.file || undefined,
            line: f.line || undefined,
            title: f.title || 'Untitled finding',
            description: f.description || '',
            suggestedFix: f.suggestedFix || f.suggested_fix || undefined,
          }));
        }
      }
    } catch {
      // JSON parsing failed
    }

    return text.trim() ? [{
      severity: 'info' as const,
      category: 'raw-output',
      title: 'Agent output (unstructured)',
      description: text.substring(0, 2000),
    }] : [];
  }

  // -------------------------------------------------------------------------
  // Private: Compute a 0–100 score from findings
  // -------------------------------------------------------------------------

  private computeScore(findings: AgentFinding[]): number {
    if (findings.length === 0) return 100;

    // Weighted deductions per severity
    const weights: Record<string, number> = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 0,
    };

    let deduction = 0;
    for (const f of findings) {
      deduction += weights[f.severity] ?? 0;
    }

    return Math.max(0, 100 - deduction);
  }
}
