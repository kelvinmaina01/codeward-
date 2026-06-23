import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Bot, Monitor, Blocks, Key } from 'lucide-react';

interface Props {
  onRunClick?: (sha: string) => void;
}

import { mockHealthData, mockDebtData, mockActivityRows } from '../../lib/mockAgentData';
import { api } from '../../lib/api';
import { useEffect, useState } from 'react';

export function Dashboard({ onRunClick }: Props) {
  const [stats, setStats] = useState({
    repositoriesProtected: 0,
    runsToday: 0,
    debtRemoved: 0,
    interventions: 0
  });

  useEffect(() => {
    api.api.stats.dashboard.$get()
      .then(res => res.json())
      .then(data => {
        if (!('error' in data)) {
          setStats({
            repositoriesProtected: data.repositoriesProtected,
            runsToday: data.runsToday,
            debtRemoved: data.debtRemoved,
            interventions: data.interventions
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-cw-bg text-cw-txt flex flex-col gap-6">
      
      {/* Row 1: 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'REPOSITORIES PROTECTED', value: stats.repositoriesProtected + '/6', sub: 'Active tracking' },
          { label: 'RUNS TODAY', value: stats.runsToday.toString(), sub: '0 this week' },
          { label: 'DEBT REMOVED', value: stats.debtRemoved.toString(), sub: 'Lines of bloated code removed' },
          { label: 'INTERVENTIONS', value: stats.interventions.toString(), sub: 'Automatic rollbacks triggered' },
        ].map(stat => (
          <div key={stat.label} className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col">
            <span className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-3">{stat.label}</span>
            <div className="text-3xl font-medium text-cw-txt mb-1">{stat.value}</div>
            <span className="text-[11px] text-cw-txt2">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Row 2: 2 Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Platform Health Chart (Now an AreaChart) */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col relative h-[240px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-1">PLATFORM HEALTH — 30 DAYS</div>
              <div className="text-4xl font-medium text-cw-green">77%</div>
            </div>
            <span className="text-[11px] text-cw-txt2">trend paused</span>
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

      {/* Row 3: Recent Sandbox Activity */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-lg flex flex-col overflow-hidden">
        <div className="px-5 py-4 flex justify-between items-center border-b border-cw-bdr">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">RECENT SANDBOX ACTIVITY</div>
          <button className="text-[11px] text-cw-blue hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1">
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
              {mockActivityRows.map((run, i) => (
                <tr key={i} onClick={() => onRunClick?.(run.sha)} className="hover:bg-cw-bg3 cursor-pointer transition-colors border-t border-cw-bdr group">
                  <td className="px-5 py-3 font-mono text-cw-blue">{run.sha}</td>
                  <td className="px-5 py-3 font-medium text-cw-txt">{run.repo}</td>
                  <td className="px-5 py-3 text-cw-txt2 max-w-[400px] truncate">{run.msg}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${run.statusColor}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-cw-txt3">{run.time}</td>
                  <td className="px-5 py-3 text-right">
                    <button className="px-3 py-1 bg-cw-bg3 border border-cw-bdr text-cw-txt text-[10px] font-medium rounded hover:bg-cw-bdr transition-all">
                      View PR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: 2 Bottom Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Active Runs */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-5">ACTIVE RUNS</div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-amber" />
                <span className="text-[13px] font-medium text-cw-txt">my-api</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] text-cw-txt2">commit 3fa2c1 - 2m 14s</span>
                <span className="px-2 py-0.5 rounded bg-cw-amber/10 text-cw-amber border border-cw-amber/20 text-[10px] font-bold">Running</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-green" />
                <span className="text-[13px] font-medium text-cw-txt">frontend</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] text-cw-txt2">4m ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-green/10 text-cw-green border border-cw-green/20 text-[10px] font-bold">94/100</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-green" />
                <span className="text-[13px] font-medium text-cw-txt">auth-service</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] text-cw-txt2">1h ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-green/10 text-cw-green border border-cw-green/20 text-[10px] font-bold">91/100</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-red" />
                <span className="text-[13px] font-medium text-cw-txt">payments-api</span>
              </div>
              <div className="flex items-center">
                <span className="text-[11px] text-cw-txt2">3h ago</span>
                <span className="px-2 py-0.5 rounded bg-cw-red/10 text-cw-red border border-cw-red/20 text-[10px] font-bold">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Debt Removed This Week */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-5">DEBT REMOVED THIS WEEK</div>
          <div className="flex flex-col gap-3.5">
            {[
              { label: 'Duplicate functions', pct: 75, color: 'bg-cw-green', val: '-18', valColor: 'text-cw-green' },
              { label: 'Dead code lines', pct: 95, color: 'bg-cw-green', val: '-247', valColor: 'text-cw-green' },
              { label: 'Security issues', pct: 45, color: 'bg-cw-red', val: '-3 crit', valColor: 'text-cw-red' },
              { label: 'N+1 queries fixed', pct: 60, color: 'bg-cw-teal', val: '-6', valColor: 'text-cw-teal' },
              { label: 'AI-era issues', pct: 35, color: 'bg-cw-purple', val: '-2', valColor: 'text-cw-purple' },
            ].map(r => (
              <div key={r.label} className="flex items-center">
                <span className="text-[12px] text-cw-txt min-w-[140px]">{r.label}</span>
                <div className="flex-1 h-1.5 bg-cw-bg3 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                </div>
                <span className={`text-[11px] min-w-[40px] text-right font-medium ${r.valColor}`}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Tactical Platform Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Section 1: High Priority Alerts */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">HIGH PRIORITY ALERTS</div>
            <button className="text-[11px] text-cw-blue hover:underline">View all Alerts &rarr;</button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-3 border border-cw-red/30 bg-cw-red/5 rounded-lg flex gap-3 items-start">
              <div className="w-8 h-8 rounded bg-cw-red/20 flex items-center justify-center text-cw-red shrink-0"><Key size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-bold text-cw-txt">API key exposed</div>
                  <div className="text-[11px] text-cw-txt3">2m ago</div>
                </div>
                <div className="text-[12px] text-cw-txt2 mt-0.5 truncate">Stripe key hardcoded in payments-api.</div>
                <button className="mt-3 text-[11px] font-medium text-white bg-cw-red hover:brightness-110 px-3 py-1.5 rounded shadow-sm">Resolve now</button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Agent Activity Stream */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">AGENT ACTIVITY STREAM</div>
          </div>
          <div className="flex flex-col gap-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-cw-bdr">
            {[
              { text: 'Deploy Manager auto-approved commit 3fa2c1', time: '14m ago', icon: Monitor, color: 'text-cw-green' },
              { text: 'Security Agent rotated Stripe key in payments-api', time: '1h ago', icon: ShieldAlert, color: 'text-cw-red' },
              { text: 'Chat Agent suggested fix for N+1 queries across 3 repos', time: 'Yesterday', icon: Bot, color: 'text-cw-purple' }
            ].map((ev, i) => (
              <div key={i} className="flex gap-4 items-start relative z-10">
                <div className="w-8 h-8 rounded-full bg-cw-bg border border-cw-bdr flex items-center justify-center shrink-0">
                  <ev.icon size={14} className={ev.color} />
                </div>
                <div className="mt-1 flex-1">
                  <div className="text-[13px] text-cw-txt font-medium">{ev.text}</div>
                  <div className="text-[11px] text-cw-txt3">{ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Pending Approvals */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-wider text-cw-txt3">PENDING APPROVALS</div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-3 border border-cw-amber/30 bg-cw-amber/5 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold text-cw-txt">Staging Deploy: my-api</div>
                <div className="text-[12px] text-cw-txt2 mt-0.5">Commit 3fa2c1 passed all 5 agent gates.</div>
              </div>
              <button className="px-3 py-1.5 bg-cw-amber text-cw-bg hover:brightness-110 text-[11px] font-bold rounded shadow-sm">Approve</button>
            </div>
            <div className="p-3 border border-cw-bdr bg-cw-bg rounded-lg flex items-center justify-between opacity-60">
              <div>
                <div className="text-[13px] font-bold text-cw-txt">PR #214: auth-service</div>
                <div className="text-[12px] text-cw-txt2 mt-0.5">Blocked by Guardian Agent (tests failing).</div>
              </div>
              <button className="px-3 py-1.5 bg-cw-bg3 text-cw-txt3 text-[11px] font-medium rounded cursor-not-allowed">Review</button>
            </div>
          </div>
        </div>

        {/* Section 4: Integration Health */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 mb-4">INTEGRATION HEALTH</div>
            <div className="grid grid-cols-2 gap-3">
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
          <button className="mt-5 text-[12px] font-medium text-cw-txt2 hover:text-cw-txt flex items-center gap-1.5 w-fit transition-colors">
            <Blocks size={14} /> Manage integrations
          </button>
        </div>

      </div>
      
      <div className="h-4" />
    </div>
  );
}
