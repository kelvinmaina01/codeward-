import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldAlert, Bot, Monitor, Blocks, Key, GitMerge, X as XIcon, 
  TrendingUp, Plus, ChevronRight, AlertTriangle, Award, CheckCircle2, 
  GitPullRequest, Scissors, Cpu, Layers, Shield, Zap, ExternalLink, Radio,
  Activity
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockHealthData, mockDebtData } from '../../lib/mockAgentData';
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

export function Dashboard({ onRunClick }: Props) {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    repositoriesProtected: 10,
    runsToday: 14,
    debtRemoved: 1346,
    interventions: 18
  });

  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>(DEFAULT_MOCK_ACTIVITIES);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);

  const loadApprovals = () => {
    fetch(`${API_URL}/api/approvals?status=pending`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data?.approvals) setApprovals(data.approvals); })
      .catch(console.error);
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
    return () => clearInterval(approvalsPoll);
  }, []);

  useEffect(() => {
    api.api.stats.dashboard.$get()
      .then(res => res.json())
      .then(data => {
        if (!('error' in data)) {
          setStats({
            repositoriesProtected: data.repositoriesProtected || 10,
            runsToday: data.runsToday || 14,
            debtRemoved: data.debtRemoved || 1346,
            interventions: data.interventions || 18
          });
        }
      })
      .catch(console.error);

    // WebSocket connection for real-time activity feed
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/feed';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
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

          const newEvent: ActivityEvent = {
            id: Date.now().toString() + Math.random().toString(),
            text,
            time: 'Just now',
            icon,
            color,
            dotEmoji
          };

          setActivityFeed((prev) => [newEvent, ...prev].slice(0, 10));
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

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-cw-bg text-cw-txt flex flex-col gap-6">
      
      {/* Header with Repo Filter Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-cw-bdr/40">
        <div>
          <h1 className="text-[18px] font-bold text-cw-txt">Dashboard</h1>
          <div className="text-[12px] text-cw-txt3 mt-0.5">Real-time overview of code health, active agents, and pending approvals across your repositories.</div>
        </div>
        <div className="flex items-center gap-2">
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
          <button onClick={() => navigate('/dashboard/agent')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Comment01Icon size={15} className="text-cw-blue" /> Ask Codeward AI
          </button>
          <button onClick={() => navigate('/dashboard/debt')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <File01Icon size={15} className="text-cw-txt2" /> View debt report
          </button>
          <button onClick={() => navigate('/dashboard/cert')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Award01Icon size={15} className="text-amber-400" /> Share certificate
          </button>
          <button onClick={() => navigate('/dashboard/integrations')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <Share01Icon size={15} className="text-cw-txt3" /> Export to Jira
          </button>
        </div>
      </div>


      {/* Row 4: 2 Original 30-Day Area Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Health Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col relative h-[240px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-1">PLATFORM HEALTH — 30 DAYS</div>
              <div className="text-4xl font-medium text-cw-green">77%</div>
            </div>
            <span className="text-[11px] text-cw-txt2">trend active</span>
          </div>
          <div className="flex-1 w-full mt-4 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHealthData}>
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
          </div>
          <div className="flex justify-between text-[10px] text-cw-txt3 mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Cumulative Debt Area Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col relative h-[240px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-1">CUMULATIVE DEBT REMOVED — 30 DAYS</div>
              <div className="text-4xl font-medium text-cw-green">-1346 lines</div>
            </div>
            <span className="text-[11px] text-cw-txt2">26 refactors applied</span>
          </div>
          <div className="flex-1 w-full mt-4 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockDebtData}>
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
          </div>
          <div className="flex justify-between text-[10px] text-cw-txt3 mt-2">
            <span>0 lines</span>
            <span>-1346 lines</span>
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
                <tr><td colSpan={6} className="px-5 py-6 text-center text-cw-txt3">Loading recent runs...</td></tr>
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
            <div className="text-3xl font-medium text-cw-txt mb-1 flex items-baseline gap-2">
              {stats.repositoriesProtected}
              <span className="text-[11px] font-semibold text-cw-green flex items-center gap-0.5">
                <TrendingUp size={12} /> +2 this month
              </span>
            </div>
            <div className="text-[11px] text-cw-txt2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cw-green shrink-0" />
              <span>6 on free tier</span>
              <span className="text-cw-txt3">• Active tracking</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Runs Today */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">RUNS TODAY</span>
          <div>
            <div className="text-3xl font-medium text-cw-txt mb-1">{stats.runsToday}</div>
            <span className="text-[11px] text-cw-txt2">3 active scans right now</span>
          </div>
        </div>

        {/* Stat 3: Debt Removed */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">DEBT REMOVED</span>
          <div>
            <div className="text-3xl font-medium text-cw-txt mb-1">-{stats.debtRemoved} <span className="text-[14px] text-cw-txt2">lines</span></div>
            <span className="text-[11px] text-cw-txt2">Lines of bloated code removed</span>
          </div>
        </div>

        {/* Stat 4: Interventions */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">INTERVENTIONS</span>
          <div>
            <div className="text-3xl font-medium text-cw-txt mb-1">{stats.interventions}</div>
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
              <h2 className="text-[13px] font-semibold text-cw-txt flex items-center gap-2">
                <span className="text-[15px]">🚨</span> High priority alerts
              </h2>
              <button 
                onClick={() => navigate('/dashboard/alerts')}
                className="text-[11px] font-medium text-cw-blue hover:underline flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                View all &rarr;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Alert 1 */}
              <div className="p-3.5 border border-cw-bdr bg-cw-bg/50 rounded-lg flex items-start gap-3 hover:border-cw-red/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-cw-red/15 border border-cw-red/30 flex items-center justify-center text-cw-red shrink-0 mt-0.5">
                  <Key size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-bold text-cw-txt truncate">API key exposed</div>
                    <div className="text-[10px] text-cw-txt3 shrink-0">2m ago</div>
                  </div>
                  <div className="text-[11px] text-cw-txt2 mt-0.5">
                    Stripe key hardcoded in payments-api config.js:14
                  </div>
                  <button 
                    onClick={() => navigate('/dashboard/security')}
                    className="mt-2 text-[11px] font-semibold text-cw-red hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                  >
                    Resolve now &rarr;
                  </button>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="p-3.5 border border-cw-bdr bg-cw-bg/50 rounded-lg flex items-start gap-3 hover:border-cw-amber/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-cw-amber/15 border border-cw-amber/30 flex items-center justify-center text-cw-amber shrink-0 mt-0.5">
                  <AlertTriangle size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-bold text-cw-amber truncate">RLS missing on users table</div>
                    <div className="text-[10px] text-cw-txt3 shrink-0">14m ago</div>
                  </div>
                  <div className="text-[11px] text-cw-txt2 mt-0.5">
                    Supabase policy not set · any auth user can query all rows
                  </div>
                  <button 
                    onClick={() => navigate('/dashboard/security')}
                    className="mt-2 text-[11px] font-semibold text-cw-blue hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                  >
                    View suggested fix &rarr;
                  </button>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="p-3.5 border border-cw-bdr bg-cw-bg/50 rounded-lg flex items-start gap-3 hover:border-cw-blue/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-cw-blue/15 border border-cw-blue/30 flex items-center justify-center text-cw-blue shrink-0 mt-0.5">
                  <div className="w-3 h-3 rounded-full bg-cw-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-bold text-cw-txt truncate">N+1 on /api/users</div>
                    <div className="text-[10px] text-cw-txt3 shrink-0">1h ago</div>
                  </div>
                  <div className="text-[11px] text-cw-txt2 mt-0.5">
                    1 query per row · JOIN fix estimated -40% latency
                  </div>
                  <div className="mt-2 text-[10px] text-cw-txt3 font-medium">
                    Medium · Architecture Agent
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health Card (Exact design from user screenshot: 77 Ring & DEBT THIS WEEK progress bars) */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-cw-txt flex items-center gap-2">
                <span className="text-[15px]">🏅</span> Platform health
              </h2>
              <button 
                onClick={() => navigate('/dashboard/cert')}
                className="text-[11px] font-medium text-cw-blue hover:underline flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                Full cert &rarr;
              </button>
            </div>

            {/* Score Ring Header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative w-16 h-16 rounded-full border-[3.5px] border-cw-green flex items-center justify-center shrink-0 bg-cw-green/5 shadow-inner">
                <span className="text-xl font-bold text-cw-green">77</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-cw-green">77 / 100</div>
                <div className="text-[11px] text-cw-txt3">30-day platform avg across all connected repos</div>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-cw-green/15 border border-cw-green/30 text-cw-green text-[10px] font-bold">
                  Grade B
                </span>
              </div>
            </div>

            {/* Debt This Week Breakdown */}
            <div className="border-t border-cw-bdr pt-4">
              <div className="text-[10px] font-bold tracking-wider text-cw-txt3 uppercase mb-3">DEBT THIS WEEK</div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Duplicate functions', color: 'bg-cw-red', val: '-18', width: '65%' },
                  { label: 'Dead code lines', color: 'bg-cw-amber', val: '-247', width: '92%' },
                  { label: 'Security issues', color: 'bg-cw-red', val: '-3 crit', width: '30%' },
                  { label: 'N+1 queries', color: 'bg-cw-blue', val: '-6', width: '50%' },
                  { label: 'AI-era issues', color: 'bg-cw-green', val: '-2', width: '25%' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-[11px]">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                    <span className="text-cw-txt2 min-w-[130px]">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-cw-bg3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                    </div>
                    <span className="text-cw-green font-mono font-semibold min-w-[45px] text-right">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
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
          {activityFeed.map((item) => (
            <div 
              key={item.id} 
              className="p-3.5 rounded-lg border border-cw-bdr/60 bg-cw-bg/40 hover:bg-cw-bg3/60 transition-all flex items-start gap-3 group"
            >
              <div className="text-[16px] shrink-0 leading-none mt-0.5">
                {item.dotEmoji || '🤖'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[13px] font-medium text-cw-txt leading-snug">
                    {item.text}
                    {item.highlightText && (
                      <span className={`ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${item.badgeStyle || 'bg-cw-bg3 text-cw-txt border-cw-bdr'}`}>
                        {item.highlightText}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-cw-txt3 shrink-0">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 6: 2 Bottom Cards — Active Runs & Pending Approvals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Runs */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-5">ACTIVE RUNS</div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-amber" />
                <span className="text-[13px] font-medium text-cw-txt">my-api</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cw-txt2">commit 3fa2c1 - 2m 14s</span>
                <span className="px-2 py-0.5 rounded bg-cw-amber/10 text-cw-amber border border-cw-amber/20 text-[10px] font-bold">Running</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-green" />
                <span className="text-[13px] font-medium text-cw-txt">frontend</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cw-txt2">4m ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-green/10 text-cw-green border border-cw-green/20 text-[10px] font-bold">94/100</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-green" />
                <span className="text-[13px] font-medium text-cw-txt">auth-service</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cw-txt2">1h ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-green/10 text-cw-green border border-cw-green/20 text-[10px] font-bold">91/100</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-red" />
                <span className="text-[13px] font-medium text-cw-txt">payments-api</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cw-txt2">3h ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-red/10 text-cw-red border border-cw-red/20 text-[10px] font-bold">Blocked</span>
              </div>
            </div>
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
              {[
                { name: 'Slack', status: 'Connected', color: 'bg-cw-green' },
                { name: 'Sentry', status: 'Live feed', color: 'bg-cw-green' },
                { name: 'Supabase', status: 'Syncing...', color: 'bg-cw-amber' },
                { name: 'Jira', status: 'Config error', color: 'bg-cw-red' }
              ].map(int => (
                <div key={int.name} className="flex items-center gap-2 p-3 border border-cw-bdr rounded-md bg-cw-bg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${int.color} ${int.status === 'Syncing...' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-cw-txt truncate">{int.name}</div>
                    <div className="text-[11px] text-cw-txt3 truncate">{int.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => navigate('/dashboard/integrations')}
            className="mt-5 text-[12px] font-medium text-cw-txt2 hover:text-cw-txt flex items-center gap-1.5 w-fit transition-colors bg-transparent border-none cursor-pointer"
          >
            <Blocks size={14} /> Manage integrations &rarr;
          </button>
        </div>

      </div>
      
      <div className="h-4" />
    </div>
  );
}
