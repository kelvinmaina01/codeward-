import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, GitMerge, X as XIcon, ExternalLink, GitPullRequest, Clock, AlertTriangle, ShieldCheck, ChevronRight, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

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
}

interface DiffFile { filename: string; status: string; additions: number; deletions: number; patch: string | null; }
interface DiffResponse { pullRequestNumber: number; prUrl: string | null; prTitle: string | null; status: string; files: DiffFile[]; }
interface MergeSettings { mode: 'manual' | 'auto'; timeoutMinutes: number; }

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-cw-amber/15 text-cw-amber',
  approved: 'bg-cw-green/15 text-cw-green',
  auto_merged: 'bg-cw-green/15 text-cw-green',
  rejected: 'bg-cw-red/15 text-cw-red',
  merge_failed: 'bg-cw-red/15 text-cw-red',
  merging: 'bg-cw-blue/15 text-cw-blue',
};

const TIMEOUT_OPTIONS = [
  { label: 'Manual approval required', mode: 'manual' as const, minutes: 120 },
  { label: 'Auto-merge after 2 hours', mode: 'auto' as const, minutes: 120 },
  { label: 'Auto-merge after 12 hours', mode: 'auto' as const, minutes: 720 },
  { label: 'Auto-merge after 24 hours', mode: 'auto' as const, minutes: 1440 },
];

function timeUntil(deadlineAt: string | null): string | null {
  if (!deadlineAt) return null;
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return 'auto-merging now';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Parses a real unified-diff patch into GitHub-style rows with old/new line numbers. */
type DiffRow = { type: 'hunk' | 'add' | 'del' | 'ctx' | 'meta'; oldNo: number | null; newNo: number | null; text: string };
function parsePatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNo = 0, newNo = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) { oldNo = parseInt(m[1], 10); newNo = parseInt(m[2], 10); }
      rows.push({ type: 'hunk', oldNo: null, newNo: null, text: line });
    } else if (line.startsWith('\\')) {
      rows.push({ type: 'meta', oldNo: null, newNo: null, text: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      rows.push({ type: 'add', oldNo: null, newNo, text: line.slice(1) }); newNo++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      rows.push({ type: 'del', oldNo, newNo: null, text: line.slice(1) }); oldNo++;
    } else if (line.startsWith('+++') || line.startsWith('---')) {
      // file markers — skip, the header already names the file
    } else {
      const text = line.startsWith(' ') ? line.slice(1) : line;
      rows.push({ type: 'ctx', oldNo, newNo, text }); oldNo++; newNo++;
    }
  }
  return rows;
}

const rowBg: Record<string, string> = {
  add: 'bg-[#0d2818]',
  del: 'bg-[#2d0d14]',
  ctx: '',
  hunk: 'bg-cw-bg3',
  meta: '',
};
const rowText: Record<string, string> = {
  add: 'text-[#4ade80]',
  del: 'text-[#f87171]',
  ctx: 'text-cw-txt3',
  hunk: 'text-cw-blue',
  meta: 'text-cw-txt3 italic',
};
const rowSign: Record<string, string> = { add: '+', del: '-', ctx: ' ', hunk: '', meta: '' };

