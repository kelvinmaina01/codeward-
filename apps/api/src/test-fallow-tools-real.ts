/**
 * Direct, non-LLM stress test of the real Fallow-backed bloat tools.
 * Runs each run_fallow_* tool against THIS repo via a real sandbox exec
 * (no mocking, no LLM round-trip) to prove the CLI wiring actually works
 * end-to-end before trusting an agent to call it.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { createBloatTools } from './agents/definitions/bloat/bloat.tools.js';
import type { SandboxHandle } from './agents/core/provider.js';
import 'dotenv/config';

const execAsync = promisify(exec);
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const sandbox: SandboxHandle = {
  exec: async (cmd: string) => {
    console.log(`[real exec] ${cmd}`);
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 50 });
      return { exitCode: 0, stdout, stderr };
    } catch (err: any) {
      return { exitCode: err.code ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? err.message };
    }
  },
  destroy: async () => {},
};

async function main() {
  const tools = createBloatTools(sandbox);

  console.log('\n=== run_fallow_health ===');
  const health = await tools.run_fallow_health.execute({ top: 3 } as any);
  console.log('score:', (health as any).score ?? (health as any).health_score, 'findings:', (health as any).findings?.length);

  console.log('\n=== run_fallow_dead_code ===');
  const deadCode = await tools.run_fallow_dead_code.execute({} as any);
  console.log('summary:', JSON.stringify((deadCode as any).summary));

  console.log('\n=== run_fallow_duplicates ===');
  const dupes = await tools.run_fallow_duplicates.execute({ minOccurrences: 2 } as any);
  console.log('clone_groups found:', (dupes as any).clone_groups?.length);

  console.log('\n=== run_fallow_complexity ===');
  const complexity = await tools.run_fallow_complexity.execute({ top: 3 } as any);
  console.log('findings:', (complexity as any).findings?.length);

  console.log('\n=== run_fallow_boundaries ===');
  const boundaries = await tools.run_fallow_boundaries.execute({} as any);
  console.log(JSON.stringify(boundaries));

  console.log('\n=== ERROR-PATH CHECK: intentionally bad flag ===');
  try {
    // @ts-expect-error - deliberately invalid enum value to prove real errors surface, not silent fake success
    await tools.run_fallow_duplicates.execute({ mode: 'not-a-real-mode' } as any);
    console.log('UNEXPECTED: no error thrown for invalid mode');
  } catch (e: any) {
    console.log('Correctly threw a real error instead of faking success:', e.message.slice(0, 200));
  }

  console.log('\n=== DONE. All calls above hit the real fallow CLI against this actual repo. ===');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
