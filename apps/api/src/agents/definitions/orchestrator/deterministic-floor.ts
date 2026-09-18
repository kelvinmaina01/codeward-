/**
 * ============================================================================
 * Routing v2 — Layer 0: The Deterministic Floor
 * ============================================================================
 *
 * See docs/architecture/routing-v2-design.md §2.
 *
 * A pure, token-free pass over the raw diff that runs BEFORE any model. A signature match
 * force-dispatches the relevant deep agent and bypasses LLM routing entirely — the point being
 * that the trigger is the malicious *code itself*, which an attacker cannot remove without
 * removing the attack, rather than the PR title/description, which is attacker-controlled prose.
 *
 * INVARIANT (design doc §0): no LLM decision may be the sole reason the security review does not
 * run. This module is one of the two mechanisms that enforce it — the other being the existing
 * `mandatory: !isDocOrConfigOnly` flag on the security agent. Where that flag already guarantees
 * security runs on any code change, this floor adds the *specialist* forcing (data_dx on raw SQL,
 * architecture on IaC, compliance on secrets/auth) and, more importantly, surfaces the concrete
 * vulnerability class so the risk profile handed downstream is no longer a thin keyword guess.
 *
 * Detection is regex-first (design doc §2.2): a cheap lexical match, and for the taint-shaped
 * classes (file/URL sinks fed by request data) a pragmatic co-occurrence check within the added
 * hunk. Full AST/data-flow taint is deliberately future work; it lowers the false-FORCE rate but
 * is not required for correctness, because a false force costs a Layer-2 debunk, never a miss.
 * The floor is HIGH-RECALL by design: we would rather force a needless deep review than let a
 * signatured vuln through.
 */

export type SignatureClass =
  | 'command-injection'
  | 'code-injection'
  | 'dynamic-code-load'
  | 'unsafe-deserialization'
  | 'path-traversal'
  | 'sql-injection'
  | 'ssrf'
  | 'hardcoded-secret'
  | 'security-control-disabled'
  | 'auth-surface-change'
  | 'auth-check-removed'
  | 'dependency-change'
  | 'infra-change'
  | 'data-layer-change';

