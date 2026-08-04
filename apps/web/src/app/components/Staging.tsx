import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, Bot, CheckCircle, Clock, ExternalLink, FileDiff,
  GitMerge, Loader2, RefreshCw, Settings, ShieldCheck, TerminalSquare, X, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

interface Props {
  onRunClick?: (repoId: number, runId: number) => void;
}

interface AgentTaskSummary {
  agentId: string;
  status: string;
  score: number | null;
  findingsCount: number;
  gateDecision: string | null;
  summary: unknown;
  duration: number | null;
}

interface Approval {
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
  run: {
    id: number;
    commitSha: string;
    status: string;
    score: number | null;
    createdAt: string;
    scope: { changedFiles?: string[] } | null;
  } | null;
  agentSummary: {
    completedTasks: number;
    failedTasks: number;
    totalTasks: number;
    findingsCount: number;
    criticalFindings: number;
    tasks: AgentTaskSummary[];
  };
}

interface DiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

interface DiffResponse {
  pullRequestNumber: number;
  prUrl: string | null;
  prTitle: string | null;
  status: string;
  files: DiffFile[];
}

interface MergeSettings {
  mode: 'manual' | 'auto';
  timeoutMinutes: number;
}

type ConfirmAction = 'approve' | 'reject';

const TIMEOUT_OPTIONS = [
  { label: 'Manual approval required', mode: 'manual' as const, minutes: 120 },
  { label: 'Auto-merge after 30 minutes', mode: 'auto' as const, minutes: 30 },
  { label: 'Auto-merge after 2 hours', mode: 'auto' as const, minutes: 120 },
  { label: 'Auto-merge after 12 hours', mode: 'auto' as const, minutes: 720 },
  { label: 'Auto-merge after 24 hours', mode: 'auto' as const, minutes: 1440 },
];

const statusTone: Record<string, string> = {
  pending: 'bg-cw-amber/10 border-cw-amber/25 text-cw-amber',
  merging: 'bg-cw-blue/10 border-cw-blue/25 text-cw-blue',
  approved: 'bg-cw-green/10 border-cw-green/25 text-cw-green',
  auto_merged: 'bg-cw-green/10 border-cw-green/25 text-cw-green',
  rejected: 'bg-cw-red/10 border-cw-red/25 text-cw-red',
  merge_failed: 'bg-cw-red/10 border-cw-red/25 text-cw-red',
};

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(ms / 60_000);
  return m > 0 ? `${m}m ago` : 'just now';
}

