import { Github, Activity, ShieldCheck, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, RefreshCcw, Webhook } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const rateLimitData = [
  { time: '10:00', used: 1200, limit: 5000 },
  { time: '10:15', used: 1500, limit: 5000 },
  { time: '10:30', used: 2800, limit: 5000 },
  { time: '10:45', used: 3100, limit: 5000 },
  { time: '11:00', used: 4200, limit: 5000 },
  { time: '11:15', used: 4600, limit: 5000 },
  { time: '11:30', used: 800, limit: 5000 }, // Reset
];

const mockWebhooks = [
  { id: 'evt_102934', event: 'push', repo: 'acme/frontend', status: 'Delivered', latency: '124ms', time: '2m ago' },
  { id: 'evt_102935', event: 'pull_request', repo: 'acme/backend', status: 'Delivered', latency: '89ms', time: '5m ago' },
  { id: 'evt_102936', event: 'installation_repositories', repo: 'vortex/core', status: 'Failed', latency: '5004ms', time: '12m ago' },
  { id: 'evt_102937', event: 'check_run', repo: 'novatech/api', status: 'Delivered', latency: '210ms', time: '15m ago' },
  { id: 'evt_102938', event: 'push', repo: 'cartflow/web', status: 'Delivered', latency: '145ms', time: '22m ago' },
];

export function AdminGitHubApp() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="API Rate Limit" value="800 / 5k" trend="Resets in 42m" trendDir="flat" color="text-cw-green" />
        <Kpi title="Active Installations" value="1,204" trend="+12 this week" trendDir="up" color="text-cw-txt" />
        <Kpi title="Webhook Success Rate" value="99.8%" trend="-0.1%" trendDir="down" color="text-cw-green" />
        <Kpi title="Avg Webhook Latency" value="142ms" trend="+12ms" trendDir="up" color="text-cw-amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Rate Limit Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col p-4 overflow-hidden h-full">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Activity size={14} className="text-cw-purple"/> API Rate Limit Usage</h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateLimitData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} domain={[0, 5000]} />
                <Tooltip cursor={{ stroke: 'var(--cw-bdr)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', fontSize: '11px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="used" stroke="var(--cw-purple)" strokeWidth={2} dot={false} name="Tokens Used" />
                <Line type="stepAfter" dataKey="limit" stroke="var(--cw-txt3)" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Limit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Webhook Delivery Log */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Webhook size={14} className="text-cw-blue"/> Webhook Deliveries</h3>
            <button className="px-2 py-1 text-[10px] font-bold bg-cw-bg3 border border-cw-bdr rounded hover:bg-cw-bg transition-colors flex items-center gap-1.5">
              <RefreshCcw size={10} /> Refresh Log
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
                <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Event ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Repository</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {mockWebhooks.map(hook => (
                  <tr key={hook.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-cw-txt3">{hook.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-cw-purple">{hook.event}</td>
                    <td className="px-4 py-3 font-bold text-cw-txt flex items-center gap-2"><Github size={12} className="text-cw-txt3"/> {hook.repo}</td>
                    <td className="px-4 py-3 text-center">
                      {hook.status === 'Delivered' ? (
                        <CheckCircle2 size={14} className="text-cw-green mx-auto" />
                      ) : (
                        <AlertCircle size={14} className="text-cw-red mx-auto" />
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-[11px] ${parseInt(hook.latency) > 1000 ? 'text-cw-red font-bold' : 'text-cw-txt2'}`}>{hook.latency}</td>
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

function Kpi({ title, value, trend, trendDir, color = 'text-cw-txt' }: { title: string, value: string, trend: string, trendDir: 'up' | 'down' | 'flat', color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-4 shadow-sm flex flex-col justify-between h-[100px]">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider font-bold flex items-center justify-between">
        {title}
      </div>
      <div className="flex items-end justify-between">
        <div className={`text-[24px] font-bold font-mono ${color}`}>{value}</div>
        <div className={`text-[11px] font-bold flex items-center gap-0.5 mb-1 ${trendDir === 'up' ? 'text-cw-green' : trendDir === 'down' ? 'text-cw-red' : 'text-cw-txt3'}`}>
          {trendDir === 'up' && <ArrowUpRight size={12} />}
          {trendDir === 'down' && <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
    </div>
  );
}
