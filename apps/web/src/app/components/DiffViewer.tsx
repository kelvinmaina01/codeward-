import { useEffect, useState } from 'react';
import { RefreshCw, GitMerge, X as XIcon, ExternalLink } from 'lucide-react';
import { API_URL } from '../../lib/api';

interface Approval {
  id: number;
  repoFullName: string;
  pullRequestNumber: number;
  prUrl: string | null;
  prTitle: string | null;
  guardianVerdict: string | null;
  status: string;
  createdAt: string;
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

/** Parses a real unified diff "patch" string into typed lines for rendering — no fabricated content, this is GitHub's own patch text. */
function parsePatchLines(patch: string): { type: 'add' | 'rem' | 'ctx' | 'hunk'; text: string }[] {
  return patch.split('\n').map((line) => {
    if (line.startsWith('@@')) return { type: 'hunk' as const, text: line };
    if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'add' as const, text: line };
    if (line.startsWith('-') && !line.startsWith('---')) return { type: 'rem' as const, text: line };
    return { type: 'ctx' as const, text: line };
  });
}

const lineClasses: Record<string, string> = {
  add: 'bg-[#F0FDF4] text-[#166534]',
  rem: 'bg-[#FEF2F2] text-[#991B1B]',
  ctx: 'text-cw-txt3',
  hunk: 'bg-cw-bg3 text-cw-blue',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  approved: 'bg-[#DCFCE7] text-[#166534]',
  auto_merged: 'bg-[#DCFCE7] text-[#166534]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B]',
  merge_failed: 'bg-[#FEE2E2] text-[#991B1B]',
};

export function DiffViewer() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/approvals?status=all`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.approvals) {
          setApprovals(data.approvals);
          if (data.approvals.length > 0) setSelectedId(data.approvals[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

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

  const decide = async (action: 'approve' | 'reject') => {
    if (selectedId == null) return;
    setActingOn(true);
    try {
      const res = await fetch(`${API_URL}/api/approvals/${selectedId}/${action}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? `Failed to ${action}`); return; }
      setApprovals((prev) => prev.map((a) => a.id === selectedId ? { ...a, status: action === 'approve' ? 'approved' : 'rejected' } : a));
      setDiff((prev) => prev ? { ...prev, status: action === 'approve' ? 'approved' : 'rejected' } : prev);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActingOn(false);
    }
  };

  const selected = approvals.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: real list of auto-fix PRs */}
      <div className="w-[280px] shrink-0 border-r border-cw-bdr overflow-y-auto px-3 py-3">
        <div className="text-[10px] font-bold text-cw-txt3 uppercase tracking-wide mb-2 px-1">Real Auto-Fix PRs</div>
        {loadingList ? (
          <div className="text-[11px] text-cw-txt3 px-1 py-2">Loading...</div>
        ) : approvals.length === 0 ? (
          <div className="text-[11px] text-cw-txt3 px-1 py-2">No auto-fix PRs yet.</div>
        ) : approvals.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            className={`w-full text-left px-2.5 py-2 mb-1 rounded-md border cursor-pointer transition-colors ${selectedId === a.id ? 'bg-cw-bg3 border-cw-blue' : 'bg-transparent border-transparent hover:bg-cw-bg3/50'}`}
          >
            <div className="text-[11px] font-medium text-cw-txt truncate">PR #{a.pullRequestNumber}: {a.repoFullName}</div>
            <div className="text-[10px] text-cw-txt3 truncate mt-0.5">{a.prTitle ?? '—'}</div>
            <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${STATUS_BADGE[a.status] ?? 'bg-cw-bg3 text-cw-txt2'}`}>{a.status}</span>
          </button>
        ))}
      </div>

      {/* Right: real diff content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && <div className="text-[12px] text-cw-red mb-3">{error}</div>}
        {loadingDiff ? (
          <div className="flex items-center gap-2 text-[12px] text-cw-txt3"><RefreshCw size={14} className="animate-spin" /> Loading real diff from GitHub...</div>
        ) : !diff ? (
          <div className="text-[12px] text-cw-txt3">Select a PR to view its real diff.</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[14px] font-semibold text-cw-txt">{diff.prTitle}</div>
                {diff.prUrl && (
                  <a href={diff.prUrl} target="_blank" rel="noreferrer" className="text-[11px] text-cw-blue no-underline hover:underline flex items-center gap-1 mt-0.5">
                    View PR #{diff.pullRequestNumber} on GitHub <ExternalLink size={10} />
                  </a>
                )}
              </div>
              {selected?.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => decide('approve')} disabled={actingOn} className="px-3 py-1.5 bg-cw-green text-white hover:brightness-110 text-[11px] font-bold rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
                    <GitMerge size={12} /> Merge now
                  </button>
                  <button onClick={() => decide('reject')} disabled={actingOn} className="px-3 py-1.5 bg-cw-bg3 border border-cw-bdr text-cw-txt2 hover:text-cw-red text-[11px] font-medium rounded flex items-center gap-1 disabled:opacity-50">
                    <XIcon size={12} /> Reject
                  </button>
                </div>
              )}
            </div>

            {diff.files.map((f) => (
              <div key={f.filename} className="mb-3">
                <div className="bg-cw-bg3 border border-cw-bdr rounded-t-lg px-2.5 py-1.5 text-[11px] font-medium flex justify-between items-center text-cw-txt">
                  <span className="font-mono">{f.filename}</span>
                  <span className="text-[10px] text-cw-txt3">
                    <span className="text-cw-green">+{f.additions}</span> <span className="text-cw-red">-{f.deletions}</span>
                  </span>
                </div>
                <div className="border border-cw-bdr border-t-0 rounded-b-lg overflow-hidden overflow-x-auto">
                  {f.patch ? parsePatchLines(f.patch).map((l, i) => (
                    <div key={i} className={`font-mono leading-[1.5] text-[11px] px-2 py-0.5 whitespace-pre ${lineClasses[l.type]}`}>
                      {l.text}
                    </div>
                  )) : (
                    <div className="text-[11px] text-cw-txt3 px-2 py-1.5">No textual diff available (binary or too large).</div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
