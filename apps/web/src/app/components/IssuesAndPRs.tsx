import { useEffect, useMemo, useState } from 'react';
import {
  Loader, AlertCircle, CircleDot, CheckCircle2, GitPullRequest, GitMerge, XCircle,
  Clock, X as XIcon, MessageSquare, GitBranch, FileDiff, ShieldCheck, Bot, User as UserIcon,
} from 'lucide-react';
import { API_URL } from '../../lib/api';
import { GithubIcon, GithubLink } from './GithubLink';

// ── Real shapes returned by /api/issues-prs ──────────────────────────────────
interface RealIssue {
  id: string;
  repoId: number;
  repoFullName: string;
  issueNumber: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  severity: string | null;
  htmlUrl: string;
  comments: number;
  createdAt: string;
  closedAt: string | null;
}

interface HumanPrReview {
  reviewed?: boolean;
  event?: string;
  reason?: string;
}

interface RealPR {
  id: string;
  kind: 'autofix' | 'human';
  repoId: number;
  repoFullName: string;
  pullRequestNumber: number;
  prUrl: string | null;
  prTitle: string | null;
  agentId?: string;
  guardianVerdict?: string | null;
  maxSeverity?: string | null;
  mode?: string;
  deadlineAt?: string | null;
  status: string; // pending | approved | rejected | auto_merged | merge_failed | merging | merged | closed | open | unknown
  decidedBy?: string | null;
  decisionNote?: string | null;
  author?: string | null;
  headBranch?: string | null;
  baseBranch?: string | null;
  additions?: number | null;
  deletions?: number | null;
  changedFiles?: number | null;
  humanPrReview?: HumanPrReview | null;
  runId?: number;
  createdAt: string;
}

