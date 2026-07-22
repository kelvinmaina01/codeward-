import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, ChevronRight, Loader2, Wrench, CheckCircle2, AlertTriangle,
  History, Plus, Search, Pencil, Trash2, X, Square, MessageSquare,
  GitFork, ChevronDown, Check, Ban, Radio, Zap,
} from 'lucide-react';
import {
  SecurityCheckIcon, Analytics01Icon, SourceCodeIcon, GitPullRequestIcon, Rocket01Icon, Time04Icon,
  Wrench01Icon, File01Icon, ChartLineData01Icon, AnalyticsUpIcon, GitBranchIcon, BubbleChatIcon,
  ListViewIcon, CheckmarkCircle01Icon, Cancel01Icon, RefreshIcon,
} from 'hugeicons-react';
import { API_URL, WS_URL } from '../../lib/api';
import { useSession } from '../../lib/auth';
import { GordonIcon } from './GordonIcon';
import { GithubIcon, GitlabIcon } from './GithubLink';

/** Provider logo for a repo, chosen by where the repo is hosted. */
function RepoSourceIcon({ source, className = '' }: { source?: 'github' | 'gitlab'; className?: string }) {
  return source === 'gitlab'
    ? <GitlabIcon size={12} className={`text-[#FC6D26] ${className}`} />
    : <GithubIcon size={12} className={className} />;
}

type HugeIcon = typeof SecurityCheckIcon;

/** icon key (from the server's dynamic suggestions) → hugeicon component */
const SUGGESTION_ICON: Record<string, HugeIcon> = {
  approvals: GitPullRequestIcon, fix: Wrench01Icon, scan: SecurityCheckIcon,
  report: File01Icon, compare: ChartLineData01Icon, health: AnalyticsUpIcon,
  connect: GitBranchIcon, info: BubbleChatIcon,
};

/* ---------------------------------- markdown ---------------------------------- */

function Markdown({ text }: { text: string }) {
  return (
    <div className="gordon-md text-xs leading-[1.65] [&>*+*]:mt-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <div className="text-sm font-semibold text-cw-txt mt-1">{children}</div>,
          h2: ({ children }) => <div className="text-[13px] font-semibold text-cw-txt mt-1">{children}</div>,
          h3: ({ children }) => <div className="text-xs font-semibold text-cw-txt mt-1">{children}</div>,
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-cw-blue underline underline-offset-2 hover:opacity-80">{children}</a>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className ?? '');
            return isBlock
              ? <code className="block bg-cw-bg3 border border-cw-bdr rounded-md p-2.5 text-[11px] font-mono overflow-x-auto whitespace-pre">{children}</code>
              : <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-1">{children}</pre>,
          table: ({ children }) => <div className="overflow-x-auto my-1.5 border border-cw-bdr rounded-md"><table className="w-full text-[11px] border-collapse">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-cw-bg3 text-cw-txt2">{children}</thead>,
          th: ({ children }) => <th className="text-left font-semibold px-2.5 py-1.5 border-b border-cw-bdr whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-cw-bdr/50 align-top">{children}</td>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-cw-bdr pl-2.5 text-cw-txt2">{children}</blockquote>,
          hr: () => <hr className="border-cw-bdr my-2" />,
        }}
      >{text}</ReactMarkdown>
    </div>
  );
}

/* ---------------------------------- tool card ---------------------------------- */

const TOOL_LABELS: Record<string, string> = {
  list_repositories: 'Listed your repositories', query_run_history: 'Queried run history',
  get_finding_details: 'Read finding details', search_findings: 'Searched findings',
  get_fix_priority_list: 'Built fix priority list', get_health_trend: 'Computed health trend',
  compare_repos: 'Compared repositories', get_run_status: 'Checked run status',
  get_run_logs: 'Read run logs', list_branches: 'Listed branches',
  get_commit_diff: 'Read commit diff', run_all_agents: 'Ran full agent suite',
  create_github_issue: 'Opened GitHub issue', create_issue_from_finding: 'Escalated finding to issue',
  read_repo_file: 'Read a source file', list_repo_dir: 'Listed repo files',
  read_agent_memory: 'Read shared agent memory', list_pending_approvals: 'Listed pending approvals',
  spawn_agent: 'Ran an analysis agent', approve_and_merge: 'Approved & merged a PR', reject_fix: 'Rejected a fix PR',
};
const ACTION_VERB: Record<string, string> = {
  spawn_agent: 'run an analysis agent in a real sandbox',
  run_all_agents: 'run the full Codeward suite in real sandboxes',
  create_github_issue: 'open a real GitHub issue',
  create_issue_from_finding: 'open a real GitHub issue from this finding',
  approve_and_merge: 'approve and merge this auto-fix PR for real',
  reject_fix: 'reject and close this auto-fix PR',
};

