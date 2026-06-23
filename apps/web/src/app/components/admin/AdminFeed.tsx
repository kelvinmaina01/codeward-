import { useState, useEffect } from 'react';
import { Activity, Server, Clock, AlertTriangle, Shield, CheckCircle, Package, Search, Filter } from 'lucide-react';

const mockEvents = [
  { id: 1, type: 'AGENT_CRITICAL', color: 'red', icon: <AlertTriangle size={14}/>, time: '14:32:10', repo: 'payments-service', org: 'CartFlow', agent: 'Security', desc: 'Exposed API key in payments-service (truffleHog)' },
  { id: 2, type: 'AGENT_FINDING', color: 'amber', icon: <Activity size={14}/>, time: '14:32:05', repo: 'user-service', org: 'Helix', agent: 'Bloat', desc: '3 duplicate functions found in user-service' },
  { id: 3, type: 'AGENT_START', color: 'blue', icon: <Activity size={14}/>, time: '14:31:50', repo: 'checkout-api', org: 'NovaCorp', agent: 'Security', desc: 'Security agent started on checkout-api @ a4f91c2' },
  { id: 4, type: 'VM_BOOT', color: 'gray', icon: <Server size={14}/>, time: '14:31:48', repo: 'payments-service', org: 'CartFlow', agent: 'System', desc: 'Firecracker VM booted for payments-service (138ms)' },
  { id: 5, type: 'PR_COMMENT', color: 'purple', icon: <Activity size={14}/>, time: '14:31:12', repo: 'payments-service', org: 'CartFlow', agent: 'System', desc: 'PR comment posted to CartFlow/payments-service #441' },
  { id: 6, type: 'GATE_BLOCK', color: 'red', icon: <AlertTriangle size={14}/>, time: '14:30:55', repo: 'payments-service', org: 'CartFlow', agent: 'System', desc: 'Merge BLOCKED — payments-service — debt score 22' },
  { id: 7, type: 'AGENT_COMPLETE', color: 'green', icon: <CheckCircle size={14}/>, time: '14:30:40', repo: 'auth-gateway', org: 'PayPulse', agent: 'Architecture', desc: 'Architecture agent completed — 0 critical, 2 medium' },
  { id: 8, type: 'GATE_PASS', color: 'green', icon: <CheckCircle size={14}/>, time: '14:30:38', repo: 'auth-gateway', org: 'PayPulse', agent: 'System', desc: 'Merge PASSED — auth-gateway — debt score 91' },
  { id: 9, type: 'VM_DESTROY', color: 'gray', icon: <Server size={14}/>, time: '14:30:10', repo: 'sandbox', org: 'System', agent: 'System', desc: 'VM destroyed — run_01HX7K2M — sandbox wiped' },
  { id: 10, type: 'QUEUE_ADD', color: 'gray', icon: <Clock size={14}/>, time: '14:29:45', repo: 'ml-inference-api', org: 'Axon Labs', agent: 'System', desc: 'Job queued — ml-inference-api — priority 8' },
];

