import { useState } from 'react';
import { Search, Filter, Github, Play, History, Settings, TrendingUp, TrendingDown, Activity, X, ChevronRight, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const sparklineData = () => Array.from({length: 7}, () => ({ value: Math.floor(Math.random() * 40) + 60 }));

const mockRepos = [
  { id: 1, name: 'payments-service', org: 'CartFlow', lang: 'TypeScript', stack: 'Node', branch: 'main', score: 61, trend: 'down', status: 'critical', runs: 142, lastRun: '5m ago', vulns: 12 },
  { id: 2, name: 'billing-service', org: 'CartFlow', lang: 'TypeScript', stack: 'Node', branch: 'main', score: 88, trend: 'up', status: 'healthy', runs: 84, lastRun: '1h ago', vulns: 0 },
  { id: 3, name: 'auth-gateway', org: 'PayPulse', lang: 'Go', stack: 'Gin', branch: 'master', score: 84, trend: 'up', status: 'healthy', runs: 210, lastRun: '12m ago', vulns: 2 },
  { id: 4, name: 'transaction-engine', org: 'PayPulse', lang: 'Go', stack: 'Standard lib', branch: 'main', score: 72, trend: 'down', status: 'degrading', runs: 95, lastRun: '3h ago', vulns: 5 },
  { id: 5, name: 'data-pipeline-v2', org: 'Axon Labs', lang: 'Python', stack: 'FastAPI', branch: 'main', score: 79, trend: 'up', status: 'healthy', runs: 45, lastRun: '1d ago', vulns: 1 },
  { id: 6, name: 'ml-inference-api', org: 'Axon Labs', lang: 'Python', stack: 'Flask', branch: 'dev', score: 58, trend: 'down', status: 'critical', runs: 12, lastRun: '2d ago', vulns: 8 },
  { id: 7, name: 'frontend-monorepo', org: 'Stackwise HQ', lang: 'TypeScript', stack: 'React', branch: 'main', score: 91, trend: 'up', status: 'healthy', runs: 320, lastRun: '1m ago', vulns: 0 },
  { id: 8, name: 'checkout-api', org: 'NovaCorp', lang: 'Ruby', stack: 'Rails', branch: 'master', score: 63, trend: 'down', status: 'degrading', runs: 67, lastRun: '4h ago', vulns: 4 },
  { id: 9, name: 'user-service', org: 'Helix Health', lang: 'TypeScript', stack: 'NestJS', branch: 'main', score: 77, trend: 'up', status: 'healthy', runs: 88, lastRun: '5h ago', vulns: 0 },
  { id: 10, name: 'notification-engine', org: 'Nimbly Inc', lang: 'Python', stack: 'Celery', branch: 'main', score: 69, trend: 'down', status: 'degrading', runs: 110, lastRun: '10m ago', vulns: 3 },
  { id: 11, name: 'core-api', org: 'Vortex Dev', lang: 'Rust', stack: 'Actix', branch: 'main', score: 94, trend: 'up', status: 'healthy', runs: 40, lastRun: '8h ago', vulns: 0 },
  { id: 12, name: 'devtools-sdk', org: 'Vortex Dev', lang: 'TypeScript', stack: 'Node', branch: 'main', score: 87, trend: 'up', status: 'healthy', runs: 25, lastRun: '1d ago', vulns: 0 },
];

export function AdminRepos() {
  const [selectedRepo, setSelectedRepo] = useState<typeof mockRepos[0] | null>(null);

  return (
    <div className="space-y-6 relative flex flex-col h-full overflow-hidden">
      {/* Summary Strip */}
      <div className="flex items-center gap-6 bg-cw-bg2 border border-cw-bdr rounded-md p-3 shadow-sm text-[12px] font-medium shrink-0">
        <div className="flex items-center gap-2"><span className="text-[16px] font-bold text-cw-txt">47</span> <span className="text-cw-txt3 uppercase tracking-wider text-[10px]">Total Connected Repos</span></div>
        <div className="w-px h-5 bg-cw-bdr" />
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cw-green"></span> 38 healthy</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cw-amber"></span> 6 degrading</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cw-red animate-pulse"></span> 3 critical</div>
        <div className="flex-1" />
        <div className="text-[11px] text-cw-txt3 flex items-center gap-2 bg-cw-bg px-2 py-1 rounded border border-cw-bdr">
          <Activity size={12} className="text-cw-green" /> Global Sync: Live (2s ago)
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
          <input type="text" placeholder="Filter repositories by name or org..." className="w-full bg-cw-bg2 border border-cw-bdr rounded-md pl-9 pr-3 py-1.5 text-[12px] text-cw-txt focus:outline-none focus:border-cw-purple shadow-sm font-mono" />
        </div>
        <FilterSelect options={['All Tech Stacks', 'TypeScript/Node', 'Python/FastAPI', 'Go', 'Rust']} />
        <FilterSelect options={['All Statuses', 'Healthy', 'Degrading', 'Critical']} />
        <FilterSelect options={['Sort: Health Score', 'Sort: Last Run', 'Sort: Vulns']} />
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm relative">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 bg-cw-bg z-10 shadow-sm border-b border-cw-bdr">
            <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
              <th className="px-4 py-3">Repository</th>
              <th className="px-4 py-3">Tech Stack</th>
              <th className="px-4 py-3">Health Score</th>
              <th className="px-4 py-3">Vulns</th>
              <th className="px-4 py-3">Active Agents</th>
              <th className="px-4 py-3 text-right">Last Scan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {mockRepos.map(repo => (
              <tr 
                key={repo.id} 
                onClick={() => setSelectedRepo(repo)}
                className={`border-b border-cw-bdr hover:bg-cw-bg3/50 cursor-pointer transition-colors ${selectedRepo?.id === repo.id ? 'bg-cw-purple/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${repo.status === 'healthy' ? 'bg-cw-green' : repo.status === 'critical' ? 'bg-cw-red animate-pulse' : 'bg-cw-amber'}`} />
                    <span className="font-bold text-cw-txt font-mono">{repo.name}</span>
                  </div>
                  <div className="text-[10px] text-cw-txt3 ml-3.5 mt-0.5 font-medium">{repo.org}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-cw-bg px-2 py-0.5 rounded border border-cw-bdr text-[10px] text-cw-txt2">{repo.lang}</span>
                  <span className="text-[11px] text-cw-txt3 ml-2">{repo.stack}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${repo.score < 65 ? 'text-cw-red' : repo.score < 80 ? 'text-cw-amber' : 'text-cw-green'}`}>{repo.score}</span>
                    {repo.trend === 'up' ? <TrendingUp size={12} className="text-cw-green"/> : <TrendingDown size={12} className="text-cw-red"/>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {repo.vulns > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-cw-red/10 text-cw-red font-bold text-[10px] flex items-center gap-1 w-max">
                      <AlertOctagon size={10}/> {repo.vulns}
                    </span>
                  ) : (
                    <span className="text-cw-txt3 font-mono">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-0.5">
                    {Array.from({length: 8}).map((_, i) => (
                      <div key={i} className={`w-3 h-4 rounded-sm ${Math.random() > 0.2 ? 'bg-cw-blue/80' : 'bg-cw-bg3'}`} title="Agent active" />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-cw-txt2">{repo.lastRun}</td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight size={14} className="text-cw-txt3" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sidepull Drawer */}
      {selectedRepo && (
        <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-cw-bg2 border-l border-cw-bdr shadow-2xl flex flex-col z-20 animate-in slide-in-from-right-8 duration-200">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Github size={14} className="text-cw-txt" />
                <h3 className="text-[14px] font-bold text-cw-txt font-mono">{selectedRepo.name}</h3>
              </div>
              <div className="text-[11px] text-cw-txt3">{selectedRepo.org} · Branch: <span className="font-mono text-cw-blue">{selectedRepo.branch}</span></div>
            </div>
            <button onClick={() => setSelectedRepo(null)} className="p-1.5 hover:bg-cw-bg3 rounded text-cw-txt3 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button className="flex-1 bg-cw-blue text-white py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-cw-blue/90">
                <Play size={12} fill="currentColor"/> Trigger Scan
              </button>
              <button className="flex-1 border border-cw-bdr bg-cw-bg py-1.5 rounded-md text-[11px] font-bold text-cw-txt flex items-center justify-center gap-1.5 hover:bg-cw-bg3">
                <Terminal size={12}/> View Logs
              </button>
            </div>

            {/* Health Trend */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-cw-txt3">Health Trend (7 Days)</h4>
                <span className={`text-[18px] font-bold ${selectedRepo.score < 65 ? 'text-cw-red' : selectedRepo.score < 80 ? 'text-cw-amber' : 'text-cw-green'}`}>{selectedRepo.score}</span>
              </div>
              <div className="h-[60px] bg-cw-bg border border-cw-bdr rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData()}>
                    <Line type="monotone" dataKey="value" stroke={selectedRepo.trend === 'up' ? 'var(--cw-green)' : 'var(--cw-red)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Agent Status */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-cw-txt3 mb-3">Agent Status</h4>
              <div className="space-y-2 text-[12px]">
                {['Security', 'Bloat', 'Architecture', 'Data & DX'].map(agent => (
                  <div key={agent} className="flex items-center justify-between p-2 bg-cw-bg border border-cw-bdr rounded-md">
                    <span className="font-medium text-cw-txt">{agent}</span>
                    <div className="flex items-center gap-2 text-cw-txt3">
                      <span className="text-[10px] font-mono">Last run 2h ago</span>
                      <CheckCircle2 size={14} className="text-cw-green" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Findings */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-cw-txt3 mb-3">Recent Findings</h4>
              <div className="space-y-2">
                <div className="p-2 bg-cw-red/5 border border-cw-red/20 rounded-md text-[11px]">
                  <span className="font-bold text-cw-red">Critical:</span> Hardcoded AWS Key in src/config.ts
                </div>
                <div className="p-2 bg-cw-amber/5 border border-cw-amber/20 rounded-md text-[11px]">
                  <span className="font-bold text-cw-amber">Warning:</span> N+1 Query in getUserProfile()
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ options }: { options: string[] }) {
  return (
    <select className="bg-cw-bg2 border border-cw-bdr rounded-md px-2.5 py-1.5 text-[11px] font-bold text-cw-txt uppercase tracking-wider focus:outline-none focus:border-cw-purple cursor-pointer shadow-sm appearance-none">
      {options.map(opt => <option key={opt}>{opt}</option>)}
    </select>
  );
}