interface ToolDetail { id: string; name: string; state: string; input: unknown; output: unknown }

/** A subtle, Claude-style activity line for a tool call. Clicking opens the right detail drawer. */
function ActivityRow({ name, state, active, onOpen }: { name: string; state: string; active: boolean; onOpen: () => void }) {
  const running = state === 'input-streaming' || state === 'input-available';
  const errored = state === 'output-error';
  const StatusIcon = errored ? AlertTriangle : running ? Loader2 : CheckCircle2;
  const tone = errored ? 'text-cw-red' : running ? 'text-cw-blue' : 'text-cw-green';
  return (
    <button onClick={onOpen}
      className={`group flex items-center gap-2 w-fit max-w-full py-1 pl-1.5 pr-2 -ml-1.5 rounded-md text-[11px] transition-colors ${active ? 'bg-cw-blue/[0.07]' : 'hover:bg-black/[0.04]'}`}>
      <StatusIcon size={12} className={`shrink-0 ${tone} ${running ? 'animate-spin' : ''}`} />
      <Wrench size={11} className="shrink-0 text-cw-txt3" />
      <span className="text-cw-txt2 truncate">{TOOL_LABELS[name] ?? name}</span>
      {running && <span className="shrink-0 text-cw-txt3 italic">working…</span>}
      <ChevronRight size={11} className={`shrink-0 text-cw-txt3 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`} />
    </button>
  );
}

/** Recursive, collapsible tree for arbitrary tool input/output — the "details, listed & collapsible". */
function JsonView({ data, name, depth = 0 }: { data: unknown; name?: string; depth?: number }) {
  const isObj = data !== null && typeof data === 'object';
  const [open, setOpen] = useState(depth < 2);
  if (!isObj) {
    const str = typeof data === 'string';
    return (
      <div className="flex gap-1.5 py-[1px] leading-relaxed">
        {name != null && <span className="text-cw-txt3 shrink-0">{name}:</span>}
        <span className={str ? 'text-cw-green break-all' : typeof data === 'number' ? 'text-cw-blue' : 'text-cw-purple'}>{str ? (data as string) : String(data)}</span>
      </div>
    );
  }
  const entries = Array.isArray(data) ? (data as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(data as Record<string, unknown>);
  const label = Array.isArray(data) ? `${entries.length} item${entries.length === 1 ? '' : 's'}` : `${entries.length} field${entries.length === 1 ? '' : 's'}`;
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 py-[1px] text-left hover:text-cw-txt transition-colors">
        <ChevronRight size={10} className={`shrink-0 text-cw-txt3 transition-transform ${open ? 'rotate-90' : ''}`} />
        {name != null && <span className="text-cw-txt2">{name}</span>}
        <span className="text-cw-txt3 opacity-60">{label}</span>
      </button>
      {open && <div className="pl-3 ml-[5px] border-l border-cw-bdr/50">{entries.map(([k, v]) => <JsonView key={k} data={v} name={k} depth={depth + 1} />)}</div>}
    </div>
  );
}

/** Right side-pull drawer showing a tool call's full request + result, Claude-style. */
function DetailDrawer({ detail, onClose }: { detail: ToolDetail; onClose: () => void }) {
  const running = detail.state === 'input-streaming' || detail.state === 'input-available';
  const errored = detail.state === 'output-error';
  return (
    <div className="shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col w-[min(500px,94vw)] lg:w-[500px] animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-cw-bdr">
          <div className="w-8 h-8 rounded-lg bg-cw-blue/10 flex items-center justify-center shrink-0"><Wrench size={15} className="text-cw-blue" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-cw-txt truncate">{TOOL_LABELS[detail.name] ?? detail.name}</div>
            <div className="text-[11px] text-cw-txt3">{running ? 'Running…' : errored ? 'Failed' : 'Completed'} · Gordon tool call</div>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-cw-txt3 hover:text-cw-txt transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-cw-txt3 mb-2 font-semibold">Request</div>
            <div className="text-[11px] font-mono bg-cw-bg rounded-lg border border-cw-bdr p-3"><JsonView data={detail.input ?? {}} /></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-cw-txt3 mb-2 font-semibold">{errored ? 'Error' : 'Result'}</div>
            {errored ? (
              <div className="text-[11px] text-cw-red whitespace-pre-wrap break-all bg-cw-red/[0.05] border border-cw-red/30 rounded-lg p-3">{String(detail.output ?? 'unknown error')}</div>
            ) : detail.output == null ? (
              <div className="text-[11px] text-cw-txt3">No result yet — still running.</div>
            ) : (
              <div className="text-[11px] font-mono bg-cw-bg rounded-lg border border-cw-bdr p-3"><JsonView data={detail.output} /></div>
            )}
          </div>
        </div>
    </div>
  );
}

