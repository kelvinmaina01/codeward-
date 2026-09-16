// ─── Shared presentation vocabulary for findings ─────────────────────────────
// One Finding record, one row, one drawer. Dashboard, Alerts, Security and Debt
// report all render the same `/api/alerts` shape through these primitives, so the
// visual rules (severity rail, exposure chip, type scale) are defined exactly once.
// Everything is expressed through the `cw-*` theme tokens so the three app themes
// keep working. Pure helpers only — no state lives here.

export type Exposure = 'DIRECT' | 'TRANSITIVE';

/** The real `/api/alerts` row. Identical across every consumer. */
export interface RealAlert {
  id: string;
  kind: 'finding' | 'escalation' | 'autofix' | string;
  severity: 'CRITICAL' | 'HIGH' | 'INFO' | string;
  category?: string | null;
  title: string;
  description: string;
  source: string;
  repo: string;
  file?: string | null;
  line?: number | null;
  evidence?: string | null;
  suggestedFix?: string | null;
  htmlUrl?: string | null;
  exposure?: Exposure | string | null;
  runId?: number;
  repoId?: number;
  createdAt?: string;
}

export type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

export const TONE_PILL: Record<Tone, string> = {
  neutral: 'bg-cw-bg3 text-cw-txt2 border-cw-bdr',
  green: 'bg-cw-green/10 text-cw-green border-cw-green/30',
  amber: 'bg-cw-amber/10 text-cw-amber border-cw-amber/30',
  red: 'bg-cw-red/10 text-cw-red border-cw-red/30',
  blue: 'bg-cw-blue/10 text-cw-blue border-cw-blue/30',
  purple: 'bg-cw-purple/10 text-cw-purple border-cw-purple/30',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-cw-txt3',
  green: 'bg-cw-green',
  amber: 'bg-cw-amber',
  red: 'bg-cw-red',
  blue: 'bg-cw-blue',
  purple: 'bg-cw-purple',
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-cw-txt3',
  green: 'text-cw-green',
  amber: 'text-cw-amber',
  red: 'text-cw-red',
  blue: 'text-cw-blue',
  purple: 'text-cw-purple',
};

// Type scale. Nothing a user must read goes below 12px; body rows are 14px.
export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cw-purple/60 focus-visible:ring-offset-1 focus-visible:ring-offset-cw-bg';
export const EYEBROW = 'text-[11px] font-medium uppercase tracking-wider text-cw-txt3';
export const BTN_BASE = `inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
export const BTN_PRIMARY = `${BTN_BASE} h-8 px-3 bg-cw-purple text-white border border-cw-purple hover:brightness-110 active:brightness-95`;
export const BTN_SECONDARY = `${BTN_BASE} h-8 px-3 bg-cw-bg2 text-cw-txt border border-cw-bdr hover:bg-cw-bg3`;
export const BTN_SUCCESS = `${BTN_BASE} h-8 px-3 bg-cw-green text-white border border-cw-green hover:brightness-110 active:brightness-95`;
export const BTN_GHOST_SM = `${BTN_BASE} h-7 px-2 text-[12px] bg-transparent text-cw-txt2 border border-cw-bdr hover:bg-cw-bg3 hover:text-cw-txt`;
export const BTN_LINK = `inline-flex items-center gap-1 rounded-sm text-[12px] font-medium text-cw-purple hover:text-cw-txt bg-transparent border-none p-0 cursor-pointer transition-colors ${FOCUS_RING}`;
export const INPUT = `h-8 bg-cw-bg2 border border-cw-bdr text-cw-txt rounded-md px-2 text-[13px] ${FOCUS_RING}`;
export const SELECT = `appearance-none h-8 bg-cw-bg2 border border-cw-bdr text-cw-txt2 hover:text-cw-txt text-[13px] rounded-md pl-2.5 pr-7 cursor-pointer ${FOCUS_RING}`;

export function severityTone(severity: string | undefined | null): Tone {
  if (severity === 'CRITICAL') return 'red';
  if (severity === 'HIGH') return 'amber';
  return 'blue';
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Exposure — mirrors the backend policy engine's `deriveExposure()` so a row with no
// declared exposure is still grouped the way the gate actually treated it.
const DEPENDENCY_CATEGORIES = new Set(['CVE', 'SUPPLY_CHAIN', 'DEPENDENCY']);
const VENDOR_PATH = /(^|\/)(node_modules|vendor|\.venv|site-packages)(\/|$)/i;
const MANIFEST_PATH = /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|requirements\.txt|go\.sum|Cargo\.lock|Gemfile\.lock)$/i;

export function deriveExposure(a: Pick<RealAlert, 'kind' | 'exposure' | 'category' | 'file'>): Exposure {
  if (a.kind !== 'finding') return 'DIRECT';
  const declared = String(a.exposure ?? '').trim().toUpperCase();
  if (declared === 'TRANSITIVE' || declared === 'INDIRECT') return 'TRANSITIVE';
  if (declared === 'DIRECT') return 'DIRECT';
  const category = String(a.category ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const file = String(a.file ?? '').trim();
  if (!DEPENDENCY_CATEGORIES.has(category)) return 'DIRECT';
  if (!file || VENDOR_PATH.test(file) || MANIFEST_PATH.test(file)) return 'TRANSITIVE';
  return 'DIRECT';
}

export function isAdvisory(a: RealAlert): boolean {
  return a.kind === 'finding' && deriveExposure(a) === 'TRANSITIVE';
}

export function groupByExposure<T extends RealAlert>(alerts: T[]): { blocking: T[]; advisory: T[] } {
  const blocking: T[] = [];
  const advisory: T[] = [];
  for (const a of alerts) (isAdvisory(a) ? advisory : blocking).push(a);
  return { blocking, advisory };
}

/** Short mono locator for a row: `src/x.ts:83`, or the package path for a CVE. */
export function locatorOf(a: Pick<RealAlert, 'file' | 'line'>): string | null {
  const file = String(a.file ?? '').trim();
  if (!file) return null;
  const m = file.match(/node_modules\/(?:.*node_modules\/)?((?:@[^/]+\/)?[^/]+)$/);
  const shown = m ? m[1] : file;
  return a.line != null ? `${shown}:${a.line}` : shown;
}

/** Strips a machine prefix like `[Codeward] HIGH:` from a GitHub issue title. */
export function stripIssuePrefix(title: string): string {
  return title.replace(/^\s*\[codeward\]\s*/i, '').replace(/^(CRITICAL|HIGH|MEDIUM|LOW|INFO)\s*:\s*/i, '').trim();
}
