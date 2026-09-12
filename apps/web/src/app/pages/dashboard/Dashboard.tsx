import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ShieldAlert, Bot, Key, GitMerge, X as XIcon, Plus, AlertTriangle, CheckCircle2,
  Scissors, Cpu, Shield, ArrowRight, ArrowUpRight, ChevronDown, Timer, LoaderCircle,
  ShieldCheck, GitCommitHorizontal, GitPullRequest, Activity, CircleDot, Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_URL, WS_URL } from '../../../lib/api';
import { RepoSelector } from '../../components/shared/RepoSelector';
import { Search01Icon, Add01Icon, File01Icon, Award01Icon } from 'hugeicons-react';

function getAgentIdFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('security')) return 'security';
  if (lower.includes('guardian')) return 'guardian';
  if (lower.includes('bloat')) return 'bloat';
  if (lower.includes('broken code') || lower.includes('broken_code')) return 'broken_code';
  if (lower.includes('architecture') || lower.includes('n+1')) return 'architecture';
  if (lower.includes('compliance')) return 'compliance';
  if (lower.includes('data dx') || lower.includes('data_dx')) return 'data_dx';
  return 'orchestrator';
}

// ─── Presentation vocabulary ─────────────────────────────────────────────────
// The visual system for this page is derived from the Codeward brand language
// (LandingHero): a dark ground with hairline borders, a single purple accent,
// green / amber / red / blue status semantics, monospace for technical
// identifiers and small uppercase tracked labels for section headers. Everything
// is expressed through the shared `cw-*` theme tokens so the dashboard renders
// correctly in every app theme (dark, cream, white).

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

