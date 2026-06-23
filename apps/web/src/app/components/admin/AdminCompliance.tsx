import { ClipboardCheck, ShieldCheck, Database, Lock, AlertTriangle, FileText, CheckCircle2, XCircle } from 'lucide-react';

const mockRtbf = [
  { id: 'usr_892nf81', email: 'john.doe@example.com', requested: '2 days ago', deadline: '28 days', status: 'In Progress', locations: 'DB, Redis, S3', progress: 45 },
  { id: 'usr_19xn37c', email: 's.smith@techcorp.com', requested: '14 days ago', deadline: '16 days', status: 'Pending Approval', locations: 'Stripe, DB', progress: 90 },
];

const mockActions = [
  { id: 1, type: 'SOC2 Gap', desc: 'S3 Bucket "user-uploads-v2" missing encryption at rest', severity: 'High', recommended: 'Enable AES-256' },
  { id: 2, type: 'Policy Violation', desc: 'Stale admin session (Kelvin M) > 30 days active', severity: 'Medium', recommended: 'Force Logout' },
  { id: 3, type: 'Audit Log Gap', desc: 'auth-gateway missing failed login attempts log', severity: 'High', recommended: 'Deploy updated logger' },
];

export function AdminCompliance() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4 shrink-0">
        <Kpi title="Compliance Score" value="92%" color="text-cw-green" />
        <Kpi title="SOC2 Gaps Found" value="2" color="text-cw-amber" />
        <Kpi title="RTBF Requests" value="2" suffix=" pending" color="text-cw-blue" />
        <Kpi title="Hardcoded Secrets" value="0" color="text-cw-green" />
        <Kpi title="Audit Log Coverage" value="100%" color="text-cw-txt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Compliance Scorecard */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2"><ShieldCheck size={14} className="text-cw-green"/> Live Compliance Scorecard</h3>
            <span className="px-2 py-0.5 bg-cw-green/10 text-cw-green rounded text-[10px] font-bold border border-cw-green/20">SOC2 & GDPR</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            <ScorecardItem title="Data at Rest Encryption" status="Pass" desc="All primary databases and S3 buckets encrypted (AES-256)" icon={Database} />
            <ScorecardItem title="Data in Transit" status="Pass" desc="TLS 1.3 enforced on all external endpoints" icon={Lock} />
            <ScorecardItem title="Access Control" status="Warning" desc="2 stale admin sessions detected; 1 S3 bucket misconfigured" icon={AlertTriangle} />
            <ScorecardItem title="Audit Logging" status="Pass" desc="Comprehensive trails for auth, data access, and config changes" icon={FileText} />
            <ScorecardItem title="Vendor Risk Management" status="Pass" desc="All 3rd party subprocessors mapped and approved" icon={ClipboardCheck} />
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-hidden">
          {/* RTBF Tracker */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col h-[280px] shrink-0">
            <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
              <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2"><FileText size={14} className="text-cw-blue"/> Right to Be Forgotten (GDPR)</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {mockRtbf.map(r => (
                <div key={r.id} className="p-3 bg-cw-bg border border-cw-bdr rounded-md mb-3 last:mb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[12px] font-bold text-cw-txt font-mono">{r.email}</div>
                      <div className="text-[10px] text-cw-txt3 mt-0.5">ID: {r.id} · Requested {r.requested}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-cw-amber">{r.deadline} left</div>
                      <div className="text-[10px] text-cw-txt3">{r.status}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-1 font-bold">Data Locations Identified</div>
                    <div className="text-[11px] font-mono text-cw-blue bg-cw-blue/10 px-2 py-1 rounded inline-block border border-cw-blue/20">
                      {r.locations}
                    </div>
                  </div>
                  <div className="w-full bg-cw-bg3 rounded-full h-1.5 mt-3">
                    <div className="bg-cw-blue h-1.5 rounded-full" style={{ width: `${r.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Action Items */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col flex-1 min-h-[250px] overflow-hidden">
            <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg">
              <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2"><AlertTriangle size={14} className="text-cw-amber"/> Compliance Action Required</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <tbody className="text-[11px]">
                  {mockActions.map(act => (
                    <tr key={act.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${act.severity === 'High' ? 'bg-cw-red/10 text-cw-red border border-cw-red/20' : 'bg-cw-amber/10 text-cw-amber border border-cw-amber/20'}`}>
                            {act.severity}
                          </span>
                          <span className="font-bold text-cw-txt">{act.type}</span>
                        </div>
                        <div className="text-cw-txt2 mb-2 whitespace-normal leading-snug">{act.desc}</div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 bg-cw-purple text-white rounded text-[10px] font-bold hover:bg-cw-purple/90">
                            Apply: {act.recommended}
                          </button>
                          <button className="px-2 py-1 bg-cw-bg border border-cw-bdr text-cw-txt text-[10px] font-bold rounded hover:bg-cw-bg3">
                            Ignore
                          </button>
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
    </div>
  );
}

function ScorecardItem({ title, status, desc, icon: Icon }: any) {
  return (
    <div className="flex gap-3 p-3 bg-cw-bg border border-cw-bdr rounded-md">
      <div className="mt-0.5">
        {status === 'Pass' ? <CheckCircle2 size={16} className="text-cw-green" /> : 
         status === 'Fail' ? <XCircle size={16} className="text-cw-red" /> : 
         <AlertTriangle size={16} className="text-cw-amber" />}
      </div>
      <div>
        <div className="text-[12px] font-bold text-cw-txt mb-0.5">{title}</div>
        <div className="text-[11px] text-cw-txt2 leading-snug">{desc}</div>
      </div>
    </div>
  );
}

function Kpi({ title, value, suffix = '', color = 'text-cw-txt' }: { title: string, value: string, suffix?: string, color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-3 shadow-sm">
      <div className="text-[9px] text-cw-txt3 uppercase tracking-wider mb-1 font-bold">{title}</div>
      <div className={`text-[20px] font-bold font-mono ${color}`}>{value}<span className="text-[11px] text-cw-txt3 font-sans font-medium ml-1">{suffix}</span></div>
    </div>
  );
}
