/**
 * ============================================================================
 * Finding Policy Engine — the backend's final say on what developers see
 * ============================================================================
 *
 * Prompts are probabilistic. This module is not. Every finding an agent emits
 * passes through here before it is persisted, aggregated, or shown on GitHub,
 * and the gate decision is computed here from validated structured data rather
 * than taken from whatever the model put in its `gateDecision` field.
 *
 * Two independent gates, deliberately:
 *   - persistence  — everything survives, so the dashboard keeps full history
 *   - surfacing    — only high-severity/high-confidence findings reach GitHub
 *
 * Suppression is therefore never data loss: a suppressed finding is still
 * stored and still visible in-product, it just doesn't interrupt a developer.
 * That is what lets the surfacing bar be strict without losing recall.
 */

export type CanonicalSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type EvidenceStrength = 'STRONG' | 'WEAK' | 'NONE';

/**
 * How reachable the issue is from an attacker's position — the axis that decides whether a
 * finding is worth *stopping a merge* over, as distinct from severity, which describes impact.
 *
 *   DIRECT      the developer's own code, or a direct production dependency. Blocks.
 *   TRANSITIVE  a CVE in a devDependency, build tool, or nested dependency with no traced path
 *               from a production entry point. Reported, never blocks.
 *
 * Without this axis severity was the only dial and it governed surfacing and blocking together,
 * so the only way to stop blocking on a transitive CVE was to downgrade it below the surface
 * floor — which deleted it from the report entirely. Exposure decouples "worth telling you"
 * from "worth stopping you".
 */
export type Exposure = 'DIRECT' | 'TRANSITIVE';

export const SEVERITY_RANK: Record<CanonicalSeverity, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0,
};

/** Categories that are never worth interrupting a developer over, regardless of model severity. */
const NON_SURFACING_CATEGORIES = new Set([
  'STYLE', 'NAMING', 'FORMATTING', 'LINT', 'DOCUMENTATION', 'DOC_DRIFT',
  'BEST_PRACTICE', 'READABILITY', 'COGNITIVE_LOAD', 'YAGNI', 'TODO',
]);

/**
 * Phrases signalling the model is unsure the issue EXISTS — not merely describing impact.
 * Bare "could"/"might" are deliberately excluded: "an attacker could read any user's row"
 * is a correct impact statement, and matching it would suppress real vulnerabilities.
 * Only multi-word uncertainty markers count, and a hit downgrades confidence one notch
 * rather than suppressing outright.
 */
