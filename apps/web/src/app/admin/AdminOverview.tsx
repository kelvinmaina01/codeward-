import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, Shield, CheckCircle, XCircle, AlertCircle, PlayCircle, Loader2, DollarSign, TrendingUp, Users, Bot } from 'lucide-react';

const runVolumeData = [
  { date: 'May 24', runs: 410 }, { date: 'May 28', runs: 450 }, { date: 'Jun 1', runs: 520 },
  { date: 'Jun 5', runs: 580 }, { date: 'Jun 9', runs: 650 }, { date: 'Jun 13', runs: 710 },
  { date: 'Jun 17', runs: 790 }, { date: 'Jun 23', runs: 847 }
];

const mrrData = [
  { month: 'Jan', mrr: 3200 }, { month: 'Feb', mrr: 4500 }, { month: 'Mar', mrr: 6800 },
  { month: 'Apr', mrr: 8900 }, { month: 'May', mrr: 11200 }, { month: 'Jun', mrr: 14210 }
];

const recentRuns = [
  { id: 'run_01HX7K2M', repo: 'CartFlow / payments-service', sha: 'a4f91c2', status: 'Blocked', time: '4m 22s', findings: '3 critical, 1 high' },
  { id: 'run_01HX7K2N', repo: 'PayPulse / auth-gateway', sha: 'b8e3a1f', status: 'Passed', time: '2m 15s', findings: 'All clear' },
  { id: 'run_01HX7K2P', repo: 'Axon Labs / data-pipeline', sha: 'c7d2b4e', status: 'Running', time: '1m 05s', findings: 'Scanning...' },
  { id: 'run_01HX7K2Q', repo: 'NovaCorp / checkout-api', sha: 'd6c1a5d', status: 'Failed', time: '0m 45s', findings: 'Syntax error' },
  { id: 'run_01HX7K2R', repo: 'Helix / user-service', sha: 'e5b0c6c', status: 'Passed', time: '3m 10s', findings: '1 low' },
  { id: 'run_01HX7K2S', repo: 'Nimbly / notifications', sha: 'f4a9d7b', status: 'Blocked', time: '5m 02s', findings: '1 critical (SQLi)' },
  { id: 'run_01HX7K2T', repo: 'Vortex / core-api', sha: '039e8a1', status: 'Passed', time: '1m 55s', findings: 'All clear' },
  { id: 'run_01HX7K2U', repo: 'Stackwise / frontend', sha: '128d7b0', status: 'Passed', time: '2m 30s', findings: '2 medium' },
];

const agentsHealth = [
  { name: 'Security', score: 92, status: 'Active', finding: '1 critical open' },
  { name: 'Bloat', score: 85, status: 'Active', finding: '12 duplicate fns' },
  { name: 'Broken code', score: 78, status: 'Active', finding: '2 flaky tests' },
  { name: 'Architecture', score: 88, status: 'Active', finding: 'N+1 queries detected' },
  { name: 'AI-Era', score: 95, status: 'Active', finding: 'No injection risks' },
  { name: 'Compliance', score: 100, status: 'Active', finding: 'SOC2 ready' },
  { name: 'Data & DX', score: 71, status: 'Degraded', finding: 'High setup time' },
  { name: 'Chat Agent', score: 98, status: 'Active', finding: '14 chats today' },
];

const activeAlerts = [
  { severity: 'critical', title: 'Live Stripe Key Exposed', source: 'Security', repo: 'CartFlow / payments-service', time: '2h ago' },
  { severity: 'critical', title: 'Missing RLS Policy', source: 'Security', repo: 'CartFlow / payments-service', time: '2h ago' },
  { severity: 'high', title: 'High Memory Usage (Leak)', source: 'Broken code', repo: 'PayPulse / auth-gateway', time: '4h ago' },
  { severity: 'medium', title: 'N+1 Query Detected', source: 'Architecture', repo: 'Axon Labs / data-pipeline', time: '5h ago' },
  { severity: 'medium', title: 'Bloated Bundle Size', source: 'Bloat', repo: 'NovaCorp / checkout-api', time: '1d ago' },
];

const topCustomers = [
  { name: 'CartFlow', tier: 'Enterprise', repos: 14, runs: 1250 },
  { name: 'PayPulse', tier: 'Enterprise', repos: 8, runs: 940 },
  { name: 'Axon Labs', tier: 'Pro', repos: 22, runs: 820 },
  { name: 'NovaCorp', tier: 'Pro', repos: 5, runs: 450 },
  { name: 'Helix', tier: 'Pro', repos: 12, runs: 310 },
];