export interface FloorSignature {
  id: string; // S1..S15, matching the design-doc table
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

/** Added-line content of a unified diff (strips the leading '+', excludes '+++' file headers). */
function addedLines(rawDiff: string): string {
  return (rawDiff.match(/^\+(?!\+).*/gm) ?? []).map((l) => l.slice(1)).join('\n');
}

/** Longest run of base64/hex-ish chars in a string — a cheap entropy proxy for secret detection. */
function looksHighEntropy(s: string): boolean {
  const m = s.match(/[A-Za-z0-9+/_-]{20,}/g);
  if (!m) return false;
  return m.some((tok) => {
    const unique = new Set(tok).size;
    // A long token drawing on a wide character set is unlikely to be a normal identifier.
    return tok.length >= 24 && unique >= 12;
  });
}

function redact(line: string): string {
  return line.trim().replace(/\s+/g, ' ').slice(0, 120);
}

/**
 * The signature table (design doc §2.1). Each entry is evaluated against either the added-line
 * text (`code`) or the changed-file list (`path`). Taint-shaped rows additionally require request
 * data to co-occur in the added text, which is what `needsRequestTaint` expresses.
 */
interface Rule extends FloorSignature {
  scope: 'code' | 'path';
  pattern: RegExp;
  needsRequestTaint?: boolean;
  entropy?: boolean;
}

const REQUEST_TAINT = /\breq(uest)?\.(params|query|body|headers|cookies)\b|\bctx\.request\b/i;

const RULES: Rule[] = [
  { id: 'S1', signatureClass: 'command-injection', forces: ['security'], scope: 'code',
    pattern: /\bchild_process\b|\.(exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/ },
  { id: 'S2', signatureClass: 'code-injection', forces: ['security'], scope: 'code',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(|\bvm\.runIn(New|This)Context\s*\(/ },
  { id: 'S3', signatureClass: 'dynamic-code-load', forces: ['security'], scope: 'code',
    pattern: /\b(require|import)\s*\(\s*(?!['"`])/ }, // require/import with a non-string-literal argument
  { id: 'S4', signatureClass: 'unsafe-deserialization', forces: ['security'], scope: 'code',
    pattern: /\bos\.system\s*\(|\bsubprocess\.[A-Za-z_]+\([^)]*shell\s*=\s*True|\bpickle\.loads\s*\(|\byaml\.load\s*\((?![^)]*Safe)/ },
  { id: 'S5', signatureClass: 'path-traversal', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\bfs\.(readFile|readFileSync|createReadStream|writeFile|writeFileSync)\s*\(|\bres\.sendFile\s*\(/ },
  { id: 'S6', signatureClass: 'path-traversal', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\bpath\.(join|resolve)\s*\(/ },
  { id: 'S7', signatureClass: 'sql-injection', forces: ['security', 'data_dx'], scope: 'code',
    // A .query/.raw/.execute call opened with either a template literal containing `${…}` OR a
    // quoted string immediately followed by `+` (string concatenation). Parameterised calls that
    // pass a plain string plus a values array (`'… $1', [x]`) match neither branch.
    pattern: /\.(query|raw|execute)\s*\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+)/ },
  { id: 'S8', signatureClass: 'ssrf', forces: ['security'], scope: 'code', needsRequestTaint: true,
    pattern: /\b(fetch|axios|got|http\.request|https\.request)\s*\(/ },
  { id: 'S9', signatureClass: 'hardcoded-secret', forces: ['security', 'compliance'], scope: 'code', entropy: true,
    pattern: /\bAKIA[0-9A-Z]{16}\b|\bASIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bghp_[A-Za-z0-9]{20,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bsk_live_[A-Za-z0-9]{20,}|:\/\/[^\s:@/]+:[^\s:@/]+@/ },
  { id: 'S10', signatureClass: 'security-control-disabled', forces: ['security', 'compliance'], scope: 'code',
    pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]|\b(bypassAuth|skipAuth|disableAuth)\b\s*[:=]\s*true|\bverify\s*:\s*false\b/ },
  { id: 'S11', signatureClass: 'auth-surface-change', forces: ['security', 'compliance'], scope: 'path',
    pattern: /(^|\/)([^/]*auth[^/]*|.*jwt.*|.*session.*|.*permission.*|.*rbac.*)\.(ts|tsx|js|jsx|py|go|rb|java)$/i },
  { id: 'S12', signatureClass: 'auth-check-removed', forces: ['security'], scope: 'code',
    // Evaluated against REMOVED lines separately (see scanDiff): a deleted auth guard.
    pattern: /\b(requireAuth|authenticate|authorize|ensureAuthenticated|isAuthenticated)\b/ },
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
  const hasTaint = REQUEST_TAINT.test(added);
  const removed = (rawDiff.match(/^-(?!-).*/gm) ?? []).map((l) => l.slice(1)).join('\n');

  const matches: FloorMatch[] = [];

  for (const rule of RULES) {
    if (rule.scope === 'path') {
      const hit = changedFiles.find((f) => rule.pattern.test(f));
      if (hit) matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: hit });
      continue;
    }

    // S12 is a deletion signal: an auth guard removed from the diff.
    const haystack = rule.id === 'S12' ? removed : added;
    if (rule.id === 'S12') {
      // Only count it as a removed guard if it isn't also re-added (a move/rename, not a removal).
      if (rule.pattern.test(removed) && !rule.pattern.test(added)) {
        const line = removed.split('\n').find((l) => rule.pattern.test(l)) ?? '';
        matches.push({ id: rule.id, signatureClass: rule.signatureClass, forces: rule.forces, sample: redact(line) });
      }
      continue;
    }

    if (!rule.pattern.test(haystack)) continue;
    if (rule.needsRequestTaint && !hasTaint) continue; // taint-shaped rows require request data in the hunk
    if (rule.entropy && !(/\bAKIA|ASIA|-----BEGIN|ghp_|xox|sk_live_/.test(haystack) || looksHighEntropy(haystack))) continue;

    const line = haystack.split('\n').find((l) => rule.pattern.test(l)) ?? '';
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