/* -------------------------------- approval card -------------------------------- */

function ApprovalCard({ name, input, decided, onDecide }: {
  name: string; input: unknown; decided: 'approved' | 'denied' | null; onDecide: (approved: boolean) => void;
}) {
  return (
    <div className="border border-cw-amber/50 bg-cw-amber/[0.06] rounded-lg mt-2 p-2.5 text-[11px]">
      <div className="flex items-center gap-1.5 mb-1.5 text-cw-amber font-semibold"><Zap size={12} /> Gordon wants to {ACTION_VERB[name] ?? name}</div>
      <pre className="text-[10px] text-cw-txt2 whitespace-pre-wrap break-all bg-cw-bg2 rounded p-1.5 mb-2 max-h-28 overflow-auto">{JSON.stringify(input, null, 2)}</pre>
      {decided ? (
        <div className={`flex items-center gap-1.5 ${decided === 'approved' ? 'text-cw-green' : 'text-cw-red'}`}>
          {decided === 'approved' ? <Check size={12} /> : <Ban size={12} />} {decided === 'approved' ? 'Approved — running…' : 'Rejected'}
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onDecide(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cw-green text-white hover:opacity-90 transition-opacity"><Check size={12} /> Accept</button>
          <button onClick={() => onDecide(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-cw-bdr text-cw-txt2 hover:border-cw-red hover:text-cw-red transition-colors"><Ban size={12} /> Reject</button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- live activity strip ----------------------------- */

interface LiveEvent { id: number; agent: string; repo: string; status: string; score?: number | null }

function useLiveActivity() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const counter = useRef(0);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    try {
      ws = new WebSocket(`${WS_URL}/ws/feed`);
      ws.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data);
          if (type === 'agent_active' || type === 'agent_completed' || type === 'agent_failed') {
            const ev: LiveEvent = { id: ++counter.current, agent: payload.agent, repo: payload.repo, status: payload.status, score: payload.score };
            setEvents((prev) => [ev, ...prev].slice(0, 4));
          }
        } catch { /* ignore malformed frames */ }
      };
    } catch { /* WS unavailable — strip just stays empty */ }
    return () => { closed = true; try { ws?.close(); } catch { /* noop */ } void closed; };
  }, []);
  return events;
}

function LiveStrip({ events }: { events: LiveEvent[] }) {
  if (events.length === 0) return null;
  const e = events[0];
  const tone = e.status === 'Failed' ? 'text-cw-red' : e.status === 'Completed' ? 'text-cw-green' : 'text-cw-blue';
  return (
    <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg border border-cw-bdr bg-cw-bg3/50 text-[11px]">
      <Radio size={12} className={`${tone} ${e.status === 'Running' ? 'animate-pulse' : ''} shrink-0`} />
      <span className="text-cw-txt2 truncate"><span className="font-medium text-cw-txt">{e.agent}</span> · {e.repo}</span>
      <span className={`ml-auto shrink-0 ${tone}`}>{e.status}{e.score != null ? ` · ${e.score}` : ''}</span>
    </div>
  );
}

/* -------------------------------- history drawer -------------------------------- */

interface ChatSession { id: string; title: string | null; repoId: number | null; createdAt: string; updatedAt: string }

function groupLabel(iso: string): string {
  const d = new Date(iso), now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days <= 7) return 'Previous 7 days'; return 'Older';
}