function timeUntil(deadlineAt: string | null): string | null {
  if (!deadlineAt) return null;
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return 'auto-merging now';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function shortSha(approval: Approval): string {
  return (approval.run?.commitSha || `PR-${approval.pullRequestNumber}`).slice(0, 7);
}

function parsePatch(patch: string) {
  return patch.split('\n').filter((line) => !line.startsWith('+++') && !line.startsWith('---'));
}

function renderSummary(summary: unknown): string {
  if (summary == null || summary === '') return 'No written summary returned.';
  if (typeof summary === 'string') return summary;
  if (typeof summary === 'number' || typeof summary === 'boolean') return String(summary);
  try {
    return JSON.stringify(summary);
  } catch {
    return 'Structured summary returned, but it could not be displayed.';
  }
}

function decisionInsight(approval: Approval): { tone: 'green' | 'amber' | 'red'; title: string; body: string; facts: string[] } {
  const highSeverity = ['HIGH', 'CRITICAL'].includes(String(approval.maxSeverity || '').toUpperCase());
  const requestedChanges = approval.guardianVerdict === 'REQUEST_CHANGES';
  const failedAgents = approval.agentSummary.failedTasks;
  const criticals = approval.agentSummary.criticalFindings;

  if (approval.status !== 'pending') {
    return {
      tone: approval.status === 'rejected' || approval.status === 'merge_failed' ? 'red' : 'green',
      title: `Gate ${approval.status.replace('_', ' ')}`,
      body: 'This gate is already decided. The card remains here as an audit trail for what Codeward did.',
      facts: [`PR #${approval.pullRequestNumber}`, `Guardian: ${approval.guardianVerdict ?? 'pending'}`],
    };
  }

  if (requestedChanges || highSeverity || criticals > 0) {
    return {
      tone: 'red',
      title: 'Human decision required',
      body: 'Codeward will not auto-merge this gate because the evidence includes a blocking verdict or high-severity risk.',
      facts: [
        `Guardian: ${approval.guardianVerdict ?? 'pending'}`,
        `Max severity: ${approval.maxSeverity ?? 'none'}`,
        `${criticals} critical finding${criticals === 1 ? '' : 's'}`,
      ],
    };
  }

  if (failedAgents > 0 || approval.guardianVerdict !== 'APPROVE') {
    return {
      tone: 'amber',
      title: 'Review before merging',
      body: 'The gate is live, but at least one signal is incomplete or not a clear approval. Inspect the summary before deciding.',
      facts: [
        `${failedAgents} failed agent task${failedAgents === 1 ? '' : 's'}`,
        `Guardian: ${approval.guardianVerdict ?? 'pending'}`,
        `${approval.agentSummary.findingsCount} finding${approval.agentSummary.findingsCount === 1 ? '' : 's'}`,
      ],
    };
  }

  return {
    tone: 'green',
    title: approval.mode === 'auto' ? 'Eligible for auto-merge' : 'Safe to approve',
    body: approval.mode === 'auto'
      ? 'Guardian approved this PR and no high-severity evidence blocks the configured auto-merge path.'
      : 'Guardian approved this PR and no high-severity evidence blocks a manual merge.',
    facts: [
      `${approval.agentSummary.completedTasks}/${approval.agentSummary.totalTasks || 0} agents completed`,
      `${approval.agentSummary.findingsCount} finding${approval.agentSummary.findingsCount === 1 ? '' : 's'} reviewed`,
      `Score: ${approval.run?.score ?? 'pending'}`,
    ],
  };
}

export function Staging({ onRunClick }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [settings, setSettings] = useState<MergeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [drawer, setDrawer] = useState<'summary' | 'diff' | 'settings' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; approval: Approval } | null>(null);
  const [, tick] = useState(0);

  const loadApprovals = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/approvals?status=all`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      const rows: Approval[] = data.approvals || [];
      setApprovals(rows);
      setSelectedId((current) => current && rows.some((a) => a.id === current) ? current : rows[0]?.id ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(() => approvals.find((a) => a.id === selectedId) ?? null, [approvals, selectedId]);
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  useEffect(() => {
    if (!selected || drawer !== 'diff') return;
    setLoadingDiff(true);
    setDiff(null);
    fetch(`${API_URL}/api/approvals/${selected.id}/diff`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setDiff(data);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingDiff(false));
  }, [selected?.id, drawer]);

  useEffect(() => {
    if (!selected || drawer !== 'settings') return;
    fetch(`${API_URL}/api/approvals/settings/${selected.repoId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data?.settings) setSettings(data.settings); })
      .catch((e) => toast.error(e.message));
  }, [selected?.repoId, drawer]);

  const decide = async (action: ConfirmAction, approval = selected) => {
    if (!approval) return;
    setActing(action);
    try {
      const res = await fetch(`${API_URL}/api/approvals/${approval.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${action}`);
      toast.success(action === 'approve'
        ? `Merged PR #${approval.pullRequestNumber} on GitHub.`
        : `Rejected and closed PR #${approval.pullRequestNumber}.`);
      setConfirm(null);
      await loadApprovals();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(null);
    }
  };

  const saveSettings = async (mode: 'manual' | 'auto', timeoutMinutes: number) => {
    if (!selected) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/api/approvals/settings/${selected.repoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, timeoutMinutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save settings');
      setSettings(data.settings);
      toast.success(mode === 'auto' ? 'Auto-merge settings saved.' : 'Manual approval mode saved.');
      await loadApprovals();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-cw-txt3"><Loader2 size={24} className="animate-spin mr-2" /> Loading live staging gates...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-cw-red gap-2">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-cw-txt">Staging</h2>
              <span className="text-[9px] font-bold uppercase tracking-wide bg-cw-purple/15 text-cw-purple border border-cw-purple/20 rounded px-1.5 py-0.5">New</span>
            </div>
            <p className="text-[12px] text-cw-txt3">{pendingCount} deployment gate{pendingCount === 1 ? '' : 's'} awaiting approval</p>
          </div>
          <button onClick={loadApprovals} className="px-3 py-1.5 rounded-lg border border-cw-bdr bg-cw-bg2 text-[12px] text-cw-txt2 hover:text-cw-txt flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {approvals.length === 0 ? (
          <div className="py-20 text-center border border-cw-bdr rounded-xl bg-cw-bg2">
            <CheckCircle size={34} className="text-cw-green mx-auto mb-3" />
            <div className="text-[14px] text-cw-txt">No staging gates yet.</div>
            <div className="text-[12px] text-cw-txt3 mt-1">When Codeward opens and reviews an auto-fix PR, the real approval gate appears here.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvals.map((approval) => {
              const active = approval.id === selectedId;
              const hardBlock = ['HIGH', 'CRITICAL'].includes(String(approval.maxSeverity || '').toUpperCase()) || approval.guardianVerdict === 'REQUEST_CHANGES';
              const insight = decisionInsight(approval);
              const changedFiles = approval.run?.scope?.changedFiles ?? [];
              return (
                <div
                  key={approval.id}
                  onClick={() => { setSelectedId(approval.id); setDrawer(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(approval.id);
                      setDrawer(null);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`text-left border rounded-xl p-5 shadow-sm transition-colors ${active ? 'bg-cw-purple/5 border-cw-purple/50' : hardBlock ? 'bg-cw-red/5 border-cw-red/30' : 'bg-cw-bg2 border-cw-bdr hover:border-cw-purple/30'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-cw-txt truncate">
                        {approval.repoFullName} <span className="text-cw-txt3 font-normal mx-1">·</span> <span className="font-mono">{shortSha(approval)}</span>
                      </div>
                      <div className="text-[12px] text-cw-txt2 mt-1">
                        Gate opened {relTime(approval.createdAt)} · PR #{approval.pullRequestNumber} · {approval.agentId} fix
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase ${statusTone[approval.status] ?? 'bg-cw-bg3 border-cw-bdr text-cw-txt3'}`}>
                      {approval.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className="text-[11px] font-medium text-cw-txt2 mr-1">Files modified:</span>
                    {(changedFiles.length ? changedFiles.slice(0, 5) : ['Open diff to load files']).map((file) => (
                      <span key={file} className="px-2 py-0.5 bg-cw-bg border border-cw-bdr/60 rounded text-[10px] font-mono text-cw-txt opacity-80 truncate max-w-[260px]">
                        {file}
                      </span>
                    ))}
                    {changedFiles.length > 5 && <span className="text-[10px] text-cw-txt3">+{changedFiles.length - 5} more</span>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
                    <Metric icon={<CheckCircle size={16} className="text-cw-blue" />} label={`${approval.agentSummary.completedTasks}/${approval.agentSummary.totalTasks || 0} agents`} desc="Verified tasks" />
                    <Metric icon={<ShieldCheck size={16} className={approval.agentSummary.criticalFindings ? 'text-cw-red' : 'text-cw-teal'} />} label={`${approval.agentSummary.criticalFindings} critical`} desc="Security gate" />
                    <Metric icon={<Bot size={16} className="text-cw-purple" />} label={`${approval.agentSummary.findingsCount} findings`} desc="Agent evidence" />
                    <Metric icon={<FileDiff size={16} className="text-cw-amber" />} label={`PR #${approval.pullRequestNumber}`} desc="GitHub change" />
                    <Metric icon={<Clock size={16} className="text-cw-red" />} label={approval.mode === 'auto' ? timeUntil(approval.deadlineAt) || 'scheduled' : 'manual'} desc="Expiry action" />
                  </div>

                  <div className="text-[12px] text-cw-txt2 mb-4 bg-cw-bg3/40 rounded-lg p-3 border border-cw-bdr/30">
                    <span className="font-semibold text-cw-txt">Score: {approval.run?.score ?? 'pending'}</span>
                    <span className="mx-1.5 opacity-40">|</span>
                    Guardian: <span className={approval.guardianVerdict === 'APPROVE' ? 'text-cw-green font-bold' : 'text-cw-amber font-bold'}>{approval.guardianVerdict ?? 'PENDING'}</span>
                    <span className="mx-1.5 opacity-40">|</span>
                    Max severity: <span className={hardBlock ? 'text-cw-red font-bold' : 'text-cw-blue font-bold'}>{approval.maxSeverity ?? 'none'}</span>
                  </div>

                  {hardBlock && approval.status === 'pending' && (
                    <div className="mb-4 flex items-start gap-2 text-[12px] text-cw-red bg-cw-red/5 border border-cw-red/20 rounded-lg p-3">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      This gate is not auto-merge eligible. High or critical findings require an explicit human decision.
                    </div>
                  )}

                  <DecisionBanner insight={insight} />

                  {approval.id === selectedId && (
                    <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      {approval.status === 'pending' && (
                        <>
                          <button onClick={() => setConfirm({ action: 'approve', approval })} disabled={!!acting} className="flex-[1.5] min-w-[150px] px-3 py-2 text-[12px] rounded-lg bg-cw-green text-white font-semibold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {acting === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />} Approve & Merge
                          </button>
                          <button onClick={() => setConfirm({ action: 'reject', approval })} disabled={!!acting} className="flex-1 min-w-[110px] px-3 py-2 text-[12px] rounded-lg bg-cw-red text-white font-semibold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {acting === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                          </button>
                        </>
                      )}
                      <button onClick={() => setDrawer('summary')} className="flex-1 min-w-[130px] px-3 py-2 text-[12px] rounded-lg border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt font-semibold flex items-center justify-center gap-1.5">
                        <TerminalSquare size={14} className="text-cw-purple" /> Agent Summary
                      </button>
                      <button onClick={() => setDrawer('diff')} className="flex-1 min-w-[110px] px-3 py-2 text-[12px] rounded-lg bg-cw-purple text-white font-semibold hover:brightness-110 flex items-center justify-center gap-1.5">
                        <ExternalLink size={14} /> View diff
                      </button>
                      <button onClick={() => setDrawer('settings')} className="w-9 rounded-lg border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt flex items-center justify-center" title="Gatekeeper settings">
                        <Settings size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={!!drawer && !!selected} title={drawerTitle(drawer)} subtitle={selected?.repoFullName ?? ''} onClose={() => setDrawer(null)}>
        {selected && drawer === 'summary' && <AgentSummary approval={selected} onRunClick={onRunClick} />}
        {selected && drawer === 'diff' && <DiffPanel diff={diff} loading={loadingDiff} approval={selected} />}
        {selected && drawer === 'settings' && (
          <SettingsPanel approval={selected} settings={settings} saving={savingSettings} onSave={saveSettings} />
        )}
      </Drawer>

      {confirm && (
        <DecisionConfirm
          action={confirm.action}
          approval={confirm.approval}
          acting={acting}
          onCancel={() => setConfirm(null)}
          onConfirm={() => decide(confirm.action, confirm.approval)}
        />
      )}
    </div>
  );
}

function DecisionBanner({ insight }: { insight: ReturnType<typeof decisionInsight> }) {
  const tone = {
    green: 'bg-cw-green/5 border-cw-green/20 text-cw-green',
    amber: 'bg-cw-amber/5 border-cw-amber/20 text-cw-amber',
    red: 'bg-cw-red/5 border-cw-red/20 text-cw-red',
  }[insight.tone];
  return (
    <div className={`mb-4 rounded-lg border p-3 ${tone}`}>
      <div className="flex items-start gap-2">
        {insight.tone === 'green' ? <CheckCircle size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <div className="text-[12px] font-semibold">{insight.title}</div>
          <div className="text-[12px] text-cw-txt2 leading-relaxed mt-1">{insight.body}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {insight.facts.map((fact) => (
              <span key={fact} className="text-[10px] text-cw-txt2 bg-cw-bg border border-cw-bdr/60 rounded px-2 py-0.5">{fact}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, desc }: { icon: React.ReactNode; label: string | null; desc: string }) {
  return (
    <div className="bg-cw-bg border border-cw-bdr/50 rounded-lg p-2.5 flex items-center justify-center flex-col gap-1 text-center min-h-[76px]">
      {icon}
      <div className="text-[11px] font-bold text-cw-txt">{label || '-'}</div>
      <div className="text-[9px] text-cw-txt3 leading-tight px-1">{desc}</div>
    </div>
  );
}

function drawerTitle(drawer: 'summary' | 'diff' | 'settings' | null) {
  if (drawer === 'summary') return 'Agent Decision Summary';
  if (drawer === 'diff') return 'Real GitHub Diff';
  if (drawer === 'settings') return 'Gatekeeper Settings';
  return '';
}

function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ${open ? 'w-[460px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
      {open && (
        <>
          <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg2 shrink-0">
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-cw-txt leading-none mb-1">{title}</h3>
              <p className="text-[11px] text-cw-txt3 leading-none truncate">{subtitle}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 p-5 overflow-y-auto">{children}</div>
        </>
      )}
    </div>
  );
}

function AgentSummary({ approval, onRunClick }: { approval: Approval; onRunClick?: (repoId: number, runId: number) => void }) {
  return (
    <div>
      <div className={`rounded-lg p-3 text-[12px] font-medium leading-relaxed mb-5 ${approval.guardianVerdict === 'APPROVE' ? 'bg-cw-green/10 border border-cw-green/20 text-cw-green' : 'bg-cw-amber/10 border border-cw-amber/20 text-cw-amber'}`}>
        Guardian verdict: {approval.guardianVerdict ?? 'pending'}. Max severity: {approval.maxSeverity ?? 'none'}.
      </div>
      <div className="flex flex-col gap-3">
        {approval.agentSummary.tasks.length === 0 ? (
          <div className="text-[12px] text-cw-txt3">No agent task details are attached to this approval yet.</div>
        ) : approval.agentSummary.tasks.map((task) => (
          <div key={task.agentId} className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-[12px] font-semibold text-cw-txt">{task.agentId}</div>
              <div className="text-[10px] text-cw-txt3 uppercase">{task.status}</div>
            </div>
            <div className="text-[11px] text-cw-txt3 mb-2">Score {task.score ?? '-'} · {task.findingsCount} finding{task.findingsCount === 1 ? '' : 's'} · Gate {task.gateDecision ?? '-'}</div>
            <div className="text-[12px] text-cw-txt2 leading-relaxed break-words">{renderSummary(task.summary)}</div>
          </div>
        ))}
      </div>
      {approval.runId && onRunClick && (
        <button onClick={() => onRunClick(approval.repoId, approval.runId!)} className="mt-4 w-full py-2.5 text-[12px] rounded-lg bg-cw-purple text-white font-semibold hover:brightness-110">
          Open full run
        </button>
      )}
    </div>
  );
}

function DecisionConfirm({
  action,
  approval,
  acting,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  approval: Approval;
  acting: ConfirmAction | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const approving = action === 'approve';
  const insight = decisionInsight(approval);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !acting && onCancel()}>
      <div className="w-full max-w-[480px] bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b border-cw-bdr flex items-center gap-2.5 ${approving ? 'text-cw-green' : 'text-cw-red'}`}>
          {approving ? <GitMerge size={18} /> : <XCircle size={18} />}
          <span className="text-[15px] font-bold text-cw-txt">{approving ? 'Approve and merge this gate?' : 'Reject this staging gate?'}</span>
        </div>
        <div className="px-5 py-4 text-[13px] text-cw-txt2 leading-relaxed">
          {approving ? (
            <>
              This squash-merges <span className="font-semibold text-cw-txt">PR #{approval.pullRequestNumber}</span> into <span className="font-semibold text-cw-txt">{approval.repoFullName}</span> on GitHub using the existing Codeward approval endpoint.
              <div className="mt-2 text-cw-txt3">This is irreversible from this screen. To undo it, revert the merge commit in GitHub.</div>
            </>
          ) : (
            <>
              This closes <span className="font-semibold text-cw-txt">PR #{approval.pullRequestNumber}</span> on GitHub and posts a Codeward rejection comment.
              <div className="mt-2 text-cw-txt3">The PR is not deleted. It can still be reopened from GitHub if the team changes direction.</div>
            </>
          )}
          <div className={`mt-4 rounded-lg border p-3 ${insight.tone === 'green' ? 'bg-cw-green/5 border-cw-green/20' : insight.tone === 'red' ? 'bg-cw-red/5 border-cw-red/20' : 'bg-cw-amber/5 border-cw-amber/20'}`}>
            <div className="text-[12px] font-semibold text-cw-txt">{insight.title}</div>
            <div className="text-[12px] text-cw-txt2 mt-1">{insight.body}</div>
          </div>
        </div>
        <div className="px-5 py-4 bg-cw-bg flex justify-end gap-2 border-t border-cw-bdr">
          <button onClick={onCancel} disabled={!!acting} className="px-4 py-2 text-[13px] font-medium text-cw-txt2 hover:text-cw-txt rounded-lg disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={!!acting} className={`px-4 py-2 text-[13px] font-bold text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 ${approving ? 'bg-cw-green hover:brightness-110' : 'bg-cw-red hover:brightness-110'}`}>
            {acting ? <Loader2 size={14} className="animate-spin" /> : approving ? <GitMerge size={14} /> : <XCircle size={14} />}
            {approving ? 'Merge on GitHub' : 'Reject and close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffPanel({ diff, loading, approval }: { diff: DiffResponse | null; loading: boolean; approval: Approval }) {
  if (loading) return <div className="flex items-center gap-2 text-[12px] text-cw-txt3"><Loader2 size={14} className="animate-spin" /> Loading real diff from GitHub...</div>;
  if (!diff) return <div className="text-[12px] text-cw-txt3">Open this drawer to load the real GitHub diff.</div>;
  return (
    <div>
      {approval.prUrl && (
        <a href={approval.prUrl} target="_blank" rel="noreferrer" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-cw-blue hover:underline">
          <ExternalLink size={13} /> Open PR #{approval.pullRequestNumber} on GitHub
        </a>
      )}
      <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wide mb-2">{diff.files.length} file{diff.files.length === 1 ? '' : 's'} changed</div>
      {diff.files.map((file) => (
        <div key={file.filename} className="mb-4 border border-cw-bdr rounded-lg overflow-hidden">
          <div className="bg-cw-bg3 px-3 py-2 flex justify-between gap-2 text-[12px]">
            <span className="font-mono text-cw-txt truncate">{file.filename}</span>
            <span className="shrink-0"><span className="text-cw-green">+{file.additions}</span> <span className="text-cw-red">-{file.deletions}</span></span>
          </div>
          <div className="bg-[#0b0e14] font-mono text-[11px] leading-relaxed overflow-x-auto">
            {file.patch ? parsePatch(file.patch).map((line, i) => (
              <div key={i} className={`whitespace-pre px-3 py-0.5 ${line.startsWith('+') ? 'bg-[#0d2818] text-[#4ade80]' : line.startsWith('-') ? 'bg-[#2d0d14] text-[#f87171]' : line.startsWith('@@') ? 'bg-cw-bg3 text-cw-blue' : 'text-cw-txt3'}`}>
                {line || ' '}
              </div>
            )) : <div className="px-3 py-2 text-cw-txt3">No textual diff.</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel({ approval, settings, saving, onSave }: { approval: Approval; settings: MergeSettings | null; saving: boolean; onSave: (mode: 'manual' | 'auto', timeoutMinutes: number) => void }) {
  const highSeverity = ['HIGH', 'CRITICAL'].includes(String(approval.maxSeverity || '').toUpperCase());
  return (
    <div>
      <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">Default action for {approval.repoFullName}</label>
      <select
        value={settings ? (settings.mode === 'manual' ? 'manual' : String(settings.timeoutMinutes)) : 'manual'}
        disabled={saving || !settings}
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'manual') onSave('manual', settings?.timeoutMinutes ?? 120);
          else onSave('auto', Number(value));
        }}
        className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt outline-none focus:border-cw-purple disabled:opacity-50"
      >
        {TIMEOUT_OPTIONS.map((option) => (
          <option key={option.label} value={option.mode === 'manual' ? 'manual' : String(option.minutes)}>{option.label}</option>
        ))}
      </select>

      {approval.mode === 'auto' && approval.deadlineAt && (
        <div className="mt-4 text-[12px] text-cw-amber bg-cw-amber/5 border border-cw-amber/20 rounded-lg p-3">
          This specific gate auto-merges in {timeUntil(approval.deadlineAt)} unless someone acts first.
        </div>
      )}
      {highSeverity && (
        <div className="mt-4 text-[12px] text-cw-txt2 bg-cw-bg2 border border-cw-bdr rounded-lg p-3 leading-relaxed">
          High and critical findings are always manual. Changing this setting affects future low and medium severity gates only.
        </div>
      )}
      <div className="mt-4 text-[11px] text-cw-txt3 leading-relaxed">
        Secrets are not edited here. Runtime credentials live in encrypted integration or MCP records and are only exposed to approved agent tools as masked, scoped credentials.
      </div>
    </div>
  );
}