const TONE_PILL: Record<Tone, string> = {
  neutral: 'bg-cw-bg3 text-cw-txt2 border-cw-bdr',
  green: 'bg-cw-green/10 text-cw-green border-cw-green/25',
  amber: 'bg-cw-amber/10 text-cw-amber border-cw-amber/25',
  red: 'bg-cw-red/10 text-cw-red border-cw-red/25',
  blue: 'bg-cw-blue/10 text-cw-blue border-cw-blue/25',
  purple: 'bg-cw-purple/10 text-cw-purple border-cw-purple/25',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-cw-txt3',
  green: 'bg-cw-green',
  amber: 'bg-cw-amber',
  red: 'bg-cw-red',
  blue: 'bg-cw-blue',
  purple: 'bg-cw-purple',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cw-purple/60 focus-visible:ring-offset-1 focus-visible:ring-offset-cw-bg';
const MICRO_LABEL = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-cw-txt3';
const BTN_BASE = `inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
const BTN_PRIMARY = `${BTN_BASE} px-3 py-1.5 bg-cw-purple text-white border border-cw-purple hover:brightness-110 active:brightness-95`;
const BTN_SECONDARY = `${BTN_BASE} px-3 py-1.5 bg-cw-bg2 text-cw-txt border border-cw-bdr hover:bg-cw-bg3 hover:border-cw-txt3/50`;
const BTN_SUCCESS = `${BTN_BASE} px-3 py-1.5 bg-cw-green text-white border border-cw-green hover:brightness-110 active:brightness-95`;
const BTN_GHOST_SM = `${BTN_BASE} px-2 py-1 text-[11px] bg-transparent text-cw-txt2 border border-cw-bdr hover:bg-cw-bg3 hover:text-cw-txt`;
const BTN_LINK = `inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-cw-purple hover:text-cw-txt bg-transparent border-none p-0 cursor-pointer transition-colors ${FOCUS_RING}`;
const INPUT = `bg-cw-bg2 border border-cw-bdr text-cw-txt rounded-md px-2 py-1 text-[11px] ${FOCUS_RING}`;

interface Props {
  onRunClick?: (repoId: number, runId: number) => void;
}

interface RecentRun {
  runId: number;
  repoId: number;
  repoFullName: string;
  commitSha: string;
  prNumber?: number | null;
  status: string;
  overallScore: number | null;
  createdAt: string;
}

interface PendingApproval {
  id: number;
  repoId: number;
  repoFullName: string;
  runId: number | null;
  agentId: string;
  pullRequestNumber: number;
  prUrl: string | null;
  prTitle: string | null;
  guardianVerdict: string | null;
  maxSeverity: string | null;
  mode: 'manual' | 'auto';
  deadlineAt: string | null;
  status: string;
  createdAt: string;
}

function deadlineLabel(deadlineAt: string | null): string | null {
  if (!deadlineAt) return null;
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return 'auto-merging now';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `auto-merges in ${h}h ${m}m` : `auto-merges in ${m}m`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const RUN_STATUS_TONE: Record<string, Tone> = {
  completed: 'green',
  running: 'blue',
  queued: 'neutral',
  failed: 'red',
  agent_failed: 'red',
};

export interface ActivityEvent {
  id: string;
  text: string;
  time: string;
  icon: any;
  color: string;
  dotEmoji?: string;
  highlightText?: string;
  badgeStyle?: string;
}

const DEFAULT_MOCK_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'mock-1',
    text: 'Security Agent found hardcoded Stripe key in payments-api config.js:14',
    highlightText: 'auto-fix ready',
    time: '2 min ago',
    icon: Key,
    color: 'text-cw-red',
    dotEmoji: '🔴',
    badgeStyle: 'bg-cw-red/10 text-cw-red border-cw-red/30'
  },
  {
    id: 'mock-2',
    text: 'Guardian Agent posted review on PR #214 · score 89/100',
    highlightText: '1 change requested',
    time: '4 min ago',
    icon: Shield,
    color: 'text-cw-purple',
    dotEmoji: '💜',
    badgeStyle: 'bg-cw-purple/10 text-cw-purple border-cw-purple/30'
  },
  {
    id: 'mock-3',
    text: 'Bloat Agent removed 247 dead code lines from frontend',
    highlightText: 'validateEmail() merged to utils/',
    time: '4 min ago',
    icon: Scissors,
    color: 'text-cw-amber',
    dotEmoji: '🟡',
    badgeStyle: 'bg-cw-amber/10 text-cw-amber border-cw-amber/30'
  },
  {
    id: 'mock-4',
    text: 'Broken Code Agent · auth-service 142/142 tests passing',
    highlightText: 'coverage 84%',
    time: '1 hour ago',
    icon: CheckCircle2,
    color: 'text-cw-green',
    dotEmoji: '🟢',
    badgeStyle: 'bg-cw-green/10 text-cw-green border-cw-green/30'
  },
  {
    id: 'mock-5',
    text: 'Architecture Agent detected N+1 on /api/users · JOIN fix reduces 40% latency',
    highlightText: 'GitHub Issue #88 created',
    time: '3 hours ago',
    icon: Cpu,
    color: 'text-cw-blue',
    dotEmoji: '🔵',
    badgeStyle: 'bg-cw-blue/10 text-cw-blue border-cw-blue/30'
  },
  {
    id: 'mock-6',
    text: 'Orchestrator blocked payments-api merge · Critical security finding unresolved',
    highlightText: 'score 0/100',
    time: '3 hours ago',
    icon: ShieldAlert,
    color: 'text-cw-red',
    dotEmoji: '📊',
    badgeStyle: 'bg-cw-red/10 text-cw-red border-cw-red/30'
  }
];

const processFeedEvent = (data: any, defaultTime: string = 'Just now'): ActivityEvent | null => {
  if (data.type === 'agent_active' || data.type === 'agent_completed' || data.type === 'agent_failed') {
    const { repo, sha, agent, score, error } = data.payload;
    let text = '';
    let icon = Bot;
    let color = 'text-cw-purple';
    let dotEmoji = '🤖';

    const agentName = agent.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Agent';
    const shortSha = sha ? sha.substring(0, 6) : '';

    if (data.type === 'agent_active') {
      text = `${agentName} started scanning ${repo} on commit ${shortSha}`;
      color = 'text-cw-blue';
      dotEmoji = '🔵';
    } else if (data.type === 'agent_completed') {
      text = `${agentName} finished scanning ${repo}. Score: ${score}/100`;
      color = 'text-cw-green';
      dotEmoji = '🟢';
    } else if (data.type === 'agent_failed') {
      text = `${agentName} failed on ${repo}: ${error}`;
      color = 'text-cw-red';
      icon = ShieldAlert;
      dotEmoji = '🔴';
    }

    let timeLabel = defaultTime;
    if (data.timestamp) {
      const ms = Date.now() - new Date(data.timestamp).getTime();
      const mins = Math.floor(ms / 60000);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) timeLabel = `${days}d ago`;
      else if (hours > 0) timeLabel = `${hours}h ago`;
      else if (mins > 0) timeLabel = `${mins} min ago`;
    }

    return {
      id: data.timestamp ? `feed-${new Date(data.timestamp).getTime()}-${Math.random()}` : Date.now().toString() + Math.random().toString(),
      text,
      time: timeLabel,
      icon,
      color,
      dotEmoji,
      badgeStyle: `bg-cw-bg3 text-cw-txt2 border-cw-bdr`
    };
  }
  return null;
};

// ─── UI preview (development only, opt-in) ───────────────────────────────────
// Lets the dashboard be reviewed visually against an empty local database.
// This is a presentation-only fallback: real state, fetches, effects and
// setters are never touched. When enabled and a piece of real state is empty,
// the *display* substitutes representative values that match the real types.
//
//   VITE_DASHBOARD_UI_PREVIEW=true            populated preview (default)
//   ...?ui_preview=loading                    force every loading state
//   ...?ui_preview=empty                      show the real (empty) states
//
// Both conditions are required, so this can never activate in a production
// build (import.meta.env.DEV is false there).
const UI_PREVIEW_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_UI_PREVIEW === 'true';

type DashboardStats = {
  repositoriesProtected: number;
  runsToday: number;
  debtRemoved: number;
  refactorsApplied: number;
  interventions: number;
  healthTrend: { date: string; score: number | null }[];
  debtTrend: { date: string; lines: number }[];
};

type HealthStats = {
  codebaseHealth: number | null;
  grade: string | null;
  debtThisWeek: {
    duplicateFunctions: number;
    deadCodeLines: number;
    securityIssues: number;
    nPlusOneQueries: number;
    aiEraIssues: number;
  };
};

const PREVIEW_DAYS = 30;
const previewDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const PREVIEW_STATS: DashboardStats = {
  repositoriesProtected: 12,
  runsToday: 34,
  debtRemoved: 1284,
  refactorsApplied: 57,
  interventions: 3,
  healthTrend: Array.from({ length: PREVIEW_DAYS }, (_, i) => ({
    date: previewDate(PREVIEW_DAYS - 1 - i).slice(0, 10),
    score: Math.min(100, Math.round(62 + i * 0.85 + Math.sin(i / 2.5) * 4)),
  })),
  debtTrend: Array.from({ length: PREVIEW_DAYS }, (_, i) => ({
    date: previewDate(PREVIEW_DAYS - 1 - i).slice(0, 10),
    lines: Math.round(38 * i + Math.abs(Math.sin(i / 3)) * 120),
  })),
};

const PREVIEW_HEALTH: HealthStats = {
  codebaseHealth: 87,
  grade: 'A',
  debtThisWeek: { duplicateFunctions: 14, deadCodeLines: 247, securityIssues: 3, nPlusOneQueries: 6, aiEraIssues: 21 },
};

const PREVIEW_HEALTH_DATA = PREVIEW_STATS.healthTrend.map((p, i) => ({ day: i + 1, score: p.score }));
const PREVIEW_DEBT_DATA = PREVIEW_STATS.debtTrend.map((p, i) => ({ day: i + 1, lines: -p.lines }));

const PREVIEW_REPOS: { id: number; fullName: string }[] = [
  { id: 1, fullName: 'codeward-ai/payments-api' },
  { id: 2, fullName: 'codeward-ai/auth-service' },
  { id: 3, fullName: 'codeward-ai/frontend' },
  { id: 4, fullName: 'codeward-ai/platform-infrastructure-shared-services-monorepo' },
];

const PREVIEW_RUNS: RecentRun[] = [
  { runId: 8812, repoId: 1, repoFullName: 'codeward-ai/payments-api', commitSha: 'a3f9c2e1b7d4', status: 'running', overallScore: null, createdAt: previewDate(0.002) },
  { runId: 8811, repoId: 2, repoFullName: 'codeward-ai/auth-service', commitSha: '5c1d0e9f2a6b', status: 'completed', overallScore: 92, createdAt: previewDate(0.02) },
  { runId: 8810, repoId: 3, repoFullName: 'codeward-ai/frontend', commitSha: 'e7b2a41c9d03', status: 'queued', overallScore: null, createdAt: previewDate(0.03) },
  { runId: 8809, repoId: 4, repoFullName: 'codeward-ai/platform-infrastructure-shared-services-monorepo', commitSha: '0d4e8f1a2b3c', status: 'failed', overallScore: 0, createdAt: previewDate(0.2) },
  { runId: 8808, repoId: 1, repoFullName: 'codeward-ai/payments-api', commitSha: '9b8a7c6d5e4f', status: 'agent_failed', overallScore: null, createdAt: previewDate(0.6) },
  { runId: 8807, repoId: 2, repoFullName: 'codeward-ai/auth-service', commitSha: '1f2e3d4c5b6a', status: 'completed', overallScore: 74, createdAt: previewDate(1.4) },
];

const PREVIEW_APPROVALS: PendingApproval[] = [
  {
    id: 9101, repoId: 1, repoFullName: 'codeward-ai/payments-api', runId: 8811, agentId: 'security',
    pullRequestNumber: 214, prUrl: 'https://github.com/codeward-ai/payments-api/pull/214',
    prTitle: 'fix(security): move Stripe secret from config.js to environment configuration',
    guardianVerdict: 'APPROVE', maxSeverity: 'CRITICAL', mode: 'auto',
    deadlineAt: new Date(Date.now() + 2.5 * 3_600_000).toISOString(), status: 'pending', createdAt: previewDate(0.03),
  },
  {
    id: 9102, repoId: 4, repoFullName: 'codeward-ai/platform-infrastructure-shared-services-monorepo', runId: 8809, agentId: 'bloat',
    pullRequestNumber: 88, prUrl: 'https://github.com/codeward-ai/platform-infrastructure-shared-services-monorepo/pull/88',
    prTitle: null, guardianVerdict: 'REQUEST_CHANGES', maxSeverity: 'HIGH', mode: 'manual',
    deadlineAt: null, status: 'pending', createdAt: previewDate(0.5),
  },
];

const PREVIEW_ALERTS: any[] = [
  {
    id: 'finding-8811-1', kind: 'finding', severity: 'CRITICAL', category: 'secrets',
    title: 'Hardcoded Stripe secret key committed to config.js',
    description: 'A live Stripe secret key is embedded in payments-api/config.js:14 and readable by anyone with repository access. Rotate the key and load it from the environment.',
    source: 'Security Agent', repo: 'codeward-ai/payments-api', file: 'config.js', line: 14,
    runId: 8811, repoId: 1, createdAt: previewDate(0.01),
  },
  {
    id: 'finding-8810-2', kind: 'finding', severity: 'HIGH', category: 'performance',
    title: 'N+1 query on GET /api/users loads organisations per row',
    description: 'UserController.list issues one organisation query per user. A JOIN reduces p95 latency by roughly 40% on the current dataset.',
    source: 'Architecture Agent', repo: 'codeward-ai/frontend', file: 'src/controllers/user.ts', line: 88,
    runId: 8810, repoId: 3, createdAt: previewDate(0.15),
  },
  {
    id: 'issue-131', kind: 'escalation', severity: 'HIGH',
    title: 'GitHub issue #131 opened: Legacy auth middleware bypasses rate limiting on /login',
    description: 'Codeward could not auto-fix this security finding and opened a real GitHub issue.',
    source: 'Guardian Agent', repo: 'codeward-ai/auth-service', htmlUrl: 'https://github.com/codeward-ai/auth-service/issues/131',
    runId: 8807, repoId: 2, createdAt: previewDate(1.4),
  },
  {
    id: 'pr-214', kind: 'autofix', severity: 'INFO',
    title: 'Auto-fix PR #214 opened — 2 fix(es)',
    description: 'Guardian reviewed it: APPROVE.',
    source: 'Security Agent + Guardian', repo: 'codeward-ai/payments-api', htmlUrl: 'https://github.com/codeward-ai/payments-api/pull/214',
    runId: 8811, repoId: 1, createdAt: previewDate(0.03),
  },
];

// ─── Presentational subcomponents (UI only) ──────────────────────────────────

function Pill({
  tone = 'neutral', dot = false, pulse = false, mono = false, className = '', children,
}: { tone?: Tone; dot?: boolean; pulse?: boolean; mono?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 py-[3px] rounded border text-[10px] font-semibold leading-none whitespace-nowrap ${mono ? 'font-mono' : ''} ${TONE_PILL[tone]} ${className}`}>
      {dot && (
        <span className={`relative inline-flex w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[tone]}`}>
          {pulse && <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${TONE_DOT[tone]}`} />}
        </span>
      )}
      {children}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-cw-bg3 animate-pulse rounded ${className}`} />;
}

function Panel({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={`bg-cw-bg2 border border-cw-bdr rounded-lg flex flex-col min-w-0 ${className}`}>
      {children}
    </section>
  );
}

function PanelHeader({
  title, description, count, actions,
}: { title: string; description?: string; count?: number; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 px-4 sm:px-5 py-3 border-b border-cw-bdr">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-cw-txt leading-5 flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {count != null && (
            <span className="font-mono text-[10px] font-semibold text-cw-txt2 bg-cw-bg3 border border-cw-bdr rounded px-1.5 py-px leading-4 tabular-nums shrink-0">
              {count}
            </span>
          )}
        </h2>
        {description && <p className="text-[11px] text-cw-txt3 leading-4 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">{actions}</div>}
    </div>
  );
}