const infraMetrics = [
  { label: 'Active VMs', value: '12' },
  { label: 'Queue depth', value: '4' },
  { label: 'P95 boot', value: '138ms' },
  { label: 'Destroyed', value: '835' },
  { label: 'Region', value: 'ams, syd' },
  { label: 'Error rate', value: '0.2%' },
];

export function AdminOverview() {
  return (
    <div className="space-y-8 pb-10">
      {/* PLATFORM HEALTH */}
      <section>
        <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-3">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard 
            title="Runs today" value="847" 
            trend={{ text: '12% vs yesterday (757)', type: 'up' }} icon={<PlayCircle size={16} />} 
          />
          <KpiCard 
            title="Block rate" value="18.3%" 
            trend={{ text: '2.1pp — more critical PRs', type: 'down' }} icon={<AlertCircle size={16} />} 
          />
          <KpiCard 
            title="Avg run time" value="4m 22s" 
            trend={{ text: '18s vs last week', type: 'up' }} icon={<Clock size={16} />} 
          />
          <KpiCard 
            title="Cost / run" value="$0.07" 
            trend={{ text: '$0.01 vs $0.08 baseline', type: 'up' }} icon={<DollarSign size={16} />} 
          />
        </div>
      </section>

      {/* BUSINESS METRICS */}
      <section>
        <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-3">Business Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard 
            title="MRR" value="$14,210" 
            trend={{ text: '31% MoM - target $18k Jul', type: 'up' }} icon={<TrendingUp size={16} />} 
          />
          <KpiCard 
            title="Paying orgs" value="184" 
            trend={{ text: '22 this month (+13.6%)', type: 'up' }} icon={<Users size={16} />} 
          />
          <KpiCard 
            title="Free → paid conv." value="6.8%" 
            trend={{ text: '0.9pp vs May (5.9%)', type: 'up' }} icon={<ArrowUpRight size={16} />} 
          />
          <KpiCard 
            title="Monthly churn" value="1.4%" 
            trend={{ text: '0.3pp — best ever', type: 'up' }} icon={<ArrowDownRight size={16} />} 
          />
        </div>
      </section>

      {/* CHARTS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-cw-txt mb-6">Run volume — last 30 days</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={runVolumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cw-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cw-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--cw-txt)' }}
                />
                <Area type="monotone" dataKey="runs" stroke="var(--cw-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorRuns)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-cw-txt mb-6">MRR — Jan to Jun 2026</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--cw-bg3)' }}
                  contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value) => [`$${value}`, 'MRR']}
                />
                <Bar dataKey="mrr" fill="var(--cw-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RECENT RUNS & AGENT HEALTH */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt">Recent runs</h3>
            <button className="text-[12px] font-medium text-cw-blue hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-cw-bdr bg-cw-bg/50 text-[11px] text-cw-txt3 font-bold tracking-wider uppercase">
                  <th className="px-5 py-3">Repo</th>
                  <th className="px-5 py-3">Commit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Findings</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {recentRuns.map((run, i) => (
                  <tr key={run.id} className={`border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors ${i === recentRuns.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-3 font-medium text-cw-txt">{run.repo}</td>
                    <td className="px-5 py-3 text-cw-txt2 font-mono text-[12px]">{run.sha}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        run.status === 'Passed' ? 'bg-cw-green/10 text-cw-green border-cw-green/20' :
                        run.status === 'Blocked' || run.status === 'Failed' ? 'bg-cw-red/10 text-cw-red border-cw-red/20' :
                        'bg-cw-amber/10 text-cw-amber border-cw-amber/20'
                      }`}>
                        {run.status === 'Running' && <Loader2 size={10} className="animate-spin" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-cw-txt2">{run.time}</td>
                    <td className="px-5 py-3 text-cw-txt">{run.findings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col">
          <div className="p-5 border-b border-cw-bdr">
            <h3 className="text-[14px] font-bold text-cw-txt">Agent Health</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {agentsHealth.map((agent, i) => (
              <div key={agent.name} className="p-3 hover:bg-cw-bg3/50 rounded-lg transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-cw-txt truncate">{agent.name}</span>
                    <span className={`text-[12px] font-bold ${agent.score < 80 ? 'text-cw-amber' : 'text-cw-green'}`}>{agent.score}</span>
                  </div>
                  <div className="h-1.5 w-full bg-cw-bg3 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className={`h-full rounded-full ${agent.score < 80 ? 'bg-cw-amber' : 'bg-cw-green'}`} 
                      style={{ width: `${agent.score}%` }} 
                    />
                  </div>
                  <div className="text-[11px] text-cw-txt3 truncate">{agent.finding}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts & Customers */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col">
          <div className="p-5 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2">
              Active Alerts <span className="w-5 h-5 rounded-full bg-cw-red/10 text-cw-red text-[11px] flex items-center justify-center">5</span>
            </h3>
          </div>
          <div className="p-2">
            {activeAlerts.map((alert, i) => (
              <div key={i} className="p-3 border-b border-cw-bdr last:border-0">
                <div className="flex items-start gap-2">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === 'critical' ? 'bg-cw-red' : alert.severity === 'high' ? 'bg-cw-amber' : 'bg-cw-blue'
                  }`} />
                  <div>
                    <div className="text-[13px] font-semibold text-cw-txt leading-snug">{alert.title}</div>
                    <div className="text-[11px] text-cw-txt2 mt-0.5">{alert.repo} · {alert.source}</div>
                    <div className="text-[10px] text-cw-txt3 mt-1">{alert.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col">
          <div className="p-5 border-b border-cw-bdr">
            <h3 className="text-[14px] font-bold text-cw-txt">Top Customers</h3>
          </div>
          <div className="p-2">
            {topCustomers.map((cust, i) => (
              <div key={i} className="p-3 border-b border-cw-bdr last:border-0 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-cw-txt">{cust.name}</div>
                  <div className="text-[11px] text-cw-txt3">{cust.repos} repos</div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] px-2 py-0.5 rounded border mb-1 font-medium inline-block ${
                    cust.tier === 'Enterprise' ? 'bg-cw-purple/10 text-cw-purple border-cw-purple/20' : 'bg-cw-blue/10 text-cw-blue border-cw-blue/20'
                  }`}>
                    {cust.tier}
                  </div>
                  <div className="text-[12px] font-bold text-cw-txt2">{cust.runs} runs</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sandbox Pipeline & AI Insights */}
        <div className="flex flex-col gap-6">
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-cw-txt mb-4">Sandbox Pipeline</h3>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 h-2 bg-cw-green rounded-full" />
              <div className="flex-1 h-2 bg-cw-green rounded-full" />
              <div className="flex-1 h-2 bg-cw-blue animate-pulse rounded-full" />
              <div className="flex-1 h-2 bg-cw-bg3 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              {infraMetrics.map((m, i) => (
                <div key={i}>
                  <div className="text-[11px] text-cw-txt3">{m.label}</div>
                  <div className="text-[13px] font-semibold text-cw-txt">{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-cw-purple/5 border border-cw-purple/20 rounded-xl shadow-sm p-5 flex-1 flex flex-col">
            <h3 className="text-[14px] font-bold text-cw-purple flex items-center gap-2 mb-4">
              <Bot size={16} /> AI Insight Engine
            </h3>
            <div className="flex flex-col gap-2 flex-1 justify-center">
              <button className="text-left px-3 py-2 rounded border border-cw-purple/20 bg-cw-bg2 text-cw-purple text-[12px] hover:bg-cw-purple/10 transition-colors">
                "What broke most today?"
              </button>
              <button className="text-left px-3 py-2 rounded border border-cw-purple/20 bg-cw-bg2 text-cw-purple text-[12px] hover:bg-cw-purple/10 transition-colors">
                "Show me all critical open findings"
              </button>
              <button className="text-left px-3 py-2 rounded border border-cw-purple/20 bg-cw-bg2 text-cw-purple text-[12px] hover:bg-cw-purple/10 transition-colors">
                "Which customer is most at risk?"
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ title, value, trend, icon }: { title: string, value: string, trend: { text: string, type: 'up' | 'down' }, icon: React.ReactNode }) {
  const trendColor = trend.type === 'up' ? 'text-cw-green' : 'text-cw-red';
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 shadow-sm hover:border-cw-txt3/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-medium text-cw-txt2 flex items-center gap-2">
          {icon} {title}
        </div>
      </div>
      <div className="text-[32px] font-bold text-cw-txt leading-none mb-3">{value}</div>
      <div className={`text-[11px] font-medium ${trendColor}`}>
        {trend.type === 'up' ? '↑' : '↓'} {trend.text}
      </div>
    </div>
  );
}
