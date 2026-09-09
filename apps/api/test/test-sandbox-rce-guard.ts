import assert from 'node:assert';
import { LocalExecSandbox } from '../src/sandbox/local-exec.js';

console.log('=== TEST: Sandbox RCE Safeguard ===');

// 1. Direct LocalExecSandbox constructor with NODE_ENV=production & unset SANDBOX_PROVIDER
process.env.NODE_ENV = 'production';
delete process.env.SANDBOX_PROVIDER;

assert.throws(
  () => new LocalExecSandbox(),
  /FATAL: Local execution forbidden in production/,
  'LocalExecSandbox must throw when NODE_ENV=production and SANDBOX_PROVIDER is not set'
);
console.log('✓ PASS: LocalExecSandbox throws with unset SANDBOX_PROVIDER in production');

// 2. Misspelled SANDBOX_PROVIDER (e.g. 'local' or 'FLY' or 'aws')
process.env.SANDBOX_PROVIDER = 'local';
assert.throws(
  () => new LocalExecSandbox(),
  /FATAL: Local execution forbidden in production/,
  'LocalExecSandbox must throw when SANDBOX_PROVIDER is misspelled or not fly'
);
console.log('✓ PASS: LocalExecSandbox throws with misspelled SANDBOX_PROVIDER in production');

// 3. Development environment allows LocalExecSandbox
process.env.NODE_ENV = 'development';
delete process.env.SANDBOX_PROVIDER;
const devSandbox = new LocalExecSandbox();
assert.ok(devSandbox.workDir, 'LocalExecSandbox must instantiate cleanly in development');
console.log('✓ PASS: LocalExecSandbox instantiates cleanly in development');

// 4. Test environment allows LocalExecSandbox
process.env.NODE_ENV = 'test';
const testSandbox = new LocalExecSandbox();
assert.ok(testSandbox.workDir, 'LocalExecSandbox must instantiate cleanly in test');
console.log('✓ PASS: LocalExecSandbox instantiates cleanly in test');

console.log('\nALL RCE SAFEGUARD TESTS PASSED!');
