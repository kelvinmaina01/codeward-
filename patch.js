const fs = require('fs');
const path = 'apps/api/src/providers/bedrock.provider.ts';
let code = fs.readFileSync(path, 'utf8');

// Inject console.log before new ConverseCommand
const inject = `
    console.log("---- DEBUG BEDROCK ----");
    console.log("converseTools.length:", converseTools.length);
    console.log("has toolConfig:", !!toolConfig);
    console.log("config.messages has toolUse/toolResult:", JSON.stringify(config.messages).includes('tool_call_id') || JSON.stringify(config.messages).includes('tool_calls'));
    console.log("-----------------------");
`;
code = code.replace(/const command = new ConverseCommand\(\{/g, inject + '\n    const command = new ConverseCommand({');

fs.writeFileSync(path, code);
