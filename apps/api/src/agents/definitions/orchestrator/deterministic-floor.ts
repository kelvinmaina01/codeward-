/**
 * ============================================================================
 * Routing v2 — Layer 0: The Deterministic Floor
 * ============================================================================
 *
 * See docs/architecture/routing-v2-design.md §2.
 *
 * A pure, token-free pass over the raw diff that runs BEFORE any model. A signature match
 * force-dispatches the relevant deep agent and bypasses LLM routing entirely — the trigger is the
 * malicious *code itself*, which an attacker cannot remove without removing the attack, rather
 * than the PR title/description, which is attacker-controlled prose.
 *
 * INVARIANT (design doc §0): no LLM decision may be the sole reason the security review does not
 * run. This module is one of the two mechanisms enforcing it; the other is the existing
 * `mandatory: !isDocOrConfigOnly` flag on the security agent.
 *
 * ── Detection model ─────────────────────────────────────────────────────────
 * HIGH RECALL by design: a false FORCE costs one Layer-2 debunk, a miss costs a shipped vuln, so
 * every ambiguous call resolves toward forcing. Coverage spans the OWASP Top 10 / CWE Top 25
 * injection and access-control classes, cloud-provider secret formats, and cryptographic-failure
 * patterns. Where a class genuinely needs data-flow (a file/URL/DB sink fed by request input) the
 * floor uses a pragmatic co-occurrence heuristic — the dangerous sink AND request-taint present in
 * the same hunk — rather than full AST taint, which is noted as future work; the heuristic
 * over-flags, which the funnel tolerates.
 *
 * ── ReDoS safety (hard requirement) ─────────────────────────────────────────
 * Every pattern below is linear-time by construction:
 *   - no nested quantifiers ((a+)+), no overlapping alternation under a quantifier ((a|ab)*);
 *   - repetition on negated classes / literals only, with bounded upper limits where a quantifier
 *     could otherwise scan far;
 *   - no /g flag on any rule regex (so no shared lastIndex state across .test calls).
 * Additionally, every scanned line is clipped to MAX_LINE_LEN before matching, bounding the
 * constant factor against pathological minified single-line inputs. The stress test in
 * test-deterministic-floor.ts feeds adversarial strings and asserts sub-50ms whole-scan latency.
 */

export type SignatureClass =
  // Injection / OWASP A03, CWE-77/78/79/89/94/611/915/918/1321
  | 'command-injection'
  | 'code-injection'
  | 'dynamic-code-load'
  | 'unsafe-deserialization'
  | 'path-traversal'
  | 'sql-injection'
  | 'nosql-injection'
  | 'ssrf'
  | 'xxe'
  | 'prototype-pollution'
  | 'mass-assignment'
  | 'open-redirect'
  | 'xss-sink'
  | 'unsafe-regex'
  // Secrets / OWASP A07, CWE-798
  | 'hardcoded-secret'
  // Cryptographic failures / OWASP A02, CWE-327/328/330/331/916
  | 'weak-hash'
  | 'crypto-weak-random'
  | 'weak-cipher'
  | 'hardcoded-crypto-material'
  // Security-control disablement / misconfiguration
  | 'security-control-disabled'
  | 'auth-surface-change'
  | 'auth-check-removed'
  // Change-surface routing
  | 'dependency-change'
  | 'infra-change'
  | 'data-layer-change';

export interface FloorSignature {
  id: string; // S-codes, matching the design-doc table + expansion
  signatureClass: SignatureClass;
  /** Agents this signature force-dispatches (deep). */
  forces: string[];
}

export interface FloorMatch extends FloorSignature {
  /** A short, redacted excerpt of the line that tripped it — for the audit log and rationale. */
  sample: string;
}

export interface FloorResult {
  matches: FloorMatch[];
  /** Union of every forced agent across all matches. */
  forcedAgents: string[];
  /** Distinct vulnerability classes seen — feeds the enriched risk profile. */
  signatureClasses: SignatureClass[];
  /** True if any signature forces the security agent. */
  hasSecuritySignature: boolean;
}

/** Upper bound on line length passed to any regex — bounds ReDoS constant factor. */
const MAX_LINE_LEN = 4000;
const clip = (l: string): string => (l.length > MAX_LINE_LEN ? l.slice(0, MAX_LINE_LEN) : l);

/** Added-line content of a unified diff (strips the leading '+', excludes '+++' file headers). */
function addedLines(rawDiff: string): string {
  return (rawDiff.match(/^\+(?!\+).*/gm) ?? []).map((l) => l.slice(1)).join('\n');
}

