import { useState, useEffect } from 'react';
import { Settings2, ShieldCheck, Activity, Trash2, Zap, RefreshCw, Loader2, X } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { ProviderSettingsForm } from './ProviderSettingsForms';

interface Props {
  integration: any; // the connected integration instance
  catalog: any;     // the catalog definition for UI info
  isOpen: boolean;
  onClose: () => void;
  onDisconnected: () => void;
}

export function IntegrationSettingsDrawer({ integration, catalog, isOpen, onClose, onDisconnected }: Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'access' | 'logs'>('general');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>({});
  const [access, setAccess] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, msg: string} | null>(null);

  useEffect(() => {
    if (isOpen && integration) {
      setLoading(true);
      fetch(`${API_URL}/api/integrations/${integration.id}/settings`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setSettings(data.settings || {});
          setAccess(data.access || []);
          setLogs(data.logs || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, integration]);

  if (!isOpen || !integration || !catalog) return null;

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/integrations/${integration.id}/test`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setTestResult({ success: data.success, msg: data.message || (data.success ? 'Success' : 'Failed') });
    } catch {
      setTestResult({ success: false, msg: 'Network error' });
    }
    setTesting(false);
  };

  const handleDisconnect = async () => {
    if (confirm(`Are you sure you want to disconnect ${catalog.name}? Agents will instantly lose access.`)) {
      await fetch(`${API_URL}/api/integrations/${integration.id}`, { method: 'DELETE', credentials: 'include' });
      onDisconnected();
      onClose();
    }
  };

  const handleAccessChange = async (agentId: string, isEnabled: boolean) => {
    // Optimistic UI
    const updated = access.map(a => a.agentId === agentId ? { ...a, isEnabled } : a);
    if (!updated.find(a => a.agentId === agentId)) {
      updated.push({ agentId, isEnabled });
    }
    setAccess(updated);

    await fetch(`${API_URL}/api/integrations/${integration.id}/access`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access: [{ agentId, isEnabled }] })
    });
  };

  return (
    <>
      <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {catalog && (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-cw-bdr p-1.5">
              <img src={catalog.logoUrl} alt={catalog.name} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-cw-txt truncate">{catalog?.name} Settings</div>
            {integration?.connectedAccount ? (
              <div className="text-[11px] text-cw-txt3">Connected as {integration.connectedAccount}</div>
            ) : (
              <div className="text-[11px] text-cw-txt3">Not connected</div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt"><X size={16} /></button>
      </div>

      {/* Tab Nav */}
        <div className="px-5 flex gap-5 border-b border-cw-bdr shrink-0">
          <button onClick={() => setActiveTab('general')} className={`pb-3 pt-3 text-[12px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}>
            <Settings2 size={14} /> General
          </button>
          <button onClick={() => setActiveTab('access')} className={`pb-3 pt-3 text-[12px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'access' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}>
            <ShieldCheck size={14} /> Agent Access
          </button>
          <button onClick={() => setActiveTab('logs')} className={`pb-3 pt-3 text-[12px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}>
            <Activity size={14} /> Activity Logs
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-cw-txt3">
              <Loader2 className="animate-spin w-6 h-6" />
            </div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Test Connection */}
                  <div className="p-4 bg-cw-bg2 rounded-xl border border-cw-bdr">
                    <h3 className="text-[14px] font-semibold text-cw-txt mb-1">Verify Connection</h3>
                    <p className="text-[13px] text-cw-txt3 mb-4">Run a harmless read-only ping to verify tokens are still valid.</p>
                    <div className="flex items-center gap-3">
                      <button onClick={testConnection} disabled={testing} className="px-4 py-2 bg-cw-bg border border-cw-bdr hover:border-cw-purple/40 text-[13px] font-medium text-cw-txt rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-yellow-500" />}
                        Test Connection
                      </button>
                      {testResult && (
                        <span className={`text-[13px] ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                          {testResult.msg}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Settings Form */}
                  <div className="p-4 bg-cw-bg2 rounded-xl border border-cw-bdr">
                    <ProviderSettingsForm 
                      integration={integration}
                      settings={settings}
                      onSettingsUpdate={(newSettings) => setSettings(newSettings)}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'access' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-cw-txt">Which agents can use this?</h3>
                  <p className="text-[13px] text-cw-txt3">Toggle access for individual agents. When disabled, an agent cannot see or execute any tools provided by {catalog.name}.</p>
                  
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {['base', 'research', 'deploy', 'security', 'bloat'].map(agentId => {
                      const isEnabled = access.find(a => a.agentId === agentId)?.isEnabled ?? false;
                      return (
                        <div key={agentId} className="flex items-center justify-between p-4 rounded-xl border border-cw-bdr bg-cw-bg2">
                          <div>
                            <p className="text-[14px] font-medium text-cw-txt capitalize">{agentId} Agent</p>
                            <p className="text-[12px] text-cw-txt3">Allow access to {catalog.tools?.length || 0} tools</p>
                          </div>
                          <button
                            onClick={() => handleAccessChange(agentId, !isEnabled)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${isEnabled ? 'bg-cw-purple' : 'bg-cw-bg border border-cw-bdr'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${isEnabled ? 'left-[22px]' : 'left-0.5 bg-cw-txt3'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-cw-txt">Recent Activity</h3>
                  {logs.length === 0 ? (
                    <p className="text-[13px] text-cw-txt3 text-center py-8">No recent activity for this integration.</p>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log: any) => (
                        <div key={log.id} className="p-3 border border-cw-bdr bg-cw-bg2 rounded-lg">
                          <p className="text-[13px] text-cw-txt"><span className="font-mono text-[11px] bg-cw-bg px-1 rounded">{log.toolName}</span></p>
                          <p className="text-[11px] text-cw-txt3 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cw-bdr bg-cw-bg2 shrink-0">
          <button onClick={handleDisconnect} className="w-full py-2.5 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors text-[13px] font-medium flex items-center justify-center gap-2">
            <Trash2 size={16} />
            Disconnect Integration
          </button>
        </div>
    </>
  );
}
