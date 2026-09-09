import assert from 'node:assert/strict';
import fs from 'node:fs';

const localExec = fs.readFileSync(new URL('./sandbox/local-exec.ts', import.meta.url), 'utf8');
const flyMachine = fs.readFileSync(new URL('./sandbox/fly-machine.ts', import.meta.url), 'utf8');

assert.ok(
  localExec.includes('GIT_LFS_SKIP_SMUDGE=1 git clone'),
  'LocalExecSandbox clone must skip Git LFS smudge',
);
assert.ok(
  localExec.includes('GIT_LFS_SKIP_SMUDGE=1 git checkout'),
  'LocalExecSandbox checkout must skip Git LFS smudge',
);
assert.ok(
  localExec.includes('cloneRes.exitCode !== 0'),
  'LocalExecSandbox must fail init when clone fails',
);
assert.ok(
  localExec.includes('checkoutRes.exitCode !== 0'),
  'LocalExecSandbox must fail init when checkout fails',
);

assert.ok(
  flyMachine.includes('GIT_LFS_SKIP_SMUDGE=1 git clone'),
  'FlySandbox clone must skip Git LFS smudge',
);
assert.ok(
  flyMachine.includes('GIT_LFS_SKIP_SMUDGE=1 git checkout'),
  'FlySandbox checkout must skip Git LFS smudge',
);
assert.ok(
  flyMachine.includes('execRaw(`mkdir -p'),
  'FlySandbox clone must use execRaw before the repo workdir exists',
);

console.log('PASS: Sandbox LFS harness verified clone/checkout smudge skip and failure handling.');
