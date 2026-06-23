import { Users, TrendingUp, Target, UserPlus, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const conversionData = [
  { month: 'Jan', trials: 120, conversions: 45 },
  { month: 'Feb', trials: 150, conversions: 58 },
  { month: 'Mar', trials: 180, conversions: 72 },
  { month: 'Apr', trials: 210, conversions: 90 },
  { month: 'May', trials: 250, conversions: 110 },
  { month: 'Jun', trials: 320, conversions: 145 },
];

const acquisitionChannels = [
  { id: 1, channel: 'Organic Search', visitors: '45.2k', signups: 840, conversion: '1.8%', trend: 'up' },
  { id: 2, channel: 'Direct Traffic', visitors: '12.4k', signups: 320, conversion: '2.5%', trend: 'up' },
  { id: 3, channel: 'Twitter / X', visitors: '8.1k', signups: 150, conversion: '1.8%', trend: 'flat' },
  { id: 4, channel: 'LinkedIn', visitors: '5.6k', signups: 110, conversion: '1.9%', trend: 'down' },
  { id: 5, channel: 'Referral (GitHub)', visitors: '3.2k', signups: 450, conversion: '14.1%', trend: 'up' },
];

export function AdminGrowth() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="New Signups (30d)" value="1,842" trend="+24%" trendDir="up" color="text-cw-purple" />
        <Kpi title="Trial Conversion" value="45.3%" trend="+4.1%" trendDir="up" color="text-cw-green" />
        <Kpi title="Active Trials" value="480" trend="-12" trendDir="down" color="text-cw-amber" />
        <Kpi title="CAC" value="$142.50" trend="-$14" trendDir="up" color="text-cw-txt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Trial Conversion Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col p-4 overflow-hidden h-full">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Target size={14} className="text-cw-purple"/> Trial to Paid Conversions</h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} />
                <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="trials" fill="var(--cw-bg3)" name="Trials Started" />
                <Bar dataKey="conversions" fill="var(--cw-purple)" name="Converted to Paid" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition Channels */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Globe size={14} className="text-cw-blue"/> Acquisition Channels</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
                <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Visitors</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {acquisitionChannels.map(ch => (
                  <tr key={ch.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-cw-txt">{ch.channel}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cw-txt2">{ch.visitors}</td>
                    <td className="px-4 py-3 text-right font-mono text-cw-txt">{ch.signups}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold">{ch.conversion}</span>
                        {ch.trend === 'up' ? <ArrowUpRight size={12} className="text-cw-green"/> : ch.trend === 'down' ? <ArrowDownRight size={12} className="text-cw-red"/> : <span className="text-cw-txt3 w-3 text-center">-</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
