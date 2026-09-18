import { scanDiff } from '../src/agents/definitions/orchestrator/deterministic-floor.js';
import { classifyDiff } from '../src/agents/definitions/orchestrator/orchestrator.tools.js';

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: string) {
  if (cond) { console.log(`  ✅ ${name}`); passed++; }
  else { console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); failed++; }
}

console.log('\n=== Routing v2 Layer 0 — Deterministic Floor ===\n');

// --- Regression fixture: the enterprise-vault-api honeypot feature branch (design doc §6) ---
console.log('--- Honeypot: feature/diagnostic-and-storage-update ---');
const honeypotDiff = `
diff --git a/src/services/diagnostic.service.ts b/src/services/diagnostic.service.ts
+import { exec } from 'node:child_process';
+  const { stdout } = await execAsync(\`ping -c 1 \${host}\`);
diff --git a/src/controllers/storage.controller.ts b/src/controllers/storage.controller.ts
+  const key = String(req.query.key ?? '');
+  const filePath = path.join(env.documentRoot, key);
+  return res.send(fs.readFileSync(filePath));
diff --git a/src/config/debug-overrides.ts b/src/config/debug-overrides.ts
+  awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
+  awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
+  bypassAuth: true,
`;
const honeypotFiles = ['src/services/diagnostic.service.ts', 'src/controllers/storage.controller.ts', 'src/config/debug-overrides.ts'];
const hp = scanDiff(honeypotDiff, honeypotFiles);
const classes = hp.signatureClasses;
assert(classes.includes('command-injection'), 'RCE (S1) detected');
assert(classes.includes('path-traversal'), 'Path traversal (S5/S6) detected');
assert(classes.includes('hardcoded-secret'), 'Hardcoded AWS secret (S9) detected');
assert(classes.includes('security-control-disabled'), 'bypassAuth (S10) detected');
assert(hp.hasSecuritySignature, 'Security agent force-dispatched');
// End-to-end through classifyDiff: security must be mandatory, and risk HIGH.
const hpAnalysis = classifyDiff(honeypotDiff, honeypotFiles);
assert(hpAnalysis.mandatoryAgents.includes('security'), 'classifyDiff: security is MANDATORY on honeypot');
assert(hpAnalysis.riskProfile.overallRisk === 'HIGH', 'classifyDiff: honeypot rated HIGH risk');
assert((hpAnalysis.riskProfile.deterministicSignatures ?? []).length >= 3, 'classifyDiff: signatures surfaced in risk profile');

// --- Deceptive title cannot suppress it (the v1 failure the floor exists to prevent) ---
console.log('\n--- Adversarial: benign-looking title, malicious body ---');
// The floor never reads a title; it reads code. A diff that is *only* a reassuring comment must
// NOT trip security — proving the trigger is code, not narration.
const titleOnlyDiff = `
diff --git a/src/util/format.ts b/src/util/format.ts
+// storage diagnostics: harmless helper, no security impact whatsoever
+export const pad = (s: string) => s.padStart(4, '0');
`;
const benign = scanDiff(titleOnlyDiff, ['src/util/format.ts']);
assert(!benign.hasSecuritySignature, 'No false force on a benign helper with a reassuring comment');

// --- False-positive guards (Layer 0 must be precise enough not to force on everything) ---
console.log('\n--- Precision guards ---');
const safePathDiff = `
diff --git a/src/config/paths.ts b/src/config/paths.ts
+const root = path.join(__dirname, 'assets');
`;
assert(!scanDiff(safePathDiff, ['src/config/paths.ts']).signatureClasses.includes('path-traversal'),
  'path.join WITHOUT request taint is not flagged as traversal');

const safeSqlDiff = `
diff --git a/src/db/users.ts b/src/db/users.ts
+await pool.query('SELECT id FROM users WHERE email = $1', [email]);
`;
assert(!scanDiff(safeSqlDiff, ['src/db/users.ts']).signatureClasses.includes('sql-injection'),
  'Parameterised query ($1 placeholder) is not flagged as SQLi');

// --- Specialist routing ---
console.log('\n--- Specialist forcing ---');
const sqlInjDiff = `
diff --git a/src/db/search.ts b/src/db/search.ts
+await pool.query(\`SELECT * FROM docs WHERE name = '\${req.query.q}'\`);
`;
const sqli = scanDiff(sqlInjDiff, ['src/db/search.ts']);
assert(sqli.forcedAgents.includes('security') && sqli.forcedAgents.includes('data_dx'),
  'Raw SQL interpolation forces BOTH security and data_dx');

const infraDiff = `diff --git a/Dockerfile b/Dockerfile\n+RUN npm ci`;
const infra = scanDiff(infraDiff, ['Dockerfile']);
assert(infra.forcedAgents.includes('architecture'), 'Dockerfile change forces architecture');

// --- The one that MUST stay true: pure docs force nothing ---
console.log('\n--- Doc-only stays clean ---');
const docFloor = scanDiff(`diff --git a/README.md b/README.md\n+Some new documentation.`, ['README.md']);
assert(docFloor.forcedAgents.length === 0, 'Pure README change forces zero agents');

console.log(`\n${failed === 0 ? '✅ PASS' : '❌ FAIL'} — ${passed}/${passed + failed} floor assertions.`);
process.exit(failed === 0 ? 0 : 1);
