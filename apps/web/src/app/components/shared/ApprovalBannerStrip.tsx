import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitPullRequestIcon, 
  GitMergeIcon, 
  ArrowRight01Icon, 
  Cancel01Icon, 
  Settings01Icon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';
import { Loader2 } from 'lucide-react';
import { API_URL } from '../../../lib/api';

interface PendingApproval {
  id: number;
  repoId: number;
  repoFullName: string;
  pullRequestNumber: number;
  prUrl: string;
  prTitle: string;
  guardianVerdict: string | null;
  maxSeverity: string | null;
  mode: string;
  deadlineAt: string | null;
  status: string;
}

export function ApprovalBannerStrip() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [mergingId, setMergingId] = useState<number | null>(null);
  const [mergeSuccessSha, setMergeSuccessSha] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    try {
      const stored = sessionStorage.getItem('dismissed_approvals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/approvals?status=pending`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.approvals)) {
        setApprovals(data.approvals);
      }
    } catch {
      // Non-blocking background fetch
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 20000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const activeApprovals = approvals.filter((a) => !dismissedIds.includes(a.id));
  const current = activeApprovals[0] ?? null;

  const handleDismiss = (id: number) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('dismissed_approvals', JSON.stringify(updated));
    } catch {}
  };

  const handleMergeNow = async (approval: PendingApproval) => {
    setMergingId(approval.id);
    try {
      const res = await fetch(`${API_URL}/api/approvals/${approval.id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data?.merged) {
        setMergeSuccessSha(data.sha ? data.sha.slice(0, 7) : 'merged');
        setTimeout(() => {
          handleDismiss(approval.id);
          fetchApprovals();
          setMergeSuccessSha(null);
          setMergingId(null);
        }, 2000);
      } else {
        alert(data?.error || 'Failed to merge pull request');
        setMergingId(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Network error approving pull request');
      setMergingId(null);
    }
  };

  if (!current) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/30 text-cw-txt px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-[12px] shrink-0 sticky top-0 z-30 backdrop-blur-md shadow-sm transition-all animate-fadeIn">
      {/* Left indicator + copy */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <GitPullRequestIcon size={14} />
        </div>
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-amber-300 tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Manual approval required
          </span>
          <span className="text-cw-txt3 hidden sm:inline">·</span>
          <span className="font-mono text-cw-txt font-semibold truncate max-w-[280px]">
            {current.repoFullName}#{current.pullRequestNumber}
          </span>
          {current.prTitle && (
            <span className="text-cw-txt2 truncate max-w-[340px] hidden md:inline">
              "{current.prTitle}"
            </span>
          )}
          {activeApprovals.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
              +{activeApprovals.length - 1} more
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {mergeSuccessSha ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
            <CheckmarkCircle01Icon size={13} /> Merged ({mergeSuccessSha})
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleMergeNow(current)}
              disabled={mergingId === current.id}
              className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {mergingId === current.id ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Merging...
                </>
              ) : (
                <>
                  <GitMergeIcon size={13} /> Merge now
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                navigate(`/dashboard/diff?repo=${current.repoId}&pr=${current.pullRequestNumber}`);
              }}
              className="px-2 py-1 rounded-md bg-cw-bg3 hover:bg-cw-bg2 border border-cw-bdr text-cw-txt font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              Review diff <ArrowRight01Icon size={12} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/settings?tab=automation')}
              title="Change auto-merge policy in Settings"
              className="p-1 rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Settings01Icon size={14} />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => handleDismiss(current.id)}
          title="Dismiss this notification"
          aria-label="Dismiss"
          className="p-1 rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors cursor-pointer"
        >
          <Cancel01Icon size={13} />
        </button>
      </div>
    </div>
  );
}