function EmptyState({
  icon: Icon, title, hint, action,
}: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 px-4 py-8">
      <div className="w-8 h-8 rounded-md border border-dashed border-cw-bdr bg-cw-bg/60 flex items-center justify-center text-cw-txt3">
        <Icon size={14} />
      </div>
      <div className="text-[12px] font-medium text-cw-txt2">{title}</div>
      {hint && <div className="text-[11px] text-cw-txt3 max-w-[340px] leading-4">{hint}</div>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

function Metric({
  label, value, unit, hint, hintTone, loading, action, valueClass = 'text-cw-txt',
}: {
  label: string; value: ReactNode; unit?: string; hint?: ReactNode; hintTone?: Tone;
  loading?: boolean; action?: ReactNode; valueClass?: string;
}) {
  return (
    <div className="bg-cw-bg2 border-r border-b border-cw-bdr px-4 sm:px-5 py-4 flex flex-col gap-2 min-w-0">
      <span className={`${MICRO_LABEL} leading-4`}>{label}</span>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className={`text-[26px] leading-none font-semibold tracking-tight tabular-nums truncate ${valueClass}`}>{value}</span>
          {unit && <span className="text-[11px] text-cw-txt3 font-medium shrink-0">{unit}</span>}
        </div>
      )}
      {(hint || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
          {hint && (
            <div className="flex items-center gap-1.5 text-[11px] text-cw-txt3 leading-4 min-w-0">
              {hintTone && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[hintTone]}`} />}
              <span className="truncate">{hint}</span>
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}

function severityTone(severity: string | undefined): Tone {
  if (severity === 'CRITICAL') return 'red';
  if (severity === 'HIGH') return 'amber';
  return 'blue';
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--cw-bg2)',
  border: '1px solid var(--cw-bdr)',
  borderRadius: '6px',
  fontSize: '11px',
  padding: '6px 8px',
};

const DASHBOARD_RANGES: { value: string; label: string; title: string }[] = [
  { value: '7d', label: '7d', title: 'Last 7 Days' },
  { value: '30d', label: '30d', title: 'Last 30 Days' },
  { value: '3m', label: '3m', title: 'Last 3 Months' },
  { value: 'custom', label: 'Custom', title: 'Custom Date' },
];

export function Dashboard({ onRunClick }: Props) {
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    repositoriesProtected: number;
    runsToday: number;
    debtRemoved: number;
    refactorsApplied: number;
    interventions: number;
    healthTrend: { date: string; score: number | null }[];
    debtTrend: { date: string; lines: number }[];
  } | null>(null);

  const [healthStats, setHealthStats] = useState<{
    codebaseHealth: number | null;
    grade: string | null;
    debtThisWeek: {
      duplicateFunctions: number;
      deadCodeLines: number;
      securityIssues: number;
      nPlusOneQueries: number;
      aiEraIssues: number;
    };
  } | null>(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);

  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [feedLimit, setFeedLimit] = useState(5);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);

  const [alertTimeFilter, setAlertTimeFilter] = useState('all');
  const [customAlertDate, setCustomAlertDate] = useState('');
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState('30d');
  const [customDashboardDate, setCustomDashboardDate] = useState('');
  const [integrations, setIntegrations] = useState<{provider: string, status: string, updatedAt: string}[]>([]);

  const loadApprovals = () => {
    fetch(`${API_URL}/api/approvals?status=pending`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data?.approvals) setApprovals(data.approvals); })
      .catch(console.error)
      .finally(() => setLoadingApprovals(false));
  };

  const decideApproval = async (id: number, action: 'approve' | 'reject') => {
    setActingOn(id);
    try {
      const res = await fetch(`${API_URL}/api/approvals/${id}/${action}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        console.error(`Failed to ${action} approval #${id}:`, data?.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActingOn(null);
      loadApprovals();
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { repos: [] })
      .then((d) => setRepoList(d.repos ?? []))
      .catch(() => {});

    api.api.reports.recent.$get()
      .then((res) => res.json())
      .then((data) => {
        if ('runs' in data) setRecentRuns(data.runs as RecentRun[]);
      })
      .catch(console.error)
      .finally(() => setLoadingRuns(false));

    loadApprovals();
    const approvalsPoll = setInterval(loadApprovals, 30_000);

    fetch(`${API_URL}/api/reports/feed`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data?.feed && Array.isArray(data.feed)) {
          const events = data.feed.map((ev: any) => processFeedEvent(ev, '')).filter(Boolean);
          if (events.length > 0) setActivityFeed(events as ActivityEvent[]);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFeed(false));

    return () => clearInterval(approvalsPoll);
  }, []);

  useEffect(() => {
    setLoadingAlerts(true);
    let url = `${API_URL}/api/alerts?timeFilter=${alertTimeFilter}`;
    if (alertTimeFilter === 'custom' && customAlertDate) {
      url += `&since=${new Date(customAlertDate).getTime()}`;
    }
    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.alerts) setAlerts(data.alerts);
      })
      .catch(console.error)
      .finally(() => setLoadingAlerts(false));
  }, [alertTimeFilter, customAlertDate]);

  useEffect(() => {
    setLoadingStats(true);
    let url = `${API_URL}/api/stats/dashboard?timeFilter=${dashboardTimeFilter}`;
    if (dashboardTimeFilter === 'custom' && customDashboardDate) {
      url += `&since=${new Date(customDashboardDate).getTime()}`;
    }

    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!('error' in data)) {
          setStats({
            repositoriesProtected: data.repositoriesProtected || 0,
            runsToday: data.runsToday || 0,
            debtRemoved: data.debtRemoved || 0,
            refactorsApplied: data.refactorsApplied || 0,
            interventions: data.interventions || 0,
            healthTrend: Array.isArray(data.healthTrend) ? data.healthTrend : [],
            debtTrend: Array.isArray(data.debtTrend) ? data.debtTrend : [],
          });
          setHealthStats({
            codebaseHealth: data.codebaseHealth ?? null,
            grade: data.grade || null,
            debtThisWeek: data.debtThisWeek || {
              duplicateFunctions: 0,
              deadCodeLines: 0,
              securityIssues: 0,
              nPlusOneQueries: 0,
              aiEraIssues: 0,
            },
          });
          if ('integrations' in data && Array.isArray(data.integrations)) {
            setIntegrations(data.integrations as any);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, [dashboardTimeFilter, customDashboardDate]);

  useEffect(() => {
    // WebSocket connection for real-time activity feed & active runs
    const wsUrl = import.meta.env.VITE_WS_URL || `${WS_URL}/ws/feed`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        const newEvent = processFeedEvent(data);
        if (newEvent) {
          setActivityFeed((prev) => [newEvent, ...prev].slice(0, 50));
        }

        if (data.type === 'agent_active' || data.type === 'agent_completed' || data.type === 'agent_failed') {
          const { repo, sha, score, runId } = data.payload;

          // Real-time update to Active Runs state
          if (runId && repo) {
            setRecentRuns((prev) => {
              const status = data.type === 'agent_active' ? 'running' : (data.type === 'agent_completed' ? 'completed' : 'failed');
              const idx = prev.findIndex((r) => r.runId === runId);
              const updatedRun: RecentRun = {
                runId,
                repoId: prev[idx]?.repoId ?? 0,
                repoFullName: repo,
                commitSha: sha || 'baseline',
                status,
                overallScore: score ?? prev[idx]?.overallScore ?? null,
                createdAt: prev[idx]?.createdAt ?? new Date().toISOString(),
              };

              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updatedRun;
                return next;
              }
              return [updatedRun, ...prev].slice(0, 20);
            });
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          try { ws.close(); } catch {}
        };
      } else if (ws.readyState === WebSocket.OPEN) {
        try { ws.close(); } catch {}
      }
    };
  }, []);

  const filteredRuns = recentRuns.filter((r) => repoFilter === 'All' || r.repoFullName === repoFilter);

  const computedHealthData = useMemo(() => {
    return stats?.healthTrend?.map((p, i) => ({
      day: i + 1,
      score: p.score,
    })) ?? [];
  }, [stats?.healthTrend]);

  const computedDebtData = useMemo(() => {
    return stats?.debtTrend?.map((p, i) => ({
      day: i + 1,
      lines: -p.lines,
    })) ?? [];
  }, [stats?.debtTrend]);

  const getTimeLabel = () => {
    if (dashboardTimeFilter === '7d') return '7 days ago';
    if (dashboardTimeFilter === '3m') return '3 months ago';
    if (dashboardTimeFilter === 'custom' && customDashboardDate) {
      return new Date(customDashboardDate).toLocaleDateString();
    }
    return '30 days ago';
  };

  // ── Presentation view-model ────────────────────────────────────────────────
  // Real state above is the only source of truth. The `view*` values are what
  // the JSX renders: identical to real state in production, and only in the
  // opt-in development preview do empty real values fall back to sample data.
  const previewScenario = UI_PREVIEW_ENABLED
    ? new URLSearchParams(window.location.search).get('ui_preview')
    : null;
  const forceLoading = previewScenario === 'loading';
  const previewFallback = UI_PREVIEW_ENABLED && previewScenario !== 'loading' && previewScenario !== 'empty';

  const viewStats = stats ?? (previewFallback ? PREVIEW_STATS : null);
  const viewHealth = healthStats ?? (previewFallback ? PREVIEW_HEALTH : null);
  const statsPending = forceLoading || (previewFallback ? viewStats == null : (loadingStats || !stats));
  const healthPending = forceLoading || (previewFallback ? viewHealth == null : (loadingStats || !healthStats));
  const viewHealthData = previewFallback && !stats ? PREVIEW_HEALTH_DATA : computedHealthData;
  const viewDebtData = previewFallback && !stats ? PREVIEW_DEBT_DATA : computedDebtData;

  const viewRepoList = previewFallback && repoList.length === 0 ? PREVIEW_REPOS : repoList;
  const viewRuns = previewFallback && recentRuns.length === 0
    ? PREVIEW_RUNS.filter((r) => repoFilter === 'All' || r.repoFullName === repoFilter)
    : filteredRuns;
  const runsPending = forceLoading || (previewFallback ? false : loadingRuns);

  const viewApprovals = previewFallback && approvals.length === 0 ? PREVIEW_APPROVALS : approvals;
  const approvalsPending = forceLoading || (previewFallback ? false : (loadingApprovals && approvals.length === 0));

  const viewAlerts = previewFallback && alerts.length === 0 ? PREVIEW_ALERTS : alerts;
  const alertsPending = forceLoading || (previewFallback ? false : loadingAlerts);

  const viewFeed = previewFallback && activityFeed.length === 0 ? DEFAULT_MOCK_ACTIVITIES : activityFeed;
  const feedPending = forceLoading || (previewFallback ? false : (loadingFeed && activityFeed.length === 0));

  const rangeCaption =
    dashboardTimeFilter === '7d' ? '7 days'
    : dashboardTimeFilter === '3m' ? '3 months'
    : dashboardTimeFilter === 'custom' ? 'Custom range'
    : '30 days';

  const debtRows = viewHealth ? [
    { label: 'Duplicate functions', tone: 'red' as Tone, val: viewHealth.debtThisWeek.duplicateFunctions },
    { label: 'Dead code lines', tone: 'amber' as Tone, val: viewHealth.debtThisWeek.deadCodeLines },
    { label: 'Security issues', tone: 'red' as Tone, val: viewHealth.debtThisWeek.securityIssues },
    { label: 'N+1 queries', tone: 'blue' as Tone, val: viewHealth.debtThisWeek.nPlusOneQueries },
    { label: 'AI-era issues', tone: 'green' as Tone, val: viewHealth.debtThisWeek.aiEraIssues },
  ] : [];
  const debtMax = Math.max(1, ...debtRows.map((r) => r.val));

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-cw-bg text-cw-txt">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col gap-5">

        {/* ── Context bar: what this page is, plus global filters ───────────── */}
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[12px] text-cw-txt2 leading-5">
                Real-time overview of code health, active agents, and pending approvals across your repositories.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div role="group" aria-label="Time range" className="inline-flex items-center rounded-md border border-cw-bdr bg-cw-bg2 p-0.5">
                {DASHBOARD_RANGES.map((r) => {
                  const active = dashboardTimeFilter === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      title={r.title}
                      aria-pressed={active}
                      onClick={() => setDashboardTimeFilter(r.value)}
                      className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer ${FOCUS_RING} ${active ? 'bg-cw-bg3 text-cw-txt shadow-sm' : 'text-cw-txt3 hover:text-cw-txt'}`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              {dashboardTimeFilter === 'custom' && (
                <input
                  type="date"
                  aria-label="Custom start date"
                  value={customDashboardDate}
                  onChange={(e) => setCustomDashboardDate(e.target.value)}
                  className={INPUT}
                />
              )}
              <RepoSelector
                options={viewRepoList}
                value={repoFilter}
                onChange={(val, name) => setRepoFilter(val === 'All' ? 'All' : name)}
                showAllOption={true}
                allOptionLabel="All connected repositories"
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${MICRO_LABEL} mr-1 hidden sm:inline`}>Quick actions</span>
            <button type="button" onClick={() => navigate('/dashboard/staging')} className={BTN_PRIMARY}>
              <Search01Icon size={14} /> Run full audit
            </button>
            <button type="button" onClick={() => navigate('/dashboard/repos')} className={BTN_SECONDARY}>
              <Add01Icon size={14} className="text-cw-green" /> Connect new repo
            </button>
            <button type="button" onClick={() => navigate('/dashboard/agent?agent=chat')} className={BTN_SECONDARY}>
              <img src="/gordon.png" alt="" className="w-4 h-4 rounded-full border border-cw-bdr" /> Ask Codeward AI (Gordon)
            </button>
            <button type="button" onClick={() => navigate('/dashboard/debt')} className={BTN_SECONDARY}>
              <File01Icon size={14} className="text-cw-txt2" /> View debt report
            </button>
            <button type="button" onClick={() => navigate('/dashboard/cert')} className={BTN_SECONDARY}>
              <Award01Icon size={14} className="text-cw-amber" /> Share certificate
            </button>
          </div>
        </header>

        {/* ── Key metrics strip ─────────────────────────────────────────────── */}
        <section aria-label="Key metrics" className="rounded-lg border border-cw-bdr bg-cw-bg2 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 -mr-px -mb-px">
            <Metric
              label="Codebase health"
              loading={healthPending}
              value={viewHealth?.codebaseHealth != null ? viewHealth.codebaseHealth : '—'}
              unit={viewHealth?.codebaseHealth != null ? '/ 100' : undefined}
              valueClass="text-cw-green"
              hint={viewHealth?.grade ? `Grade ${viewHealth.grade} · latest completed scans` : 'No completed scans yet'}
              hintTone={viewHealth?.grade ? 'green' : undefined}
            />
            <Metric
              label="Repositories protected"
              loading={statsPending}
              value={viewStats ? viewStats.repositoriesProtected.toLocaleString() : '—'}
              hint="Active tracking"
              hintTone="green"
              action={
                <button type="button" onClick={() => navigate('/connect')} className={`${BTN_LINK} text-[10px] whitespace-nowrap`}>
                  <Plus size={11} /> Add repository
                </button>
              }
            />
            <Metric
              label="Runs today"
              loading={statsPending}
              value={viewStats ? viewStats.runsToday.toLocaleString() : '—'}
              hint="Automated workflow scans"
            />
            <Metric
              label="Debt removed"
              loading={statsPending}
              value={viewStats ? viewStats.debtRemoved.toLocaleString() : '—'}
              unit="files"
              hint="Files changed by merged refactors"
            />
            <Metric
              label="Interventions"
              loading={statsPending}
              value={viewStats ? viewStats.interventions.toLocaleString() : '—'}
              hint="Automatic rollbacks triggered"
            />
          </div>
        </section>

        {/* ── Trends ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Codebase health trend */}
          <Panel label="Codebase health trend" className="h-[260px]">
            <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4">
              <div className="min-w-0">
                <div className={MICRO_LABEL}>
                  Codebase health <span className="normal-case tracking-normal font-medium text-cw-txt3/80">· {rangeCaption}</span>
                </div>
                {statsPending ? (
                  <Skeleton className="h-7 w-20 mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-[24px] leading-none font-semibold tracking-tight tabular-nums text-cw-green">
                      {viewHealth?.codebaseHealth != null ? viewHealth.codebaseHealth : '—'}
                    </span>
                    {viewHealth?.codebaseHealth != null && <span className="text-[12px] text-cw-txt3">%</span>}
                  </div>
                )}
              </div>
              <Pill tone={viewHealth?.codebaseHealth != null ? 'green' : 'neutral'} dot pulse={viewHealth?.codebaseHealth != null}>
                {viewHealth?.codebaseHealth != null ? 'trend active' : 'no scans yet'}
              </Pill>
            </div>
            <div className="relative flex-1 min-h-0 px-2 mt-2">
              {statsPending ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <>
                  {viewHealthData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-cw-txt3">
                      No trend data for this range
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={viewHealthData}>
                      <XAxis dataKey="day" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={{ color: 'var(--cw-txt)' }}
                        labelStyle={{ color: 'var(--cw-txt3)' }}
                        cursor={{ stroke: 'var(--cw-bdr)' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="var(--cw-green)" fill="var(--cw-green)" fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
            <div className="flex justify-between px-4 sm:px-5 pb-3 pt-1.5 text-[10px] font-mono text-cw-txt3">
              <span>{getTimeLabel()}</span>
              <span>Today</span>
            </div>
          </Panel>

          {/* Cumulative debt removed */}
          <Panel label="Cumulative debt removed" className="h-[260px]">
            <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4">
              <div className="min-w-0">
                <div className={MICRO_LABEL}>
                  Cumulative debt removed <span className="normal-case tracking-normal font-medium text-cw-txt3/80">· {rangeCaption}</span>
                </div>
                {statsPending ? (
                  <Skeleton className="h-7 w-24 mt-1.5" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[24px] leading-none font-semibold tracking-tight tabular-nums text-cw-green">
                      {viewStats ? viewStats.debtRemoved.toLocaleString() : '—'}
                    </span>
                    <span className="text-[11px] text-cw-txt3">files</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[11px] text-cw-txt3 tabular-nums">{viewStats?.refactorsApplied ?? 0} refactors applied</span>
                <button type="button" onClick={() => navigate('/dashboard/diff')} className={BTN_GHOST_SM}>
                  View diff <ArrowUpRight size={11} />
                </button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 px-2 mt-2">
              {statsPending ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : (
                <>
                  {viewDebtData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-cw-txt3">
                      No refactors merged in this range
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={viewDebtData}>
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={{ color: 'var(--cw-green)' }}
                        labelStyle={{ color: 'var(--cw-txt3)' }}
                        cursor={{ stroke: 'var(--cw-bdr)' }}
                      />
                      <Area type="monotone" dataKey="lines" stroke="var(--cw-green)" fill="var(--cw-green)" fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
            <div className="flex justify-between px-4 sm:px-5 pb-3 pt-1.5 text-[10px] font-mono text-cw-txt3">
              <span>0</span>
              <span>{viewStats?.debtRemoved ?? 0} files refactored</span>
            </div>
          </Panel>
        </div>

        {/* ── Attention + system state ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left: things that need a decision */}
          <div className="xl:col-span-2 flex flex-col gap-4 min-w-0">

            {/* Pending merge approvals */}
            <Panel label="Pending merge approvals">
              <PanelHeader
                title="Pending merge approvals"
                description="Auto-fix pull requests waiting for your decision"
                count={approvalsPending ? undefined : viewApprovals.length}
              />
              <div className="p-3 flex flex-col gap-2">
                {approvalsPending ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-cw-bdr px-3.5 py-3 flex flex-col gap-2">
                      <Skeleton className="h-3.5 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))
                ) : viewApprovals.length === 0 ? (
                  <EmptyState
                    icon={GitMerge}
                    title="No auto-fix PRs awaiting a decision."
                    hint="When an agent opens a pull request that needs a human decision, it will show up here with a one-click merge or reject."
                  />
                ) : viewApprovals.map((a) => {
                  const acting = actingOn === a.id;
                  return (
                    <div
                      key={a.id}
                      className="rounded-md border border-cw-amber/30 bg-cw-amber/[0.04] px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:border-cw-amber/50"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={a.prUrl ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-1.5 min-w-0 text-[12.5px] font-semibold text-cw-txt no-underline hover:text-cw-purple transition-colors ${FOCUS_RING} rounded-sm`}
                        >
                          <span className="font-mono shrink-0">PR #{a.pullRequestNumber}</span>
                          <span className="text-cw-txt3 font-normal shrink-0">·</span>
                          <span className="truncate">{a.repoFullName}</span>
                          <ArrowUpRight size={12} className="shrink-0 text-cw-txt3" />
                        </a>
                        <div className="text-[12px] text-cw-txt2 mt-0.5 truncate">
                          {a.prTitle ?? `${a.agentId} auto-fix`}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <Pill tone="neutral" mono>{a.agentId}</Pill>
                          {a.guardianVerdict && (
                            <Pill tone={a.guardianVerdict === 'APPROVE' ? 'green' : 'amber'}>
                              Guardian: {a.guardianVerdict}
                            </Pill>
                          )}
                          {a.mode === 'auto' && a.deadlineAt && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-cw-amber">
                              <Timer size={11} /> {deadlineLabel(a.deadlineAt)} unless you act
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => decideApproval(a.id, 'approve')}
                          disabled={acting}
                          className={BTN_SUCCESS}
                        >
                          {acting ? <LoaderCircle size={12} className="animate-spin" /> : <GitMerge size={12} />} Merge now
                        </button>
                        <button
                          type="button"
                          onClick={() => decideApproval(a.id, 'reject')}
                          disabled={acting}
                          className={`${BTN_SECONDARY} hover:text-cw-red hover:border-cw-red/40`}
                        >
                          <XIcon size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* High priority alerts */}
            <Panel label="High priority alerts">
              <PanelHeader
                title="High priority alerts"
                description="Critical and high-severity findings from your agents"
                count={alertsPending ? undefined : viewAlerts.length}
                actions={
                  <>
                    <div className="relative">
                      <select
                        value={alertTimeFilter}
                        onChange={(e) => setAlertTimeFilter(e.target.value)}
                        aria-label="Alert time range"
                        className={`appearance-none bg-cw-bg2 border border-cw-bdr text-cw-txt2 hover:text-cw-txt text-[11px] rounded-md pl-2 pr-6 py-1 cursor-pointer ${FOCUS_RING}`}
                      >
                        <option value="all">All time</option>
                        <option value="1d">Yesterday</option>
                        <option value="7d">7 days</option>
                        <option value="15d">15 days</option>
                        <option value="custom">Custom date</option>
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-cw-txt3" />
                    </div>
                    {alertTimeFilter === 'custom' && (
                      <input
                        type="date"
                        aria-label="Alerts since date"
                        value={customAlertDate}
                        onChange={(e) => setCustomAlertDate(e.target.value)}
                        className={INPUT}
                      />
                    )}
                    <button type="button" onClick={() => navigate('/dashboard/alerts')} className={BTN_LINK}>
                      View all <ArrowRight size={12} />
                    </button>
                  </>
                }
              />
              <div className="p-3 flex flex-col gap-2">
                {alertsPending ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-cw-bdr px-3.5 py-3 flex items-start gap-3">
                      <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))
                ) : viewAlerts.length === 0 ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="No high priority alerts currently."
                    hint="Critical and high-severity findings, escalated issues and auto-fix PRs will be listed here as agents report them."
                  />
                ) : viewAlerts.slice(0, 3).map((alert, i) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  const isHigh = alert.severity === 'HIGH';
                  const tone = severityTone(alert.severity);

                  const hoverColor = isCritical ? 'hover:border-cw-red/40' : (isHigh ? 'hover:border-cw-amber/40' : 'hover:border-cw-blue/40');
                  const iconBgColor = isCritical ? 'bg-cw-red/10 border-cw-red/25 text-cw-red' : (isHigh ? 'bg-cw-amber/10 border-cw-amber/25 text-cw-amber' : 'bg-cw-blue/10 border-cw-blue/25 text-cw-blue');
                  const titleColor = isCritical ? 'text-cw-red' : (isHigh ? 'text-cw-amber' : 'text-cw-txt');
                  const actionColor = isCritical ? 'text-cw-red hover:text-cw-txt' : 'text-cw-purple hover:text-cw-txt';
                  const actionText = isCritical ? 'Resolve now' : (alert.kind === 'escalation' ? 'View issue' : 'View suggested fix');
                  const Icon = isCritical ? Key : (isHigh ? AlertTriangle : CircleDot);

                  return (
                    <article
                      key={alert.id || i}
                      className={`relative rounded-md border border-cw-bdr bg-cw-bg/50 pl-4 pr-3.5 py-3 transition-colors ${hoverColor}`}
                    >
                      <span aria-hidden="true" className={`absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full ${TONE_DOT[tone]}`} />
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${iconBgColor}`}>
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className={`text-[12.5px] font-semibold leading-5 truncate ${titleColor}`}>{alert.title}</div>
                            <div className="text-[10px] font-mono text-cw-txt3 shrink-0 leading-5">{timeAgo(alert.createdAt)}</div>
                          </div>
                          <p className="text-[11px] text-cw-txt2 leading-4 mt-0.5 line-clamp-2">{alert.description}</p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/alerts')}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold bg-transparent border-none p-0 cursor-pointer transition-colors rounded-sm ${FOCUS_RING} ${actionColor}`}
                            >
                              {actionText} <ArrowRight size={11} />
                            </button>
                            {alert.source && (
                              <div className="text-[10px] text-cw-txt3 font-medium truncate">
                                {alert.severity !== 'INFO' ? `${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1).toLowerCase()} · ` : ''}{alert.source}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* Right: current state of the codebase and the system */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* Codebase health */}
            <Panel label="Codebase health">
              <PanelHeader
                title="Codebase health"
                description="Latest completed scan avg across connected repos"
                actions={
                  <button type="button" onClick={() => navigate('/dashboard/cert')} className={BTN_LINK}>
                    Full cert <ArrowUpRight size={12} />
                  </button>
                }
              />
              <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
                {healthPending || !viewHealth ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                      <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <div className="border-t border-cw-bdr pt-4 flex flex-col gap-3">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 rounded-full border-[3px] border-cw-green bg-cw-green/5 flex items-center justify-center shrink-0">
                        <span className="text-[17px] font-semibold tabular-nums text-cw-green">
                          {viewHealth.codebaseHealth != null ? viewHealth.codebaseHealth : '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[18px] font-semibold tracking-tight tabular-nums text-cw-txt leading-6">
                          {viewHealth.codebaseHealth != null ? `${viewHealth.codebaseHealth} / 100` : 'No data yet'}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {viewHealth.grade ? (
                            <Pill tone="green">Grade {viewHealth.grade}</Pill>
                          ) : (
                            <span className="text-[11px] text-cw-txt3">Run a scan to establish a baseline</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-cw-bdr pt-4">
                      <div className={`${MICRO_LABEL} mb-3`}>Debt this week</div>
                      <div className="flex flex-col gap-2.5">
                        {debtRows.map((item) => {
                          const widthPct = Math.max(3, Math.round((item.val / debtMax) * 100));
                          return (
                            <div key={item.label} className="flex items-center gap-3 text-[11px]">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[item.tone]}`} />
                              <span className="text-cw-txt2 w-[120px] shrink-0 truncate">{item.label}</span>
                              <div className="flex-1 h-1 bg-cw-bg3 rounded-full overflow-hidden min-w-[40px]">
                                <div className={`h-full rounded-full ${TONE_DOT[item.tone]}`} style={{ width: `${widthPct}%` }} />
                              </div>
                              <span className="font-mono font-semibold tabular-nums text-cw-txt w-[44px] text-right shrink-0">{item.val.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Panel>

            {/* Active runs */}
            <Panel label="Active runs">
              <PanelHeader title="Active runs" description="Latest sandbox runs and their outcome" />
              <div className="p-2 flex flex-col">
                {runsPending ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-2 py-2 flex items-center gap-2.5">
                      <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))
                ) : viewRuns.length === 0 ? (
                  <EmptyState icon={Inbox} title="No active or recent runs." hint="Runs start automatically on new pull requests, or on demand from a full audit." />
                ) : viewRuns.slice(0, 4).map((run) => {
                  const isRunning = run.status === 'running' || run.status === 'queued';
                  const isFailed = run.status === 'failed' || run.status === 'agent_failed';
                  const tone: Tone = isRunning ? 'amber' : (isFailed ? 'red' : 'green');

                  let badgeText = '';
                  if (isRunning) badgeText = 'Running';
                  else if (isFailed) badgeText = 'Blocked';
                  else badgeText = run.overallScore != null ? `${run.overallScore}/100` : 'Pass';

                  return (
                    <button
                      type="button"
                      key={run.runId}
                      onClick={() => onRunClick?.(run.repoId, run.runId)}
                      className={`w-full text-left flex items-center justify-between gap-3 px-2 py-2 rounded-md hover:bg-cw-bg3/50 transition-colors cursor-pointer group bg-transparent border-none ${FOCUS_RING}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`relative w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[tone]}`}>
                          {isRunning && <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${TONE_DOT[tone]}`} />}
                        </span>
                        <img src={`https://github.com/${run.repoFullName.split('/')[0]}.png?size=32`} className="w-5 h-5 rounded-full bg-cw-bg3 shrink-0" alt="" />
                        <span className="text-[12.5px] font-medium text-cw-txt truncate group-hover:text-cw-purple transition-colors">
                          {run.repoFullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[10px] font-mono text-cw-txt3 hidden sm:inline-block tabular-nums">
                          {isRunning ? `${run.commitSha.substring(0, 6)} · ` : ''}{timeAgo(run.createdAt)}
                        </span>
                        <Pill tone={tone} mono className="min-w-[56px] justify-center">{badgeText}</Pill>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>

        {/* ── Recent sandbox activity ───────────────────────────────────────── */}
        <Panel label="Recent sandbox activity">
          <PanelHeader
            title="Recent sandbox activity"
            description="Every agent run across connected repositories"
            actions={
              <button type="button" onClick={() => navigate('/dashboard/livefeed')} className={BTN_LINK}>
                View all <ArrowRight size={12} />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/40">
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr">Pull Request / Target</th>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr">Repository</th>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr">Findings</th>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr">Status</th>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr">Time</th>
                  <th scope="col" className="px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                {runsPending ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 sm:px-5 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : viewRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        icon={GitPullRequest}
                        title={`No pull request runs found for ${repoFilter === 'All' ? 'connected repositories' : repoFilter}.`}
                        hint="Codeward triggers sandbox analysis on every new pull request. Open a pull request or trigger a baseline scan to see automated reviews."
                      />
                    </td>
                  </tr>
                ) : viewRuns.map((run) => (
                  <tr
                    key={run.runId}
                    onClick={() => onRunClick?.(run.repoId, run.runId)}
                    className="hover:bg-cw-bg3/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 sm:px-5 py-2.5 whitespace-nowrap">
                      {run.prNumber ? (
                        <span className="inline-flex items-center gap-1.5 text-cw-purple font-medium">
                          <GitPullRequest size={13} className="text-cw-purple shrink-0" />
                          PR #{run.prNumber}
                        </span>
                      ) : run.commitSha === 'baseline' ? (
                        <span className="inline-flex items-center gap-1.5 text-cw-green font-medium">
                          <ShieldCheck size={13} className="text-cw-green shrink-0" />
                          Baseline audit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-cw-txt2">
                          <GitCommitHorizontal size={12} className="text-cw-txt3 shrink-0" />
                          {run.commitSha.slice(0, 7)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 font-medium text-cw-txt max-w-[280px]">
                      <span className="block truncate group-hover:text-cw-purple transition-colors">{run.repoFullName}</span>
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-cw-txt2 whitespace-nowrap tabular-nums">
                      {run.overallScore != null ? `Score: ${run.overallScore}/100` : '—'}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 whitespace-nowrap">
                      <Pill
                        tone={RUN_STATUS_TONE[run.status] ?? 'neutral'}
                        dot
                        pulse={run.status === 'running'}
                        className="uppercase tracking-wider"
                      >
                        {run.status}
                      </Pill>
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-cw-txt3 whitespace-nowrap tabular-nums">{new Date(run.createdAt).toLocaleString()}</td>
                    <td className="px-4 sm:px-5 py-2.5 text-right whitespace-nowrap">
                      <span className={`${BTN_GHOST_SM} opacity-70 group-hover:opacity-100`}>
                        View report <ArrowUpRight size={11} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ── Agent activity ────────────────────────────────────────────────── */}
        <Panel label="Agent activity">
          <PanelHeader
            title="Agent activity"
            description="Autonomous actions, code reviews, and automated fixes executed across your projects."
            actions={
              <button
                type="button"
                onClick={() => navigate('/dashboard/livefeed')}
                className={`${BTN_SECONDARY} text-cw-green border-cw-green/30 hover:bg-cw-green/10 hover:border-cw-green/50`}
              >
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-cw-green">
                  <span className="absolute inset-0 rounded-full bg-cw-green animate-ping opacity-60" />
                </span>
                Live feed <ArrowRight size={12} />
              </button>
            }
          />
          <div className="flex flex-col divide-y divide-cw-bdr">
            {feedPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                  <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))
            ) : viewFeed.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No agent activity yet."
                hint="As agents scan, review and patch your repositories, each action is streamed here in real time."
              />
            ) : viewFeed.slice(0, feedLimit).map((item) => {
              const agentId = getAgentIdFromText(item.text);
              const Icon = item.icon ?? Bot;
              const openCanvas = () => {
                sessionStorage.setItem('cw_target_agent_id', agentId);
                navigate('/dashboard/livefeed');
              };
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={openCanvas}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openCanvas();
                    }
                  }}
                  className={`px-4 sm:px-5 py-2.5 flex items-start sm:items-center gap-3 hover:bg-cw-bg3/40 transition-colors cursor-pointer group ${FOCUS_RING} focus-visible:ring-inset`}
                >
                  <div className={`w-7 h-7 rounded-md border border-cw-bdr bg-cw-bg/60 flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[12.5px] text-cw-txt leading-5 break-words min-w-0">{item.text}</span>
                      {item.highlightText && (
                        <span className={`inline-flex items-center px-1.5 py-[3px] rounded border text-[10px] font-semibold leading-none whitespace-nowrap ${item.badgeStyle || 'bg-cw-bg3 text-cw-txt border-cw-bdr'}`}>
                          {item.highlightText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-cw-txt3 whitespace-nowrap tabular-nums">{item.time}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sessionStorage.setItem('cw_target_agent_id', agentId);
                        navigate('/dashboard/livefeed');
                      }}
                      title={`Open ${agentId} in Agent Canvas`}
                      className={`${BTN_BASE} px-2 py-1 text-[11px] bg-cw-purple/10 text-cw-purple border border-cw-purple/25 hover:bg-cw-purple hover:text-white hover:border-cw-purple`}
                    >
                      Canvas <ArrowRight size={11} />
                    </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {viewFeed.length > 5 && (
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setFeedLimit(feedLimit === 5 ? 50 : 5)}
                  className={`${BTN_BASE} w-full justify-center py-1.5 text-[11px] text-cw-txt3 hover:text-cw-txt bg-cw-bg/40 hover:bg-cw-bg3 border border-transparent hover:border-cw-bdr`}
                >
                  {feedLimit === 5 ? `View all activity (${viewFeed.length})` : 'Show less'}
                </button>
              </div>
            )}
          </div>
        </Panel>

        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  );
}
