import { Shield, AlertTriangle, ExternalLink, Check, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const typeData = [
  { name: 'Exposed secrets', value: 12 },
  { name: 'Missing RLS', value: 9 },
  { name: 'Missing auth', value: 8 },
  { name: 'Missing rate limit', value: 6 },
  { name: 'SQL injection', value: 5 },
  { name: 'CVEs', value: 3 },
  { name: 'XSS/CSRF', value: 3 },
  { name: 'Prompt injection', value: 1 },
];

const mockFindings = [
  { id: 1, sev: 'Critical', type: 'Exposed secrets', repo: 'payments-service', org: 'CartFlow', file: 'src/config/stripe.ts:14', date: '2h ago', status: 'Open' },
  { id: 2, sev: 'Critical', type: 'Missing RLS', repo: 'payments-service', org: 'CartFlow', file: 'src/db/schema.ts', date: '2h ago', status: 'Open' },
  { id: 3, sev: 'High', type: 'SQL injection', repo: 'auth-gateway', org: 'PayPulse', file: 'src/auth/login.go:42', date: '5h ago', status: 'In Review' },
  { id: 4, sev: 'High', type: 'Missing auth', repo: 'checkout-api', org: 'NovaCorp', file: 'src/routes/admin.ts:18', date: '1d ago', status: 'Fixed' },
  { id: 5, sev: 'Medium', type: 'XSS/CSRF', repo: 'frontend-monorepo', org: 'Stackwise HQ', file: 'src/components/Form.tsx:55', date: '2d ago', status: 'Open' },
];

export function AdminSecurity() {
  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <Kpi title="Open critical" value="7" color="text-cw-red" />
        <Kpi title="Open high" value="18" color="text-cw-amber" />
        <Kpi title="No secrets scan" value="0" color="text-cw-green" />
        <Kpi title="OWASP coverage" value="100%" color="text-cw-txt" />
        <Kpi title="Scans today" value="847" color="text-cw-txt" />
        <Kpi title="CVEs found" value="3" color="text-cw-amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Findings Table */}
        <div className="lg:col-span-2 bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><Shield size={16} className="text-cw-red"/> All Open Security Findings</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cw-bdr bg-cw-bg/50 text-[11px] text-cw-txt3 font-bold tracking-wider uppercase">
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Repository</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {mockFindings.map(f => (
                  <tr key={f.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${f.sev === 'Critical' ? 'bg-cw-red/10 text-cw-red border border-cw-red/20' : f.sev === 'High' ? 'bg-cw-amber/10 text-cw-amber border border-cw-amber/20' : 'bg-cw-blue/10 text-cw-blue border border-cw-blue/20'}`}>{f.sev}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-cw-txt">{f.type}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-cw-txt">{f.repo}</div><div className="text-[11px] text-cw-txt3">{f.org}</div></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-cw-txt2">{f.file}</td>
                    <td className="px-4 py-3 text-cw-txt2">{f.status}</td>
                    <td className="px-4 py-3 text-right"><ExternalLink size={14} className="text-cw-blue cursor-pointer inline"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown & Coverage */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[260px]">
            <h3 className="text-[12px] font-bold text-cw-txt mb-4 uppercase tracking-wider">Findings by Type</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--cw-bdr)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt2)' }} width={120} />
                <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)' }} />
                <Bar dataKey="value" fill="var(--cw-red)" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 flex-1">
            <h3 className="text-[12px] font-bold text-cw-txt mb-4 uppercase tracking-wider">OWASP Top 10 Coverage</h3>
            <div className="space-y-2">
              {['A01: Broken Access Control', 'A02: Cryptographic Failures', 'A03: Injection', 'A04: Insecure Design'].map(a => (
                <div key={a} className="flex items-center justify-between p-2 bg-cw-bg rounded border border-cw-bdr text-[12px]">
                  <span className="text-cw-txt font-medium">{a}</span>
                  <Check size={14} className="text-cw-green"/>
                </div>
              ))}
              <div className="flex items-center justify-between p-2 bg-cw-amber/5 rounded border border-cw-amber/20 text-[12px]">
                <span className="text-cw-amber font-medium">A05: Security Misconfig</span>
                <span className="text-[10px] font-bold text-cw-amber uppercase">Planned</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-3 shadow-sm">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-[20px] font-bold ${color}`}>{value}</div>
    </div>
  );
}