const UNCERTAINTY_PATTERNS: RegExp[] = [
  /\bmay be (?:vulnerable|susceptible|exposed|affected|unsafe)\b/i,
  /\bmight be (?:vulnerable|susceptible|exposed|affected|unsafe)\b/i,
  /\bcould (?:potentially|possibly|conceivably)\b/i,
  /\bpotentially (?:vulnerable|unsafe|exploitable)\b/i,
  /\bit (?:is|'s) possible that\b/i,
  /\b(?:appears|seems) to be\b/i,
  /\b(?:likely|probably|presumably) (?:a |an )?(?:vulnerab|issue|bug|problem)/i,
  /\bif this (?:is|were|was)\b/i,
  /\bassuming (?:that )?\b/i,
  /\bcannot (?:be )?(?:confirm|verif)/i,
  /\bunable to (?:confirm|verify|determine)\b/i,
  /\bconsider (?:whether|refactor|using|adding)\b/i,
  /\bin theory\b/i,
  /\btheoretically\b/i,
];

/** A finding as agents actually emit it. Every field optional — models omit things. */
export interface RawFinding {
  severity?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  file?: unknown;
  line?: unknown;
  toolName?: unknown;
  rawEvidence?: unknown;
  suggestedFix?: unknown;
  dismissed?: unknown;
  dismissalReason?: unknown;
  /** Optional, additive: agents that assess their own certainty supply it; absent is fine. */
  confidence?: unknown;
  /** Optional, additive: DIRECT | TRANSITIVE. Absent falls back to inference — see deriveExposure. */
  exposure?: unknown;
  /**
   * Optional, additive: where a `dismissed: true` came from.
   *   SELF_TRIAGE  the agent examined this code itself this run (a fixture, a mock, a dummy value).
   *   HUMAN        a person on the team dismissed it.
   *   MEMORY       the agent is deferring to a claim in agent_memory it did not re-verify.
   * Absent behaves exactly as before — a plain suppression — so existing agents are unaffected.
   */
  dismissalSource?: unknown;
  cveId?: unknown;
  [key: string]: unknown;
}

export type SuppressionReason =
  | 'DISMISSED_BY_MEMORY'
  | 'NON_SURFACING_CATEGORY'
  | 'BELOW_SEVERITY_FLOOR'
  | 'INSUFFICIENT_EVIDENCE'
  | 'LOW_CONFIDENCE';

export interface AssessedFinding {
  finding: RawFinding;
  severity: CanonicalSeverity;
  confidence: Confidence;
  evidence: EvidenceStrength;
  exposure: Exposure;
  surfaced: boolean;
  blocking: boolean;
  suppressionReason: SuppressionReason | null;
  /** Set when the finding is reported but deliberately not allowed to block. */
  advisory: boolean;
  /**
   * Chain-of-custody result for the declared `toolName`.
   *   true   the tool really ran this run — the evidence can be trusted to its full strength.
   *   false  no executed tool matches the declared name; evidence was capped at WEAK.
   *   null   no executed-tool list was supplied, so the claim was not checked (legacy callers).
   */
  evidenceVerified: boolean | null;
  /** An agent deferred to an unverified memory dismissal; reported anyway, but never blocking. */
  dismissalContested: boolean;
}

/**
 * Tool names are compared loosely on purpose. The shared reporting discipline teaches agents to
 * write `toolName: "semgrep"` (shared-discipline.ts worked example) while the registered tool is
 * `run_semgrep`, and real corpus findings mix both spellings — an exact match would brand honest
 * findings as fabricated, which is a far worse failure than the one this check exists to stop.
 * Agents may also legitimately cite an external tool whose output they read (e.g. eslint in a CI
 * log); that is why a miss only *caps* evidence rather than suppressing the finding.
 */
const TOOL_PREFIX = /^(run|check|scan|analyse|analyze|get|list|fetch)[_-]?/;

export function normalizeToolName(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase().replace(TOOL_PREFIX, '').replace(/[^a-z0-9]/g, '');
}

/** True when a declared toolName plausibly refers to one of the tools actually executed. */
export function toolWasExecuted(declared: unknown, executedTools: readonly string[]): boolean {
  const d = normalizeToolName(declared);
  if (!d) return false;
  for (const e of executedTools) {
    const n = normalizeToolName(e);
    if (!n) continue;
    if (n === d) return true;
    // Containment covers "semgrep" vs "run_semgrep_scan"; the length floor stops "read" from
    // matching half the registry.
    if (d.length >= 4 && n.includes(d)) return true;
    if (n.length >= 4 && d.includes(n)) return true;
  }
  return false;
}

export function normalizeSeverity(raw: unknown): CanonicalSeverity {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Some agents self-score 1-10; map onto the canonical bands.
    if (raw >= 9) return 'CRITICAL';
    if (raw >= 8) return 'HIGH';
    if (raw >= 5) return 'MEDIUM';
    if (raw >= 3) return 'LOW';
    return 'INFO';
  }
  const s = String(raw ?? '').trim().toUpperCase();
  if (s in SEVERITY_RANK) return s as CanonicalSeverity;
  if (s === 'BLOCKER' || s === 'SEVERE') return 'CRITICAL';
  if (s === 'WARNING' || s === 'WARN') return 'MEDIUM';
  if (s === 'NOTE' || s === 'NOTICE' || s === 'NONE') return 'INFO';
  // Unrecognised severity is treated as the least alarming value rather than guessed upward.
  return 'INFO';
}

function normalizeConfidence(raw: unknown): Confidence | null {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === 'HIGH' || s === 'MEDIUM' || s === 'LOW') return s;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 0.8) return 'HIGH';
    if (raw >= 0.5) return 'MEDIUM';
    return 'LOW';
  }
  return null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Evidence is assessed from the fields agents already emit — no schema change required.
 * STRONG means a reader could independently check the claim: a concrete location plus
 * the actual tool output that produced it.
 */
