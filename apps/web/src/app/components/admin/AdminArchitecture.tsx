import { Database, Network, Clock, Zap, Activity, ArrowRight, Server } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const k6Data = [
  { repo: 'payments-service', p50: 45, p95: 120, p99: 250 },
  { repo: 'checkout-api', p50: 60, p95: 180, p99: 410 },
  { repo: 'user-service', p50: 35, p95: 85, p99: 140 },
  { repo: 'auth-gateway', p50: 25, p95: 65, p99: 110 },
];

const mockQueries = [
  { id: 1, repo: 'payments-service', desc: 'getOrdersWithItems()', time: '410ms', rows: '4,520', type: 'N+1 Query', fix: 'JOIN with eager load', est: '85%' },
  { id: 2, repo: 'checkout-api', desc: 'Find transactions by date', time: '850ms', rows: '1.2M', type: 'Missing Index', fix: 'CREATE INDEX idx_created_at', est: '92%' },
  { id: 3, repo: 'user-service', desc: 'Count active sessions', time: '120ms', rows: '8,400', type: 'Full Table Scan', fix: 'Use Redis counter', est: '99%' },
];

const mockColdStarts = [
  { id: 1, repo: 'image-processor (Lambda)', time: '850ms', status: 'Above 500ms threshold' },
  { id: 2, repo: 'webhook-handler (Edge)', time: '45ms', status: 'Healthy' },
  { id: 3, repo: 'pdf-generator (Lambda)', time: '1.2s', status: 'Above 500ms threshold' },
];

export function AdminArchitecture() {
  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <Kpi title="N+1 Queries Caught" value="34" color="text-cw-amber" />
        <Kpi title="Missing Indexes" value="12" color="text-cw-red" />
        <Kpi title="Query Time Reduced" value="41" suffix=" ms" color="text-cw-green" />
        <Kpi title="Cold Starts > 500ms" value="2" suffix=" repos" color="text-cw-amber" />
        <Kpi title="Circular Dependencies" value="3" color="text-cw-red" />
        <Kpi title="Missing Retry Logic" value="8" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slow Query Table */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col h-[350px] lg:col-span-2">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><Database size={16} className="text-cw-amber"/> Slow Query Log (EXPLAIN ANALYZE)</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cw-bdr bg-cw-bg/50 text-[11px] text-cw-txt3 font-bold tracking-wider uppercase">
                  <th className="px-4 py-3">Query Description</th>
                  <th className="px-4 py-3">Avg Time</th>
                  <th className="px-4 py-3">Rows Scanned</th>
                  <th className="px-4 py-3">Issue Type</th>
                  <th className="px-4 py-3">Suggested Fix</th>
                  <th className="px-4 py-3 text-right">Est. Improvement</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {mockQueries.map(q => (
                  <tr key={q.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-cw-txt">{q.desc}</div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">{q.repo}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-cw-red">{q.time}</td>
                    <td className="px-4 py-3 font-mono text-cw-txt2">{q.rows}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-cw-bg3 rounded text-[11px] font-bold">{q.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-cw-blue">{q.fix}</td>
                    <td className="px-4 py-3 text-right font-bold text-cw-green">{q.est}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Circular Dependency Graph */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[350px] flex flex-col">
          <h3 className="text-[14px] font-bold text-cw-txt mb-4 flex items-center gap-2"><Network size={16} className="text-cw-red"/> Circular Dependencies</h3>
          <div className="flex-1 bg-cw-bg rounded-lg border border-cw-bdr flex items-center justify-center relative overflow-hidden">
            {/* SVG placeholder for dependency graph */}
            <svg width="100%" height="100%" viewBox="0 0 300 200" className="opacity-80">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--cw-red)" />
                </marker>
              </defs>
              <rect x="100" y="20" width="100" height="30" rx="4" fill="var(--cw-bg2)" stroke="var(--cw-bdr)" strokeWidth="1" />
              <text x="150" y="40" textAnchor="middle" fontSize="10" fill="var(--cw-txt)" fontFamily="monospace">user.service.ts</text>
              
              <rect x="20" y="120" width="100" height="30" rx="4" fill="var(--cw-bg2)" stroke="var(--cw-bdr)" strokeWidth="1" />
              <text x="70" y="140" textAnchor="middle" fontSize="10" fill="var(--cw-txt)" fontFamily="monospace">auth.service.ts</text>
              
              <rect x="180" y="120" width="100" height="30" rx="4" fill="var(--cw-bg2)" stroke="var(--cw-bdr)" strokeWidth="1" />
              <text x="230" y="140" textAnchor="middle" fontSize="10" fill="var(--cw-txt)" fontFamily="monospace">role.service.ts</text>

              {/* Edges */}
              <path d="M 120 50 L 90 120" stroke="var(--cw-red)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
              <path d="M 120 135 L 180 135" stroke="var(--cw-red)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
              <path d="M 210 120 L 180 50" stroke="var(--cw-red)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
            </svg>
            <div className="absolute top-2 left-2 text-[10px] bg-cw-bg2 px-2 py-1 rounded border border-cw-bdr text-cw-txt2 font-mono">auth-gateway</div>
          </div>
        </div>

        {/* k6 Load Test Results */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[350px] flex flex-col">
          <h3 className="text-[14px] font-bold text-cw-txt mb-4 flex items-center gap-2"><Zap size={16} className="text-cw-blue"/> k6 Load Test (p95 Latency)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={k6Data} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
              <XAxis dataKey="repo" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} />
              <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)' }} />
              <Bar dataKey="p50" fill="var(--cw-txt3)" name="p50 (ms)" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="p95" fill="var(--cw-blue)" name="p95 (ms)" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cold Start Tracker */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 lg:col-span-2">
          <h3 className="text-[14px] font-bold text-cw-txt mb-4 flex items-center gap-2"><Server size={16}/> Cold Start Tracker (Serverless)</h3>
          <div className="grid grid-cols-3 gap-4">
            {mockColdStarts.map(c => (
              <div key={c.id} className="p-3 bg-cw-bg border border-cw-bdr rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-mono text-[12px] text-cw-txt">{c.repo}</div>
                  <div className={`text-[10px] mt-1 ${c.status === 'Healthy' ? 'text-cw-green' : 'text-cw-red'}`}>{c.status}</div>
                </div>
                <div className={`text-[18px] font-bold ${c.time.includes('s') || parseInt(c.time) > 500 ? 'text-cw-red' : 'text-cw-green'}`}>
                  {c.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, suffix = '', color = 'text-cw-txt' }: { title: string, value: string, suffix?: string, color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-3 shadow-sm">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-[20px] font-bold flex items-baseline ${color}`}>{value}<span className="text-[12px] text-cw-txt3 ml-1 font-medium">{suffix}</span></div>
    </div>
  );
}
