/**
 * Real agent run directly through FlySandbox, bypassing BullMQ (Upstash Redis is over its
 * request quota right now — unrelated to this code, see conversation). Proves the
 * init()/workDir fix works with genuine tool-calling against a real Fly Machine, not just
 * plain commands.
 */
import { FlySandbox } from './sandbox/fly-machine.js';
import { bloatAgent } from './agents/definitions/bloat.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import 'dotenv/config';

const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';
const IMAGE = 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';

async function main() {
  console.log('=== BLOAT AGENT — real FlySandbox, real clone inside the machine, real LLM ===\n');
  const sandbox = new FlySandbox({ image: IMAGE });

  try {
    const t0 = Date.now();
    await sandbox.init(REPO_URL, 'baseline');
    console.log(`Machine booted + real clone completed in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    const pwd = await sandbox.exec('pwd && ls | head -5');
    console.log(`Sanity check — cwd + listing:\n${pwd.stdout}\n`);

    const toolMap = bloatAgent.createTools(sandbox);
    let reportResult: any = null;

    const toolArray = Object.entries(toolMap).map(([name, impl]) => ({
      name,
      description: impl.description,
      parameters: impl.parameters,
      execute: async (args: any) => {
        const t = Date.now();
        const result = await impl.execute(args);
        console.log(`  [tool] ${name} -> ${((Date.now() - t) / 1000).toFixed(1)}s | ${JSON.stringify(result).slice(0, 150)}`);
        if (name === 'submit_bloat_report') reportResult = args;
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();
    await runAgentLoop({
      model: 'gpt-4o-mini',
      systemPrompt: bloatAgent.systemPrompt,
      maxSteps: bloatAgent.maxSteps,
      tools: toolArray,
      messages: [{ role: 'user', content: 'Analyze this repository for code bloat. Run ID: test-fly-real-001. Submit findings using submit_bloat_report.' }]
    }, provider);

    console.log('\n=== FINAL REPORT (real Fly Machine, real tool calls) ===');
    if (!reportResult) {
      console.log('Agent never called submit_bloat_report.');
    } else {
      console.log('gateDecision:', reportResult.gateDecision, '| score:', reportResult.score, '| findings:', reportResult.findings?.length);
      console.log('toolsExecuted:', reportResult.toolsExecuted?.map((t: any) => t.toolName));
    }
  } finally {
    await sandbox.destroy();
    console.log('\nMachine destroyed.');
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
