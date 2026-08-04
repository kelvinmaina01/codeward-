import { useState } from 'react';
import { API_URL } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface Props {
  integration: any;
  settings: any;
  onSettingsUpdate: (newSettings: any) => void;
}

export function ProviderSettingsForm({ integration, settings, onSettingsUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>(settings);

  const saveSettings = async (updates: any) => {
    setLoading(true);
    const merged = { ...localSettings, ...updates };
    setLocalSettings(merged);
    
    try {
      await fetch(`${API_URL}/api/integrations/${integration.id}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: merged })
      });
      onSettingsUpdate(merged);
    } catch (err) {
      console.error('Failed to save settings', err);
    }
    setLoading(false);
  };

  const googleApps = [
    { id: 'drive', label: 'Google Drive', desc: 'Read and write files, manage folders, and search Drive content.', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg' },
    { id: 'docs', label: 'Google Docs', desc: 'Read, create, and edit text documents.', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg' },
    { id: 'sheets', label: 'Google Sheets', desc: 'Read spreadsheets and manipulate row data.', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg' },
    { id: 'calendar', label: 'Google Calendar', desc: 'Read schedules and create events.', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg' },
    { id: 'gmail', label: 'Google Gmail', desc: 'Send emails on behalf of the user.', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg' }
  ];

  if (integration.id === 'workspace') {
    return (
      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold text-cw-txt">Google Workspace Access</h3>
        <p className="text-[13px] text-cw-txt3">Select which specific Google apps you want to grant the agents access to. Note: Disabling an app here will prevent any agent from using tools for that app.</p>
        
        <div className="flex flex-col gap-3 mt-2">
          {googleApps.map(app => {
            const isEnabled = localSettings.googleScopes?.[app.id] ?? true;
            return (
              <div key={app.id} className="flex items-start justify-between p-4 rounded-xl border border-cw-bdr bg-cw-bg transition-colors hover:border-cw-purple/50">
                <div className="flex items-start gap-4">
                  <img src={app.icon} alt={app.label} className="w-8 h-8 object-contain shrink-0" />
                  <div>
                    <label htmlFor={app.id} className="text-[14px] font-semibold text-cw-txt cursor-pointer">
                      {app.label}
                    </label>
                    <p className="text-[13px] text-cw-txt3 mt-0.5 max-w-sm">
                      {app.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {loading && <Loader2 className="w-3 h-3 text-cw-txt3 animate-spin" />}
                  <input 
                    id={app.id}
                    type="checkbox" 
                    checked={isEnabled} 
                    onChange={(e) => {
                      saveSettings({ 
                        googleScopes: { 
                          ...(localSettings.googleScopes || {}), 
                          [app.id]: e.target.checked 
                        } 
                      });
                    }}
                    className="accent-cw-purple w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (integration.id === 'slack') {
    return (
      <div className="space-y-4">
        <h3 className="text-[14px] font-semibold text-cw-txt">Slack Configuration</h3>
        
        <div>
          <label className="text-[13px] font-medium text-cw-txt2 block mb-1.5">Incident Alert Channel</label>
          <input 
            type="text" 
            value={localSettings.slackIncidentChannel || '#incidents'}
            onChange={(e) => setLocalSettings({ ...localSettings, slackIncidentChannel: e.target.value })}
            onBlur={() => saveSettings({ slackIncidentChannel: localSettings.slackIncidentChannel })}
            className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple"
            placeholder="#incidents"
          />
        </div>
      </div>
    );
  }

  // Default fallback for integrations without specific forms
  return (
    <div className="text-center p-6 border border-cw-bdr rounded-xl bg-cw-bg">
      <p className="text-[13px] text-cw-txt3">No advanced settings required for {integration.name}.</p>
    </div>
  );
}