/** Longest run of base64/hex-ish chars in a string — a cheap entropy proxy for secret detection. */
function looksHighEntropy(s: string): boolean {
  const m = s.match(/[A-Za-z0-9+/_-]{20,200}/g);
  if (!m) return false;
  // A run of >=20 chars drawing on >=12 distinct symbols is unlikely to be a normal identifier
  // (which repeats a small alphabet) — the discriminator is symbol diversity, not just length.
  return m.some((tok) => tok.length >= 20 && new Set(tok).size >= 12);
}

function redact(line: string): string {
  return line.trim().replace(/\s+/g, ' ').slice(0, 120);
}

interface Rule extends FloorSignature {
  scope: 'code' | 'path';
  pattern: RegExp;
  /** Optional second pattern that must ALSO match the same line (linear co-occurrence). */
  also?: RegExp;
  /** Require request-derived data anywhere in the hunk (pragmatic taint gate). */
  needsRequestTaint?: boolean;
  /** Require the matched line to look high-entropy (reduces generic-secret false positives). */
  entropy?: boolean;
}

/** Request-derived data — the taint source for sink rules. Literal alternation → linear. */
const REQUEST_TAINT = /\breq(uest)?\.(params|query|body|headers|cookies)\b|\bctx\.request\b|\bprocess\.argv\b/i;

