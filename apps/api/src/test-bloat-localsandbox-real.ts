/**
 * Validates the bloat agent against the ACTUAL sandbox class the queue worker uses
 * (LocalExecSandbox), not a hand-rolled stub — a genuinely fresh `git clone` into a real
 * ephemeral tmpdir, zero pre-installed node_modules, zero fallow cache. This is the closest
 * faithful stand-in for the real Fly.io ephemeral sandbox available right now (FLY_API_TOKEN
 * is dead — 401 on every Machines API call, confirmed independently of any code issue).
 */
import { LocalExecSandbox } from './sandbox/local-exec.js';
import { bloatAgent } from './agents/definitions/bloat.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import 'dotenv/config';

const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';

async function main() {
  console.log('=== REAL LocalExecSandbox — fresh clone, no cache, ephemeral lifecycle ===\n');
  const sandbox = new LocalExecSandbox();

  const t0 = Date.now();
  await sandbox.init(REPO_URL, 'baseline'); // 'baseline' = skip checkout, use default branch HEAD
  console.log(`\nFresh clone completed in ${((Date.now() - t0) / 1000).toFixed(1)}s at ${sandbox.workDir}\n`);

  // Confirm it's genuinely fresh: no node_modules anywhere yet.
  const nm = await sandbox.exec('find . -maxdepth 3 -type d -name node_modules 2>/dev/null | wc -l');
  console.log(`node_modules dirs present before any install: ${nm.stdout.trim()} (should be 0)\n`);

  try {
    const toolMap = bloatAgent.createTools(sandbox);
    let reportResult: any = null;

    const toolArray = Object.entries(toolMap).map(([name, impl]) => ({
      name,
      description: impl.description,
      parameters: impl.parameters,
      execute: async (args: any) => {
        const t = Date.now();
        const result = await impl.execute(args);
        console.log(`  [tool] ${name} -> ${((Date.now() - t) / 1000).toFixed(1)}s`);
        if (name === 'submit_bloat_report') reportResult = args;
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();
    const tAgent = Date.now();

    await runAgentLoop({
      model: 'gpt-4o-mini',
      systemPrompt: bloatAgent.systemPrompt,
      maxSteps: bloatAgent.maxSteps,
      tools: toolArray,
      messages: [{
        role: 'user',
        content: `Analyze this repository for code bloat.
Run ID: test-run-fresh-clone-001
Use your tools to investigate. Submit your findings using submit_bloat_report.`
      }]
    }, provider);

    console.log(`\nAgent loop completed in ${((Date.now() - tAgent) / 1000).toFixed(1)}s\n`);
    console.log('=== FINAL REPORT (from a genuinely fresh, ephemeral clone) ===');
    if (!reportResult) {
      console.log('Agent never called submit_bloat_report.');
      process.exitCode = 1;
    } else {
      console.log('gateDecision:', reportResult.gateDecision, '| score:', reportResult.score, '| findings:', reportResult.findings?.length);
      console.log('toolsExecuted:', reportResult.toolsExecuted?.map((t: any) => t.toolName));
    }
  } finally {
    console.log('\nDestroying ephemeral sandbox (deleting tmpdir)...');
    await sandbox.destroy();
    console.log('Destroyed. Ephemeral lifecycle honored end-to-end.');
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
