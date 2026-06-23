import { useState } from 'react';
import { ShieldAlert, Package, AlertTriangle, Network, Bot, ClipboardCheck, Database, MessageSquare, Activity, ChevronRight, X, Play, Terminal, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const sparklineData = () => Array.from({length: 7}, () => ({ value: Math.floor(Math.random() * 40) + 60 }));

const agentsData = [
  { id: 'security', name: 'Security Agent', icon: ShieldAlert, activeRepos: 47, status: 'Running', issues: { critical: 2, warning: 18 }, lastRun: '2m ago', uptime: '99.9%' },
  { id: 'bloat', name: 'Bloat Agent', icon: Package, activeRepos: 47, status: 'Running', issues: { critical: 0, warning: 4 }, lastRun: '5m ago', uptime: '100%' },
  { id: 'broken', name: 'Broken Code Agent', icon: AlertTriangle, activeRepos: 47, status: 'Running', issues: { critical: 1, warning: 11 }, lastRun: '12m ago', uptime: '99.8%' },
  { id: 'arch', name: 'Architecture Agent', icon: Network, activeRepos: 42, status: 'Running', issues: { critical: 3, warning: 34 }, lastRun: '1h ago', uptime: '99.5%' },
  { id: 'ai', name: 'AI-Era Agent', icon: Bot, activeRepos: 18, status: 'Running', issues: { critical: 0, warning: 2 }, lastRun: '3m ago', uptime: '100%' },
  { id: 'compliance', name: 'Compliance Agent', icon: ClipboardCheck, activeRepos: 47, status: 'Running', issues: { critical: 2, warning: 0 }, lastRun: '10m ago', uptime: '100%' },
  { id: 'data', name: 'Data & DX Agent', icon: Database, activeRepos: 35, status: 'Paused', issues: { critical: 0, warning: 0 }, lastRun: '2d ago', uptime: '94.2%' },
  { id: 'chat', name: 'Chat Agent', icon: MessageSquare, activeRepos: 47, status: 'Running', issues: { critical: 0, warning: 0 }, lastRun: 'Live', uptime: '99.9%' },
];

export function AdminAgents() {
  const [selectedAgent, setSelectedAgent] = useState<typeof agentsData[0] | null>(null);

  return (
    <div className="space-y-6 relative flex flex-col h-full overflow-hidden">
      {/* Summary Strip */}
      <div className="flex items-center gap-6 bg-cw-bg2 border border-cw-bdr rounded-md p-3 shadow-sm text-[12px] font-medium shrink-0">
        <div className="flex items-center gap-2"><span className="text-[16px] font-bold text-cw-txt">8</span> <span className="text-cw-txt3 uppercase tracking-wider text-[10px]">Total Agents</span></div>
        <div className="w-px h-5 bg-cw-bdr" />
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cw-green"></span> 7 Active</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cw-amber"></span> 1 Paused</div>
        <div className="flex-1" />
        <div className="text-[11px] text-cw-txt3 flex items-center gap-2 bg-cw-bg px-2 py-1 rounded border border-cw-bdr">
          <Activity size={12} className="text-cw-green" /> Cluster: Nominal
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm relative">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-cw-bg z-10 shadow-sm border-b border-cw-bdr">
            <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
              <th className="px-4 py-3">Agent ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Active Repos</th>
              <th className="px-4 py-3">Open Issues</th>
              <th className="px-4 py-3">Uptime</th>
              <th className="px-4 py-3 text-right">Last Global Run</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {agentsData.map(agent => (
              <tr 
                key={agent.id} 
                onClick={() => setSelectedAgent(agent)}
                className={`border-b border-cw-bdr hover:bg-cw-bg3/50 cursor-pointer transition-colors ${selectedAgent?.id === agent.id ? 'bg-cw-purple/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <agent.icon size={16} className="text-cw-txt" />
                    <span className="font-bold text-cw-txt font-mono">{agent.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Running' ? 'bg-cw-green' : 'bg-cw-amber'}`} />
                    <span className="text-cw-txt2 font-mono text-[11px]">{agent.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-cw-bg px-2 py-0.5 rounded border border-cw-bdr text-[11px] font-mono">{agent.activeRepos} / 47</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {agent.issues.critical > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-cw-red/10 text-cw-red font-bold text-[10px] flex items-center gap-1">
                        Critical: {agent.issues.critical}
                      </span>
                    )}
                    {agent.issues.warning > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-cw-amber/10 text-cw-amber font-bold text-[10px] flex items-center gap-1">
                        Warn: {agent.issues.warning}
                      </span>
                    )}
                    {agent.issues.critical === 0 && agent.issues.warning === 0 && (
                      <span className="text-cw-txt3 font-mono">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-cw-green">{agent.uptime}</td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-cw-txt2">{agent.lastRun}</td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={14} className="text-cw-txt3" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sidepull Drawer */}
      {selectedAgent && (
        <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-cw-bg2 border-l border-cw-bdr shadow-2xl flex flex-col z-20 animate-in slide-in-from-right-8 duration-200">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
            <div className="flex items-center gap-2">
              <selectedAgent.icon size={16} className="text-cw-txt" />
              <h3 className="text-[14px] font-bold text-cw-txt font-mono">{selectedAgent.name}</h3>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="p-1.5 hover:bg-cw-bg3 rounded text-cw-txt3 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button className="flex-1 bg-cw-blue text-white py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-cw-blue/90">
                <Play size={12} fill="currentColor"/> Force Global Run
              </button>
              <button className="flex-1 border border-cw-bdr bg-cw-bg py-1.5 rounded-md text-[11px] font-bold text-cw-txt flex items-center justify-center gap-1.5 hover:bg-cw-bg3">
                <Terminal size={12}/> View Agent Logs
              </button>
            </div>

            {/* Run Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-cw-txt3">Run Volume (7 Days)</h4>
                <span className="text-[18px] font-bold text-cw-txt">14.2k</span>
              </div>
              <div className="h-[60px] bg-cw-bg border border-cw-bdr rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData()}>
                    <Line type="monotone" dataKey="value" stroke="var(--cw-purple)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Findings */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-cw-txt3 mb-3">Top Repos by Findings</h4>
              <div className="space-y-2 text-[12px]">
                {['payments-service', 'checkout-api', 'auth-gateway'].map(repo => (
                  <div key={repo} className="flex items-center justify-between p-2 bg-cw-bg border border-cw-bdr rounded-md font-mono text-[11px]">
                    <span className="font-medium text-cw-txt">{repo}</span>
                    <span className="text-cw-red font-bold">{Math.floor(Math.random() * 10) + 1} issues</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