const RULES: Rule[] = [
  // ── Injection ──────────────────────────────────────────────────────────────
  { id: 'S1', signatureClass: 'command-injection', forces: ['security'], scope: 'code',
    pattern: /\bchild_process\b|\.(exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/ },
  { id: 'S2', signatureClass: 'code-injection', forces: ['security'], scope: 'code',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bvm\.runIn(New|This)Context\s*\(/ },
  { id: 'S3', signatureClass: 'dynamic-code-load', forces: ['security'], scope: 'code',
    pattern: /\b(require|import)\s*\(\s*(?!['"`])/ }, // require/import with a non-string-literal argument
  { id: 'S4', signatureClass: 'unsafe-deserialization', forces: ['security'], scope: 'code',
    pattern: /\bos\.system\s*\(|\bsubprocess\.[A-Za-z_]{1,20}\([^)]{0,200}shell\s*=\s*True|\bpickle\.loads\s*\(|\byaml\.load\s*\((?![^)]{0,50}Safe)/ },
  { id: 'S5', signatureClass: 'path-traversal', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\bfs\.(readFile|readFileSync|createReadStream|writeFile|writeFileSync)\s*\(|\bres\.sendFile\s*\(/ },
  { id: 'S6', signatureClass: 'path-traversal', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\bpath\.(join|resolve)\s*\(/ },
  { id: 'S7', signatureClass: 'sql-injection', forces: ['security', 'data_dx'], scope: 'code',
    // .query/.raw/.execute opened with a template literal containing `${…}` OR a quoted string
    // immediately followed by `+`. Parameterised calls (`'… $1', [x]`) match neither branch.
    pattern: /\.(query|raw|execute)\s*\(\s*(`[^`]{0,2000}\$\{|['"][^'"]{0,2000}['"]\s*\+)/ },
  { id: 'S8', signatureClass: 'ssrf', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\b(fetch|axios|got|http\.request|https\.request)\s*\(/ },
  { id: 'S16', signatureClass: 'nosql-injection', forces: ['security', 'data_dx'], scope: 'code',
    pattern: /\$where\b|\$regex\s*:\s*req\.|\.(find|findOne|update|updateOne|updateMany|deleteOne|remove)\s*\(\s*req\.(body|query|params)\b/ },
  { id: 'S17', signatureClass: 'xxe', forces: ['security'], scope: 'code',
    pattern: /\bnoent\s*:\s*true\b|\bexpandEntities\s*:\s*true\b|resolveExternalEntities|externalEntityLoader|\bnoblanks\s*:\s*false\b/ },
  { id: 'S18', signatureClass: 'prototype-pollution', forces: ['security'], scope: 'code',
    pattern: /\[\s*['"]__proto__['"]\s*\]|\b__proto__\s*[:=]|\bconstructor\s*\.\s*prototype\b/ },
  { id: 'S18b', signatureClass: 'prototype-pollution', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\b_?\.?(merge|mergeWith|defaultsDeep|set|setWith)\s*\(/ }, // lodash-style recursive merge fed by user data
  { id: 'S19', signatureClass: 'mass-assignment', forces: ['security'], scope: 'code',
    pattern: /\bnew\s+[A-Z][A-Za-z0-9_]{0,40}\s*\(\s*req\.(body|query|params)\b|\bObject\.assign\s*\([^,)]{0,80},\s*req\.(body|query|params)\b|\.(create|update|save|build|insert)\s*\(\s*req\.(body|query|params)\b/ },
  { id: 'S20', signatureClass: 'open-redirect', forces: ['security'], scope: 'code',
    pattern: /\bres\.redirect\s*\(\s*req\.(query|params|body)\b|\bres\.redirect\s*\(\s*`\s*\$\{\s*req\./ },
  { id: 'S21', signatureClass: 'xss-sink', forces: ['security'], scope: 'code',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=(?!=)|\.outerHTML\s*=(?!=)|insertAdjacentHTML\s*\(|document\.write(ln)?\s*\(|\bv-html\b/ },
  { id: 'S22', signatureClass: 'unsafe-regex', forces: ['security'], scope: 'code',
    pattern: /\bnew\s+RegExp\s*\(\s*req\.(body|query|params)\b/ },
  { id: 'S23', signatureClass: 'unsafe-deserialization', forces: ['security'], scope: 'code',
    pattern: /\bnode-serialize\b|\bunserialize\s*\(|\bfuncster\b/ },

  // ── Secrets (cloud + generic) ────────────────────────────────────────────────
  { id: 'S9', signatureClass: 'hardcoded-secret', forces: ['security', 'compliance'], scope: 'code',
    // Fixed-prefix provider tokens — each anchored on a literal prefix, so all branches are linear.
    pattern: /\bAKIA[0-9A-Z]{16}\b|\bASIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bya29\.[0-9A-Za-z_-]{20,120}|\bgh[pousr]_[A-Za-z0-9]{36,80}|\bgithub_pat_[0-9A-Za-z_]{22,120}|\bxox[baprs]-[0-9A-Za-z-]{10,80}|\b[sr]k_live_[0-9A-Za-z]{20,80}|\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b|\bSK[0-9a-f]{32}\b|\bAC[0-9a-f]{32}\b|\bnpm_[A-Za-z0-9]{36}\b|\bkey-[0-9a-f]{32}\b|\bdop_v1_[0-9a-f]{64}\b|-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{10,200}\.eyJ[A-Za-z0-9_-]{10,400}\.[A-Za-z0-9_-]{10,200}\b|:\/\/[^\s:@/]{1,64}:[^\s:@/]{1,64}@/ },
  { id: 'S25', signatureClass: 'hardcoded-secret', forces: ['security', 'compliance'], scope: 'code',
    // Cloud config-shaped secrets (Azure storage, GCP service-account JSON).
    pattern: /AccountKey=[^;\s"']{10,80}|"type"\s*:\s*"service_account"|"private_key"\s*:\s*"-----BEGIN|DefaultEndpointsProtocol=[^;\s"']{0,80}AccountKey=/ },
  { id: 'S31', signatureClass: 'hardcoded-secret', forces: ['security', 'compliance'], scope: 'code', entropy: true,
    // Generic "<credential-ish name> = '<long high-entropy literal>'".
    pattern: /\b(secret|token|passwd|password|api[_-]?key|apikey|access[_-]?key|client[_-]?secret|private[_-]?key|auth[_-]?token|bearer)\b\s*[:=]\s*['"][^'"]{12,200}['"]/i },

  // ── Cryptographic failures ──────────────────────────────────────────────────
  { id: 'S26', signatureClass: 'weak-hash', forces: ['security'], scope: 'code',
    pattern: /\bcreateHash\s*\(\s*['"](md5|sha1)['"]|\bcreateHmac\s*\(\s*['"](md5|sha1)['"]/i },
  { id: 'S27', signatureClass: 'crypto-weak-random', forces: ['security'], scope: 'code',
    pattern: /\bMath\.random\s*\(/,
    also: /\b(token|secret|password|otp|nonce|salt|session|api[_-]?key|csrf|iv|uuid|guid|reset)\b/i },
  { id: 'S27b', signatureClass: 'crypto-weak-random', forces: ['security'], scope: 'code',
    pattern: /\bpseudoRandomBytes\s*\(/ },
  { id: 'S28', signatureClass: 'weak-cipher', forces: ['security'], scope: 'code',
    pattern: /\bcreateCipher\s*\(|\bcreateDecipher\s*\(|\bcreateCipheriv\s*\(\s*['"](des|des-ede3?|rc4|rc2|bf|blowfish|aes-\d{3}-ecb)/i },
  { id: 'S29', signatureClass: 'hardcoded-crypto-material', forces: ['security'], scope: 'code',
    pattern: /\b(salt|iv|secret[_-]?key|encryption[_-]?key)\b\s*[:=]\s*['"][0-9a-fA-F]{16,128}['"]/i },

  // ── Security-control disablement / misconfiguration ─────────────────────────
  { id: 'S10', signatureClass: 'security-control-disabled', forces: ['security', 'compliance'], scope: 'code',
    pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]|\b(bypassAuth|skipAuth|disableAuth)\b\s*[:=]\s*true|\bverify\s*:\s*false\b/ },
  { id: 'S30', signatureClass: 'security-control-disabled', forces: ['security'], scope: 'code',
    pattern: /secureProtocol\s*:\s*['"]?(TLSv1(_method)?|SSLv3|SSLv2)['"]?|minVersion\s*:\s*['"]TLSv1['"]|\bSSLv3_method\b|\bSSLv2_method\b/ },

  // ── Auth surface ────────────────────────────────────────────────────────────
  { id: 'S11', signatureClass: 'auth-surface-change', forces: ['security', 'compliance'], scope: 'path',
    pattern: /(^|\/)([^/]*auth[^/]*|.*jwt.*|.*session.*|.*permission.*|.*rbac.*)\.(ts|tsx|js|jsx|py|go|rb|java)$/i },
  { id: 'S12', signatureClass: 'auth-check-removed', forces: ['security'], scope: 'code',
    pattern: /\b(requireAuth|authenticate|authorize|ensureAuthenticated|isAuthenticated)\b/ }, // evaluated against REMOVED lines

  // ── Change-surface routing ──────────────────────────────────────────────────
  { id: 'S13', signatureClass: 'dependency-change', forces: ['bloat', 'compliance', 'security'], scope: 'path',
    pattern: /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|requirements\.txt|go\.mod|Gemfile)$/i },
  { id: 'S14', signatureClass: 'infra-change', forces: ['architecture', 'security'], scope: 'path',
    pattern: /(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|.*\.tf|.*\.tfvars)$|(^|\/)\.github\/workflows\// },
  { id: 'S15', signatureClass: 'data-layer-change', forces: ['data_dx'], scope: 'path',
    pattern: /migration|(^|\/)schema\.(ts|prisma|sql)$|\.sql$/i },
];

/**
 * Runs the deterministic floor over a diff. Pure and synchronous — no sandbox, no I/O, no tokens.
 */
export function scanDiff(rawDiff: string, changedFiles: string[]): FloorResult {
  const added = addedLines(rawDiff);
  const addedLineList = added.split('\n');
  const hasTaint = REQUEST_TAINT.test(added);
  const removedLineList = (rawDiff.match(/^-(?!-).*/gm) ?? []).map((l) => l.slice(1));

  const matches: FloorMatch[] = [];

  for (const rule of RULES) {
    if (rule.scope === 'path') {
      const hit = changedFiles.find((f) => rule.pattern.test(f));
      if (hit) matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: hit });
      continue;
    }

    // S12 is a deletion signal: an auth guard removed and not re-added (i.e. a real removal, not a move).
    if (rule.id === 'S12') {
      const removedGuard = removedLineList.find((l) => rule.pattern.test(clip(l)));
      const stillPresent = addedLineList.some((l) => rule.pattern.test(clip(l)));
      if (removedGuard && !stillPresent) {
        matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: redact(removedGuard) });
      }
      continue;
    }

    // Per-line predicate path for rules with a co-occurrence or entropy requirement (precision).
    if (rule.also || rule.entropy) {
      const line = addedLineList.find((l) => {
        const c = clip(l);
        if (!rule.pattern.test(c)) return false;
        if (rule.also && !rule.also.test(c)) return false;
        if (rule.entropy && !looksHighEntropy(c)) return false;
        return true;
      });
      if (line) matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: redact(line) });
      continue;
    }

    // Whole-hunk match path (catches multi-line constructs such as templated SQL).
    if (!rule.pattern.test(added)) continue;
    if (rule.needsRequestTaint && !hasTaint) continue;
    const line = addedLineList.find((l) => rule.pattern.test(clip(l))) ?? '';
    matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: redact(line) });
  }

  const forcedAgents = [...new Set(matches.flatMap((m) => m.forces))];
  const signatureClasses = [...new Set(matches.map((m) => m.signatureClass))];
  return {
    matches,
    forcedAgents,
    signatureClasses,
    hasSecuritySignature: forcedAgents.includes('security'),
  };
}
