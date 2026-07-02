/**
 * Minimal, real validation of the production ephemeral cloud sandbox (FlySandbox).
 * Boots one real Fly Machine, runs a few harmless commands, destroys it immediately.
 * Kept deliberately small — this costs real infra time, unlike the local tests.
 */
import { FlySandbox } from './sandbox/fly-machine.js';
import 'dotenv/config';

const IMAGE = 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';

async function main() {
  console.log(`=== FlySandbox live validation — image: ${IMAGE} ===\n`);
  const sandbox = new FlySandbox({ image: IMAGE });

  try {
    const t0 = Date.now();
    await sandbox.start({});
    console.log(`\nMachine booted in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    for (const cmd of ['echo hello-from-fly', 'node --version', 'git --version', 'which npx', 'pwd']) {
      const res = await sandbox.exec(cmd);
      console.log(`$ ${cmd}\n  exitCode=${res.exitCode} stdout=${JSON.stringify(res.stdout.trim())} stderr=${JSON.stringify(res.stderr.trim())}`);
    }
  } catch (e: any) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    console.log('\nDestroying machine...');
    await sandbox.destroy();
    console.log('Destroyed.');
  }
}

main();
