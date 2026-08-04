import { useState, useEffect } from 'react';
import { 
  User, 
  Settings2, 
  CreditCard, 
  Users, 
  Code2, 
  Copy, 
  Check, 
  RefreshCw, 
  Shield, 
  KeyRound, 
  Webhook, 
  LogOut, 
  Sparkles, 
  Calendar, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Lock, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Sliders, 
  Zap, 
  FileText, 
  Download, 
  History,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession, signOut } from '../../lib/auth';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { API_URL } from '../../lib/api';

type TabType = 'general' | 'account' | 'billing' | 'team' | 'developers';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
}

interface WebhookDestination {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'failing';
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  status: 'Active' | 'Invited';
  joinedAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  status: 'success' | 'warning' | 'info';
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div 
      onClick={onChange} 
      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors shrink-0 ${on ? 'bg-cw-purple' : 'bg-cw-bdr'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-[left] shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </div>
  );
}

function SetRow({ label, desc, control }: { label: string; desc?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-cw-bdr/40 last:border-b-0">
      <div>
        <div className="text-xs font-semibold text-cw-txt">{label}</div>
        {desc && <div className="text-[11px] text-cw-txt3 mt-0.5 leading-snug">{desc}</div>}
      </div>
      <div className="shrink-0 ml-4">{control}</div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '' }: { title: string; icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-cw-bg2 border border-cw-bdr rounded-2xl p-5 mb-5 shadow-sm ${className}`}>
      <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-cw-bdr/40 pb-3">
        {Icon && <Icon size={14} className="text-cw-purple" />}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function Settings() {
  const { data: session } = useSession();
  const { activeWorkspace, setOpenInviteDrawer } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>('account');

  // User Profile State
  const [fullName, setFullName] = useState(session?.user?.name || 'Kelvin Maina');
  const [savingName, setSavingName] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // General Settings State
  const [toggles, setToggles] = useState({
    autoRefactor: true,
    autoDeploy: true,
    autoMerge: false,
    autonomous: false,
    autoRollback: true,
    aggressiveDedup: true,
    prMode: true,
    dryRunOnly: false,
    slack: true,
    email: true,
    push: false,
    aiAlerts: true,
  });

  const toggleHandler = (key: keyof typeof toggles) => {
    setToggles(prev => {
      const next = { ...prev, [key]: !prev[key] };
      toast.success('Setting updated successfully');
      return next;
    });
  };

  // Auto-Merge Policy State
  const [repos, setRepos] = useState<Array<{ id: number; fullName: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [mergeMode, setMergeMode] = useState<'manual' | 'auto'>('manual');
  const [timeoutMinutes, setTimeoutMinutes] = useState(120);
  const [savingMerge, setSavingMerge] = useState(false);

  // Developers Tab State (API Keys & Webhooks)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: '1', name: 'Production CI/CD Pipeline', prefix: 'cw_live_89f2...', createdAt: '2026-07-20', lastUsed: '2 hours ago' },
    { id: '2', name: 'CLI Local Dev Key', prefix: 'cw_live_12a7...', createdAt: '2026-07-15', lastUsed: 'Yesterday' }
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [copiedKeySecret, setCopiedKeySecret] = useState(false);

  const [webhooks, setWebhooks] = useState<WebhookDestination[]>([
    { id: '1', url: 'https://hooks.slack.com/services/T00/B00/X00', events: ['push', 'agent.run_completed'], status: 'active', createdAt: '2026-07-10' }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState(false);

  // Team & Audit Logs State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  
  // RBAC Roles
  const isAdminOrOwner = ['owner', 'admin'].includes(activeWorkspace?.role || '');

  // WebSocket Presence
  useEffect(() => {
    if (!activeWorkspace?.id || !session?.user?.id) return;
    
    // Create WS URL
    const wsUrl = API_URL.replace('http', 'ws') + '/ws/presence';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        workspaceId: activeWorkspace.id,
        userId: session.user.id
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence_update') {
          setOnlineUserIds(data.payload || []);
        }
      } catch (e) {
        // ignore
      }
    };
    
    return () => {
      ws.close();
    };
  }, [activeWorkspace?.id, session?.user?.id]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    // Fetch members
    fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/members`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const active = (data.members || []).map((m: any) => ({
          id: m.userId || m.id,
          name: m.userName || 'Unknown User',
          email: m.userEmail || 'No email',
          role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
          status: 'Active',
          joinedAt: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        }));
        const pending = (data.pendingInvites || []).map((i: any) => ({
          id: i.id,
          name: 'Pending Invite',
          email: i.email,
          role: i.role.charAt(0).toUpperCase() + i.role.slice(1),
          status: 'Invited',
          joinedAt: 'Pending'
        }));
        setTeamMembers([...active, ...pending]);
      })
      .catch(console.error);

    // Fetch logs only if Admin or Owner
    if (['owner', 'admin'].includes(activeWorkspace?.role || '')) {
      fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/logs`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          const logs = (data.logs || []).map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
            user: l.actorName || 'System',
            action: l.action,
            ip: l.ipAddress || 'Unknown',
            status: l.status
          }));
          setAuditLogs(logs);
        })
        .catch(console.error);
    }
  }, [activeWorkspace?.id, activeWorkspace?.role]);

  // Load connected repos
  useEffect(() => {
    fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : data?.repos ?? data?.connectedRepos ?? []).map((r: any) => ({ id: r.id, fullName: r.fullName }));
        setRepos(list.filter((r: any) => r.id != null));
        if (list.length > 0) setSelectedRepo(list[0].id);
      })
      .catch(console.error);
  }, []);

  // Copy helpers
  const copyToClipboard = (text: string, setCopiedFn: (val: boolean) => void) => {
    navigator.clipboard?.writeText(text);
    setCopiedFn(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedFn(false), 2000);
  };

  // Save Full Name
  const handleSaveName = async () => {
    setSavingName(true);
    setTimeout(() => {
      setSavingName(false);
      toast.success('Profile name updated');
    }, 600);
  };

  // Create API Key
  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter an API key name');
      return;
    }
    const secret = `cw_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: newKeyName.trim(),
      prefix: secret.substring(0, 14) + '...',
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    setApiKeys([newKey, ...apiKeys]);
    setCreatedKeySecret(secret);
    setNewKeyName('');
    toast.success('API Key generated');
  };

  const handleRevokeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    toast.success('API Key revoked');
  };

  // Create Webhook
  const handleCreateWebhook = () => {
    if (!newWebhookUrl.trim()) {
      toast.error('Please enter a valid webhook URL');
      return;
    }
    const newWh: WebhookDestination = {
      id: String(Date.now()),
      url: newWebhookUrl.trim(),
      events: ['push', 'pull_request', 'agent_alert'],
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setWebhooks([newWh, ...webhooks]);
    setNewWebhookUrl('');
    setShowWebhookModal(false);
    toast.success('Webhook endpoint registered');
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success('Webhook endpoint removed');
  };

  const userId = session?.user?.id || '310519663286786535';
  const userEmail = session?.user?.email || 'kelvin202maina@gmail.com';
  const webhookUrl = 'https://6da03ff7-234d-4d3e-ab48df5075fb7.codeward.app/reposeive';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-cw-bg text-cw-txt font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-[1000px] mx-auto pb-24">
        
        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-cw-txt">Settings</h1>
          <p className="text-[13px] text-cw-txt3 mt-1">Manage your workspace options, account security, billing, and API credentials.</p>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-cw-bdr mb-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'account', label: 'Account', icon: User },
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
            { id: 'team', label: 'Workspace & Team', icon: Users },
            { id: 'developers', label: 'Developers & API', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-cw-purple text-cw-purple bg-cw-purple/5 rounded-t-xl'
                    : 'border-transparent text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg2 rounded-t-xl'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: ACCOUNT (Matching User's Reference Layout) ── */}
        {activeTab === 'account' && (
          <div className="flex flex-col gap-6">
            
            {/* User Profile Card */}
            <SectionCard title="Account Profile" icon={User}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-16 h-16 rounded-full bg-cw-purple/20 border border-cw-purple/40 flex items-center justify-center text-cw-purple text-xl font-bold overflow-hidden shrink-0">
                    {session?.user?.image ? (
                      <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[11px] font-medium text-cw-txt3 block mb-1">Full name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="px-3 py-1.5 bg-cw-bg3 border border-cw-bdr rounded-xl text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors w-full max-w-[240px]"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="px-3.5 py-1.5 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl transition-colors cursor-pointer border border-cw-bdr"
                      >
                        {savingName ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await signOut();
                    window.location.reload();
                  }}
                  className="p-2.5 bg-cw-bg3 hover:bg-red-500/10 hover:text-red-400 text-cw-txt3 rounded-xl border border-cw-bdr transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </SectionCard>

            {/* Plan & Credits Card */}
            <SectionCard title="Plan & Credits Usage" icon={Sparkles}>
              <div className="bg-cw-bg3/60 border border-cw-bdr rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-bold text-cw-txt">Free</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cw-purple/20 text-cw-purple border border-cw-purple/30">Active</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="px-4 py-1.5 bg-white text-black hover:bg-slate-200 text-[13px] font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    Upgrade
                  </button>
                </div>

                <div className="space-y-3 pt-2 border-t border-cw-bdr/50">
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 text-cw-txt">
                      <Sparkles size={15} className="text-cw-purple" />
                      <span className="font-semibold">Credits</span>
                    </div>
                    <span className="font-bold text-cw-txt font-mono">205</span>
                  </div>
                  <div className="text-[11px] text-cw-txt3 pl-6">Free credits: 205</div>

                  <div className="flex items-center justify-between text-[13px] pt-2">
                    <div className="flex items-center gap-2 text-cw-txt">
                      <Calendar size={15} className="text-cw-purple" />
                      <span className="font-semibold">Daily refresh credits</span>
                    </div>
                    <span className="font-bold text-cw-txt font-mono">300</span>
                  </div>
                  <div className="text-[11px] text-cw-txt3 pl-6">Refresh to 300 at 00:00 every day</div>
                </div>
              </div>
            </SectionCard>

            {/* Account Identifiers */}
            <SectionCard title="Identity & Security" icon={ShieldCheck}>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center justify-between py-2 border-b border-cw-bdr/40">
                  <div>
                    <div className="text-xs font-semibold text-cw-txt">Email</div>
                    <div className="text-[12px] text-cw-txt2 mt-0.5 font-mono">{userEmail}</div>
                  </div>
                  <button 
                    onClick={() => toast.info('Email change verification sent to ' + userEmail)}
                    className="px-3 py-1.5 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* User ID */}
                <div className="flex items-center justify-between py-2 border-b border-cw-bdr/40">
                  <div>
                    <div className="text-xs font-semibold text-cw-txt">User ID</div>
                    <div className="text-[12px] text-cw-txt3 mt-0.5 font-mono">{userId}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(userId, setCopiedId)}
                    className="px-3 py-1.5 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedId ? <Check size={14} className="text-cw-green" /> : <Copy size={14} />}
                    {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Manage Sign-In Methods */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-semibold text-cw-txt">Manage sign-in methods</div>
                    <div className="text-[11px] text-cw-txt3 mt-0.5">Manage third-party accounts for signing in to Codeward.</div>
                  </div>
                  <button 
                    onClick={() => toast.info('GitHub & Google OAuth sign-in methods active')}
                    className="px-3 py-1.5 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Danger Zone */}
            <SectionCard title="Danger Zone" icon={AlertTriangle} className="border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-red-400">Delete account</div>
                  <div className="text-[11px] text-cw-txt3 mt-0.5">This will permanently delete your account, workspace data, and all repository connections.</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      toast.error('Account deletion initiated');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-[12px] font-semibold rounded-xl border border-red-500/40 transition-colors cursor-pointer"
                >
                  Delete account
                </button>
              </div>
            </SectionCard>

          </div>
        )}

        {/* ── TAB 2: GENERAL SETTINGS ── */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-6">
            
            {/* Auto-Merge Policy */}
            <SectionCard title="🔀 Auto-Merge Policy (per repository)" icon={Sliders}>
              <div className="text-[11px] text-cw-txt3 mb-4 leading-relaxed">
                Controls what happens after Guardian approves a Codeward auto-fix PR. Manual: nothing merges without your click.
                Auto: if you don't respond within the window, the PR merges on your standing authorization. High/critical-severity
                fixes always require a manual click.
              </div>

              {repos.length === 0 ? (
                <div className="text-[12px] text-cw-txt3 py-3 text-center bg-cw-bg3/40 rounded-xl">No connected repositories yet.</div>
              ) : (
                <div className="space-y-4">
                  <SetRow 
                    label="Target Repository" 
                    control={
                      <select
                        value={selectedRepo ?? ''}
                        onChange={(e) => setSelectedRepo(Number(e.target.value))}
                        className="text-[12px] px-3 py-1.5 rounded-xl border border-cw-bdr bg-cw-bg3 text-cw-txt outline-none max-w-[240px]"
                      >
                        {repos.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                      </select>
                    } 
                  />
                  <SetRow 
                    label="Merge Policy Mode" 
                    desc={mergeMode === 'auto' ? `Unactioned approved PRs merge after ${timeoutMinutes >= 60 ? `${Math.round(timeoutMinutes / 60)}h` : `${timeoutMinutes}m`}.` : 'Every merge requires your explicit click.'} 
                    control={
                      <select
                        value={mergeMode === 'manual' ? 'manual' : String(timeoutMinutes)}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'manual') { setMergeMode('manual'); }
                          else { setMergeMode('auto'); setTimeoutMinutes(Number(v)); }
                          toast.success('Auto-merge policy saved');
                        }}
                        className="text-[12px] px-3 py-1.5 rounded-xl border border-cw-bdr bg-cw-bg3 text-cw-txt outline-none"
                      >
                        <option value="manual">Manual approval required</option>
                        <option value="120">Auto-merge after 2 hours</option>
                        <option value="720">Auto-merge after 12 hours</option>
                        <option value="1440">Auto-merge after 24 hours</option>
                      </select>
                    } 
                  />
                </div>
              )}
            </SectionCard>

            {/* Autonomous Engine & Trust Parameters */}
            <SectionCard title="⚙ Autonomous Engine & Trust Mode" icon={Zap}>
              <div className="space-y-1">
                <SetRow label="Auto-refactor low-risk files" desc="Utilities, helpers, test files. Never touches business logic without asking." control={<Toggle on={toggles.autoRefactor} onChange={() => toggleHandler('autoRefactor')} />} />
                <SetRow label="Auto-deploy to ephemeral staging" desc="After sandbox passes all security gates, deploy to staging automatically." control={<Toggle on={toggles.autoDeploy} onChange={() => toggleHandler('autoDeploy')} />} />
                <SetRow label="Auto Rollback on Test Failure" desc="Automatically revert commits that break verification tests." control={<Toggle on={toggles.autoRollback} onChange={() => toggleHandler('autoRollback')} />} />
                <SetRow label="Aggressive Deduplication" desc="Deep-scan code for duplicate utility patterns across repos." control={<Toggle on={toggles.aggressiveDedup} onChange={() => toggleHandler('aggressiveDedup')} />} />
                <SetRow label="PR Mode (Requires Manual Review)" desc="Open a pull request and review before committing directly." control={<Toggle on={toggles.prMode} onChange={() => toggleHandler('prMode')} />} />
                <SetRow label="Dry Run Only" desc="Analyse and report without applying any changes." control={<Toggle on={toggles.dryRunOnly} onChange={() => toggleHandler('dryRunOnly')} />} />
              </div>
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="🔔 Notifications & Alerts" icon={Mail}>
              <div className="space-y-1">
                <SetRow label="Slack integration alerts" desc="Receive instant notifications in your Slack channel on security findings." control={<Toggle on={toggles.slack} onChange={() => toggleHandler('slack')} />} />
                <SetRow label="Email digest (weekly summary)" desc="Weekly summary report of debt eliminated and tests generated." control={<Toggle on={toggles.email} onChange={() => toggleHandler('email')} />} />
                <SetRow label="Mobile push notifications" desc="Alerts on critical vulnerability fixes waiting for approval." control={<Toggle on={toggles.push} onChange={() => toggleHandler('push')} />} />
                <SetRow label="Codeward AI proactive alerts" desc="Agent notifies you when it spots recurring architecture smells." control={<Toggle on={toggles.aiAlerts} onChange={() => toggleHandler('aiAlerts')} />} />
              </div>
            </SectionCard>

          </div>
        )}

        {/* ── TAB 3: BILLING & USAGE ── */}
        {activeTab === 'billing' && (
          <div className="flex flex-col gap-6">
            
            {/* Current Plan Overview */}
            <SectionCard title="Current Subscription" icon={CreditCard}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-cw-bg3/60 border border-cw-bdr rounded-xl mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-cw-txt">Free Tier</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-cw-purple/20 text-cw-purple rounded-full border border-cw-purple/30 uppercase">Current</span>
                  </div>
                  <p className="text-[12px] text-cw-txt3 mt-1">300 daily refresh credits · 5 connected repos · Automated PR Reviews</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cw-txt">$0 <span className="text-[13px] font-normal text-cw-txt3">/ month</span></div>
                  <div className="text-[11px] text-cw-txt3">Renews automatically daily</div>
                </div>
              </div>

              {/* Plan Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                
                {/* Free */}
                <div className="border border-cw-bdr rounded-xl p-4 bg-cw-bg3/30 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-cw-txt text-base">Free</h3>
                    <p className="text-[12px] text-cw-txt3 mt-0.5">For indie developers and side projects.</p>
                    <div className="text-xl font-bold text-cw-txt mt-3 mb-4">$0 <span className="text-xs font-normal text-cw-txt3">/mo</span></div>
                    <ul className="text-[12px] text-cw-txt2 space-y-2 mb-6">
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> 300 Daily Credits</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> 5 Repositories</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> Community Support</li>
                    </ul>
                  </div>
                  <button disabled className="w-full py-2 bg-cw-bg3 text-cw-txt3 font-semibold rounded-xl text-[12px] border border-cw-bdr cursor-not-allowed">
                    Current Plan
                  </button>
                </div>

                {/* Pro */}
                <div className="border-2 border-cw-purple rounded-xl p-4 bg-cw-purple/5 flex flex-col justify-between relative shadow-lg">
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-cw-purple text-white text-[10px] font-bold uppercase rounded-full">Popular</span>
                  <div>
                    <h3 className="font-bold text-cw-txt text-base">Pro Developer</h3>
                    <p className="text-[12px] text-cw-txt3 mt-0.5">For active developers and growing codebases.</p>
                    <div className="text-xl font-bold text-cw-txt mt-3 mb-4">$29 <span className="text-xs font-normal text-cw-txt3">/mo</span></div>
                    <ul className="text-[12px] text-cw-txt2 space-y-2 mb-6">
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> 5,000 Monthly Credits</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> Unlimited Repositories</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> Priority Agent Execution</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> Slack & Email Alerts</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => toast.info('Redirecting to Stripe checkout...')}
                    className="w-full py-2 bg-cw-purple hover:bg-purple-600 text-white font-semibold rounded-xl text-[12px] transition-colors cursor-pointer"
                  >
                    Upgrade to Pro
                  </button>
                </div>

                {/* Team */}
                <div className="border border-cw-bdr rounded-xl p-4 bg-cw-bg3/30 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-cw-txt text-base">Team & Enterprise</h3>
                    <p className="text-[12px] text-cw-txt3 mt-0.5">For engineering teams & organizations.</p>
                    <div className="text-xl font-bold text-cw-txt mt-3 mb-4">$99 <span className="text-xs font-normal text-cw-txt3">/mo</span></div>
                    <ul className="text-[12px] text-cw-txt2 space-y-2 mb-6">
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> 25,000 Monthly Credits</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> 10 Team Seats included</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> SOC2 Compliance Export</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-cw-purple shrink-0" /> Dedicated SLA & Support</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => toast.info('Contact sales@codeward.ai for custom enterprise plans')}
                    className="w-full py-2 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt font-semibold rounded-xl text-[12px] border border-cw-bdr transition-colors cursor-pointer"
                  >
                    Contact Sales
                  </button>
                </div>

              </div>
            </SectionCard>

            {/* Invoices History */}
            <SectionCard title="Invoices & Payment Receipts" icon={FileText}>
              <div className="text-[12px] text-cw-txt3 py-6 text-center bg-cw-bg3/30 rounded-xl border border-cw-bdr/40">
                No past paid invoices found for your account.
              </div>
            </SectionCard>

          </div>
        )}

        {/* ── TAB 4: WORKSPACE & TEAM ── */}
        {activeTab === 'team' && (
          <div className="flex flex-col gap-6">
            
            {/* Active Members Table */}
            <SectionCard title="Workspace Members" icon={Users}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] text-cw-txt3">People with access to this workspace and connected repositories.</p>
                {isAdminOrOwner && (
                  <button
                    onClick={() => setOpenInviteDrawer(true)}
                    className="px-3.5 py-1.5 bg-cw-purple hover:bg-purple-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} /> Invite Member
                  </button>
                )}
              </div>

              <div className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg3/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cw-bdr bg-cw-bg3 text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cw-bdr/40 text-[12px]">
                    {teamMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-cw-bg3/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-cw-purple/20 border border-cw-purple/30 flex items-center justify-center text-cw-purple font-bold text-xs shrink-0">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-cw-txt">{m.name}</div>
                              <div className="text-[11px] text-cw-txt3 font-mono">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-cw-bg3 border border-cw-bdr rounded-md font-medium text-cw-txt text-[11px]">
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const isOnline = onlineUserIds.includes(m.id);
                            const displayStatus = isOnline ? 'Online' : (m.status === 'Invited' ? 'Invited' : 'Offline');
                            let colorClass = 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
                            let dotClass = 'bg-gray-400';
                            
                            if (isOnline) {
                              colorClass = 'bg-green-500/10 text-green-400 border border-green-500/30';
                              dotClass = 'bg-green-400 animate-pulse';
                            } else if (m.status === 'Invited') {
                              colorClass = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
                              dotClass = 'bg-yellow-400';
                            }
                            
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                                {displayStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-right text-cw-txt3 text-[11px]">
                          {m.joinedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Audit & Activity Logs (Admin/Owner Only) */}
            {isAdminOrOwner && (
              <SectionCard title="Workspace Audit & Activity Logs" icon={History}>
                <p className="text-[12px] text-cw-txt3 mb-4">Chronological log of administrative actions, repo connections, and agent executions.</p>

                <div className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg3/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-cw-bdr bg-cw-bg3 text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4 text-right">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cw-bdr/40 text-[12px]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cw-bg3/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-cw-txt3 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3 px-4 font-semibold text-cw-txt">
                            {log.user}
                          </td>
                          <td className="py-3 px-4 text-cw-txt2">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[11px] text-cw-txt3">
                            {log.ip}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

          </div>
        )}

        {/* ── TAB 5: DEVELOPERS & API ── */}
        {activeTab === 'developers' && (
          <div className="flex flex-col gap-6">
            
            {/* API Keys Management */}
            <SectionCard title="API Keys" icon={KeyRound}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] text-cw-txt3">Use API keys to authenticate CLI scripts, CI/CD pipelines, and external automated tools.</p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-3.5 py-1.5 bg-cw-purple hover:bg-purple-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Generate New Key
                </button>
              </div>

              <div className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg3/30 mb-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cw-bdr bg-cw-bg3 text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                      <th className="py-3 px-4">Key Name</th>
                      <th className="py-3 px-4">Token Prefix</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4">Last Used</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cw-bdr/40 text-[12px]">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-cw-bg3/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-cw-txt">
                          {key.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-cw-purple text-[11px]">
                          {key.prefix}
                        </td>
                        <td className="py-3 px-4 text-cw-txt3 text-[11px]">
                          {key.createdAt}
                        </td>
                        <td className="py-3 px-4 text-cw-txt3 text-[11px]">
                          {key.lastUsed}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRevokeApiKey(key.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer border border-red-500/30"
                            title="Revoke key"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Incoming Repository Webhook */}
            <SectionCard title="⬇ Incoming Webhook URL" icon={Webhook}>
              <div className="text-[12px] text-cw-txt3 mb-3 leading-relaxed">
                Add this endpoint URL in your GitHub or GitLab repository settings to automatically trigger Codeward scans on push events.
              </div>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 px-3 py-2 border border-cw-bdr rounded-xl text-[12px] bg-cw-bg3 text-cw-purple font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                  {webhookUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)}
                  className="px-3.5 py-2 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {copiedWebhook ? <Check size={14} className="text-cw-green" /> : <Copy size={14} />}
                  {copiedWebhook ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-cw-bdr/40">
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-cw-txt3 mb-1">HMAC Webhook Secret</div>
                  <input
                    type="password"
                    value="••••••••••••••••••••••••••••"
                    readOnly
                    className="w-full px-3 py-1.5 border border-cw-bdr rounded-xl text-[12px] bg-cw-bg3 text-cw-txt font-mono outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    setRotatedSecret(true);
                    toast.success('HMAC Secret token rotated');
                    setTimeout(() => setRotatedSecret(false), 2000);
                  }}
                  className="px-3.5 py-1.5 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer self-end flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={rotatedSecret ? 'animate-spin text-cw-purple' : ''} /> Rotate Secret
                </button>
              </div>
            </SectionCard>

            {/* Custom Outgoing Webhooks */}
            <SectionCard title="⬆ Custom Outgoing Webhooks" icon={ExternalLink}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] text-cw-txt3">Send live JSON event payloads from Codeward to your internal APIs or Slack endpoints.</p>
                <button
                  onClick={() => setShowWebhookModal(true)}
                  className="px-3.5 py-1.5 bg-cw-purple hover:bg-purple-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Add Destination
                </button>
              </div>

              <div className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg3/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cw-bdr bg-cw-bg3 text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                      <th className="py-3 px-4">Endpoint URL</th>
                      <th className="py-3 px-4">Events</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cw-bdr/40 text-[12px]">
                    {webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-cw-bg3/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-cw-txt truncate max-w-[280px]">
                          {wh.url}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {wh.events.map((ev) => (
                              <span key={ev} className="px-1.5 py-0.5 bg-cw-bg3 border border-cw-bdr rounded text-[10px] text-cw-txt3 font-mono">
                                {ev}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-[10px] font-bold uppercase">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => toast.success('Test payload sent to ' + wh.url)}
                            className="px-2.5 py-1 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[11px] font-medium rounded-lg border border-cw-bdr transition-colors cursor-pointer"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer border border-red-500/30"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

          </div>
        )}

        {/* Modal: Generate API Key */}
        {showKeyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-cw-bg2 border border-cw-bdr rounded-2xl p-6 w-full max-w-[460px] shadow-2xl">
              <h2 className="text-lg font-bold text-cw-txt mb-1">Generate New API Key</h2>
              <p className="text-[12px] text-cw-txt3 mb-5">Give your API key a descriptive name to identify its usage.</p>

              {!createdKeySecret ? (
                <>
                  <label className="text-[11px] font-semibold text-cw-txt3 block mb-1.5">Key Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Production CI/CD Runner"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 bg-cw-bg3 border border-cw-bdr rounded-xl text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors mb-6"
                  />

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowKeyModal(false)}
                      className="px-4 py-2 bg-cw-bg3 text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr hover:bg-cw-bdr transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateApiKey}
                      className="px-4 py-2 bg-cw-purple hover:bg-purple-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Generate Key
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4 text-[12px] text-yellow-300 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>Save this API key secret now. You will not be able to see it again!</span>
                  </div>

                  <label className="text-[11px] font-semibold text-cw-txt3 block mb-1.5">API Key Secret</label>
                  <div className="flex gap-2 mb-6">
                    <input
                      type="text"
                      readOnly
                      value={createdKeySecret}
                      className="w-full px-3 py-2 bg-cw-bg3 border border-cw-bdr rounded-xl text-[12px] font-mono text-cw-purple outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(createdKeySecret, setCopiedKeySecret)}
                      className="px-3.5 py-2 bg-cw-purple text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      {copiedKeySecret ? <Check size={14} /> : <Copy size={14} />}
                      {copiedKeySecret ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowKeyModal(false);
                      setCreatedKeySecret(null);
                    }}
                    className="w-full py-2 bg-cw-bg3 hover:bg-cw-bdr text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Add Webhook */}
        {showWebhookModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-cw-bg2 border border-cw-bdr rounded-2xl p-6 w-full max-w-[460px] shadow-2xl">
              <h2 className="text-lg font-bold text-cw-txt mb-1">Add Webhook Destination</h2>
              <p className="text-[12px] text-cw-txt3 mb-5">Enter an HTTP(S) endpoint URL to receive real-time Codeward event payloads.</p>

              <label className="text-[11px] font-semibold text-cw-txt3 block mb-1.5">Payload Endpoint URL</label>
              <input
                type="url"
                placeholder="https://api.yourcompany.com/webhooks/codeward"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="w-full px-3 py-2 bg-cw-bg3 border border-cw-bdr rounded-xl text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors mb-6"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowWebhookModal(false)}
                  className="px-4 py-2 bg-cw-bg3 text-cw-txt text-[12px] font-semibold rounded-xl border border-cw-bdr hover:bg-cw-bdr transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWebhook}
                  className="px-4 py-2 bg-cw-purple hover:bg-purple-600 text-white text-[12px] font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Add Webhook
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
