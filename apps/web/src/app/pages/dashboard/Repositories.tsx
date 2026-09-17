import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Loader, AlertCircle, Play, Pause, BarChart2, GitFork, GitPullRequest, Lock, Globe, Wrench, RotateCcw, Clock, ShieldAlert, X, MoreVertical, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast-bridge';
import { API_URL } from '../../../lib/api';

interface RepoConfig {
  agents: Record<string, boolean>;
}

interface ConnectedRepo {
  id: number;
  userId: string;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  config: RepoConfig;
  createdAt: string;
  status: string;
  paused: boolean;
  autoFixEnabled: boolean;
  healthScore: number | null;
  lastScanAt: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const langColors: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Go: '#00ADD8',
  Ruby: '#CC342D',
  Shell: '#4EAA25',
  Rust: '#DEA584',
  Java: '#B07219',
  'C#': '#178600',
  Unknown: '#6B7280',
};

/** GitHub avatar URL for an owner — works for users and orgs */
function ghAvatar(owner: string): string {
  return `https://github.com/${owner}.png?size=32`;
}

/** Fallback DiceBear Disco avatar keyed to the owner handle */
function discoAvatar(seed: string): string {
  return `https://api.dicebear.com/10.x/disco/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Compact agent-activity dots displayed inline next to the AUDITING badge.
 * One circle per *enabled* agent; all shimmer grey while auditing.
 * On hover over each dot, a tooltip shows the agent name.
 * Absolutely positioned so they add zero height to the card.
 */
function AgentDots({ agents }: { agents: Record<string, boolean> }) {
  const activeAgents = Object.entries(agents)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  if (activeAgents.length === 0) return null;

  const labels: Record<string, string> = {
    security: 'Security',
    bloat: 'Bloat',
    broken_code: 'Broken Code',
    architecture: 'Architecture',
    ai_era: 'AI-Era',
    compliance: 'Compliance',
    data_dx: 'Data DX',
    guardian: 'Guardian',
    orchestrator: 'Orchestrator',
  };

  return (
    <div className="flex items-center gap-[4px] ml-2">
      {activeAgents.map((agent, i) => (
        <div
          key={agent}
          className="relative group/dot"
          style={{ width: 10, height: 10 }}
        >
          {/* Outer glow ring */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: '0 0 0 1.5px rgba(148,163,184,0.25)',
              animation: `shimmer-ring 1.8s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
          {/* The dot itself */}
          <span
            className="absolute inset-[1px] rounded-full"
            style={{
              background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #475569 100%)',
              backgroundSize: '200% 200%',
              animation: `shimmer-dot 1.8s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
          {/* Tooltip on hover */}
          <span
            className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[11px] font-semibold text-white whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-all duration-150 z-50 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(148,163,184,0.25)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {labels[agent] || agent}
            {/* Arrow */}
            <span
              className="absolute top-full left-1/2 -translate-x-1/2"
              style={{
                width: 0, height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid rgba(148,163,184,0.25)',
              }}
            />
          </span>
        </div>
      ))}
      <style>{`
        @keyframes shimmer-dot {
          0%   { background-position: 0% 50%;   opacity: 0.5; }
          50%  { background-position: 100% 50%; opacity: 1;   }
          100% { background-position: 0% 50%;   opacity: 0.5; }
        }
        @keyframes shimmer-ring {
          0%   { box-shadow: 0 0 0 1.5px rgba(148,163,184,0.15); }
          50%  { box-shadow: 0 0 0 1.5px rgba(148,163,184,0.4);  }
          100% { box-shadow: 0 0 0 1.5px rgba(148,163,184,0.15); }
        }
      `}</style>
    </div>
  );
}

/** Owner/org avatar with GitHub → DiceBear Disco fallback */
function RepoOwnerAvatar({ owner }: { owner: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? discoAvatar(owner) : ghAvatar(owner)}
      alt={owner}
      title={owner}
      onError={() => setFailed(true)}
      className="w-5 h-5 rounded-full border border-cw-bdr/60 bg-cw-bg3 object-cover shrink-0 shadow-sm"
    />
  );
}

export function Repositories({ activeOrg }: { activeOrg?: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const retryRepoParam = searchParams.get('retryRepo');
  const runIdParam = searchParams.get('runId');

  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<number | null>(null);
  const [autoFixingId, setAutoFixingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [confirmModalRepo, setConfirmModalRepo] = useState<ConnectedRepo | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [removeModalRepo, setRemoveModalRepo] = useState<ConnectedRepo | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const handledDeepLinkRef = useRef(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchConnectedRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch connected repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err: any) {
      toast.error('Failed to load connected repositories');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConnectedRepos(); }, []);

  // Handle precision deep links from failure email alerts
  useEffect(() => {
    if (!loading && repos.length > 0 && retryRepoParam && !handledDeepLinkRef.current) {
      handledDeepLinkRef.current = true;
      const target = repos.find(
        (r) =>
          r.fullName.toLowerCase() === retryRepoParam.toLowerCase() ||
          r.name.toLowerCase() === retryRepoParam.toLowerCase()
      );
      if (target) {
        setConfirmModalRepo(target);
        setTimeout(() => {
          const el = document.getElementById(`repo-card-${target.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      }
    }
  }, [loading, repos, retryRepoParam]);

  const handleRetryAudit = async (repo: ConnectedRepo) => {
    setRetryingId(repo.id);
    try {
      const res = await fetch(`${API_URL}/api/repos/${repo.id}/retry-audit`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to trigger audit retry');
      toast.success(`Audit re-queued for ${repo.fullName}! Isolated clean sandbox container initializing...`);
      setRepos((prev) => prev.map((r) => (r.id === repo.id ? { ...r, status: 'pending_audit' } : r)));
      setConfirmModalRepo(null);
      if (retryRepoParam) {
        searchParams.delete('retryRepo');
        searchParams.delete('runId');
        setSearchParams(searchParams, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const togglePause = async (repo: ConnectedRepo) => {
    setPausingId(repo.id);
    const nextPaused = !repo.paused;
    try {
      const res = await fetch(`${API_URL}/api/repos/${repo.id}/pause`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextPaused }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      setRepos((prev) => prev.map((r) => r.id === repo.id ? { ...r, paused: data.paused } : r));
      toast.success(`${repo.fullName} ${data.paused ? 'paused' : 'resumed'} — real, persisted, and honored by the push pipeline.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pause state');
    } finally {
      setPausingId(null);
    }
  };

  const toggleAutoFix = async (repo: ConnectedRepo) => {
    setAutoFixingId(repo.id);
    const next = !repo.autoFixEnabled;
    try {
      const res = await fetch(`${API_URL}/api/repos/${repo.id}/autofix`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoFixEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update');
      setRepos((prev) => prev.map((r) => r.id === repo.id ? { ...r, autoFixEnabled: data.autoFixEnabled } : r));
      toast.success(data.autoFixEnabled
        ? `Auto-fix ON for ${repo.fullName} — the fixer may open real PRs here.`
        : `Auto-fix OFF for ${repo.fullName} — analysis still runs, but no auto-fix PRs will be opened.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update auto-fix setting');
    } finally {
      setAutoFixingId(null);
    }
  };

  const removeRepo = async (repo: ConnectedRepo) => {
    setRemovingId(repo.id);
    try {
      const res = await fetch(`${API_URL}/api/repos/${repo.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove repository');
      setRepos((prev) => prev.filter((r) => r.id !== repo.id));
      setRemoveModalRepo(null);
      toast.success(`${repo.fullName} has been disconnected from Codeward.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove repository');
    } finally {
      setRemovingId(null);
    }
  };

  const languages = ['All', ...Array.from(new Set(repos.map(r => r.language))).filter(Boolean)];

  const filteredRepos = repos.filter(r => {
    const matchesOrg = true; // TEMP FIX: !activeOrg || r.owner === activeOrg;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesLang = filterLang === 'All' || r.language === filterLang;

    let matchesStatus = true;
    if (filterStatus === 'running') {
      matchesStatus = r.status === 'pending_audit' || r.status === 'running';
    } else if (filterStatus === 'completed') {
      matchesStatus = !r.paused && (r.status === 'active' || r.healthScore != null || r.lastScanAt != null) && r.status !== 'failed_audit' && r.status !== 'pending_audit';
    } else if (filterStatus === 'failed') {
      matchesStatus = r.status === 'failed_audit' || r.status === 'failed';
    } else if (filterStatus === 'paused') {
      matchesStatus = Boolean(r.paused);
    } else if (filterStatus === 'queued') {
      matchesStatus = r.status === 'queued';
    }

    return matchesOrg && matchesSearch && matchesLang && matchesStatus;
  });

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-cw-green';
    if (score >= 60) return 'text-cw-amber';
    return 'text-cw-red';
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-cw-bg text-cw-txt">

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-full sm:w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search connected repos..."
            className="w-full py-2 pl-9 pr-3 bg-cw-bg2 border border-cw-bdr rounded-lg text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors"
          />
        </div>
        <select 
          value={filterLang} 
          onChange={e => setFilterLang(e.target.value)}
          className="bg-cw-bg2 border border-cw-bdr rounded-lg text-[13px] text-cw-txt py-2 px-3 outline-none min-w-[140px] cursor-pointer"
        >
          {languages.map(l => <option key={l || 'unknown'} value={l || 'Unknown'}>{l === 'All' ? 'All Languages' : l}</option>)}
        </select>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-cw-bg2 border border-cw-bdr rounded-lg text-[13px] text-cw-txt py-2 px-3 outline-none min-w-[150px] cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="running">⚡ Running / Auditing</option>
          <option value="completed">✅ Completed</option>
          <option value="failed">❌ Failed</option>
          <option value="queued">⏳ Queued</option>
          <option value="paused">⏸️ Paused</option>
        </select>
        {(search || filterLang !== 'All' || filterStatus !== 'All') && (
          <button
            onClick={() => { setSearch(''); setFilterLang('All'); setFilterStatus('All'); }}
            className="text-[12px] text-cw-txt3 hover:text-cw-txt px-2 py-1 transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-[300px]">
          <Loader size={24} className="animate-spin text-cw-purple" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-cw-bdr rounded-xl bg-cw-bg2">
          <AlertCircle size={32} className="text-cw-red mb-3" />
          <p className="text-cw-txt font-medium">{error}</p>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-cw-bdr rounded-xl bg-cw-bg2">
          <GitFork size={32} className="text-cw-txt3 mb-3" />
          <h3 className="text-cw-txt font-medium mb-1">No repositories found</h3>
          <p className="text-[13px] text-cw-txt2">Try adjusting your search or connect a new repository.</p>
        </div>
      ) : (
        <div className="border border-cw-bdr rounded-lg bg-cw-bg2 shadow-sm">
          <div className="bg-cw-bg3 px-5 py-3 border-b border-cw-bdr rounded-t-lg flex justify-between items-center">
            <span className="text-[13px] font-semibold text-cw-txt">{filteredRepos.length} Repositories</span>
          </div>
          <div className="flex flex-col">
            {filteredRepos.map((repo) => {
              const isPaused = repo.paused;
              const isAuditing = !isPaused && repo.status === 'pending_audit';
              const isQueued = !isPaused && repo.status === 'queued';
              const hasScore = repo.healthScore != null;
              const score = repo.healthScore ?? 0;
              const langName = repo.language || 'Unknown';
              const numAgents = Object.values(repo.config?.agents || {}).filter(Boolean).length;
              const isTargeted =
                Boolean(retryRepoParam) &&
                (repo.fullName.toLowerCase() === retryRepoParam?.toLowerCase() ||
                  repo.name.toLowerCase() === retryRepoParam?.toLowerCase());

              return (
                <div
                  key={repo.id}
                  id={`repo-card-${repo.id}`}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-cw-bdr last:border-0 hover:bg-cw-bg3 transition-all ${
                    isPaused ? 'opacity-60' : ''
                  } ${
                    isTargeted
                      ? 'ring-2 ring-cw-purple bg-cw-purple/5 shadow-[0_0_24px_rgba(168,85,247,0.2)]'
                      : ''
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0 pr-4 mb-4 md:mb-0">
                    <div className="flex items-center gap-2">
                      {/* Owner avatar: GitHub photo → DiceBear Disco fallback */}
                      <RepoOwnerAvatar owner={repo.owner} />

                      {repo.isPrivate ? <Lock size={14} className="text-cw-txt3 shrink-0" /> : <Globe size={14} className="text-cw-txt3 shrink-0" />}

                      <h3 className="text-[15px] font-semibold text-cw-blue hover:underline cursor-pointer leading-none">
                        {repo.name}
                      </h3>

                      {isPaused && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-cw-bdr bg-cw-bg text-cw-txt3 tracking-wide">
                          PAUSED
                        </span>
                      )}

                      {isAuditing && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-amber/10 text-cw-amber tracking-wide flex items-center gap-1">
                          <Loader size={10} className="animate-spin" /> AUDITING
                        </span>
                      )}

                      {isQueued && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-blue/10 text-cw-blue tracking-wide flex items-center gap-1 border border-cw-blue/20">
                          <Clock size={10} /> QUEUED
                        </span>
                      )}

                      {/* Agent activity dots — shown only while auditing */}
                      {isAuditing && repo.config?.agents && (
                        <AgentDots agents={repo.config.agents} />
                      )}
                    </div>

                    <p className="text-[13px] text-cw-txt2 truncate max-w-3xl">{repo.description || 'No description provided.'}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-cw-txt3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: langColors[langName] || langColors.Unknown }} />
                        {langName}
                      </div>
                      <span>Last scan: {timeAgo(repo.lastScanAt)}</span>
                      <div className="flex items-center gap-1">
                        Health: {hasScore ? <span className={`font-semibold ${getHealthColor(score)}`}>{score}/100</span> : <span className="text-cw-txt3">pending first scan</span>}
                      </div>
                      <div className="flex items-center gap-1 text-cw-txt2">
                        {numAgents} Agents
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isAuditing && (
                      <button
                        onClick={() => setConfirmModalRepo(repo)}
                        disabled={retryingId === repo.id}
                        title={isQueued ? `Start scan now for ${repo.fullName}` : `Run clean comprehensive audit on ${repo.fullName}`}
                        className={`px-3 py-1.5 border text-[12px] font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                          isQueued
                            ? 'bg-cw-blue/10 border-cw-blue/30 text-cw-blue hover:bg-cw-blue/20'
                            : 'bg-cw-purple/10 border-cw-purple/30 text-cw-purple hover:bg-cw-purple/20 shadow-sm'
                        }`}
                      >
                        {retryingId === repo.id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <RotateCcw size={14} />
                        )}
                        {isQueued ? 'Scan Now' : 'Scan / Retry'}
                      </button>
                    )}

                    <button
                      onClick={() => toggleAutoFix(repo)}
                      disabled={autoFixingId === repo.id}
                      title={repo.autoFixEnabled
                        ? 'Auto-fix is ON — Codeward may open real fix PRs for this repo. Click to turn off.'
                        : 'Auto-fix is OFF — analysis still runs, but no auto-fix PRs will be opened. Click to turn on.'}
                      className={`px-3 py-1.5 border text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${repo.autoFixEnabled ? 'bg-cw-green/10 border-cw-green/30 text-cw-green hover:bg-cw-green/15' : 'bg-cw-bg border-cw-bdr text-cw-txt3 hover:bg-cw-bg2'}`}
                    >
                      {autoFixingId === repo.id ? <Loader size={14} className="animate-spin" /> : <Wrench size={14} />}
                      Auto-fix {repo.autoFixEnabled ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => togglePause(repo)}
                      disabled={pausingId === repo.id}
                      className="px-3 py-1.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/issues-prs?tab=prs&repo=${encodeURIComponent(repo.fullName)}`)}
                      title={`View pull requests for ${repo.fullName}`}
                      className="px-3 py-1.5 bg-cw-purple/10 border border-cw-purple/30 text-cw-purple text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5 hover:bg-cw-purple/15 cursor-pointer"
                    >
                      <GitPullRequest size={14} /> View PRs
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/history?search=${encodeURIComponent(repo.fullName)}`)}
                      title={`View all runs for ${repo.fullName}`}
                      className="px-3 py-1.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <BarChart2 size={14} /> Runs
                    </button>

                    {/* 3-dot menu */}
                    <div className="relative">
                      <button
                        id={`repo-menu-btn-${repo.id}`}
                        onClick={() => setOpenMenuId(openMenuId === repo.id ? null : repo.id)}
                        onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                        title="More options"
                        className="w-8 h-[30px] flex items-center justify-center bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt rounded-lg transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenuId === repo.id && (
                        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 rounded-xl border border-cw-bdr bg-cw-bg2 shadow-2xl overflow-hidden animate-fade-in">
                          <button
                            onClick={() => { setOpenMenuId(null); setRemoveModalRepo(repo); }}
                            title={`Remove ${repo.fullName} from Codeward`}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-cw-red hover:bg-cw-red/10 transition-colors text-left"
                          >
                            <Trash2 size={13} /> Remove from Codeward
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation & Deep-Link Retry Modal */}
      {confirmModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-cw-bg border border-cw-bdr rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cw-bdr bg-cw-bg2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cw-purple/10 border border-cw-purple/30 flex items-center justify-center text-cw-purple">
                  <RotateCcw size={16} />
                </div>
                <h3 className="text-[15px] font-semibold text-cw-txt">Retry Audit</h3>
              </div>
              <button
                onClick={() => setConfirmModalRepo(null)}
                className="w-7 h-7 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {runIdParam && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-cw-red/10 border border-cw-red/20 text-[12px] text-cw-red">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Directed from Failure Alert</span>
                    <p className="text-cw-txt2 mt-0.5 text-[11px]">
                      Run #{runIdParam} encountered an error. Retrying will supersede prior jobs and spin up a fresh isolated microVM.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-[13px] text-cw-txt leading-relaxed">
                Trigger a fresh comprehensive security, bloat, and architecture audit for{' '}
                <strong className="text-cw-purple font-mono">{confirmModalRepo.fullName}</strong>?
              </div>

              <div className="text-[12px] text-cw-txt3 bg-cw-bg2 p-3.5 rounded-xl border border-cw-bdr flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-cw-txt font-medium">
                  <span className="w-2 h-2 rounded-full bg-cw-green"></span>
                  Zero Compute Waste Guarantee
                </div>
                <p className="text-[11px] text-cw-txt2 leading-relaxed">
                  Ephemeral execution container starts on-demand and auto-destroys immediately upon completion.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalRepo(null)}
                  disabled={retryingId === confirmModalRepo.id}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg2 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRetryAudit(confirmModalRepo)}
                  disabled={retryingId === confirmModalRepo.id}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-cw-purple hover:bg-cw-purple/90 text-white transition-all flex items-center gap-2 shadow-md shadow-cw-purple/20 disabled:opacity-50 cursor-pointer border-none"
                >
                  {retryingId === confirmModalRepo.id ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Dispatching Audit...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      Confirm & Start Scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Repository Confirmation Modal */}
      {removeModalRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-cw-bg border border-cw-bdr rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cw-bdr bg-cw-bg2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cw-red/10 border border-cw-red/30 flex items-center justify-center text-cw-red">
                  <Trash2 size={16} />
                </div>
                <h3 className="text-[15px] font-semibold text-cw-txt">Remove Repository</h3>
              </div>
              <button
                onClick={() => setRemoveModalRepo(null)}
                className="w-7 h-7 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Auditing warning */}
              {removeModalRepo.status === 'pending_audit' && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-cw-amber/10 border border-cw-amber/20 text-[12px] text-cw-amber">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Audit in progress</span>
                    <p className="text-cw-txt2 mt-0.5 text-[11px]">
                      This repository is marked as being audited. If the audit is still running, removal is
                      blocked and you'll be told how long is left. If it has stalled, removal proceeds.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-[13px] text-cw-txt leading-relaxed">
                This will permanently disconnect{' '}
                <strong className="text-cw-red font-mono">{removeModalRepo.fullName}</strong>{' '}
                from Codeward. All scan history, reports, and agent data for this repository will be deleted.
              </div>

              <div className="text-[12px] text-cw-txt3 bg-cw-bg2 p-3.5 rounded-xl border border-cw-bdr flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-cw-txt font-medium">
                  <span className="w-2 h-2 rounded-full bg-cw-red" />
                  This action cannot be undone
                </div>
                <ul className="text-[11px] text-cw-txt2 leading-relaxed list-disc ml-4 flex flex-col gap-0.5">
                  <li>All runs and scan reports deleted</li>
                  <li>GitHub App remains installed — uninstall it separately if needed</li>
                  <li>You can reconnect the repository at any time</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRemoveModalRepo(null)}
                  disabled={removingId === removeModalRepo.id}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg2 transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => removeRepo(removeModalRepo)}
                  disabled={removingId === removeModalRepo.id}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-cw-red hover:bg-cw-red/90 text-white transition-all flex items-center gap-2 shadow-md shadow-cw-red/20 disabled:opacity-50 cursor-pointer border-none"
                >
                  {removingId === removeModalRepo.id ? (
                    <><Loader size={14} className="animate-spin" /> Removing...</>
                  ) : (
                    <><Trash2 size={14} /> Remove Repository</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
