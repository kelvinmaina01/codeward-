import { scanDiff } from '../src/agents/definitions/orchestrator/deterministic-floor.js';
import { classifyDiff } from '../src/agents/definitions/orchestrator/orchestrator.tools.js';

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) { console.log(`  ✅ ${name}`); passed++; }
  else { console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); failed++; }
}
/** Build a minimal one-file diff from added code lines. */
function diffOf(file: string, ...added: string[]) {
  return `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n` + added.map((l) => `+${l}`).join('\n');
}
const has = (d: string, files: string[], cls: string) => scanDiff(d, files).signatureClasses.includes(cls as any);

console.log('\n=== Routing v2 Layer 0 — Deterministic Floor (expanded) ===\n');

// ── Regression fixture: the enterprise-vault-api honeypot (design doc §6) ──
console.log('--- Honeypot regression ---');
const honeypotDiff = `
diff --git a/src/services/diagnostic.service.ts b/src/services/diagnostic.service.ts
+import { exec } from 'node:child_process';
+  const { stdout } = await execAsync(\`ping -c 1 \${host}\`);
diff --git a/src/controllers/storage.controller.ts b/src/controllers/storage.controller.ts
+  const key = String(req.query.key ?? '');
+  const filePath = path.join(env.documentRoot, key);
diff --git a/src/config/debug-overrides.ts b/src/config/debug-overrides.ts
+  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
+  bypassAuth: true,
`;
const hpFiles = ['src/services/diagnostic.service.ts', 'src/controllers/storage.controller.ts', 'src/config/debug-overrides.ts'];
assert(has(honeypotDiff, hpFiles, 'command-injection'), 'honeypot: RCE');
assert(has(honeypotDiff, hpFiles, 'path-traversal'), 'honeypot: path traversal');
assert(has(honeypotDiff, hpFiles, 'hardcoded-secret'), 'honeypot: AWS secret');
assert(has(honeypotDiff, hpFiles, 'security-control-disabled'), 'honeypot: bypassAuth');
const hpAnalysis = classifyDiff(honeypotDiff, hpFiles);
assert(hpAnalysis.mandatoryAgents.includes('security'), 'honeypot: security MANDATORY via classifyDiff');
assert(hpAnalysis.riskProfile.overallRisk === 'HIGH', 'honeypot: HIGH risk');

// ── New injection vectors ──
console.log('\n--- Injection vectors ---');
assert(has(diffOf('a.ts', "db.find(req.body)"), ['a.ts'], 'nosql-injection'), 'NoSQL: find(req.body)');
assert(scanDiff(diffOf('a.ts', "db.find(req.body)"), ['a.ts']).forcedAgents.includes('data_dx'), 'NoSQL forces data_dx');
assert(has(diffOf('a.ts', "const p = new libxmljs.parseXml(x, { noent: true });"), ['a.ts'], 'xxe'), 'XXE: noent:true');
assert(has(diffOf('a.ts', "target['__proto__'].polluted = 1;"), ['a.ts'], 'prototype-pollution'), 'Prototype pollution: __proto__');
assert(has(diffOf('a.ts', "_.merge(config, req.body);"), ['a.ts'], 'prototype-pollution'), 'Prototype pollution: lodash merge + taint');
assert(has(diffOf('a.ts', "const u = new User(req.body);"), ['a.ts'], 'mass-assignment'), 'Mass assignment: new Model(req.body)');
assert(has(diffOf('a.ts', "res.redirect(req.query.next);"), ['a.ts'], 'open-redirect'), 'Open redirect');
assert(has(diffOf('a.tsx', "el.innerHTML = userInput;"), ['a.tsx'], 'xss-sink'), 'XSS: innerHTML assignment');
assert(has(diffOf('a.ts', "const re = new RegExp(req.query.pattern);"), ['a.ts'], 'unsafe-regex'), 'Unsafe RegExp from request');
assert(has(diffOf('a.ts', "const o = unserialize(payload);"), ['a.ts'], 'unsafe-deserialization'), 'Insecure JS deserialization');

