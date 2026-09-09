import { Users, AlertCircle, ShieldAlert, ArrowUpRight, ArrowDownRight, Building, Search, Filter } from 'lucide-react';

const mockCustomers = [
  { id: 1, org: 'Acme Corp', tier: 'Enterprise', seats: '145 / 150', health: 92, trend: 'up', lastActive: '2m ago', risk: 'Low' },
  { id: 2, org: 'NovaTech', tier: 'Enterprise', seats: '80 / 100', health: 88, trend: 'up', lastActive: '12m ago', risk: 'Low' },
  { id: 3, org: 'CartFlow', tier: 'Pro', seats: '12 / 15', health: 45, trend: 'down', lastActive: '2d ago', risk: 'High' },
  { id: 4, org: 'Stackwise HQ', tier: 'Pro', seats: '8 / 10', health: 76, trend: 'flat', lastActive: '1h ago', risk: 'Medium' },
  { id: 5, org: 'Helix Health', tier: 'Pro', seats: '45 / 50', health: 95, trend: 'up', lastActive: '5m ago', risk: 'Low' },
  { id: 6, org: 'Vortex Dev', tier: 'Enterprise', seats: '120 / 200', health: 62, trend: 'down', lastActive: '1d ago', risk: 'High' },
];

export function AdminCustomers() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="Total Orgs" value="1,204" trend="+12" trendDir="up" />
        <Kpi title="Total Active Seats" value="8,450" trend="+140" trendDir="up" />
        <Kpi title="Avg Health Score" value="84" trend="+2" trendDir="up" color="text-cw-green" />
        <Kpi title="At-Risk Accounts" value="12" trend="+3" trendDir="down" color="text-cw-red" />
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm relative flex flex-col">
        <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
          <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Users size={14} className="text-cw-blue"/> Organization Directory</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cw-txt3" />
              <input type="text" placeholder="Search orgs..." className="bg-cw-bg border border-cw-bdr rounded px-2.5 py-1 pl-7 text-[11px] text-cw-txt focus:outline-none focus:border-cw-purple w-48" />
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-1 bg-cw-bg border border-cw-bdr rounded text-[11px] font-bold text-cw-txt hover:bg-cw-bg3 transition-colors">
              <Filter size={12} /> Filter
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
              <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Seat Utilization</th>
                <th className="px-4 py-3">Health Score</th>
                <th className="px-4 py-3">Churn Risk</th>
                <th className="px-4 py-3 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {mockCustomers.map(org => (
                <tr key={org.id} className="border-b border-cw-bdr hover:bg-cw-bg3/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-cw-bg3 border border-cw-bdr flex items-center justify-center text-[10px] font-bold text-cw-txt3">
                        {org.org.charAt(0)}
                      </div>
                      <span className="font-bold text-cw-txt">{org.org}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${org.tier === 'Enterprise' ? 'bg-cw-purple/10 text-cw-purple border-cw-purple/20' : 'bg-cw-blue/10 text-cw-blue border-cw-blue/20'}`}>
                      {org.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-cw-txt2">{org.seats}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${org.health < 65 ? 'text-cw-red' : org.health < 80 ? 'text-cw-amber' : 'text-cw-green'}`}>{org.health}</span>
                      {org.trend === 'up' ? <ArrowUpRight size={12} className="text-cw-green"/> : org.trend === 'down' ? <ArrowDownRight size={12} className="text-cw-red"/> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {org.risk === 'High' ? (
                      <span className="flex items-center gap-1.5 text-cw-red font-bold text-[11px]"><AlertCircle size={12} /> High Risk</span>
                    ) : org.risk === 'Medium' ? (
                      <span className="flex items-center gap-1.5 text-cw-amber font-bold text-[11px]"><AlertCircle size={12} /> Medium</span>
                    ) : (
                      <span className="text-cw-txt3 text-[11px]">Low</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[11px] text-cw-txt3">{org.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, trend, trendDir, color = 'text-cw-txt' }: { title: string, value: string, trend: string, trendDir: 'up' | 'down', color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-4 shadow-sm flex flex-col justify-between h-[100px]">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider font-bold flex items-center justify-between">
        {title}
      </div>
      <div className="flex items-end justify-between">
        <div className={`text-[24px] font-bold font-mono ${color}`}>{value}</div>
        <div className={`text-[11px] font-bold flex items-center gap-0.5 mb-1 ${trendDir === 'up' ? 'text-cw-green' : 'text-cw-red'}`}>
          {trendDir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
    </div>
  );
}
