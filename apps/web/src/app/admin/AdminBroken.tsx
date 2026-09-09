import { Bug, TrendingUp, AlertOctagon, Database, Activity, Code2, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const memoryData = [
  { time: '0s', current: 120, fix: 120 },
  { time: '10s', current: 155, fix: 122 },
  { time: '20s', current: 190, fix: 125 },
  { time: '30s', current: 240, fix: 128 },
  { time: '40s', current: 310, fix: 124 },
  { time: '50s', current: 405, fix: 126 },
  { time: '60s', current: 520, fix: 130 },
];

const mockTests = [
  { id: 1, name: 'auth/login.spec.ts', repo: 'payments-service', rate: '3/10', seen: '12d ago', last: '2h ago', cause: 'DB connection timeout', status: 'Open' },
  { id: 2, name: 'stripe/webhook.test.ts', repo: 'checkout-api', rate: '1/20', seen: '30d ago', last: '1d ago', cause: 'Date boundary issue', status: 'In Review' },
  { id: 3, name: 'ui/Button.test.tsx', repo: 'frontend-monorepo', rate: '5/10', seen: '2d ago', last: '5m ago', cause: 'DOM node unavailable', status: 'Open' },
];

const mockRace = [
  { id: 1, req1: 'POST /api/orders/charge', req2: 'POST /api/orders/charge', state: 'orders.status (DB)', stack: 'at src/orders/process.ts:42', fix: 'Add SELECT FOR UPDATE lock' },
  { id: 2, req1: 'PUT /user/profile', req2: 'PUT /user/profile', state: 'Redis session cache', stack: 'at src/cache/redis.ts:18', fix: 'Use Redis SETNX' },
];

export function AdminBroken() {
  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <Kpi title="Failing Suites" value="3" color="text-cw-red" />
        <Kpi title="Flaky Tests" value="11" color="text-cw-amber" />
        <Kpi title="Race Conditions" value="2" color="text-cw-red" />
        <Kpi title="Memory Leaks" value="1" color="text-cw-amber" />
        <Kpi title="Broken Migrations" value="0" color="text-cw-green" />
        <Kpi title="Swallowed Errors" value="28" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flaky Test Tracker */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col h-[350px]">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><Activity size={16} className="text-cw-amber"/> Flaky Test Tracker</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cw-bdr bg-cw-bg/50 text-[11px] text-cw-txt3 font-bold tracking-wider uppercase">
                  <th className="px-4 py-3">Test Name</th>
                  <th className="px-4 py-3">Failure Rate</th>
                  <th className="px-4 py-3">Suspected Cause</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {mockTests.map(t => (
                  <tr key={t.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-cw-txt">{t.name}</div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">{t.repo}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-cw-amber">{t.rate}</span> runs
                    </td>
                    <td className="px-4 py-3 text-cw-txt2">{t.cause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Memory Profiler */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><TrendingUp size={16} className="text-cw-red"/> Memory Leak Profiler</h3>
            <span className="text-[11px] font-mono bg-cw-bg px-2 py-1 rounded border border-cw-bdr text-cw-txt2">checkout-api (60s load test)</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={memoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} />
              <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)' }} />
              <Line type="monotone" dataKey="current" name="Current (Leaking)" stroke="var(--cw-red)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fix" name="Suggested Fix" stroke="var(--cw-green)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Race Condition Log */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col h-[350px] lg:col-span-2">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><AlertOctagon size={16} className="text-cw-red"/> Race Condition Log</h3>
          </div>
          <div className="p-4 flex gap-4 overflow-x-auto flex-1">
            {mockRace.map(r => (
              <div key={r.id} className="min-w-[400px] border border-cw-bdr rounded-xl bg-cw-bg p-4 flex flex-col gap-3">
                <div className="flex items-center">
                  <div className="flex-1 bg-cw-bg3/50 rounded border border-cw-bdr p-2 text-center text-[11px] font-mono text-cw-txt">{r.req1}</div>
                  <AlertOctagon size={14} className="text-cw-red shrink-0"/>
                  <div className="flex-1 bg-cw-bg3/50 rounded border border-cw-bdr p-2 text-center text-[11px] font-mono text-cw-txt">{r.req2}</div>
                </div>
                <div className="text-center text-[12px]">
                  <span className="text-cw-txt3">Colliding on: </span>
                  <span className="font-bold text-cw-txt">{r.state}</span>
                </div>
                <div className="bg-cw-red/5 border border-cw-red/20 rounded p-2 flex-1">
                  <div className="text-[10px] text-cw-red uppercase tracking-wider mb-1 font-bold">Stack Trace</div>
                  <div className="font-mono text-[11px] text-cw-txt2">{r.stack}</div>
                </div>
                <button className="w-full py-2 bg-cw-blue/10 text-cw-blue border border-cw-blue/20 rounded text-[12px] font-bold hover:bg-cw-blue/20 transition-colors">
                  {r.fix}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, color = 'text-cw-txt' }: { title: string, value: string, color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-3 shadow-sm">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-[20px] font-bold ${color}`}>{value}</div>
    </div>
  );
}