function HistoryDrawer({ sessions, activeId, onSelect, onRename, onDelete, onClose }: {
  sessions: ChatSession[]; activeId: string | null; onSelect: (s: ChatSession) => void;
  onRename: (id: string, title: string) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const filtered = sessions.filter((s) => (s.title ?? 'New chat').toLowerCase().includes(query.toLowerCase()));
  const groups: Record<string, ChatSession[]> = {};
  for (const s of filtered) (groups[groupLabel(s.updatedAt)] ??= []).push(s);
  const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'].filter((g) => groups[g]?.length);
  return (
    <div className="w-[290px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-cw-bdr">
        <History size={13} className="text-cw-txt2" /><span className="text-xs font-semibold text-cw-txt">Chat history</span>
        <button onClick={onClose} className="ml-auto text-cw-txt3 hover:text-cw-txt transition-colors"><X size={14} /></button>
      </div>
      <div className="px-3 py-2 border-b border-cw-bdr">
        <div className="flex items-center gap-1.5 border border-cw-bdr rounded-md px-2 py-1.5 bg-cw-bg focus-within:border-cw-blue transition-colors">
          <Search size={12} className="text-cw-txt3 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats…" className="flex-1 bg-transparent text-[11px] text-cw-txt outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {order.length === 0 && <div className="text-[11px] text-cw-txt3 text-center py-6">{query ? 'No chats match.' : 'No chats yet — start one!'}</div>}
        {order.map((g) => (
          <div key={g} className="mb-2">
            <div className="text-[10px] uppercase tracking-wide text-cw-txt3 px-2 py-1">{g}</div>
            {groups[g].map((s) => (
              <div key={s.id} className={`group rounded-md px-2 py-1.5 cursor-pointer flex items-center gap-1.5 ${activeId === s.id ? 'bg-cw-blue/10 border border-cw-blue/30' : 'hover:bg-cw-bg3 border border-transparent'}`}>
                {renamingId === s.id ? (
                  <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim()) { onRename(s.id, renameValue.trim()); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                    onBlur={() => setRenamingId(null)} className="flex-1 bg-cw-bg border border-cw-blue rounded px-1.5 py-0.5 text-[11px] text-cw-txt outline-none" />
                ) : confirmDeleteId === s.id ? (
                  <div className="flex-1 flex items-center gap-1.5 text-[11px]"><span className="text-cw-red">Delete?</span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); setConfirmDeleteId(null); }} className="text-cw-red font-semibold hover:underline">Yes</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="text-cw-txt3 hover:underline">No</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onSelect(s)} className="flex-1 text-left text-[11px] text-cw-txt truncate">{s.title ?? <span className="text-cw-txt3 italic">New chat</span>}</button>
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.title ?? ''); }} className="opacity-0 group-hover:opacity-100 text-cw-txt3 hover:text-cw-txt transition-all shrink-0"><Pencil size={11} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }} className="opacity-0 group-hover:opacity-100 text-cw-txt3 hover:text-cw-red transition-all shrink-0"><Trash2 size={11} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------ hero ------------------------------------ */

interface Suggestion { id: string; icon: string; title: string; subtitle: string; prompt: string }

const CAPABILITIES: { icon: HugeIcon; label: string }[] = [
  { icon: SecurityCheckIcon, label: 'Runs real security & quality scans' },
  { icon: Rocket01Icon, label: 'Dispatches agents in a real sandbox' },
  { icon: Analytics01Icon, label: 'Reads your runs, findings & trends' },
  { icon: SourceCodeIcon, label: 'Reads your actual source code' },
  { icon: GitPullRequestIcon, label: 'Opens, approves & merges fix PRs' },
  { icon: Time04Icon, label: 'Remembers every session' },
];

/** The welcome/empty state — Meet Gordon, capabilities, and DYNAMIC suggestions from real data. */
function GordonHero({ suggestions, loadingSuggestions, onPick }: {
  suggestions: Suggestion[]; loadingSuggestions: boolean; onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-2 py-6">
        {/* hero */}
        <div className="flex items-center gap-5 flex-wrap-reverse">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-cw-txt">Meet Gordon</h1>
              <span className="text-xl">👋</span>
              <span className="text-[9px] px-[6px] py-[2px] rounded-full border border-cw-purple text-cw-purple font-semibold tracking-wide">BETA</span>
            </div>
            <p className="text-sm font-semibold text-cw-txt leading-snug mb-1.5">Your AI teammate that scans repos, fixes issues, and ships safer code.</p>
            <p className="text-[13px] text-cw-txt2 leading-relaxed">
              Just describe what you need. Gordon reads your real runs and code, dispatches the security agents in a sandbox, and acts on findings — with your approval — so you spend less time chasing debt and more time building.
            </p>
          </div>
          <div className="relative shrink-0 mx-auto">
            <div className="absolute inset-0 rounded-full bg-cw-blue/15 blur-2xl" />
            <GordonIcon size={104} className="relative" />
          </div>
        </div>

        {/* capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-5">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-center gap-2 text-[12px] text-cw-txt2">
                <Icon size={15} className="text-cw-blue shrink-0" />
                <span>{c.label}</span>
              </div>
            );
          })}
        </div>

        {/* dynamic suggestions */}
        <div className="mt-7">
          <div className="text-[10px] uppercase tracking-wider text-cw-txt3 font-semibold mb-2.5">Suggested for you · from your real activity</div>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-[12px] text-cw-txt3 py-3"><Loader2 size={14} className="animate-spin" /> Reading your repositories…</div>
          ) : suggestions.length === 0 ? (
            <div className="text-[12px] text-cw-txt3 py-3">No activity yet — connect a repo and Gordon will suggest what to do next.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {suggestions.map((s) => {
                const Icon = SUGGESTION_ICON[s.icon] ?? BubbleChatIcon;
                return (
                  <button key={s.id} onClick={() => onPick(s.prompt)}
                    className="group text-left border border-cw-bdr rounded-xl px-3.5 py-3 bg-cw-bg2 hover:border-cw-blue hover:bg-cw-blue/[0.03] transition-colors flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cw-blue/10 flex items-center justify-center shrink-0 group-hover:bg-cw-blue/15 transition-colors">
                      <Icon size={17} className="text-cw-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-cw-txt leading-tight">{s.title}</div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- gordon logs drawer -------------------------------- */

interface GordonLog {
  id: string; toolName: string; repoId: number | null; repoName: string | null;
  success: boolean; requiredApproval: boolean; durationMs: number; errorText: string | null;
  createdAt: string; input: unknown; outputSummary: { preview?: string; truncated?: boolean } | null;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDur(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }

function LogsDrawer({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<GordonLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/logs?limit=200`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setLogs(d.logs ?? []); setTotal(d.total ?? 0); }
    } catch { /* degrade to empty */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => !query
    || l.toolName.toLowerCase().includes(query.toLowerCase())
    || (l.repoName ?? '').toLowerCase().includes(query.toLowerCase()));

  const successRate = logs.length ? Math.round((logs.filter((l) => l.success).length / logs.length) * 100) : null;

  return (
    <div className="shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col w-[min(1040px,94vw)] lg:w-[1040px] animate-in slide-in-from-right duration-200">
        {/* header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-cw-bdr">
          <ListViewIcon size={18} className="text-cw-purple" />
          <div>
            <div className="text-sm font-semibold text-cw-txt flex items-center gap-2">Gordon logs <span className="text-[9px] px-[6px] py-[1px] rounded-full border border-cw-purple text-cw-purple font-semibold">ACCOUNTABILITY</span></div>
            <div className="text-[11px] text-cw-txt3">Every real action Gordon took, on your account. {total} total{successRate != null ? ` · ${successRate}% succeeded` : ''}.</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-cw-bdr rounded-md px-2 py-1.5 bg-cw-bg focus-within:border-cw-blue transition-colors">
              <Search size={12} className="text-cw-txt3 shrink-0" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by tool or repo…" className="w-[180px] bg-transparent text-[11px] text-cw-txt outline-none" />
            </div>
            <button onClick={load} title="Refresh" className="p-1.5 text-cw-txt3 hover:text-cw-txt transition-colors"><RefreshIcon size={15} /></button>
            <button onClick={onClose} className="p-1.5 text-cw-txt3 hover:text-cw-txt transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-[12px] text-cw-txt3 py-16"><Loader2 size={15} className="animate-spin" /> Loading real activity…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-cw-txt3 py-16">
              <ListViewIcon size={30} className="opacity-40" />
              <div className="text-[12px]">{query ? 'No entries match your filter.' : 'No actions logged yet. Ask Gordon to do something and it’ll appear here.'}</div>
            </div>
          ) : (
            <table className="w-full text-[11.5px] border-collapse">
              <thead className="sticky top-0 bg-cw-bg3 text-cw-txt2 z-10">
                <tr>
                  <th className="w-6"></th>
                  <th className="text-left font-semibold px-3 py-2 border-b border-cw-bdr">When</th>
                  <th className="text-left font-semibold px-3 py-2 border-b border-cw-bdr">Action</th>
                  <th className="text-left font-semibold px-3 py-2 border-b border-cw-bdr">Repository</th>
                  <th className="text-left font-semibold px-3 py-2 border-b border-cw-bdr">Approval</th>
                  <th className="text-left font-semibold px-3 py-2 border-b border-cw-bdr">Result</th>
                  <th className="text-right font-semibold px-3 py-2 border-b border-cw-bdr">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const open = expanded === l.id;
                  return (
                    <Fragment key={l.id}>
                      <tr onClick={() => setExpanded(open ? null : l.id)}
                        className={`cursor-pointer border-b border-cw-bdr/50 hover:bg-black/[0.03] ${open ? 'bg-cw-blue/[0.04]' : ''}`}>
                        <td className="pl-3"><ChevronRight size={12} className={`text-cw-txt3 transition-transform ${open ? 'rotate-90' : ''}`} /></td>
                        <td className="px-3 py-2 text-cw-txt3 whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                        <td className="px-3 py-2 font-medium text-cw-txt whitespace-nowrap">{TOOL_LABELS[l.toolName] ?? l.toolName}</td>
                        <td className="px-3 py-2 text-cw-txt2 whitespace-nowrap">{l.repoName ?? (l.repoId ? `#${l.repoId}` : '—')}</td>
                        <td className="px-3 py-2">
                          {l.requiredApproval
                            ? <span className="inline-flex items-center gap-1 text-cw-amber"><Zap size={11} /> gated</span>
                            : <span className="text-cw-txt3">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {l.success
                            ? <span className="inline-flex items-center gap-1 text-cw-green"><CheckmarkCircle01Icon size={13} /> ok</span>
                            : <span className="inline-flex items-center gap-1 text-cw-red"><Cancel01Icon size={13} /> error</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-cw-txt2 whitespace-nowrap tabular-nums">{fmtDur(l.durationMs)}</td>
                      </tr>
                      {open && (
                        <tr className="bg-cw-bg/40">
                          <td></td>
                          <td colSpan={6} className="px-3 pb-3 pt-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-cw-txt3 mb-1">Input</div>
                                <pre className="text-[10.5px] text-cw-txt2 whitespace-pre-wrap break-all bg-cw-bg2 border border-cw-bdr rounded p-2 max-h-56 overflow-auto">{JSON.stringify(l.input ?? {}, null, 2)}</pre>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-cw-txt3 mb-1">{l.success ? 'Output' : 'Error'}</div>
                                <pre className={`text-[10.5px] whitespace-pre-wrap break-all border rounded p-2 max-h-56 overflow-auto ${l.success ? 'text-cw-txt2 bg-cw-bg2 border-cw-bdr' : 'text-cw-red bg-cw-red/[0.05] border-cw-red/30'}`}>{l.success ? (l.outputSummary?.preview ?? '(no output)') + (l.outputSummary?.truncated ? '\n…(truncated)' : '') : (l.errorText ?? 'unknown error')}</pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}

/* ----------------------------------- the page ----------------------------------- */

interface Repo { id: number; fullName: string; source?: 'github' | 'gitlab' }
interface Skill { id: string; label: string; description: string; template: string }

export function AIAgent() {
  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [pinnedRepo, setPinnedRepo] = useState<Repo | null>(null);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [detail, setDetail] = useState<ToolDetail | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pinnedRepoRef = useRef<Repo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const liveEvents = useLiveActivity();
  const { data: session } = useSession();
  const userImage = session?.user?.image ?? null;
  const userInitial = (session?.user?.name ?? 'You').charAt(0).toUpperCase();

  useEffect(() => { pinnedRepoRef.current = pinnedRepo; }, [pinnedRepo]);

  const refreshSessions = useCallback(async () => {
    try { const res = await fetch(`${API_URL}/api/chat/sessions`, { credentials: 'include' }); if (res.ok) setSessions((await res.json()).sessions ?? []); } catch { /* degrade */ }
  }, []);

  useEffect(() => {
    refreshSessions();
    fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' }).then((r) => r.ok ? r.json() : { repos: [] }).then((d) => setRepos(d.repos ?? [])).catch(() => {});
    fetch(`${API_URL}/api/chat/skills`, { credentials: 'include' }).then((r) => r.ok ? r.json() : { skills: [] }).then((d) => setSkills(d.skills ?? [])).catch(() => {});
    fetch(`${API_URL}/api/chat/suggestions`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { suggestions: [] })
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [refreshSessions]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${API_URL}/api/chat`,
    credentials: 'include',
    body: () => ({ sessionId: sessionIdRef.current, repoId: pinnedRepoRef.current?.id }),
    fetch: (async (info: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(info, init);
      const sid = res.headers.get('X-Chat-Session-Id');
      if (sid && sid !== sessionIdRef.current) {
        sessionIdRef.current = sid; setActiveSessionId(sid);
        setTimeout(() => { refreshSessions(); }, 3500);
      }
      return res;
    }) as typeof fetch,
  }), [refreshSessions]);

  const { messages, setMessages, sendMessage, status, stop, addToolApprovalResponse } = useChat({
    transport,
    // Auto-resume the generation once the user has answered every approval card in the turn.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, status]);

  // Slash menu: active when the input is a single "/word" with no space yet.
  const slashActive = input.startsWith('/') && !input.includes(' ');
  const slashMatches = slashActive ? skills.filter((s) => s.label.startsWith(input.toLowerCase())) : [];

  const applySkill = (s: Skill) => {
    const filled = s.template.replace('{repo}', pinnedRepo?.fullName ?? 'this repo');
    setInput(filled);
  };

  const send = (text: string) => {
    const val = text.trim();
    if (!val || busy) return;
    setInput('');
    sendMessage({ text: val });
  };

  const newChat = () => { stop(); sessionIdRef.current = null; setActiveSessionId(null); setMessages([]); };

  const selectSession = async (s: ChatSession) => {
    if (busy) stop();
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions/${s.id}/messages`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      sessionIdRef.current = s.id; setActiveSessionId(s.id);
      const repo = data.session?.repoId ? repos.find((r) => r.id === data.session.repoId) ?? null : null;
      setPinnedRepo(repo);
      setMessages((data.messages ?? []) as UIMessage[]);
    } catch { /* keep current chat */ }
  };

  const renameSession = async (id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    await fetch(`${API_URL}/api/chat/sessions/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }).catch(() => refreshSessions());
  };

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === sessionIdRef.current) newChat();
    await fetch(`${API_URL}/api/chat/sessions/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => refreshSessions());
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden px-5 py-4 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1" />
          <button onClick={newChat} title="New chat" className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border border-cw-bdr rounded-lg text-[11px] text-cw-txt2 hover:border-cw-blue hover:text-cw-blue transition-colors"><Plus size={13} /> New</button>
          <button onClick={() => setLogsOpen(true)} title="Gordon logs" className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border border-cw-bdr rounded-lg text-[11px] text-cw-txt2 hover:border-cw-purple hover:text-cw-purple transition-colors"><ListViewIcon size={14} /> Logs</button>
          <button onClick={() => setDrawerOpen((o) => !o)} title="Chat history" className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-[11px] transition-colors ${drawerOpen ? 'border-cw-blue text-cw-blue bg-cw-blue/5' : 'border-cw-bdr text-cw-txt2 hover:border-cw-blue hover:text-cw-blue'}`}><History size={13} /> History</button>
        </div>

        <LiveStrip events={liveEvents} />

        {messages.length === 0 ? (
          <GordonHero suggestions={suggestions} loadingSuggestions={loadingSuggestions} onPick={send} />
        ) : (
        <div className="flex-1 overflow-y-auto pb-2.5">
          <div className="max-w-3xl w-full mx-auto flex flex-col gap-5 px-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant'
                ? <GordonIcon size={28} />
                : userImage
                  ? <img src={userImage} alt="You" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 bg-cw-bg3 text-cw-txt2">{userInitial}</div>}
              <div className={`min-w-0 ${msg.role === 'user' ? 'max-w-[82%] rounded-2xl px-3.5 py-2 bg-cw-blue text-white text-xs leading-[1.6]' : 'flex-1 pt-0.5 space-y-1.5'}`}>
                {msg.parts.map((part, i) => {
                  if (part.type === 'text') return msg.role === 'user' ? <span key={i}>{part.text}</span> : <Markdown key={i} text={part.text} />;
                  if (isToolUIPart(part)) {
                    const name = getToolName(part);
                    if (part.state === 'approval-requested') {
                      return <ApprovalCard key={i} name={name} input={(part as any).input} decided={null}
                        onDecide={(approved) => addToolApprovalResponse({ id: (part as any).approval.id, approved })} />;
                    }
                    if (part.state === 'approval-responded') {
                      return <ApprovalCard key={i} name={name} input={(part as any).input} decided={(part as any).approval.approved ? 'approved' : 'denied'} onDecide={() => {}} />;
                    }
                    const id = (part as any).toolCallId as string;
                    return <ActivityRow key={i} name={name} state={part.state} active={detail?.id === id}
                      onOpen={() => setDetail({ id, name, state: part.state, input: (part as any).input, output: (part as any).output })} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {busy && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 items-center">
              <GordonIcon size={28} />
              <div className="flex items-center gap-1.5 text-cw-txt3 text-[12px]">
                Gordon is thinking
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-cw-txt3 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-cw-txt3 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-cw-txt3 animate-bounce" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
          </div>
        </div>
        )}

        {/* composer */}
        <div className="pt-2.5 border-t border-cw-bdr mt-auto shrink-0">
          <div className="max-w-3xl w-full mx-auto relative">
          {/* slash-command menu */}
          {slashActive && slashMatches.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1.5 w-[320px] bg-cw-bg2 border border-cw-bdr rounded-lg shadow-lg overflow-hidden z-10">
              {slashMatches.map((s) => (
                <button key={s.id} onClick={() => applySkill(s)} className="w-full text-left px-3 py-2 hover:bg-cw-bg3 transition-colors flex flex-col gap-0.5">
                  <span className="text-[11px] font-mono text-cw-blue">{s.label}</span>
                  <span className="text-[10px] text-cw-txt3">{s.description}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            {/* repo @-tag picker */}
            <div className="relative">
              <button onClick={() => setRepoMenuOpen((o) => !o)} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-colors ${pinnedRepo ? 'border-cw-blue text-cw-blue bg-cw-blue/5' : 'border-cw-bdr text-cw-txt3 hover:text-cw-txt2'}`}>
                {pinnedRepo ? <RepoSourceIcon source={pinnedRepo.source} /> : <GitFork size={11} />} {pinnedRepo ? pinnedRepo.fullName : 'Tag a repo'} <ChevronDown size={11} />
              </button>
              {repoMenuOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-[270px] max-h-64 overflow-y-auto bg-cw-bg2 border border-cw-bdr rounded-lg shadow-lg z-10">
                  {pinnedRepo && <button onClick={() => { setPinnedRepo(null); setRepoMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-[11px] text-cw-txt3 hover:bg-cw-bg3 border-b border-cw-bdr">✕ Clear tag</button>}
                  {repos.length === 0 && <div className="px-3 py-2 text-[11px] text-cw-txt3">No repos connected.</div>}
                  {repos.map((r) => (
                    <button key={r.id} onClick={() => { setPinnedRepo(r); setRepoMenuOpen(false); }} className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-cw-bg3 transition-colors flex items-center gap-2 ${pinnedRepo?.id === r.id ? 'text-cw-blue' : 'text-cw-txt2'}`}>
                      <RepoSourceIcon source={r.source} className="shrink-0 opacity-80" />
                      <span className="truncate">{r.fullName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {messages.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-cw-txt3 shrink-0"><MessageSquare size={11} /><span className="max-w-[140px] truncate">{sessions.find((s) => s.id === activeSessionId)?.title ?? 'New chat'}</span></div>
            )}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Ask Gordon, or type / for commands…" disabled={busy}
              className="flex-1 px-3 py-2 border border-cw-bdr rounded-lg text-xs bg-cw-bg2 text-cw-txt outline-none focus:border-cw-blue transition-colors disabled:opacity-60" />
            {busy ? (
              <button onClick={() => stop()} className="px-3.5 py-2 bg-cw-red/90 text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity"><Square size={12} /> Stop</button>
            ) : (
              <button onClick={() => send(input)} disabled={!input.trim()} className="px-3.5 py-2 bg-cw-blue text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"><Send size={13} /> Send</button>
            )}
          </div>
          </div>
        </div>
      </div>

      {drawerOpen && <HistoryDrawer sessions={sessions} activeId={activeSessionId} onSelect={selectSession} onRename={renameSession} onDelete={deleteSession} onClose={() => setDrawerOpen(false)} />}
      {logsOpen && <LogsDrawer onClose={() => setLogsOpen(false)} />}
      {detail && <DetailDrawer detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
