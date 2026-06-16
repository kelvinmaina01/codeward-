export function extractToolArgs(toolCall: any): any {
  const args = toolCall?.args ?? toolCall?.input ?? toolCall?.parameters;
  if (!args) {
    throw new Error(
      `Tool "${toolCall?.toolName}" returned no args. Keys: ${Object.keys(toolCall ?? {}).join(", ")}`
    );
  }
  return args;
}