export function assessEvidence(f: RawFinding, executedTools?: readonly string[]): EvidenceStrength {
  const file = str(f.file).trim();
  if (!file) return 'NONE';

  const rawEvidence = str(f.rawEvidence).trim();
  const toolName = str(f.toolName).trim();
  const hasLine = typeof f.line === 'number' && Number.isFinite(f.line);

  let strength: EvidenceStrength;
  if (toolName && rawEvidence.length >= 24 && hasLine) strength = 'STRONG';
  else if (toolName && rawEvidence.length >= 24) strength = 'STRONG';
  else if (rawEvidence.length >= 24 || (toolName && hasLine)) strength = 'WEAK';
  else strength = 'WEAK';

  // Chain of custody. `toolName` and `rawEvidence` are model-authored strings, so on their own
  // they prove only that the model can type — a fabricated tool name plus 24 invented characters
  // earned STRONG evidence, which is the one path to a merge block. agent-loop.ts has always
  // recorded what actually ran; this is the first place that record is consulted. Unverifiable
  // evidence is capped at WEAK rather than discarded: the finding still reaches the developer,
  // it just cannot gate their merge on a claim nothing corroborates.
  if (strength === 'STRONG' && executedTools && !toolWasExecuted(toolName, executedTools)) {
    return 'WEAK';
  }
  return strength;
}

export function hasUncertaintyLanguage(f: RawFinding): boolean {
  const text = `${str(f.title)} ${str(f.description)}`;
  return UNCERTAINTY_PATTERNS.some((re) => re.test(text));
}

/**
 * Confidence is about whether the issue is REAL, which is independent of how bad it would
 * be if it were. A model-supplied value is trusted as a ceiling but still capped by the
 * evidence actually provided, so an agent cannot assert HIGH confidence with nothing to show.
 */
export function assessConfidence(f: RawFinding, evidence: EvidenceStrength): Confidence {
  const declared = normalizeConfidence(f.confidence);
  let confidence: Confidence = declared ?? (evidence === 'STRONG' ? 'HIGH' : evidence === 'WEAK' ? 'MEDIUM' : 'LOW');

  // A declared confidence can never exceed what the evidence supports.
  if (evidence === 'NONE') confidence = 'LOW';
  else if (evidence === 'WEAK' && confidence === 'HIGH') confidence = 'MEDIUM';

  if (hasUncertaintyLanguage(f)) {
    confidence = confidence === 'HIGH' ? 'MEDIUM' : 'LOW';
  }
  return confidence;
}

export interface PolicyOptions {
  /** Lowest severity allowed to reach a developer on GitHub. Default HIGH. */
  surfaceFloor?: CanonicalSeverity;
  /** Lowest severity allowed to block a merge. Default HIGH. */
  blockFloor?: CanonicalSeverity;
  /**
   * Lowest severity allowed to reach a developer for dependency-advisory findings. Default
   * MEDIUM — deliberately one notch below `surfaceFloor`, because a transitive CVE is worth
   * reporting even when it is not worth blocking, and the old single floor deleted it instead.
   */
  advisorySurfaceFloor?: CanonicalSeverity;
  /**
   * Tool names actually executed by the agent that produced these findings, from the
   * `toolsExecuted` chain-of-custody log. Omit to skip the check entirely — every existing
   * caller and the regression corpus therefore keep today's behaviour unchanged.
   */
  executedTools?: readonly string[];
  /**
   * Allow an agent's `dismissalSource: "MEMORY"` to suppress outright, as it did before this
   * option existed. Default false: agent-written memory is unauthenticated, so it may de-escalate
   * a finding to an advisory but may not delete it.
   */
  trustAgentMemoryDismissals?: boolean;
}

/** Categories whose findings describe a dependency advisory rather than the developer's code. */
const DEPENDENCY_CATEGORIES = new Set(['CVE', 'SUPPLY_CHAIN', 'DEPENDENCY']);

/** Paths that only ever appear for code the developer did not write. */
const VENDOR_PATH = /(^|\/)(node_modules|vendor|\.venv|site-packages)(\/|$)/i;

/** Manifests: a CVE reported against one of these is an advisory, not a reachable call site. */
const MANIFEST_PATH = /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|requirements\.txt|go\.sum|Cargo\.lock|Gemfile\.lock)$/i;

