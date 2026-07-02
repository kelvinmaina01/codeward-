import { LocalExecSandbox } from './sandbox/local-exec.js';
import { securityAgent } from './agents/definitions/security.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import 'dotenv/config';

const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';

async function main() {
  console.log('=== SECURITY AGENT — real LocalExecSandbox, fresh clone, real LLM ===\n');
  const sandbox = new LocalExecSandbox();
  const t0 = Date.now();
  await sandbox.init(REPO_URL, 'baseline');
  console.log(`Fresh clone in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  try {
    const toolMap = securityAgent.createTools(sandbox);
    let reportResult: any = null;

    const toolArray = Object.entries(toolMap).map(([name, impl]) => ({
      name,
      description: impl.description,
      parameters: impl.parameters,
      execute: async (args: any) => {
        const t = Date.now();
        const result = await impl.execute(args);
        console.log(`  [tool] ${name} -> ${((Date.now() - t) / 1000).toFixed(1)}s | ${JSON.stringify(result).slice(0, 180)}`);
        if (name === 'submit_security_report') reportResult = args;
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();
    const tAgent = Date.now();

    await runAgentLoop({
      model: 'gpt-4o-mini',
      systemPrompt: securityAgent.systemPrompt,
      maxSteps: securityAgent.maxSteps,
      tools: toolArray,
      messages: [{
        role: 'user',
        content: `Perform a security analysis of this repository.
Run ID: test-run-security-001
There is NO running instance and NO databaseUrl in this pipeline — dynamic checks will honestly report applicable:false, treat that as "not tested", never "passed". trufflehog/trivy binaries may not exist in this dev sandbox image; those will also honestly report applicable:false if missing — that's expected here, not a failure of the tool.
Submit your findings using submit_security_report.`
      }]
    }, provider);

    console.log(`\nAgent loop completed in ${((Date.now() - tAgent) / 1000).toFixed(1)}s\n`);
    console.log('=== FINAL REPORT ===');
    if (!reportResult) {
      console.log('Agent never called submit_security_report.');
      process.exitCode = 1;
    } else {
      console.log('gateDecision:', reportResult.gateDecision, '| score:', reportResult.score);
      console.log('findings:', reportResult.findings?.length);
      console.log(JSON.stringify(reportResult.findings, null, 2));
    }
  } finally {
    await sandbox.destroy();
    console.log('\nSandbox destroyed.');
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
