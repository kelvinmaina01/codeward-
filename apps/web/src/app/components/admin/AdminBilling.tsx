import { CreditCard, AlertTriangle, FileText, CheckCircle2, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';

const mockInvoices = [
  { id: 'inv_10293', org: 'Acme Corp', amount: 12500, status: 'Paid', date: 'Oct 1, 2026' },
  { id: 'inv_10294', org: 'NovaTech', amount: 8400, status: 'Paid', date: 'Oct 1, 2026' },
  { id: 'inv_10295', org: 'CartFlow', amount: 4500, status: 'Overdue', date: 'Sep 15, 2026' },
  { id: 'inv_10296', org: 'Stackwise HQ', amount: 6200, status: 'Open', date: 'Oct 1, 2026' },
  { id: 'inv_10297', org: 'Helix Health', amount: 3800, status: 'Paid', date: 'Oct 2, 2026' },
  { id: 'inv_10298', org: 'Vortex Dev', amount: 14200, status: 'Failed', date: 'Oct 1, 2026' },
];

export function AdminBilling() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="Total Collected (MTD)" value="$84.2k" trend="+12%" trendDir="up" color="text-cw-green" />
        <Kpi title="Outstanding Invoices" value="$24.5k" trend="3 orgs" trendDir="up" color="text-cw-amber" />
        <Kpi title="Failed Payments" value="$14.2k" trend="1 org" trendDir="up" color="text-cw-red" />
        <Kpi title="Stripe API Sync" value="Healthy" trend="Synced 2m ago" trendDir="up" color="text-cw-txt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Invoice Table */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><FileText size={14} className="text-cw-blue"/> Recent Invoices</h3>
            <button className="px-2 py-1 text-[10px] font-bold bg-cw-bg3 border border-cw-bdr rounded hover:bg-cw-bg flex items-center gap-1.5">
              <RefreshCcw size={10} /> Force Sync
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
                <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {mockInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-cw-txt2 text-[11px]">{inv.id}</td>
                    <td className="px-4 py-3 font-bold text-cw-txt">{inv.org}</td>
                    <td className="px-4 py-3 text-right font-mono">${inv.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'Paid' ? 'bg-cw-green/10 text-cw-green border border-cw-green/20' : 
                        inv.status === 'Overdue' ? 'bg-cw-amber/10 text-cw-amber border border-cw-amber/20' : 
                        inv.status === 'Failed' ? 'bg-cw-red/10 text-cw-red border border-cw-red/20' : 
                        'bg-cw-blue/10 text-cw-blue border border-cw-blue/20'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sync Status / System Health */}
        <div className="flex flex-col gap-6 overflow-hidden">
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm p-4 h-[200px] shrink-0 flex flex-col">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider mb-4"><CreditCard size={14} className="text-cw-purple"/> Payment Processor Status</h3>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-cw-bg border border-cw-bdr rounded">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-cw-green" />
                  <div>
                    <div className="text-[12px] font-bold text-cw-txt">Stripe Webhooks</div>
                    <div className="text-[10px] text-cw-txt3">Last received 4m ago</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cw-green">Operational</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-cw-bg border border-cw-bdr rounded">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-cw-green" />
                  <div>
                    <div className="text-[12px] font-bold text-cw-txt">Invoice Generator</div>
                    <div className="text-[10px] text-cw-txt3">No backlog</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-cw-green">Operational</div>
              </div>
            </div>
          </div>
          
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm p-4 flex-1 flex flex-col items-center justify-center text-center">
            <AlertTriangle size={32} className="text-cw-amber mb-3 opacity-50" />
            <h3 className="text-[14px] font-bold text-cw-txt mb-1">Action Required</h3>
            <p className="text-[11px] text-cw-txt2 max-w-[250px] leading-relaxed">
              Vortex Dev's primary payment method failed on Oct 1. An automated email was sent, but manual intervention is recommended.
            </p>
            <button className="mt-4 px-4 py-1.5 bg-cw-bg3 border border-cw-bdr rounded text-[11px] font-bold text-cw-txt hover:bg-cw-bg transition-colors">
              View Account Details
            </button>
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
