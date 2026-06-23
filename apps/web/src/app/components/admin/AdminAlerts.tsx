import { BellRing, ShieldAlert, Activity, ArrowUpRight, ArrowDownRight, RefreshCcw, BellOff, VolumeX, CheckCircle2 } from 'lucide-react';

const mockAlerts = [
  { id: 'ALT-928', severity: 'Critical', component: 'Docker Registry', message: 'Storage capacity exceeded 85%', time: '14m ago', status: 'Open' },
  { id: 'ALT-927', severity: 'High', component: 'Database', message: 'Read latency spiked to 450ms', time: '1h ago', status: 'Acknowledged' },
  { id: 'ALT-926', severity: 'Medium', component: 'Agent: Security', message: 'Failed to complete scan for repo acme/core', time: '2h ago', status: 'Open' },
  { id: 'ALT-925', severity: 'Low', component: 'Billing Sync', message: 'Stripe webhook delivery delayed', time: '4h ago', status: 'Resolved' },
  { id: 'ALT-924', severity: 'Critical', component: 'Sandbox VM', message: 'Instance vm-gpu-tesla-01 unresponsive', time: '1d ago', status: 'Resolved' },
  { id: 'ALT-923', severity: 'High', component: 'GitHub API', message: 'Rate limit approaching 90%', time: '1d ago', status: 'Resolved' },
];

export function AdminAlerts() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="Active Critical Alerts" value="1" trend="-2 vs yesterday" trendDir="down" color="text-cw-red" />
        <Kpi title="Mean Time to Ack" value="4m 12s" trend="-45s" trendDir="down" color="text-cw-green" />
        <Kpi title="PagerDuty Status" value="Healthy" trend="Synced 1m ago" trendDir="flat" color="text-cw-txt" />
        <Kpi title="Suppressed Alerts" value="45" trend="+12 noise rules" trendDir="up" color="text-cw-txt3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Alerts Table */}
        <div className="lg:col-span-2 bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><BellRing size={14} className="text-cw-red"/> Incident Timeline</h3>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 text-[10px] font-bold bg-cw-bg3 border border-cw-bdr rounded hover:bg-cw-bg transition-colors flex items-center gap-1.5">
                <CheckCircle2 size={10} /> Ack All
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
                <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {mockAlerts.map(alert => (
                  <tr key={alert.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-cw-txt3">{alert.id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'Critical' ? 'text-cw-red bg-cw-red/10 border border-cw-red/20' : 
                        alert.severity === 'High' ? 'text-cw-amber bg-cw-amber/10 border border-cw-amber/20' : 
                        alert.severity === 'Medium' ? 'text-cw-blue bg-cw-blue/10 border border-cw-blue/20' : 
                        'text-cw-txt3 bg-cw-bg3 border border-cw-bdr'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-cw-txt">{alert.component}</td>
                    <td className="px-4 py-3 text-cw-txt2">{alert.message}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold ${alert.status === 'Open' ? 'text-cw-red' : alert.status === 'Acknowledged' ? 'text-cw-amber' : 'text-cw-txt3'}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-cw-txt3">{alert.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suppression Rules */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><VolumeX size={14} className="text-cw-amber"/> Suppression Rules</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="p-3 bg-cw-bg border border-cw-bdr rounded flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-cw-txt">High CPU (Sandbox)</span>
                <span className="text-[10px] bg-cw-green/10 text-cw-green px-1.5 py-0.5 rounded font-bold">Active</span>
              </div>
              <p className="text-[11px] text-cw-txt3">Ignore CPU &gt; 90% if uptime &lt; 5m (Provisioning spike)</p>
            </div>
            <div className="p-3 bg-cw-bg border border-cw-bdr rounded flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-cw-txt">Failed PR Comments</span>
                <span className="text-[10px] bg-cw-green/10 text-cw-green px-1.5 py-0.5 rounded font-bold">Active</span>
              </div>
              <p className="text-[11px] text-cw-txt3">Group alerts by repo, notify once per hour</p>
            </div>
            <div className="p-3 bg-cw-bg border border-cw-bdr rounded flex flex-col gap-2 opacity-50">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-cw-txt">Stripe Sync Delay</span>
                <span className="text-[10px] bg-cw-bg3 text-cw-txt3 px-1.5 py-0.5 rounded font-bold">Disabled</span>
              </div>
              <p className="text-[11px] text-cw-txt3">Ignore sync delays under 30 minutes</p>
            </div>
          </div>
          <div className="p-3 border-t border-cw-bdr bg-cw-bg3/30 shrink-0">
            <button className="w-full py-1.5 text-[11px] font-bold text-cw-txt3 border border-cw-bdr rounded hover:text-cw-txt hover:bg-cw-bg transition-colors">Create New Rule</button>
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
