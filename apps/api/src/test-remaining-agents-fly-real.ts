/**
 * Real FlySandbox validation for the 3 agents that heavily use sandbox.exec() but have never
 * been run through a genuine Fly Machine: compliance, data_dx, ai_era. (guardian's tools are
 * pure GitHub API calls with no sandbox.exec() at all; chat's sandbox usage is minimal — both
 * already have real, independent validation elsewhere and re-running them here proves nothing
 * new about the sandbox layer specifically.)
 *
 * Learning from an earlier mistake in this same session: this script prints and inspects
 * actual tool result CONTENT, not just exit codes or line counts — that gap is exactly what
 * let a broken exec mechanism look like a pass before.
 */
import { FlySandbox } from './sandbox/fly-machine.js';
import { complianceAgent } from './agents/definitions/compliance.agent.js';
import { dataDxAgent } from './agents/definitions/data_dx.agent.js';
import { aiEraAgent } from './agents/definitions/ai_era.agent.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';
import { runAgentLoop } from './agents/agent-loop.js';
import type { AgentDefinition } from './agents/core/provider.js';
import 'dotenv/config';

const IMAGE = 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';
const REPO_URL = 'https://github.com/kelvinmaina01/codeward-.git';

async function runAgent(agent: AgentDefinition, note: string) {
  console.log(`\n\n=== ${agent.displayName} — real Fly Machine ===`);
  const sandbox = new FlySandbox({ image: IMAGE });
  const t0 = Date.now();
  await sandbox.init(REPO_URL, 'baseline');
  console.log(`Real clone in Fly Machine completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  try {
    const toolMap = agent.createTools(sandbox);
    let reportResult: any = null;
    const submitToolName = Object.keys(toolMap).find(n => n.startsWith('submit_'))!;

    const toolArray = Object.entries(toolMap).map(([name, impl]: [string, any]) => ({
      name, description: impl.description, parameters: impl.parameters,
      execute: async (args: any) => {
        const t = Date.now();
        const result = await impl.execute(args);
        // Print enough of the ACTUAL content to visually confirm it's real, not echoed garbage
        // or a base64/pipe artifact.
        const preview = JSON.stringify(result).slice(0, 220);
        console.log(`  [tool] ${name} -> ${((Date.now() - t) / 1000).toFixed(1)}s | ${preview}`);
        if (name === submitToolName) reportResult = args;
        return result;
      }
    }));

    const provider = new NativeOpenAIProvider();
    await runAgentLoop({
      model: 'gpt-4o-mini', systemPrompt: agent.systemPrompt, maxSteps: agent.maxSteps, tools: toolArray,
      messages: [{ role: 'user', content: `Analyze this repository. Run ID: test-fly-${agent.id}-001. ${note} Submit your findings using ${submitToolName}.` }]
    }, provider);

    if (!reportResult) {
      console.log(`${agent.id}: FAILED to submit a report`);
    } else {
      console.log(`\n${agent.id} FINAL: ${JSON.stringify({ score: reportResult.score ?? reportResult.overallTeamHealthScore, gate: reportResult.gateDecision ?? reportResult.riskLevel, findings: (reportResult.findings ?? []).length })}`);
    }
  } finally {
    await sandbox.destroy();
    console.log(`${agent.id}: Fly Machine destroyed.`);
  }
}

async function main() {
  const note = 'There is NO running instance, NO databaseUrl, and NO live external service connection in this pipeline — every dynamic check will honestly report applicable:false; treat that as "not tested", never as "passed".';
  await runAgent(complianceAgent, note);
  await runAgent(dataDxAgent, note);
  await runAgent(aiEraAgent, note);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