interface IssueComment {
  id: number;
  author: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  htmlUrl: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeUntil(deadlineAt: string | null | undefined): string | null {
  if (!deadlineAt) return null;
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return 'auto-merging now';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(ms / 60_000);
  return m > 0 ? `${m}m ago` : 'just now';
}

/** Real PR status → display label, color, icon. Covers our own auto-fix lifecycle AND live GitHub state. */
function prStatusMeta(pr: RealPR): { label: string; cls: string; Icon: any } {
  const onAutoMerge = pr.mode === 'auto' && pr.status === 'pending' && pr.deadlineAt;
  switch (pr.status) {
    case 'auto_merged': return { label: 'Auto-merged', cls: 'bg-cw-purple/10 text-cw-purple border-cw-purple/25', Icon: GitMerge };
    case 'approved':
    case 'merged': return { label: 'Merged', cls: 'bg-cw-green/10 text-cw-green border-cw-green/25', Icon: GitMerge };
    case 'rejected':
    case 'closed': return { label: pr.status === 'rejected' ? 'Rejected' : 'Closed', cls: 'bg-cw-red/10 text-cw-red border-cw-red/25', Icon: XCircle };
    case 'merge_failed': return { label: 'Merge failed', cls: 'bg-cw-red/10 text-cw-red border-cw-red/25', Icon: AlertCircle };
    case 'merging': return { label: 'Merging…', cls: 'bg-cw-amber/10 text-cw-amber border-cw-amber/25', Icon: Loader };
    case 'pending':
      return onAutoMerge
        ? { label: `Auto-merge in ${timeUntil(pr.deadlineAt)}`, cls: 'bg-cw-amber/10 text-cw-amber border-cw-amber/25', Icon: Clock }
        : { label: 'Awaiting review', cls: 'bg-cw-blue/10 text-cw-blue border-cw-blue/25', Icon: GitPullRequest };
    case 'open': return { label: 'Open', cls: 'bg-cw-green/10 text-cw-green border-cw-green/25', Icon: GitPullRequest };
    default: return { label: pr.status, cls: 'bg-cw-bg3 text-cw-txt3 border-cw-bdr', Icon: GitPullRequest };
  }
}

const sevChip: Record<string, string> = {
  CRITICAL: 'bg-cw-red/10 text-cw-red',
  HIGH: 'bg-cw-amber/10 text-cw-amber',
};

// ── Page ─────────────────────────────────────────────────────────────────────
export function IssuesAndPRs() {
  const [tab, setTab] = useState<'issues' | 'prs'>('issues');
  const [issues, setIssues] = useState<RealIssue[]>([]);
  const [prs, setPrs] = useState<RealPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoFilter, setRepoFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all');

  const [selectedIssue, setSelectedIssue] = useState<RealIssue | null>(null);
  const [selectedPr, setSelectedPr] = useState<RealPR | null>(null);
  const [comments, setComments] = useState<IssueComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/issues-prs/issues`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API_URL}/api/issues-prs/prs`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([iRes, pRes]) => {
        if (iRes?.error) throw new Error(iRes.error);
        if (pRes?.error) throw new Error(pRes.error);
        setIssues(iRes.issues || []);
        setPrs(pRes.prs || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Load the real GitHub comment thread when an issue drawer opens ("was it worked on?")
  useEffect(() => {
    if (!selectedIssue) { setComments(null); return; }
    setLoadingComments(true);
    setComments(null);
    fetch(`${API_URL}/api/issues-prs/issues/${selectedIssue.repoId}/${selectedIssue.issueNumber}/comments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [selectedIssue]);

  const repoOptions = useMemo(() => {
    const s = new Set<string>();
    issues.forEach((i) => s.add(i.repoFullName));
    prs.forEach((p) => s.add(p.repoFullName));
    return ['All', ...Array.from(s)];
  }, [issues, prs]);
  const orgOptions = useMemo(() => Array.from(new Set(repoOptions.filter((r) => r !== 'All').map((r) => r.split('/')[0]))), [repoOptions]);

  const matchRepo = (full: string) =>
    repoFilter === 'All' || full === repoFilter || (orgOptions.includes(repoFilter) && full.split('/')[0] === repoFilter);

  const visibleIssues = issues.filter((i) => matchRepo(i.repoFullName) && (stateFilter === 'all' || i.state === stateFilter));
  const visiblePrs = prs.filter((p) => matchRepo(p.repoFullName));

  const drawerOpen = !!(selectedIssue || selectedPr);
  const closeDrawer = () => { setSelectedIssue(null); setSelectedPr(null); };

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={24} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      {/* Main column pushes open when a drawer is showing */}
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div>
            <div className="text-[14px] font-medium text-cw-txt">Issues & PRs</div>
            <div className="text-[11px] text-cw-txt3">Real escalated GitHub issues and pull requests — proof of what your agents actually did.</div>
          </div>
          <div className="flex items-center gap-2.5">
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              className="bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] text-cw-txt py-2 px-3 outline-none focus:border-cw-purple max-w-[220px]"
            >
              <option value="All">All repos & workspaces</option>
              {orgOptions.length > 1 && <optgroup label="Workspaces">{orgOptions.map((o) => <option key={`org-${o}`} value={o}>{o} (workspace)</option>)}</optgroup>}
              <optgroup label="Repositories">{repoOptions.filter((r) => r !== 'All').map((r) => <option key={r} value={r}>{r}</option>)}</optgroup>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-cw-bdr bg-cw-bg2/40 shrink-0">
          <button
            onClick={() => setTab('issues')}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${tab === 'issues' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
          >
            <CircleDot size={15} /> Issues <span className="text-[11px] text-cw-txt3">({visibleIssues.length})</span>
          </button>
          <button
            onClick={() => setTab('prs')}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${tab === 'prs' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
          >
            <GitPullRequest size={15} /> Pull requests <span className="text-[11px] text-cw-txt3">({visiblePrs.length})</span>
          </button>
        </div>

        <div className="p-6">
          {tab === 'issues' ? (
            <>
              {/* Issue state filter shortcuts */}
              <div className="flex items-center gap-2 mb-4">
                {(['all', 'open', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStateFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors ${stateFilter === s ? 'bg-cw-purple text-white' : 'bg-cw-bg2 border border-cw-bdr text-cw-txt2 hover:text-cw-txt'}`}
                  >
                    {s === 'all' ? 'All' : s} {s !== 'all' && <span className="opacity-70">({issues.filter((i) => matchRepo(i.repoFullName) && i.state === s).length})</span>}
                  </button>
                ))}
              </div>

              {visibleIssues.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={32} className="text-cw-green" />}
                  title="No escalated issues"
                  sub="When an agent finds a critical problem it can't auto-fix, it opens a real GitHub issue — those appear here as proof of work."
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {visibleIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} onOpen={() => { closeDrawer(); setSelectedIssue(issue); }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {visiblePrs.length === 0 ? (
                <EmptyState
                  icon={<GitPullRequest size={32} className="text-cw-blue" />}
                  title="No pull requests yet"
                  sub="Codeward's auto-fix PRs and human PRs your guardian reviewed will appear here with real merge status."
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {visiblePrs.map((pr) => (
                    <PrCard key={pr.id} pr={pr} onOpen={() => { closeDrawer(); setSelectedPr(pr); }} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right push drawer */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${drawerOpen ? 'w-[520px] min-w-[360px] md:w-[440px] lg:w-[520px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {selectedIssue && (
          <IssueDrawer issue={selectedIssue} comments={comments} loadingComments={loadingComments} onClose={closeDrawer} />
        )}
        {selectedPr && (
          <PrDrawer pr={selectedPr} onClose={closeDrawer} />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 w-fit">{icon}</div>
      <div className="text-[14px] text-cw-txt2">{title}</div>
      <div className="text-[12px] text-cw-txt3 mt-1 max-w-md mx-auto">{sub}</div>
    </div>
  );
}

function IssueCard({ issue, onOpen }: { issue: RealIssue; onOpen: () => void }) {
  const open = issue.state === 'open';
  return (
    <button onClick={onOpen} className="text-left bg-cw-bg2 border border-cw-bdr rounded-xl p-4 hover:border-cw-purple/50 transition-colors flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GithubIcon size={15} className="text-cw-txt2 shrink-0" />
          {open
            ? <CircleDot size={15} className="text-cw-green shrink-0" />
            : <CheckCircle2 size={15} className="text-cw-purple shrink-0" />}
          <span className="text-[13px] font-semibold text-cw-txt truncate">{issue.title}</span>
        </div>
        {issue.severity && <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${sevChip[issue.severity] ?? 'bg-cw-bg3 text-cw-txt3'}`}>{issue.severity}</span>}
      </div>
      <div className="text-[12px] text-cw-txt2 line-clamp-2">{(issue.body || '').replace(/[#*`_>]/g, '').trim() || 'No description.'}</div>
      <div className="flex items-center gap-3 text-[11px] text-cw-txt3 mt-1">
        <span className="font-mono">{issue.repoFullName}</span>
        <span>#{issue.issueNumber}</span>
        <span className="flex items-center gap-1"><MessageSquare size={11} /> {issue.comments}</span>
        <span>{relTime(issue.createdAt)}</span>
      </div>
    </button>
  );
}

function PrCard({ pr, onOpen }: { pr: RealPR; onOpen: () => void }) {
  const meta = prStatusMeta(pr);
  return (
    <button onClick={onOpen} className="text-left bg-cw-bg2 border border-cw-bdr rounded-xl p-4 hover:border-cw-purple/50 transition-colors flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GithubIcon size={15} className="text-cw-txt2 shrink-0" />
          {pr.kind === 'autofix' ? <Bot size={15} className="text-cw-purple shrink-0" /> : <UserIcon size={15} className="text-cw-blue shrink-0" />}
          <span className="text-[13px] font-semibold text-cw-txt truncate">{pr.prTitle || `PR #${pr.pullRequestNumber}`}</span>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 flex items-center gap-1 ${meta.cls}`}><meta.Icon size={10} /> {meta.label}</span>
      </div>
      {pr.headBranch && pr.baseBranch && (
        <div className="flex items-center gap-1.5 text-[11px] text-cw-txt3">
          <GitBranch size={11} /> <span className="font-mono text-cw-txt2">{pr.headBranch}</span> → <span className="font-mono text-cw-txt2">{pr.baseBranch}</span>
        </div>
      )}
      <div className="flex items-center gap-3 text-[11px] text-cw-txt3 mt-1 flex-wrap">
        <span className="font-mono">{pr.repoFullName}</span>
        <span>#{pr.pullRequestNumber}</span>
        <span className="px-1.5 py-0.5 rounded bg-cw-bg3 text-[10px]">{pr.kind === 'autofix' ? 'Codeward auto-fix' : 'Human PR'}</span>
        <span>{relTime(pr.createdAt)}</span>
      </div>
    </button>
  );
}

// Full static class strings per tone — Tailwind's JIT only sees complete literals, never
// runtime-built `border-${x}` names, so we map them explicitly here.
const TONES: Record<string, { wrap: string; label: string }> = {
  'cw-purple': { wrap: 'border-cw-purple/25 bg-cw-purple/5', label: 'text-cw-purple' },
  'cw-blue': { wrap: 'border-cw-blue/25 bg-cw-blue/5', label: 'text-cw-blue' },
  'cw-green': { wrap: 'border-cw-green/25 bg-cw-green/5', label: 'text-cw-green' },
  'cw-amber': { wrap: 'border-cw-amber/25 bg-cw-amber/5', label: 'text-cw-amber' },
  'cw-red': { wrap: 'border-cw-red/25 bg-cw-red/5', label: 'text-cw-red' },
};

function Section({ color, title, icon, children }: { color: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const tone = TONES[color] ?? TONES['cw-purple'];
  return (
    <div className={`rounded-xl border p-3 mb-3 ${tone.wrap}`}>
      <div className={`text-[10px] font-bold ${tone.label} uppercase tracking-wide mb-1.5 flex items-center gap-1.5`}>{icon} {title}</div>
      {children}
    </div>
  );
}

function IssueDrawer({ issue, comments, loadingComments, onClose }: { issue: RealIssue; comments: IssueComment[] | null; loadingComments: boolean; onClose: () => void }) {
  const open = issue.state === 'open';
  return (
    <>
      <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cw-bg2 border border-cw-bdr ${open ? 'text-cw-green' : 'text-cw-purple'}`}>
            {open ? <CircleDot size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-cw-txt truncate">Issue #{issue.issueNumber}</div>
            <div className="text-[11px] text-cw-txt3">{open ? 'Open' : 'Closed'} · {issue.repoFullName}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt"><XIcon size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{issue.title}</h3>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {issue.severity && <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[issue.severity] ?? 'bg-cw-bg3 text-cw-txt3'}`}>{issue.severity}</span>}
          <span className="text-[11px] text-cw-txt3 font-mono">{issue.repoFullName}</span>
          <span className="text-[11px] text-cw-txt3">Opened {relTime(issue.createdAt)}</span>
        </div>

        {/* Why raised (purple) */}
        <Section color="cw-purple" title="Why this was raised" icon={<AlertCircle size={12} />}>
          <div className="text-[13px] text-cw-txt2 leading-relaxed">
            An agent found a critical/high issue it could not safely auto-fix, so Codeward escalated it as a real GitHub issue for a human. The full detail Codeward posted is below.
          </div>
        </Section>

        {/* Full issue body (blue) */}
        <Section color="cw-blue" title="Issue detail" icon={<FileDiff size={12} />}>
          <pre className="text-[12px] text-cw-txt2 leading-relaxed whitespace-pre-wrap break-words font-sans">{issue.body || 'No description.'}</pre>
        </Section>

        {/* Real logs — was it worked on? (green) */}
        <Section color="cw-green" title={`Activity log — was it worked on? (${comments?.length ?? 0})`} icon={<MessageSquare size={12} />}>
          {loadingComments ? (
            <div className="flex items-center gap-2 text-[12px] text-cw-txt3"><Loader size={12} className="animate-spin" /> Loading real GitHub activity…</div>
          ) : comments && comments.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {comments.map((c) => (
                <div key={c.id} className="border-t border-cw-green/15 pt-2 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    {c.authorAvatar && <img src={c.authorAvatar} alt="" className="w-4 h-4 rounded-full" />}
                    <span className="text-[11px] font-semibold text-cw-txt">{c.author}</span>
                    <span className="text-[10px] text-cw-txt3">{relTime(c.createdAt)}</span>
                  </div>
                  <div className="text-[12px] text-cw-txt2 whitespace-pre-wrap break-words">{c.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] text-cw-txt3">No activity on this issue yet — nobody has commented or worked on it since Codeward opened it.</div>
          )}
        </Section>

        <GithubLink href={issue.htmlUrl} label="View the real issue on GitHub" className="px-4 py-2 bg-cw-purple hover:brightness-110 text-white text-[12px] font-semibold rounded-lg mt-1" />
      </div>
    </>
  );
}

function PrDrawer({ pr, onClose }: { pr: RealPR; onClose: () => void }) {
  const meta = prStatusMeta(pr);
  return (
    <>
      <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cw-bg2 border border-cw-bdr ${pr.kind === 'autofix' ? 'text-cw-purple' : 'text-cw-blue'}`}>
            {pr.kind === 'autofix' ? <Bot size={18} /> : <UserIcon size={18} />}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-cw-txt truncate">PR #{pr.pullRequestNumber}</div>
            <div className="text-[11px] text-cw-txt3">{pr.kind === 'autofix' ? 'Codeward auto-fix' : 'Human PR'} · {pr.repoFullName}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt"><XIcon size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{pr.prTitle || `PR #${pr.pullRequestNumber}`}</h3>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${meta.cls}`}><meta.Icon size={10} /> {meta.label}</span>
          {pr.maxSeverity && <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[pr.maxSeverity] ?? 'bg-cw-bg3 text-cw-txt3'}`}>{pr.maxSeverity}</span>}
          <span className="text-[11px] text-cw-txt3">Opened {relTime(pr.createdAt)}</span>
        </div>

        {/* What it was about + branches (blue) */}
        <Section color="cw-blue" title="What this PR is about" icon={<GitBranch size={12} />}>
          {pr.headBranch && pr.baseBranch ? (
            <div className="flex items-center gap-1.5 text-[12px] mb-2">
              <span className="font-mono text-cw-txt px-1.5 py-0.5 rounded bg-cw-bg3">{pr.headBranch}</span>
              <span className="text-cw-txt3">→</span>
              <span className="font-mono text-cw-txt px-1.5 py-0.5 rounded bg-cw-bg3">{pr.baseBranch}</span>
            </div>
          ) : (
            <div className="text-[12px] text-cw-txt3 mb-2">Codeward opened this fix PR{pr.agentId ? ` from the ${pr.agentId} agent's changes` : ''}.</div>
          )}
          {(pr.additions != null || pr.deletions != null || pr.changedFiles != null) && (
            <div className="flex items-center gap-3 text-[12px]">
              {pr.changedFiles != null && <span className="text-cw-txt2 flex items-center gap-1"><FileDiff size={12} /> {pr.changedFiles} file{pr.changedFiles === 1 ? '' : 's'}</span>}
              {pr.additions != null && <span className="text-cw-green">+{pr.additions}</span>}
              {pr.deletions != null && <span className="text-cw-red">−{pr.deletions}</span>}
            </div>
          )}
          {pr.author && <div className="text-[11px] text-cw-txt3 mt-2">Author: <span className="text-cw-txt2">@{pr.author}</span></div>}
        </Section>

        {/* Guardian review (purple) */}
        {(pr.guardianVerdict || pr.humanPrReview) && (
          <Section color="cw-purple" title="Guardian review" icon={<ShieldCheck size={12} />}>
            {pr.guardianVerdict && <div className="text-[12px] text-cw-txt2">Verdict: <span className="font-semibold text-cw-txt">{pr.guardianVerdict}</span></div>}
            {pr.humanPrReview?.reviewed && <div className="text-[12px] text-cw-txt2">Guardian posted a <span className="font-semibold text-cw-txt">{pr.humanPrReview.event}</span> review on this human PR.</div>}
            {pr.humanPrReview && !pr.humanPrReview.reviewed && <div className="text-[12px] text-cw-txt3">Review did not complete: {pr.humanPrReview.reason}</div>}
          </Section>
        )}

        {/* Merge status / decision (green or amber) */}
        <Section color={pr.status === 'pending' ? 'cw-amber' : 'cw-green'} title="Merge status" icon={<GitMerge size={12} />}>
          <div className="text-[12px] text-cw-txt2 leading-relaxed">
            {pr.status === 'auto_merged' && 'This PR was auto-merged after its review window passed unactioned.'}
            {(pr.status === 'approved' || pr.status === 'merged') && 'This PR is merged.'}
            {pr.status === 'rejected' && 'This PR was rejected and closed.'}
            {pr.status === 'merge_failed' && 'A merge was attempted but GitHub rejected it (e.g. conflicts or branch protection).'}
            {pr.status === 'merging' && 'A merge is in progress right now.'}
            {pr.status === 'closed' && 'This PR was closed on GitHub without merging.'}
            {pr.status === 'open' && 'This PR is still open on GitHub.'}
            {pr.status === 'unknown' && 'Could not reach GitHub for live status.'}
            {pr.status === 'pending' && (pr.mode === 'auto' && pr.deadlineAt
              ? `On auto-merge — merges in ${timeUntil(pr.deadlineAt)} unless someone acts first.`
              : 'Awaiting a human merge/reject decision.')}
          </div>
          {pr.decisionNote && <div className="text-[11px] text-cw-txt3 mt-2 border-t border-cw-green/15 pt-2">Note: {pr.decisionNote}</div>}
          {pr.decidedBy && <div className="text-[11px] text-cw-txt3 mt-1">Decided by: {pr.decidedBy === 'timeout' ? 'auto-merge timeout' : pr.decidedBy}</div>}
        </Section>

        {pr.prUrl && (
          <GithubLink href={pr.prUrl} label="View the pull request on GitHub" className="px-4 py-2 bg-cw-purple hover:brightness-110 text-white text-[12px] font-semibold rounded-lg mt-1" />
        )}
      </div>
    </>
  );
}
