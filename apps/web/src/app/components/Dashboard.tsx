import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldAlert, Bot, Monitor, Blocks, Key, GitMerge, X as XIcon, 
  TrendingUp, Plus, ChevronRight, AlertTriangle, Award, CheckCircle2, 
  GitPullRequest, Scissors, Cpu, Layers, Shield, Zap, ExternalLink, Radio,
  Activity, ArrowRight, ArrowUpLeft, Settings, Slack
} from 'lucide-react';

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
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, API_URL } from '../../lib/api';
import { RepoSelector } from './RepoSelector';
import { 
  Search01Icon, 
  Add01Icon, 
  Comment01Icon, 
  File01Icon, 
  Award01Icon, 
  Share01Icon 
} from 'hugeicons-react';

interface Props {
  onRunClick?: (repoId: number, runId: number) => void;
}

interface RecentRun {
  runId: number;
  repoId: number;
  repoFullName: string;
  commitSha: string;
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

const RUN_STATUS_STYLE: Record<string, string> = {
  completed: 'bg-cw-green text-white',
  running: 'bg-cw-blue text-white',
  queued: 'bg-cw-bg3 text-cw-txt2',
  failed: 'bg-cw-red text-white',
  agent_failed: 'bg-cw-red text-white',
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
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/feed';
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

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-cw-bg text-cw-txt flex flex-col gap-6">
      
      {/* Header with Repo Filter Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-cw-bdr/40">
        <div>
          <h1 className="text-[18px] font-bold text-cw-txt">Dashboard</h1>
          <div className="text-[12px] text-cw-txt3 mt-0.5">Real-time overview of code health, active agents, and pending approvals across your repositories.</div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={dashboardTimeFilter} 
            onChange={(e) => setDashboardTimeFilter(e.target.value)}
            className="bg-cw-bg2 border border-cw-bdr text-cw-txt rounded-md px-2 py-1.5 text-sm outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="custom">Custom Date</option>
          </select>
          {dashboardTimeFilter === 'custom' && (
            <input 
              type="date" 
              value={customDashboardDate}
              onChange={(e) => setCustomDashboardDate(e.target.value)}
              className="bg-cw-bg2 border border-cw-bdr text-cw-txt rounded-md px-2 py-1.5 text-sm outline-none"
            />
          )}
          <RepoSelector
            options={repoList}
            value={repoFilter}
            onChange={(val, name) => setRepoFilter(val === 'All' ? 'All' : name)}
            showAllOption={true}
            allOptionLabel="All connected repositories"
          />
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 flex items-center gap-1.5">
          Jump to &rarr;
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/dashboard/staging')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Search01Icon size={15} className="text-cw-purple" /> Run full audit
          </button>
          <button onClick={() => navigate('/dashboard/repos')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Add01Icon size={15} className="text-cw-green" /> Connect new repo
          </button>
          <button onClick={() => navigate('/dashboard/agent?agent=chat')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            Ask Codeward AI (Gordon) <img src="http://localhost:5173/gordon.png" alt="Gordon" className="w-5 h-5 rounded-full border border-cw-bdr/50" />
          </button>
          <button onClick={() => navigate('/dashboard/debt')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <File01Icon size={15} className="text-cw-txt2" /> View debt report
          </button>
          <button onClick={() => navigate('/dashboard/cert')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Award01Icon size={15} className="text-amber-400" /> Share certificate
          </button>
          <button onClick={() => navigate('/dashboard/integrations')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <svg viewBox="0 0 24.1 24.1" width="15" height="15" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.1 14.8a2.5 2.5 0 1 1-2.5-2.5h2.5v2.5z" fill="#E01E5A"/>
              <path d="M6.3 14.8a2.5 2.5 0 1 1 5 0v6.2a2.5 2.5 0 1 1-5 0v-6.2z" fill="#E01E5A"/>
              <path d="M9.3 5.1a2.5 2.5 0 1 1 2.5-2.5v2.5H9.3z" fill="#36C5F0"/>
              <path d="M9.3 6.3a2.5 2.5 0 1 1 0 5H3.1a2.5 2.5 0 1 1 0-5h6.2z" fill="#36C5F0"/>
              <path d="M19 9.3a2.5 2.5 0 1 1 2.5 2.5h-2.5V9.3z" fill="#2EB67D"/>
              <path d="M17.8 9.3a2.5 2.5 0 1 1-5 0V3.1a2.5 2.5 0 1 1 5 0v6.2z" fill="#2EB67D"/>
              <path d="M14.8 19a2.5 2.5 0 1 1-2.5 2.5v-2.5h2.5z" fill="#ECB22E"/>
              <path d="M14.8 17.8a2.5 2.5 0 1 1 0-5h6.2a2.5 2.5 0 1 1 0 5h-6.2z" fill="#ECB22E"/>
            </svg> Export to Slack
          </button>
        </div>
      </div>


      {/* Row 4: 2 Original 30-Day Area Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Codebase Health Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col relative h-[240px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-1 uppercase">CODEBASE HEALTH — {dashboardTimeFilter === '7d' ? '7 DAYS' : dashboardTimeFilter === '3m' ? '3 MONTHS' : dashboardTimeFilter === 'custom' ? 'CUSTOM' : '30 DAYS'}</div>
              {loadingStats || !stats ? (
                <div className="h-9 w-24 bg-cw-bg3 animate-pulse rounded my-1" />
              ) : (
                <div className="text-4xl font-medium text-cw-green">{healthStats?.codebaseHealth != null ? `${healthStats.codebaseHealth}%` : '—'}</div>
              )}
            </div>
            <span className="text-[11px] text-cw-txt2">{healthStats?.codebaseHealth != null ? 'trend active' : 'no scans yet'}</span>
          </div>
          <div className="flex-1 w-full mt-4 -ml-2">
            {loadingStats || !stats ? (
              <div className="w-full h-full bg-cw-bg3/30 animate-pulse rounded-lg flex items-center justify-center text-[12px] text-cw-txt3">Loading metrics...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={computedHealthData}>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--cw-bg2)', border: '1px solid var(--cw-bdr)', borderRadius: '6px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--cw-txt)' }}
                    cursor={{ stroke: 'var(--cw-bdr)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--cw-green)" fill="var(--cw-green)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-cw-txt3 mt-2">
            <span>{getTimeLabel()}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Cumulative Debt Area Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col relative h-[240px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-1 uppercase">CUMULATIVE DEBT REMOVED — {dashboardTimeFilter === '7d' ? '7 DAYS' : dashboardTimeFilter === '3m' ? '3 MONTHS' : dashboardTimeFilter === 'custom' ? 'CUSTOM' : '30 DAYS'}</div>
              {loadingStats || !stats ? (
                <div className="h-9 w-32 bg-cw-bg3 animate-pulse rounded my-1" />
              ) : (
                <div className="text-4xl font-medium text-cw-green">{stats.debtRemoved}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] text-cw-txt2">{stats?.refactorsApplied ?? 0} refactors applied</span>
              <button 
                onClick={() => navigate('/dashboard/diff')} 
                className="px-2 py-1 bg-cw-purple hover:brightness-110 text-white rounded text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 shadow-sm border-none"
              >
                View Diff &rarr;
              </button>
            </div>
          </div>
          <div className="flex-1 w-full mt-4 -ml-2">
            {loadingStats || !stats ? (
              <div className="w-full h-full bg-cw-bg3/30 animate-pulse rounded-lg flex items-center justify-center text-[12px] text-cw-txt3">Loading debt graph...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={computedDebtData}>
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--cw-bg2)', border: '1px solid var(--cw-bdr)', borderRadius: '6px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--cw-green)' }}
                    cursor={{ stroke: 'var(--cw-bdr)' }}
                  />
                  <Area type="monotone" dataKey="lines" stroke="var(--cw-green)" fill="var(--cw-green)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-cw-txt3 mt-2">
            <span>0</span>
            <span>{stats?.debtRemoved ?? 0} files refactored</span>
          </div>
        </div>
      </div>

      {/* Row 5: Recent Sandbox Activity Table */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-lg flex flex-col overflow-hidden">
        <div className="px-5 py-4 flex justify-between items-center border-b border-cw-bdr">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">RECENT SANDBOX ACTIVITY</div>
          <button 
            onClick={() => navigate('/dashboard/commits')}
            className="text-[11px] text-cw-blue hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1"
          >
            View all &rarr;
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] tracking-wider text-cw-txt2 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Commit</th>
                <th className="px-5 py-3 font-medium">Repository</th>
                <th className="px-5 py-3 font-medium">Findings</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-[12px] text-cw-txt">
              {loadingRuns ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-cw-bdr">
                    <td colSpan={6} className="px-5 py-3">
                      <div className="h-5 w-full bg-cw-bg3/60 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredRuns.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-cw-txt3">No runs found for {repoFilter === 'All' ? 'connected repositories' : repoFilter}.</td></tr>
              ) : filteredRuns.map((run) => (
                <tr key={run.runId} onClick={() => onRunClick?.(run.repoId, run.runId)} className="hover:bg-cw-bg3 cursor-pointer transition-colors border-t border-cw-bdr group">
                  <td className="px-5 py-3 font-mono text-cw-blue">{run.commitSha.slice(0, 7)}</td>
                  <td className="px-5 py-3 font-medium text-cw-txt">{run.repoFullName}</td>
                  <td className="px-5 py-3 text-cw-txt2">{run.overallScore != null ? `Score: ${run.overallScore}/100` : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${RUN_STATUS_STYLE[run.status] ?? 'bg-cw-bg3 text-cw-txt2'}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-cw-txt3">{new Date(run.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="px-3 py-1 bg-cw-bg3 border border-cw-bdr text-cw-txt text-[10px] font-medium rounded hover:bg-cw-bdr transition-all cursor-pointer">
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 1: 4 Top KPI Stat Cards (Repos Protected enhanced with + Add repository button & free tier breakdown) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Repositories Protected */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group hover:border-cw-purple/40 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-cw-txt3">REPOSITORIES PROTECTED</span>
            <button 
              onClick={() => navigate('/connect')}
              className="px-2 py-0.5 text-[10px] font-semibold bg-cw-purple text-white hover:brightness-110 rounded transition-all flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus size={11} /> Add repository
            </button>
          </div>
          <div>
            {loadingStats || !stats ? (
              <div className="h-8 w-20 bg-cw-bg3 animate-pulse rounded my-1" />
            ) : (
              <div className="text-3xl font-medium text-cw-txt mb-1 flex items-baseline gap-2">
                {stats.repositoriesProtected}
                <span className="text-[11px] font-semibold text-cw-green flex items-center gap-0.5">
                  <TrendingUp size={12} /> tracked
                </span>
              </div>
            )}
            <div className="text-[11px] text-cw-txt2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cw-green shrink-0" />
              <span>Active tracking</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Runs Today */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">RUNS TODAY</span>
          <div>
            {loadingStats || !stats ? (
              <div className="h-8 w-16 bg-cw-bg3 animate-pulse rounded my-1" />
            ) : (
              <div className="text-3xl font-medium text-cw-txt mb-1">{stats.runsToday}</div>
            )}
            <span className="text-[11px] text-cw-txt2">Automated workflow scans</span>
          </div>
        </div>

        {/* Stat 3: Debt Removed */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">DEBT REMOVED</span>
          <div>
            {loadingStats || !stats ? (
              <div className="h-8 w-24 bg-cw-bg3 animate-pulse rounded my-1" />
            ) : (
              <div className="text-3xl font-medium text-cw-txt mb-1">{stats.debtRemoved} <span className="text-[14px] text-cw-txt2">files</span></div>
            )}
            <span className="text-[11px] text-cw-txt2">Files changed by merged refactors</span>
          </div>
        </div>

        {/* Stat 4: Interventions */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">INTERVENTIONS</span>
          <div>
            {loadingStats || !stats ? (
              <div className="h-8 w-16 bg-cw-bg3 animate-pulse rounded my-1" />
            ) : (
              <div className="text-3xl font-medium text-cw-txt mb-1">{stats.interventions}</div>
            )}
            <span className="text-[11px] text-cw-txt2">Automatic rollbacks triggered</span>
          </div>
        </div>

      </div>

      {/* Row 2: SCREENSHOT CARDS SIDE-BY-SIDE (High Priority Alerts & Platform Health with 77 Circle Score) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* High Priority Alerts Card (Exact design from user screenshot) */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-semibold text-cw-txt flex items-center gap-2">
                  <span className="text-[15px]">🚨</span> High priority alerts
                </h2>
                <div className="flex gap-2">
                  <select 
                    value={alertTimeFilter}
                    onChange={(e) => setAlertTimeFilter(e.target.value)}
                    className="bg-cw-bg3 border border-cw-bdr text-cw-txt2 text-[10px] rounded px-2 py-0.5 outline-none cursor-pointer"
                  >
                    <option value="all">All time</option>
                    <option value="1d">Yesterday</option>
                    <option value="7d">7 days</option>
                    <option value="15d">15 days</option>
                    <option value="custom">Custom date</option>
                  </select>
                  {alertTimeFilter === 'custom' && (
                    <input 
                      type="date"
                      value={customAlertDate}
                      onChange={(e) => setCustomAlertDate(e.target.value)}
                      className="bg-cw-bg3 border border-cw-bdr text-cw-txt2 text-[10px] rounded px-2 py-0.5 outline-none"
                    />
                  )}
                </div>
              </div>
              <button 
                onClick={() => navigate('/dashboard/alerts')}
                className="text-[11px] font-medium text-cw-blue hover:underline flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                View all &rarr;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {alerts.length === 0 ? (
                <div className="text-[12px] text-cw-txt3 text-center py-4">No high priority alerts currently.</div>
              ) : alerts.slice(0, 3).map((alert, i) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'HIGH';
                
                const hoverColor = isCritical ? 'hover:border-cw-red/40' : (isHigh ? 'hover:border-cw-amber/40' : 'hover:border-cw-blue/40');
                const iconBgColor = isCritical ? 'bg-cw-red/15 border-cw-red/30 text-cw-red' : (isHigh ? 'bg-cw-amber/15 border-cw-amber/30 text-cw-amber' : 'bg-cw-blue/15 border-cw-blue/30 text-cw-blue');
                const titleColor = isCritical ? 'text-cw-red' : (isHigh ? 'text-cw-amber' : 'text-cw-txt');
                const actionColor = isCritical ? 'text-cw-red' : 'text-cw-blue';
                const actionText = isCritical ? 'Resolve now \u2192' : (alert.kind === 'escalation' ? 'View issue \u2192' : 'View suggested fix \u2192');
                const Icon = isCritical ? Key : (isHigh ? AlertTriangle : undefined);
                
                return (
                  <div key={alert.id || i} className={`p-3.5 border border-cw-bdr bg-cw-bg/50 rounded-lg flex items-start gap-3 transition-colors ${hoverColor}`}>
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconBgColor}`}>
                      {Icon ? <Icon size={15} /> : <div className="w-3 h-3 rounded-full bg-cw-blue" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-[13px] font-bold truncate ${titleColor}`}>{alert.title}</div>
                        <div className="text-[10px] text-cw-txt3 shrink-0">{timeAgo(alert.createdAt)}</div>
                      </div>
                      <div className="text-[11px] text-cw-txt2 mt-0.5">
                        {alert.description}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button 
                          onClick={() => navigate('/dashboard/alerts')}
                          className={`text-[11px] font-semibold hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer ${actionColor}`}
                        >
                          {actionText}
                        </button>
                        {alert.source && (
                          <div className="text-[10px] text-cw-txt3 font-medium">
                            {alert.severity !== 'INFO' ? `${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1).toLowerCase()} · ` : ''}{alert.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Codebase Health Card */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-cw-txt flex items-center gap-2">
                <span className="text-[15px]">🏅</span> Codebase health
              </h2>
              <button 
                onClick={() => navigate('/dashboard/cert')}
                className="text-[11px] font-medium text-cw-blue hover:underline flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                Full cert &rarr;
              </button>
            </div>

            {loadingStats || !healthStats ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-cw-bg3 animate-pulse shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="h-6 w-28 bg-cw-bg3 animate-pulse rounded" />
                    <div className="h-3 w-40 bg-cw-bg3 animate-pulse rounded" />
                  </div>
                </div>
                <div className="border-t border-cw-bdr pt-4 flex flex-col gap-3">
                  <div className="h-4 w-full bg-cw-bg3 animate-pulse rounded" />
                  <div className="h-4 w-full bg-cw-bg3 animate-pulse rounded" />
                  <div className="h-4 w-full bg-cw-bg3 animate-pulse rounded" />
                </div>
              </div>
            ) : (
              <>
                {/* Score Ring Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative w-16 h-16 rounded-full border-[3.5px] border-cw-green flex items-center justify-center shrink-0 bg-cw-green/5 shadow-inner">
                    <span className="text-xl font-bold text-cw-green">{healthStats.codebaseHealth != null ? healthStats.codebaseHealth : '—'}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cw-green">{healthStats.codebaseHealth != null ? `${healthStats.codebaseHealth} / 100` : 'No data yet'}</div>
                    <div className="text-[11px] text-cw-txt3">Latest completed scan avg across connected repos</div>
                    {healthStats.grade && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-cw-green/15 border border-cw-green/30 text-cw-green text-[10px] font-bold">
                        {healthStats.grade}
                      </span>
                    )}
                  </div>
                </div>

                {/* Debt This Week Breakdown */}
                <div className="border-t border-cw-bdr pt-4">
                  <div className="text-[10px] font-bold tracking-wider text-cw-txt3 uppercase mb-3">DEBT THIS WEEK</div>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Duplicate functions', color: 'bg-cw-red', val: healthStats.debtThisWeek.duplicateFunctions },
                      { label: 'Dead code lines', color: 'bg-cw-amber', val: healthStats.debtThisWeek.deadCodeLines },
                      { label: 'Security issues', color: 'bg-cw-red', val: healthStats.debtThisWeek.securityIssues },
                      { label: 'N+1 queries', color: 'bg-cw-blue', val: healthStats.debtThisWeek.nPlusOneQueries },
                      { label: 'AI-era issues', color: 'bg-cw-green', val: healthStats.debtThisWeek.aiEraIssues },
                    ].map((item) => {
                      const maxVal = Math.max(1, ...([healthStats.debtThisWeek.duplicateFunctions, healthStats.debtThisWeek.deadCodeLines, healthStats.debtThisWeek.securityIssues, healthStats.debtThisWeek.nPlusOneQueries, healthStats.debtThisWeek.aiEraIssues]));
                      const widthPct = Math.max(3, Math.round((item.val / maxVal) * 100));
                      return (
                        <div key={item.label} className="flex items-center gap-3 text-[11px]">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                          <span className="text-cw-txt2 min-w-[130px]">{item.label}</span>
                          <div className="flex-1 h-1.5 bg-cw-bg3 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${widthPct}%` }} />
                          </div>
                          <span className="text-cw-green font-mono font-semibold min-w-[45px] text-right">{item.val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Row 3: DEDICATED AGENT ACTIVITY LIVE FEED CARD */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-cw-bdr/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🤖</span>
            <div>
              <h2 className="text-[14px] font-bold text-cw-txt">Agent activity</h2>
              <div className="text-[11px] text-cw-txt3">Autonomous actions, code reviews, and automated fixes executed across your projects.</div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/dashboard/livefeed')}
            className="px-3 py-1.5 bg-cw-green/10 border border-cw-green/30 text-cw-green hover:bg-cw-green/20 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-cw-green animate-pulse" />
            Live feed →
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {activityFeed.slice(0, feedLimit).map((item) => {
            const agentId = getAgentIdFromText(item.text);
            return (
              <div 
                key={item.id} 
                onClick={() => {
                  sessionStorage.setItem('cw_target_agent_id', agentId);
                  navigate('/dashboard/livefeed');
                }}
                className="p-3.5 rounded-lg border border-cw-bdr/60 bg-cw-bg/40 hover:bg-cw-bg3/60 transition-all flex items-center justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="text-[16px] shrink-0 leading-none mt-0.5">
                    {item.dotEmoji || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-cw-txt leading-snug">
                      {item.text}
                      {item.highlightText && (
                        <span className={`ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${item.badgeStyle || 'bg-cw-bg3 text-cw-txt border-cw-bdr'}`}>
                          {item.highlightText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-cw-txt3 whitespace-nowrap">{item.time}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      sessionStorage.setItem('cw_target_agent_id', agentId);
                      navigate('/dashboard/livefeed');
                    }}
                    title={`Open ${agentId} in Agent Canvas`}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-cw-purple/10 text-cw-purple border border-cw-purple/30 hover:bg-cw-purple hover:text-white transition-all shadow-sm shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <span>Canvas</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {activityFeed.length > 5 && (
            <button 
              onClick={() => setFeedLimit(feedLimit === 5 ? 50 : 5)}
              className="w-full mt-2 py-2 text-[11px] font-medium text-cw-txt3 hover:text-cw-txt bg-cw-bg3 hover:bg-cw-bdr/50 border border-transparent hover:border-cw-bdr rounded transition-all cursor-pointer"
            >
              {feedLimit === 5 ? 'View all activity →' : 'Show less ↑'}
            </button>
          )}
        </div>
      </div>

      {/* Row 6: 2 Bottom Cards — Active Runs & Pending Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Runs */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-5">ACTIVE RUNS</div>
          <div className="flex flex-col gap-4">
              {filteredRuns.length === 0 ? (
                <div className="text-[12px] text-cw-txt3 text-center py-4">No active or recent runs.</div>
              ) : filteredRuns.slice(0, 4).map((run) => {
                const isRunning = run.status === 'running' || run.status === 'queued';
                const isFailed = run.status === 'failed' || run.status === 'agent_failed';
                
                const dotColor = isRunning ? 'bg-cw-amber' : (isFailed ? 'bg-cw-red' : 'bg-cw-green');
                const badgeStyle = isRunning 
                  ? 'bg-cw-amber/10 text-cw-amber border-cw-amber/20' 
                  : (isFailed ? 'bg-cw-red/10 text-cw-red border-cw-red/20' : 'bg-cw-green/10 text-cw-green border-cw-green/20');
                
                let badgeText = '';
                if (isRunning) badgeText = 'Running';
                else if (isFailed) badgeText = 'Blocked';
                else badgeText = run.overallScore != null ? `${run.overallScore}/100` : 'Pass';

                return (
                  <div key={run.runId} className="flex justify-between items-center group cursor-pointer hover:bg-cw-bg3/40 -mx-2 px-2 py-1 rounded transition-colors" onClick={() => onRunClick?.(run.repoId, run.runId)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                      <img src={`https://github.com/${run.repoFullName.split('/')[0]}.png?size=32`} className="w-5 h-5 rounded-full bg-cw-bg3" alt="" />
                      <span className="text-[13px] font-medium text-cw-txt truncate group-hover:underline flex items-center gap-1">
                        {run.repoFullName}
                        <ArrowUpLeft size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cw-txt3" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-cw-txt2 hidden sm:inline-block">
                        {isRunning ? `commit ${run.commitSha.substring(0, 6)} - ` : ''}{timeAgo(run.createdAt)}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold min-w-[50px] text-center ${badgeStyle}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">PENDING MERGE APPROVALS</div>
            </div>
            <div className="flex flex-col gap-3">
              {approvals.length === 0 ? (
                <div className="text-[12px] text-cw-txt3 text-center py-4">No auto-fix PRs awaiting a decision.</div>
              ) : approvals.map((a) => (
                <div key={a.id} className="p-3 border border-cw-amber/30 bg-cw-amber/5 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <a href={a.prUrl ?? '#'} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-cw-txt no-underline hover:underline">
                      PR #{a.pullRequestNumber}: {a.repoFullName}
                    </a>
                    <div className="text-[12px] text-cw-txt2 mt-0.5 truncate">
                      {a.prTitle ?? `${a.agentId} auto-fix`}
                      {a.guardianVerdict && <span className={a.guardianVerdict === 'APPROVE' ? 'text-cw-green' : 'text-cw-amber'}> · Guardian: {a.guardianVerdict}</span>}
                    </div>
                    {a.mode === 'auto' && a.deadlineAt && (
                      <div className="text-[11px] text-cw-amber mt-0.5">{deadlineLabel(a.deadlineAt)} unless you act</div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => decideApproval(a.id, 'approve')}
                      disabled={actingOn === a.id}
                      className="px-3 py-1.5 bg-cw-green text-white hover:brightness-110 text-[11px] font-bold rounded shadow-sm flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <GitMerge size={12} /> Merge now
                    </button>
                    <button
                      onClick={() => decideApproval(a.id, 'reject')}
                      disabled={actingOn === a.id}
                      className="px-3 py-1.5 bg-cw-bg3 border border-cw-bdr text-cw-txt2 hover:text-cw-red text-[11px] font-medium rounded flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <XIcon size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Integration Health */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between md:col-span-2">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-4">INTEGRATION HEALTH</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const PROVIDER_LOGOS: Record<string, string> = {
                  slack: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
                  sentry: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Sentry_logo.svg',
                  supabase: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Supabase_logo.svg',
                  jira: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Jira_%28Software%29_logo.svg',
                  github: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg',
                  gmail: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
                  calendar: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg',
                  linear: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Linear_logo.svg',
                  figma: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg',
                };
                const getProviderLogo = (provider: string) => PROVIDER_LOGOS[provider.toLowerCase()] || PROVIDER_LOGOS.github;

                if (integrations.length === 0) {
                  return (
                    <div className="col-span-full text-[12px] text-cw-txt3 text-center py-4 bg-cw-bg rounded-md border border-cw-bdr border-dashed">
                      No integrations configured yet.
                    </div>
                  );
                }

                return integrations.map(int => (
                  <div key={int.provider} className="flex items-start justify-between p-3 border border-cw-bdr rounded-md bg-cw-bg group hover:border-cw-bdr/80 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={getProviderLogo(int.provider)} alt={int.provider} className="w-6 h-6 object-contain shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-cw-txt truncate capitalize">{int.provider}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${int.status === 'connected' ? 'bg-cw-green' : 'bg-cw-amber'}`} />
                          <div className="text-[10px] text-cw-txt3 truncate capitalize">{int.status}</div>
                        </div>
                        {int.updatedAt && (
                          <div className="text-[9px] text-cw-txt3 truncate mt-1">Last used: {new Date(int.updatedAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => navigate('/dashboard/settings?tab=integrations')} className="text-cw-txt3 hover:text-cw-purple transition-colors p-1 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-pointer" title="Settings">
                      <Settings size={14} />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
          <button 
            onClick={() => navigate('/dashboard/integrations')}
            className="mt-5 px-4 py-2 bg-cw-blue text-white hover:brightness-110 rounded-lg text-[12px] font-semibold transition-all shadow-sm w-fit flex items-center gap-2 cursor-pointer"
          >
            <Blocks size={14} /> Manage integrations &rarr;
          </button>
        </div>

      </div>
      
      <div className="h-4" />
    </div>
  );
}
