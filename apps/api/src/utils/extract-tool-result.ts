import { extractToolArgs } from "./extract-tool-args.js";

export function extractToolResult(generateTextResult: any, toolName: string): any {
  const allToolCalls = generateTextResult.steps
    ?.flatMap((s: any) => s.toolCalls ?? []) ?? [];

  const match = allToolCalls.find((c: any) => c.toolName === toolName);

  if (!match) {
    // If steps array is empty, fallback to raw toolCalls on the result object
    const rawToolCalls = generateTextResult.toolCalls ?? [];
    let fallbackMatch = rawToolCalls.find((c: any) => c.toolName === toolName);

    if (!fallbackMatch && allToolCalls.length === 1) fallbackMatch = allToolCalls[0];
    if (!fallbackMatch && rawToolCalls.length === 1) fallbackMatch = rawToolCalls[0];

    if (fallbackMatch) {
      return extractToolArgs(fallbackMatch);
    }

    console.error(`Available tool calls:`, (allToolCalls.length ? allToolCalls : rawToolCalls).map((c: any) => c.toolName));
    throw new Error(`Phase failed: "${toolName}" was never called by the model`);
  }

  return extractToolArgs(match);
}
