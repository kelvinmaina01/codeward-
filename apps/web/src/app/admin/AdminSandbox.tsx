import { Server, Cpu, HardDrive, Database, Activity, RefreshCcw, CheckCircle2, AlertTriangle, Play, Square } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const vmUtilizationData = [
  { time: '10:00', cpu: 45, memory: 60 },
  { time: '10:15', cpu: 52, memory: 65 },
  { time: '10:30', cpu: 78, memory: 80 },
  { time: '10:45', cpu: 85, memory: 82 },
  { time: '11:00', cpu: 92, memory: 88 },
  { time: '11:15', cpu: 65, memory: 70 },
  { time: '11:30', cpu: 58, memory: 68 },
];

const mockVms = [
  { id: 'vm-cluster-alpha-01', status: 'Running', cpu: '92%', mem: '14GB/16GB', uptime: '14d 2h' },
  { id: 'vm-cluster-alpha-02', status: 'Running', cpu: '45%', mem: '8GB/16GB', uptime: '14d 2h' },
  { id: 'vm-cluster-beta-01', status: 'Running', cpu: '12%', mem: '4GB/16GB', uptime: '2d 5h' },
  { id: 'vm-gpu-tesla-01', status: 'Stopped', cpu: '0%', mem: '0GB/32GB', uptime: '-' },
  { id: 'vm-gpu-tesla-02', status: 'Provisioning', cpu: '-', mem: '-', uptime: '-' },
];

export function AdminSandbox() {
  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <Kpi title="Active VMs" value="3 / 5" trend="2 provisioning/stopped" trendDir="flat" color="text-cw-green" />
        <Kpi title="Cluster CPU Usage" value="68%" trend="+12% (1h)" trendDir="up" color="text-cw-amber" />
        <Kpi title="BullMQ Queue Depth" value="4,210" trend="Processing 140/s" trendDir="flat" color="text-cw-txt" />
        <Kpi title="Docker Registry" value="1.2TB" trend="84% capacity" trendDir="up" color="text-cw-txt" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Utilization Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col p-4 overflow-hidden h-full">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Activity size={14} className="text-cw-amber"/> Cluster Utilization</h3>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vmUtilizationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cw-amber)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cw-amber)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cw-blue)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cw-blue)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--cw-txt3)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={{ stroke: 'var(--cw-bdr)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)', fontSize: '11px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="cpu" stroke="var(--cw-amber)" fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage" />
                <Area type="monotone" dataKey="memory" stroke="var(--cw-blue)" fillOpacity={1} fill="url(#colorMem)" name="Memory Usage" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VM Instances */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Server size={14} className="text-cw-blue"/> Virtual Machines</h3>
            <button className="px-2 py-1 text-[10px] font-bold bg-cw-bg3 border border-cw-bdr rounded hover:bg-cw-bg transition-colors flex items-center gap-1.5">
              <RefreshCcw size={10} /> Restart Cluster
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-cw-bg z-10 border-b border-cw-bdr">
                <tr className="text-[10px] text-cw-txt3 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Instance ID</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">CPU</th>
                  <th className="px-4 py-3 text-right">RAM</th>
                  <th className="px-4 py-3 text-right">Uptime</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {mockVms.map(vm => (
                  <tr key={vm.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[11px] text-cw-txt">{vm.id}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 w-max mx-auto ${
                        vm.status === 'Running' ? 'text-cw-green bg-cw-green/10 border border-cw-green/20' : 
                        vm.status === 'Stopped' ? 'text-cw-txt3 bg-cw-bg3 border border-cw-bdr' : 
                        'text-cw-amber bg-cw-amber/10 border border-cw-amber/20 animate-pulse'
                      }`}>
                        {vm.status === 'Running' ? <Play size={10} className="fill-current"/> : vm.status === 'Stopped' ? <Square size={10} className="fill-current"/> : <RefreshCcw size={10} className="animate-spin" />}
                        {vm.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${parseInt(vm.cpu) > 80 ? 'text-cw-red font-bold' : 'text-cw-txt2'}`}>{vm.cpu}</td>
                    <td className="px-4 py-3 text-right font-mono text-cw-txt2">{vm.mem}</td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-cw-txt3">{vm.uptime}</td>
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
          {trend}
        </div>
      </div>
    </div>
  );
}
