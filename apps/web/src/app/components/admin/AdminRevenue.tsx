import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard, Building2, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mrrData = [
  { month: 'Jan', value: 45000 },
  { month: 'Feb', value: 52000 },
  { month: 'Mar', value: 68000 },
  { month: 'Apr', value: 81000 },
  { month: 'May', value: 94000 },
  { month: 'Jun', value: 112000 },
  { month: 'Jul', value: 128500 },
];

const topOrgs = [
  { id: 1, name: 'Acme Corp', mrr: 12500, plan: 'Enterprise', trend: 'up' },
  { id: 2, name: 'NovaTech', mrr: 8400, plan: 'Enterprise', trend: 'up' },
  { id: 3, name: 'Stackwise HQ', mrr: 6200, plan: 'Pro', trend: 'flat' },
  { id: 4, name: 'CartFlow', mrr: 4500, plan: 'Pro', trend: 'down' },
  { id: 5, name: 'Helix Health', mrr: 3800, plan: 'Pro', trend: 'up' },
];

export function AdminRevenue() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="Total MRR" value="$128.5k" trend="+14.7%" trendDir="up" />
        <Kpi title="ARR Run Rate" value="$1.54M" trend="+14.7%" trendDir="up" />
        <Kpi title="Net Revenue Retention" value="112%" trend="+2.1%" trendDir="up" />
        <Kpi title="Gross Churn" value="1.8%" trend="-0.4%" trendDir="down" color="text-cw-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Waterfall / Growth Chart */}
        <div className="lg:col-span-2 bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><BarChart2 size={14} className="text-cw-green"/> MRR Growth (YTD)</h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="var(--cw-green)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Orgs List */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-cw-bdr bg-cw-bg">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Building2 size={14} className="text-cw-blue"/> Top Accounts by MRR</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {topOrgs.map(org => (
              <div key={org.id} className="flex items-center justify-between p-3 border-b border-cw-bdr last:border-0 hover:bg-cw-bg3/30 transition-colors">
                <div>
                  <div className="text-[12px] font-bold text-cw-txt">{org.name}</div>
                  <div className="text-[10px] text-cw-txt3 mt-0.5">{org.plan}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold font-mono text-cw-txt">${org.mrr.toLocaleString()}</div>
                  <div className={`text-[10px] font-medium mt-0.5 flex items-center justify-end gap-0.5 ${org.trend === 'up' ? 'text-cw-green' : org.trend === 'down' ? 'text-cw-red' : 'text-cw-txt3'}`}>
                    {org.trend === 'up' && <ArrowUpRight size={10} />}
                    {org.trend === 'down' && <ArrowDownRight size={10} />}
                    {org.trend === 'flat' && '-'}
                    {org.trend === 'up' ? '+5%' : org.trend === 'down' ? '-2%' : 'Flat'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-cw-bdr bg-cw-bg3/30">
            <button className="w-full py-1.5 text-[11px] font-bold text-cw-txt3 border border-cw-bdr rounded hover:text-cw-txt hover:bg-cw-bg transition-colors">View All Accounts</button>
          </div>
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
        <DollarSign size={12} className="opacity-50" />
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