export function AdminFeed() {
  const [events, setEvents] = useState(mockEvents);
  const [filter, setFilter] = useState('All');

  // Simulate streaming by adding events to the top
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const newEvent = { ...prev[Math.floor(Math.random() * prev.length)], id: Date.now(), time: new Date().toLocaleTimeString('en-US', { hour12: false }) };
        return [newEvent, ...prev].slice(0, 40);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = filter === 'Critical' ? events.filter(e => e.color === 'red') : events;

  return (
    <div className="flex h-full gap-6">
      {/* Main Feed Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiCard title="Active VMs" value="12" />
          <KpiCard title="Jobs in queue" value="4" />
          <KpiCard title="Events last 60s" value="34" />
          <KpiCard title="Blocked PRs today" value="155" />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setFilter('All')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium border ${filter === 'All' ? 'bg-cw-bg3 text-cw-txt border-cw-bdr' : 'border-transparent text-cw-txt2 hover:bg-cw-bg2 hover:border-cw-bdr'}`}>All events</button>
          <button onClick={() => setFilter('Critical')} className={`px-3 py-1.5 rounded-md text-[12px] font-medium border ${filter === 'Critical' ? 'bg-cw-red/10 text-cw-red border-cw-red/20' : 'border-transparent text-cw-txt2 hover:bg-cw-bg2 hover:border-cw-bdr'}`}>Critical only</button>
          <button className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-transparent text-cw-txt2 hover:bg-cw-bg2 hover:border-cw-bdr">By agent</button>
          <button className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-transparent text-cw-txt2 hover:bg-cw-bg2 hover:border-cw-bdr">By org</button>
        </div>

        {/* Feed Stream */}
        <div className="flex-1 overflow-y-auto bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm">
          <div className="p-2">
            {filteredEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-4 p-3 hover:bg-cw-bg3/50 rounded-lg transition-colors border-b border-cw-bdr/50 last:border-0">
                <div className="text-[11px] text-cw-txt3 font-mono pt-0.5 w-16 shrink-0">{e.time}</div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0 w-32 flex items-center gap-1.5 ${
                  e.color === 'red' ? 'bg-cw-red/10 text-cw-red border border-cw-red/20' :
                  e.color === 'amber' ? 'bg-cw-amber/10 text-cw-amber border border-cw-amber/20' :
                  e.color === 'blue' ? 'bg-cw-blue/10 text-cw-blue border border-cw-blue/20' :
                  e.color === 'green' ? 'bg-cw-green/10 text-cw-green border border-cw-green/20' :
                  e.color === 'purple' ? 'bg-cw-purple/10 text-cw-purple border border-cw-purple/20' :
                  'bg-cw-bg3 text-cw-txt2 border border-cw-bdr'
                }`}>
                  {e.type}
                </div>
                <div className="flex-1 text-[13px] text-cw-txt leading-relaxed">
                  <span className={e.type === 'GATE_BLOCK' ? 'font-bold' : ''}>{e.desc}</span>
                </div>
                <div className="text-[11px] text-cw-txt2 shrink-0">{e.org} / {e.repo}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Currently Running */}
      <div className="w-[260px] shrink-0 flex flex-col gap-4">
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4">
          <h3 className="text-[12px] font-bold text-cw-txt mb-4 uppercase tracking-wider flex items-center gap-2">
            <Activity size={14} className="text-cw-blue" />
            Currently Running (3)
          </h3>
          <div className="space-y-4">
            <ActiveRunCard org="CartFlow" repo="payments-service" progress={6} total={8} />
            <ActiveRunCard org="NovaCorp" repo="checkout-api" progress={2} total={8} />
            <ActiveRunCard org="PayPulse" repo="data-pipeline" progress={8} total={8} isComplete />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-medium text-cw-txt2 uppercase tracking-wider mb-2">{title}</div>
      <div className="text-[24px] font-bold text-cw-txt leading-none">{value}</div>
    </div>
  );
}

function ActiveRunCard({ org, repo, progress, total, isComplete }: { org: string, repo: string, progress: number, total: number, isComplete?: boolean }) {
  return (
    <div className="p-3 bg-cw-bg border border-cw-bdr rounded-lg">
      <div className="text-[10px] text-cw-txt3 mb-1">{org}</div>
      <div className="text-[12px] font-semibold text-cw-txt mb-3 truncate">{repo}</div>
      <div className="flex items-center justify-between text-[10px] font-medium text-cw-txt2 mb-1.5">
        <span>Agents</span>
        <span>{progress}/{total}</span>
      </div>
      <div className="h-1.5 bg-cw-bg3 rounded-full overflow-hidden flex">
        <div className={`h-full ${isComplete ? 'bg-cw-green' : 'bg-cw-blue animate-pulse'}`} style={{ width: `${(progress/total)*100}%` }} />
      </div>
    </div>
  );
}