function FileDiff({ file }: { file: DiffFile }) {
  const [collapsed, setCollapsed] = useState(false);
  const rows = file.patch ? parsePatch(file.patch) : [];
  return (
    <div className="border border-cw-bdr rounded-lg overflow-hidden mb-3">
      <button onClick={() => setCollapsed((c) => !c)} className="w-full bg-cw-bg3 px-3 py-2 flex justify-between items-center text-[12px] cursor-pointer border-none">
        <span className="font-mono font-medium text-cw-txt truncate">{file.filename}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[11px]"><span className="text-cw-green">+{file.additions}</span> <span className="text-cw-red">-{file.deletions}</span></span>
          <ChevronRight size={13} className={`text-cw-txt3 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
        </span>
      </button>
      {!collapsed && (
        <div className="overflow-x-auto bg-[#0b0e14] font-mono text-[12px] leading-[1.6]">
          {rows.length === 0 ? (
            <div className="px-3 py-2 text-cw-txt3">No textual diff (binary or too large).</div>
          ) : rows.map((r, i) => (
            <div key={i} className={`flex ${rowBg[r.type]}`}>
              <span className="w-10 shrink-0 text-right pr-2 text-cw-txt3/50 select-none">{r.oldNo ?? ''}</span>
              <span className="w-10 shrink-0 text-right pr-2 text-cw-txt3/50 select-none border-r border-cw-bdr/40">{r.newNo ?? ''}</span>
              <span className={`w-4 shrink-0 text-center select-none ${rowText[r.type]}`}>{rowSign[r.type]}</span>
              <span className={`whitespace-pre ${rowText[r.type]} pr-4`}>{r.text || ' '}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DiffViewer() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [settings, setSettings] = useState<MergeSettings | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState(false);
  const [confirm, setConfirm] = useState<{ action: 'approve' | 'reject'; approval: Approval } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadApprovals = useCallback(() => {
    fetch(`${API_URL}/api/approvals?status=all`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setApprovals(data.approvals || []);
        if (data.approvals?.length && selectedId == null) setSelectedId(data.approvals[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, [selectedId]);

  useEffect(() => { loadApprovals(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = approvals.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId == null) return;
    setLoadingDiff(true);
    setError(null);
    fetch(`${API_URL}/api/approvals/${selectedId}/diff`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setDiff(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDiff(false));
  }, [selectedId]);

  // Load the repo's real merge settings whenever the selected PR's repo changes.
  useEffect(() => {
    if (!selected) { setSettings(null); return; }
    fetch(`${API_URL}/api/approvals/settings/${selected.repoId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data?.settings) setSettings(data.settings); })
      .catch(console.error);
  }, [selected?.repoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async (mode: 'manual' | 'auto', timeoutMinutes: number) => {
    if (!selected) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/api/approvals/settings/${selected.repoId}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, timeoutMinutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      setSettings(data.settings);
      toast.success(mode === 'auto'
        ? `Auto-merge on for ${selected.repoFullName} — approved low/medium PRs merge after ${timeoutMinutes >= 60 ? `${Math.round(timeoutMinutes / 60)}h` : `${timeoutMinutes}m`} if you don't act. Overridable here or in Settings.`
        : `Manual mode for ${selected.repoFullName} — every merge needs your click.`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const runDecision = async () => {
    if (!confirm) return;
    const { action, approval } = confirm;
    setActingOn(true);
    try {
      const res = await fetch(`${API_URL}/api/approvals/${approval.id}/${action}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || `Failed to ${action}`); return; }
      toast.success(action === 'approve' ? `Merged PR #${approval.pullRequestNumber} into GitHub.` : `Closed PR #${approval.pullRequestNumber} on GitHub.`);
      setApprovals((prev) => prev.map((a) => a.id === approval.id ? { ...a, status: action === 'approve' ? 'approved' : 'rejected' } : a));
      setDiff((prev) => prev ? { ...prev, status: action === 'approve' ? 'approved' : 'rejected' } : prev);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActingOn(false);
      setConfirm(null);
    }
  };

  const isHighSev = selected?.maxSeverity && ['HIGH', 'CRITICAL'].includes(selected.maxSeverity.toUpperCase());

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      {/* MAIN: full-width PR list (uniform with Alerts list-then-right-drawer pattern) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 max-w-[900px] mx-auto">
          <div className="mb-5">
            <h1 className="text-[20px] font-bold text-cw-txt">Auto-Fix Pull Requests</h1>
            <div className="text-[13px] text-cw-txt2 mt-1">Real PRs Codeward opened, reviewed, and merged. Click any to see the exact code change and decide.</div>
          </div>

          {loadingList ? (
            <div className="py-20 flex justify-center"><Loader size={24} className="animate-spin text-cw-purple" /></div>
          ) : approvals.length === 0 ? (
            <div className="py-16 text-center text-cw-txt3">
              <GitPullRequest size={32} className="mx-auto mb-3" />
              <div className="text-[14px] text-cw-txt2">No auto-fix PRs yet.</div>
              <div className="text-[12px] text-cw-txt3 mt-1">When an agent fixes something, its PR shows up here with the real diff.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {approvals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${selectedId === a.id ? 'bg-cw-purple/5 border-cw-purple' : 'bg-cw-bg2 border-cw-bdr hover:bg-cw-bg3'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-cw-txt truncate">PR #{a.pullRequestNumber}: {a.repoFullName}</div>
                      <div className="text-[12px] text-cw-txt3 truncate mt-0.5">{a.prTitle ?? `${a.agentId} auto-fix`}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.guardianVerdict && <span className={`text-[10px] font-medium ${a.guardianVerdict === 'APPROVE' ? 'text-cw-green' : 'text-cw-amber'}`}>{a.guardianVerdict}</span>}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[a.status] ?? 'bg-cw-bg3 text-cw-txt2'}`}>{a.status}</span>
                      <ChevronRight size={15} className="text-cw-txt3" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT DRAWER: rich diff + merge controls (matches RunDetail / Alerts drawer behavior) */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'w-[620px] min-w-[380px] lg:w-[620px] md:w-[460px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {selected && (
          <>
            <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
              <div className="min-w-0 pr-3">
                <div className="text-[14px] font-bold text-cw-txt truncate">{selected.prTitle ?? `PR #${selected.pullRequestNumber}`}</div>
                {selected.prUrl && (
                  <a href={selected.prUrl} target="_blank" rel="noreferrer" className="text-[11px] text-cw-blue no-underline hover:underline flex items-center gap-1 mt-0.5">
                    View PR #{selected.pullRequestNumber} on GitHub <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors"><XIcon size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Guardian verdict + status */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_BADGE[selected.status] ?? 'bg-cw-bg3 text-cw-txt2'}`}>{selected.status}</span>
                {selected.guardianVerdict && (
                  <span className="flex items-center gap-1 text-[11px] text-cw-txt2"><ShieldCheck size={12} className="text-cw-green" /> Guardian: <span className="font-semibold">{selected.guardianVerdict}</span></span>
                )}
                {selected.maxSeverity && <span className="text-[11px] text-cw-txt3">Max severity: {selected.maxSeverity}</span>}
              </div>

              {/* Merge schedule controls — real, persisted, overridable here and in Settings */}
              <div className="bg-cw-bg border border-cw-bdr rounded-xl p-3 mb-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-cw-txt3 uppercase tracking-wide mb-2">
                  <Clock size={12} /> Auto-merge schedule · {selected.repoFullName}
                </div>
                <select
                  value={settings ? (settings.mode === 'manual' ? 'manual' : String(settings.timeoutMinutes)) : 'manual'}
                  disabled={savingSettings || !settings}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'manual') saveSettings('manual', settings?.timeoutMinutes ?? 120);
                    else saveSettings('auto', Number(v));
                  }}
                  className="w-full bg-cw-bg2 border border-cw-bdr rounded-lg px-3 py-2 text-[12px] text-cw-txt outline-none focus:border-cw-purple disabled:opacity-50"
                >
                  {TIMEOUT_OPTIONS.map((o) => <option key={o.label} value={o.mode === 'manual' ? 'manual' : String(o.minutes)}>{o.label}</option>)}
                </select>
                {selected.mode === 'auto' && selected.status === 'pending' && selected.deadlineAt && (
                  <div className="text-[11px] text-cw-amber mt-2">This PR auto-merges in {timeUntil(selected.deadlineAt)} unless you act.</div>
                )}
                {isHighSev && (
                  <div className="text-[11px] text-cw-txt3 mt-2 flex items-start gap-1.5"><AlertTriangle size={12} className="text-cw-amber shrink-0 mt-0.5" /> This PR is {selected.maxSeverity} severity — it always needs a manual click, regardless of the schedule above.</div>
                )}
              </div>

              {/* Actions (only when a decision is still open) */}
              {selected.status === 'pending' && (
                <div className="flex gap-2 mb-5">
                  <button onClick={() => setConfirm({ action: 'approve', approval: selected })} className="flex-1 px-3 py-2 bg-cw-green text-white hover:brightness-110 text-[12px] font-bold rounded-lg flex items-center justify-center gap-1.5"><GitMerge size={14} /> Merge now</button>
                  <button onClick={() => setConfirm({ action: 'reject', approval: selected })} className="flex-1 px-3 py-2 bg-cw-bg3 border border-cw-bdr text-cw-txt2 hover:text-cw-red text-[12px] font-medium rounded-lg flex items-center justify-center gap-1.5"><XIcon size={14} /> Reject</button>
                </div>
              )}

              {/* Rich GitHub-style diff */}
              {loadingDiff ? (
                <div className="flex items-center gap-2 text-[12px] text-cw-txt3 py-6"><RefreshCw size={14} className="animate-spin" /> Loading the real diff from GitHub...</div>
              ) : error ? (
                <div className="text-[12px] text-cw-red py-4">{error}</div>
              ) : diff ? (
                <div>
                  <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wide mb-2">{diff.files.length} file{diff.files.length === 1 ? '' : 's'} changed</div>
                  {diff.files.map((f) => <FileDiff key={f.filename} file={f} />)}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Confirmation modal — explains exactly what happens, calm not scary */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !actingOn && setConfirm(null)}>
          <div className="w-full max-w-[440px] bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b border-cw-bdr flex items-center gap-2.5 ${confirm.action === 'approve' ? 'text-cw-green' : 'text-cw-red'}`}>
              {confirm.action === 'approve' ? <GitMerge size={18} /> : <XIcon size={18} />}
              <span className="text-[15px] font-bold text-cw-txt">{confirm.action === 'approve' ? 'Merge this pull request?' : 'Reject this pull request?'}</span>
            </div>
            <div className="px-5 py-4 text-[13px] text-cw-txt2 leading-relaxed">
              {confirm.action === 'approve' ? (
                <>
                  This squash-merges <span className="font-semibold text-cw-txt">PR #{confirm.approval.pullRequestNumber}</span> into <span className="font-semibold text-cw-txt">{confirm.approval.repoFullName}</span> on GitHub, right now.
                  {confirm.approval.guardianVerdict === 'APPROVE' && <> Guardian reviewed it and approved.</>}
                  <div className="mt-2 text-cw-txt3">It's a real merge — to undo, you'd revert the commit on GitHub.</div>
                </>
              ) : (
                <>
                  This closes <span className="font-semibold text-cw-txt">PR #{confirm.approval.pullRequestNumber}</span> on GitHub and posts a short comment explaining it was rejected.
                  <div className="mt-2 text-cw-txt3">Nothing is deleted — you can reopen it on GitHub later if you change your mind.</div>
                </>
              )}
            </div>
            <div className="px-5 py-4 bg-cw-bg flex justify-end gap-2 border-t border-cw-bdr">
              <button onClick={() => setConfirm(null)} disabled={actingOn} className="px-4 py-2 text-[13px] font-medium text-cw-txt2 hover:text-cw-txt rounded-lg disabled:opacity-50">Cancel</button>
              <button onClick={runDecision} disabled={actingOn} className={`px-4 py-2 text-[13px] font-bold text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 ${confirm.action === 'approve' ? 'bg-cw-green hover:brightness-110' : 'bg-cw-red hover:brightness-110'}`}>
                {actingOn ? <RefreshCw size={14} className="animate-spin" /> : (confirm.action === 'approve' ? <GitMerge size={14} /> : <XIcon size={14} />)}
                {confirm.action === 'approve' ? 'Merge now' : 'Reject & close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
