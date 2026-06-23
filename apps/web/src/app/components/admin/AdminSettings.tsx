import { Settings2, ShieldCheck, Users, Sliders, ToggleLeft, ToggleRight, History, Activity } from 'lucide-react';
import { useState } from 'react';

const mockAuditLogs = [
  { id: '1029', user: 'max@codeward.io', action: 'Disabled Maintenance Mode', time: '12m ago', ip: '192.168.1.1' },
  { id: '1028', user: 'system', action: 'Auto-scaled Sandbox Cluster (+2 nodes)', time: '1h ago', ip: 'internal' },
  { id: '1027', user: 'sarah@codeward.io', action: 'Updated Stripe API Key', time: '2d ago', ip: '10.0.0.45' },
  { id: '1026', user: 'max@codeward.io', action: 'Enabled Feature Flag: Agent Deep-Scan', time: '3d ago', ip: '192.168.1.1' },
];

export function AdminSettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [deepScan, setDeepScan] = useState(true);

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        
        {/* Global Configuration */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Sliders size={14} className="text-cw-purple"/> Global Configuration</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <div className="space-y-4 border-b border-cw-bdr pb-6">
              <h4 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">System States</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-cw-txt">Maintenance Mode</div>
                  <div className="text-[11px] text-cw-txt2 mt-1">Disables new signups and pauses all scheduled agent runs. Active runs will complete.</div>
                </div>
                <button onClick={() => setMaintenance(!maintenance)} className="text-cw-purple">
                  {maintenance ? <ToggleRight size={32} className="text-cw-amber" /> : <ToggleLeft size={32} className="text-cw-txt3" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-cw-txt">Agent Deep-Scan Feature</div>
                  <div className="text-[11px] text-cw-txt2 mt-1">Enables experimental AST-level deep scanning across all agents for Pro/Enterprise tiers.</div>
                </div>
                <button onClick={() => setDeepScan(!deepScan)} className="text-cw-purple">
                  {deepScan ? <ToggleRight size={32} className="text-cw-green" /> : <ToggleLeft size={32} className="text-cw-txt3" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 border-b border-cw-bdr pb-6">
              <h4 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">API Integrations</h4>
              
              <div>
                <label className="text-[11px] font-bold text-cw-txt block mb-1">Stripe Secret Key</label>
                <input type="password" value="sk_test_••••••••••••••••••••••••" readOnly className="w-full bg-cw-bg border border-cw-bdr rounded px-3 py-1.5 text-[12px] text-cw-txt3 font-mono opacity-50 cursor-not-allowed" />
                <button className="text-[10px] font-bold text-cw-blue mt-2">Rotate Key</button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-cw-txt block mb-1">GitHub App Private Key</label>
                <input type="password" value="-----BEGIN RSA PRIVATE KEY-----..." readOnly className="w-full bg-cw-bg border border-cw-bdr rounded px-3 py-1.5 text-[12px] text-cw-txt3 font-mono opacity-50 cursor-not-allowed" />
                <button className="text-[10px] font-bold text-cw-blue mt-2">Update Key</button>
              </div>
            </div>
            
            <div className="pt-2">
              <button className="px-4 py-2 bg-cw-purple text-white font-bold rounded text-[12px] hover:bg-cw-purple/90 transition-colors">Save Configuration</button>
            </div>

          </div>
        </div>

        {/* Right Column: Team & Audit */}
        <div className="flex flex-col gap-6 overflow-hidden">
          
          {/* Admin Team */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm h-[200px] shrink-0 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
              <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><Users size={14} className="text-cw-blue"/> Admin Team</h3>
              <button className="text-[10px] font-bold text-cw-txt bg-cw-bg3 px-2 py-1 rounded border border-cw-bdr hover:bg-cw-bg">Invite</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex items-center justify-between p-2 hover:bg-cw-bg3/30 rounded transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-cw-blue/10 border border-cw-blue/20 flex items-center justify-center font-bold text-[12px] text-cw-blue">M</div>
                  <div>
                    <div className="text-[12px] font-bold text-cw-txt">Maxkryie</div>
                    <div className="text-[10px] text-cw-txt3">max@codeward.io</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-cw-purple/10 text-cw-purple rounded border border-cw-purple/20">Super Admin</span>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-cw-bg3/30 rounded transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-cw-amber/10 border border-cw-amber/20 flex items-center justify-center font-bold text-[12px] text-cw-amber">S</div>
                  <div>
                    <div className="text-[12px] font-bold text-cw-txt">Sarah O.</div>
                    <div className="text-[10px] text-cw-txt3">sarah@codeward.io</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-cw-bg3 text-cw-txt3 rounded border border-cw-bdr">Billing Admin</span>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-md shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
              <h3 className="text-[12px] font-bold text-cw-txt flex items-center gap-2 uppercase tracking-wider"><History size={14} className="text-cw-amber"/> Audit Log</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <tbody className="text-[12px]">
                  {mockAuditLogs.map(log => (
                    <tr key={log.id} className="border-b border-cw-bdr hover:bg-cw-bg3/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-cw-txt">{log.action}</div>
                        <div className="text-[10px] text-cw-txt3 mt-0.5 font-mono">{log.user} • IP: {log.ip}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-[10px] text-cw-txt3">{log.time}</td>
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