/**
 * Establishes how reachable a finding is.
 *
 * The agent's own `exposure` field wins when supplied — it has the package manifest in front of
 * it and can tell a direct dependency from a nested one. When absent (older agents, other
 * providers) it is inferred conservatively: a dependency-category finding that points at a
 * vendored path or a lockfile, or that carries a CVE id with no first-party file, is an
 * advisory. Everything else defaults to DIRECT, so an unclassified finding keeps today's
 * blocking behaviour rather than silently becoming un-blockable.
 */
export function deriveExposure(f: RawFinding): Exposure {
  const declared = str(f.exposure).trim().toUpperCase();
  if (declared === 'TRANSITIVE' || declared === 'INDIRECT') return 'TRANSITIVE';
  if (declared === 'DIRECT') return 'DIRECT';

  const category = str(f.category).trim().toUpperCase().replace(/[\s-]+/g, '_');
  const file = str(f.file).trim();
  const isDependencyFinding = DEPENDENCY_CATEGORIES.has(category) || !!str(f.cveId).trim();

  if (!isDependencyFinding) return 'DIRECT';
  if (VENDOR_PATH.test(file) || MANIFEST_PATH.test(file) || !file) return 'TRANSITIVE';

  // A CVE pinned to a real first-party source file means someone traced it to a call site.
  return 'DIRECT';
}

/**
 * Classify one finding. Surfacing requires severity at/above the floor, evidence a human
 * could check, and confidence that the issue is real. Blocking additionally requires the
 * strongest form of both — a severe claim with weak support becomes a comment, not a gate.
 */
export function assessFinding(f: RawFinding, opts: PolicyOptions = {}): AssessedFinding {
  const surfaceFloor = opts.surfaceFloor ?? 'HIGH';
  const blockFloor = opts.blockFloor ?? 'HIGH';
  const advisorySurfaceFloor = opts.advisorySurfaceFloor ?? 'MEDIUM';

  const severity = normalizeSeverity(f.severity);
  const evidence = assessEvidence(f, opts.executedTools);
  const confidence = assessConfidence(f, evidence);
  const exposure = deriveExposure(f);
  const evidenceVerified = opts.executedTools
    ? toolWasExecuted(f.toolName, opts.executedTools)
    : null;

  const base = { finding: f, severity, confidence, evidence, exposure, evidenceVerified };
  const suppress = (reason: SuppressionReason): AssessedFinding => ({
    ...base, surfaced: false, blocking: false, advisory: false, dismissalContested: false, suppressionReason: reason,
  });

  // A dismissal the agent reached itself this run — a dummy value in a fixture, a mock, an
  // example file — is exactly the false-positive triage this pipeline wants and still suppresses
  // outright. What does not is an agent deferring to an *unverified memory* claim: agent_memory
  // is written by agents, unauthenticated and never expiring, so one hallucinated "the team
  // dismissed this" would otherwise erase a real finding on every future run, permanently, from
  // the highest-precedence branch in this engine. Such a dismissal may now de-escalate a finding
  // to a non-blocking advisory, but it may not delete it.
  let dismissalContested = false;
  if (f.dismissed === true) {
    const source = str(f.dismissalSource).trim().toUpperCase();
    const isUnverifiedMemory = (source === 'MEMORY' || source === 'AGENT_MEMORY') && !opts.trustAgentMemoryDismissals;
    if (!isUnverifiedMemory) return suppress('DISMISSED_BY_MEMORY');
    dismissalContested = true;
  }

  const category = str(f.category).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (NON_SURFACING_CATEGORIES.has(category)) return suppress('NON_SURFACING_CATEGORY');

  // A transitive dependency advisory is reported one severity notch lower than first-party code,
  // because the whole point is that it stays visible without stopping the merge.
  const effectiveSurfaceFloor = exposure === 'TRANSITIVE' ? advisorySurfaceFloor : surfaceFloor;
  if (SEVERITY_RANK[severity] < SEVERITY_RANK[effectiveSurfaceFloor]) return suppress('BELOW_SEVERITY_FLOOR');
  if (evidence === 'NONE') return suppress('INSUFFICIENT_EVIDENCE');
  if (confidence === 'LOW') return suppress('LOW_CONFIDENCE');

  const blocking =
    !dismissalContested &&
    exposure === 'DIRECT' &&
    SEVERITY_RANK[severity] >= SEVERITY_RANK[blockFloor] &&
    confidence === 'HIGH' &&
    evidence === 'STRONG';

  // Surfaced, severe and well-evidenced, but held back from the gate — either because it is not
  // reachable from first-party code, or because an unverified memory dismissal contested it.
  // This is the flag the PR comment uses to say "FYI" rather than "fix this before merging".
  const advisory = !blocking && (exposure === 'TRANSITIVE' || dismissalContested);

  return { ...base, surfaced: true, blocking, advisory, dismissalContested, suppressionReason: null };
}