// ── Cloud secrets ──
console.log('\n--- Cloud secrets ---');
assert(has(diffOf('a.ts', "const k = 'AIza" + "B".repeat(35) + "';"), ['a.ts'], 'hardcoded-secret'), 'GCP API key');
assert(has(diffOf('a.ts', "slack: 'xoxb-1234567890-abcdefghijkl'"), ['a.ts'], 'hardcoded-secret'), 'Slack bot token');
assert(has(diffOf('a.ts', "sg: 'SG." + "a".repeat(22) + "." + "b".repeat(43) + "'"), ['a.ts'], 'hardcoded-secret'), 'SendGrid key');
assert(has(diffOf('gh.ts', "gh: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'"), ['gh.ts'], 'hardcoded-secret'), 'GitHub PAT');
assert(has(diffOf('cfg.json', '"type": "service_account",'), ['cfg.json'], 'hardcoded-secret'), 'GCP service-account JSON');
assert(has(diffOf('a.ts', "const apiKey = '" + "aB3xK9mP" + "2qR7sT1v" + "W4yZ6cE8" + "gH0jL5nQ" + "';"), ['a.ts'], 'hardcoded-secret'), 'Generic high-entropy apiKey literal');

// ── Cryptographic failures ──
console.log('\n--- Cryptographic failures ---');
assert(has(diffOf('a.ts', "crypto.createHash('md5').update(x);"), ['a.ts'], 'weak-hash'), 'MD5 usage');
assert(has(diffOf('a.ts', "const token = Math.random().toString(36);"), ['a.ts'], 'crypto-weak-random'), 'Math.random for token');
assert(has(diffOf('a.ts', "const c = crypto.createCipher('aes-256-cbc', key);"), ['a.ts'], 'weak-cipher'), 'Deprecated createCipher');
assert(has(diffOf('a.ts', "const salt = 'a1b2c3d4e5f60718';"), ['a.ts'], 'hardcoded-crypto-material'), 'Hardcoded salt');
assert(has(diffOf('a.ts', "{ secureProtocol: 'TLSv1_method' }"), ['a.ts'], 'security-control-disabled'), 'Disabled TLS version');

// ── FALSE-POSITIVE GUARDS (precision must survive the expansion) ──
console.log('\n--- False-positive guards ---');
assert(!has(diffOf('a.ts', "const jitter = Math.random() * 100;"), ['a.ts'], 'crypto-weak-random'), 'Math.random for jitter NOT flagged');
assert(!has(diffOf('a.ts', "crypto.createHash('sha256').update(x);"), ['a.ts'], 'weak-hash'), 'SHA-256 NOT flagged');
assert(!has(diffOf('a.ts', "const c = crypto.createCipheriv('aes-256-gcm', key, iv);"), ['a.ts'], 'weak-cipher'), 'aes-256-gcm NOT flagged as weak cipher');
assert(!has(diffOf('a.ts', "Object.assign(defaults, { timeout: 30 });"), ['a.ts'], 'mass-assignment'), 'Object.assign with a literal NOT mass-assignment');
assert(!has(diffOf('a.ts', "await pool.query('SELECT id FROM users WHERE email = $1', [email]);"), ['a.ts'], 'sql-injection'), 'Parameterised query NOT SQLi');
assert(!has(diffOf('a.ts', "const root = path.join(__dirname, 'assets');"), ['a.ts'], 'path-traversal'), 'path.join without taint NOT traversal');
assert(!has(diffOf('a.ts', "if (el.innerHTML === expected) return;"), ['a.tsx'], 'xss-sink'), 'innerHTML comparison (===) NOT an XSS sink');
assert(scanDiff(diffOf('a.ts', "export const pad = (s: string) => s.padStart(4, '0');"), ['a.ts']).forcedAgents.length === 0, 'Benign helper forces nothing');
assert(scanDiff('diff --git a/README.md b/README.md\n+Some new documentation.', ['README.md']).forcedAgents.length === 0, 'README forces nothing');

// ── ReDoS / performance guarantee ──
console.log('\n--- ReDoS & performance ---');
const evil =
  diffOf('evil.ts',
    "const s = '" + "a".repeat(50000) + "';",                          // long literal
    "query(`" + "x".repeat(40000) + "`);",                             // long unterminated-ish template
    "'" + "1234567890abcdef".repeat(4000) + "'",                        // long hex-ish run
    "http://" + "u".repeat(20000) + ":" + "p".repeat(20000) + "@host"); // long creds shape
const bigFiles = Array.from({ length: 500 }, (_, i) => `src/module-${i}/auth-${i}.ts`);
const t0 = performance.now();
for (let i = 0; i < 20; i++) scanDiff(evil, bigFiles);
const perScan = (performance.now() - t0) / 20;
console.log(`    mean scan over adversarial input: ${perScan.toFixed(2)}ms`);
assert(perScan < 50, `Adversarial scan stays sub-50ms (was ${perScan.toFixed(2)}ms)`);

console.log(`\n${failed === 0 ? '✅ PASS' : '❌ FAIL'} — ${passed}/${passed + failed} floor assertions.`);
process.exit(failed === 0 ? 0 : 1);
