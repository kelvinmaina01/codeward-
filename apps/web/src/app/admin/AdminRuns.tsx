import { Search, Filter, Calendar, ChevronLeft, ChevronRight, PlayCircle, Eye, RefreshCw, Loader2 } from 'lucide-react';

const mockRuns = [
  { id: 'run_01HX7K2M', repo: 'payments-service', org: 'CartFlow', sha: 'a4f91c2', branch: 'main', trigger: 'Push', status: 'Blocked', debt: 22, duration: '4m 22s', findings: '3 critical, 1 high', time: '2 min ago' },
  { id: 'run_01HX7K2N', repo: 'auth-gateway', org: 'PayPulse', sha: 'b8e3a1f', branch: 'main', trigger: 'Push', status: 'Passed', debt: 91, duration: '2m 15s', findings: 'All clear', time: '14 min ago' },
  { id: 'run_01HX7K2P', repo: 'data-pipeline', org: 'Axon Labs', sha: 'c7d2b4e', branch: 'feat/new-etl', trigger: 'PR', status: 'Running', debt: 0, duration: '1m 05s', findings: 'Scanning...', time: '16 min ago' },
  { id: 'run_01HX7K2Q', repo: 'checkout-api', org: 'NovaCorp', sha: 'd6c1a5d', branch: 'fix/auth-bug', trigger: 'Push', status: 'Failed', debt: 0, duration: '0m 45s', findings: 'Syntax error', time: '1h ago' },
  { id: 'run_01HX7K2R', repo: 'user-service', org: 'Helix Health', sha: 'e5b0c6c', branch: 'main', trigger: 'Scheduled', status: 'Passed', debt: 84, duration: '3m 10s', findings: '1 low', time: '2h ago' },
  { id: 'run_01HX7K2S', repo: 'notification-engine', org: 'Nimbly Inc', sha: 'f4a9d7b', branch: 'main', trigger: 'Push', status: 'Blocked', debt: 45, duration: '5m 02s', findings: '1 critical (SQLi)', time: '3h ago' },
  { id: 'run_01HX7K2T', repo: 'core-api', org: 'Vortex Dev', sha: '039e8a1', branch: 'main', trigger: 'Push', status: 'Passed', debt: 94, duration: '1m 55s', findings: 'All clear', time: '5h ago' },
  { id: 'run_01HX7K2U', repo: 'frontend-monorepo', org: 'Stackwise HQ', sha: '128d7b0', branch: 'feat/dashboard', trigger: 'PR', status: 'Passed', debt: 77, duration: '2m 30s', findings: '2 medium', time: '6h ago' },
];

export function AdminRuns() {
  return (
    <div className="space-y-6">
      {/* Stats Strip */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="Total runs this month" value="14,820" />
        <StatCard title="Pass rate" value="81.7%" />
        <StatCard title="Avg debt score" value="73" />
        <StatCard title="Avg duration" value="4m 22s" />
        <StatCard title="API cost this month" value="$1,037.40" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-cw-bg2 p-4 border border-cw-bdr rounded-xl shadow-sm">
        <div className="flex items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
            <input type="text" placeholder="Search repo or SHA..." className="w-[200px] bg-cw-bg border border-cw-bdr rounded-md pl-9 pr-3 py-1.5 text-[12px] text-cw-txt focus:outline-none focus:border-cw-purple" />
          </div>
          <FilterSelect options={['All Status', 'Passed', 'Blocked', 'Running', 'Failed']} />
          <FilterSelect options={['All Orgs', 'CartFlow', 'PayPulse', 'Axon Labs', 'NovaCorp']} />
          <FilterSelect options={['All Agents', 'Security', 'Architecture', 'Bloat']} />
        </div>
        <div className="flex items-center">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-cw-bdr rounded-md text-[12px] font-medium text-cw-txt hover:bg-cw-bg">
            <Calendar size={14} /> Date range
          </button>
          <FilterSelect options={['Sort: Newest', 'Sort: Oldest', 'Sort: Highest Debt']} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-cw-bdr bg-cw-bg/50 text-[11px] text-cw-txt3 font-bold tracking-wider uppercase">
                <th className="px-4 py-3">Run ID</th>
                <th className="px-4 py-3">Repo</th>
                <th className="px-4 py-3">Commit</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Debt Score</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Agents</th>
                <th className="px-4 py-3">Findings</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {mockRuns.map((run, i) => (
                <tr key={run.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors last:border-0">
                  <td className="px-4 py-3 font-mono text-[11px] text-cw-txt2">{run.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-cw-txt">{run.repo}</div>
                    <div className="text-[11px] text-cw-txt3">{run.org}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-[12px] text-cw-purple">{run.sha}</div>
                    <div className="text-[11px] text-cw-txt3">{run.branch}</div>
                  </td>
                  <td className="px-4 py-3 text-cw-txt2">{run.trigger}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      run.status === 'Passed' ? 'bg-cw-green/10 text-cw-green border-cw-green/20' :
                      run.status === 'Blocked' || run.status === 'Failed' ? 'bg-cw-red/10 text-cw-red border-cw-red/20' :
                      'bg-cw-amber/10 text-cw-amber border-cw-amber/20'
                    }`}>
                      {run.status === 'Running' && <Loader2 size={10} className="animate-spin" />}
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {run.debt > 0 ? (
                      <span className={`font-bold ${run.debt < 50 ? 'text-cw-red' : run.debt < 75 ? 'text-cw-amber' : 'text-cw-green'}`}>{run.debt}</span>
                    ) : <span className="text-cw-txt3">—</span>}
                  </td>
                  <td className="px-4 py-3 text-cw-txt2">{run.duration}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {[1,2,3,4,5,6,7,8].map(n => <div key={n} className="w-2 h-2 rounded-full bg-cw-blue/50" />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cw-txt">{run.findings}</td>
                  <td className="px-4 py-3 text-cw-txt2">{run.time}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-cw-txt3 hover:text-cw-blue hover:bg-cw-blue/10 rounded transition-colors" title="View Report"><Eye size={14}/></button>
                      <button className="p-1.5 text-cw-txt3 hover:text-cw-blue hover:bg-cw-blue/10 rounded transition-colors" title="Re-run"><RefreshCw size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-cw-bdr flex items-center justify-between text-[12px] text-cw-txt3">
          <div>Showing 1 to 25 of 14,820 runs</div>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:text-cw-txt transition-colors disabled:opacity-50"><ChevronLeft size={16} /></button>
            <span className="font-medium text-cw-txt">Page 1 of 593</span>
            <button className="p-1 hover:text-cw-txt transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-medium text-cw-txt3 uppercase tracking-wider mb-2">{title}</div>
      <div className="text-[20px] font-bold text-cw-txt leading-none">{value}</div>
    </div>
  );
}

function FilterSelect({ options }: { options: string[] }) {
  return (
    <select className="bg-cw-bg border border-cw-bdr rounded-md px-3 py-1.5 text-[12px] text-cw-txt font-medium focus:outline-none focus:border-cw-purple cursor-pointer hover:border-cw-txt3/30 transition-colors appearance-none pr-8 relative">
      {options.map(opt => <option key={opt}>{opt}</option>)}
    </select>
  );
}