export interface PolicyResult {
  assessed: AssessedFinding[];
  surfaced: RawFinding[];
  suppressed: Array<{ finding: RawFinding; reason: SuppressionReason }>;
  blocking: RawFinding[];
  /** Counts by suppression reason — the signal that tells us if a prompt change went too far. */
  /** Surfaced, but deliberately non-blocking — transitive dependency advisories. */
  advisory: RawFinding[];
  suppressionBreakdown: Record<string, number>;
  /**
   * Surfaced findings whose declared `toolName` matched nothing the agent actually ran. Not a
   * suppression — these still reach the developer — but the count is the tripwire for an agent
   * that has started inventing its evidence, and it belongs in run telemetry.
   */
  unverifiedEvidenceCount: number;
}

export function applyFindingPolicy(findings: RawFinding[] | null | undefined, opts: PolicyOptions = {}): PolicyResult {
  const list = Array.isArray(findings) ? findings : [];
  const assessed = list.map((f) => assessFinding(f, opts));

  const suppressionBreakdown: Record<string, number> = {};
  for (const a of assessed) {
    if (a.suppressionReason) {
      suppressionBreakdown[a.suppressionReason] = (suppressionBreakdown[a.suppressionReason] ?? 0) + 1;
    }
  }

  return {
    assessed,
    surfaced: assessed.filter((a) => a.surfaced).map((a) => a.finding),
    suppressed: assessed
      .filter((a) => a.suppressionReason !== null)
      .map((a) => ({ finding: a.finding, reason: a.suppressionReason as SuppressionReason })),
    blocking: assessed.filter((a) => a.blocking).map((a) => a.finding),
    advisory: assessed.filter((a) => a.advisory).map((a) => a.finding),
    suppressionBreakdown,
    unverifiedEvidenceCount: assessed.filter((a) => a.evidenceVerified === false).length,
  };
}

export type GateDecision = 'PASS' | 'WARN' | 'BLOCK';

/**
 * The gate decision, owned by the backend.
 *
 * Deliberately max-based, never additive and never averaged: a pile of medium findings
 * does not add up to a block, and one genuine critical is not diluted by quiet agents.
 * The model's own gateDecision is not consulted.
 */
export function decideGate(assessed: AssessedFinding[]): { decision: GateDecision; reasons: string[] } {
  const blocking = assessed.filter((a) => a.blocking);
  if (blocking.length > 0) {
    return {
      decision: 'BLOCK',
      reasons: blocking.map((a) => {
        const loc = str(a.finding.file) ? ` (${str(a.finding.file)}${typeof a.finding.line === 'number' ? `:${a.finding.line}` : ''})` : '';
        return `[${a.severity}] ${str(a.finding.title) || 'Untitled finding'}${loc}`;
      }),
    };
  }

  const surfacedNonBlocking = assessed.filter((a) => a.surfaced);
  if (surfacedNonBlocking.length > 0) {
    return {
      decision: 'WARN',
      reasons: surfacedNonBlocking.map((a) => {
        // Advisories are labelled so the developer can see at a glance that the merge is not
        // gated on them — the difference between "fix before merging" and "worth knowing".
        const prefix = a.dismissalContested
          ? `[${a.severity}/advisory · dismissed by unverified memory — not blocking]`
          : a.advisory
          ? `[${a.severity}/advisory · not blocking]`
          : `[${a.severity}/${a.confidence} confidence]`;
        return `${prefix} ${str(a.finding.title) || 'Untitled finding'}`;
      }),
    };
  }

  return { decision: 'PASS', reasons: [] };
}
