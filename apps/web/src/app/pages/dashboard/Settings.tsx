import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User, CreditCard, Users, Code2, Copy, Check, RefreshCw, KeyRound, Webhook, LogOut,
  Sparkles, Calendar, ExternalLink, Plus, Trash2, Mail, AlertTriangle, ShieldCheck,
  Sliders, Zap, FileText, History, Globe, GitMerge, Inbox, ArrowUpRight, ChevronDown,
  LoaderCircle, X as XIcon, Send, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useSession, signOut } from '../../../lib/auth';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { API_URL } from '../../../lib/api';

import { DeleteAccountDialog } from '../../components/modals/DeleteAccountDialog';

// ─── Presentation vocabulary ─────────────────────────────────────────────────
// Mirrors the vocabulary used by Dashboard.tsx so both pages read as one
// application: hairline `cw-bdr` borders, `cw-bg2` surfaces on the `cw-bg`
// ground, `cw-bg3` for inset separation, one purple accent, green / amber / red
// / blue status semantics, monospace for identifiers, and small uppercase
// tracked labels. Everything is expressed through `cw-*` tokens so the page
// renders correctly in every app theme (dark, cream, white).

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

const TONE_PILL: Record<Tone, string> = {
  neutral: 'bg-cw-bg3 text-cw-txt2 border-cw-bdr',
  green: 'bg-cw-green/10 text-cw-green border-cw-green/25',
  amber: 'bg-cw-amber/10 text-cw-amber border-cw-amber/25',
  red: 'bg-cw-red/10 text-cw-red border-cw-red/25',
  blue: 'bg-cw-blue/10 text-cw-blue border-cw-blue/25',
  purple: 'bg-cw-purple/10 text-cw-purple border-cw-purple/25',
};

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-cw-txt3',
  green: 'bg-cw-green',
  amber: 'bg-cw-amber',
  red: 'bg-cw-red',
  blue: 'bg-cw-blue',
  purple: 'bg-cw-purple',
};

const FOCUS_RING =
  'focus:outline-none focus:ring-1 focus:ring-cw-purple/50 focus:border-cw-purple';
const MICRO_LABEL = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-cw-txt3';

// Standardized button micro-variants
const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium text-[12px] cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY = `${BTN_BASE} px-3 py-1.5 bg-cw-purple hover:bg-cw-purple-hover text-white shadow-sm`;
const BTN_SECONDARY = `${BTN_BASE} px-3 py-1.5 bg-cw-bg2 text-cw-txt border border-cw-bdr hover:bg-cw-bg3 hover:border-cw-txt3/50`;
const BTN_DANGER = `${BTN_BASE} px-3 py-1.5 bg-cw-red/10 text-cw-red border border-cw-red/30 hover:bg-cw-red hover:text-white hover:border-cw-red`;
const BTN_GHOST_SM = `${BTN_BASE} px-2 py-1 text-[11px] bg-transparent text-cw-txt2 border border-cw-bdr hover:bg-cw-bg3 hover:text-cw-txt`;
const BTN_LINK = `inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-cw-purple hover:text-cw-txt bg-transparent border-none p-0 cursor-pointer transition-colors ${FOCUS_RING}`;
const INPUT = `bg-cw-bg border border-cw-bdr text-cw-txt placeholder:text-cw-txt3 rounded-md px-2.5 py-1.5 text-[12px] transition-colors hover:border-cw-txt3/50 focus:border-cw-purple/60 ${FOCUS_RING}`;
const SELECT = `appearance-none bg-cw-bg border border-cw-bdr text-cw-txt rounded-md pl-2.5 pr-7 py-1.5 text-[12px] cursor-pointer transition-colors hover:border-cw-txt3/50 ${FOCUS_RING}`;
const TH = 'px-4 sm:px-5 py-2.5 font-semibold border-b border-cw-bdr';
const TD = 'px-4 sm:px-5 py-2.5';

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
  userId?: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  status: 'Active' | 'Invited' | 'Expired';
  isOwner?: boolean;
  invitedAt: string;
  joinedAt: string;
  loginsToday?: number;
  totalLogins?: number;
  lastLoginAt?: string | null;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  status: 'success' | 'warning' | 'info';
}

interface DailyLoginSummary {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  loginDate: string;
  loginCount: number;
  lastLoginAt: string;
}

// ─── Presentational components (UI only) ────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`w-8 h-[18px] rounded-full relative cursor-pointer transition-colors shrink-0 border ${FOCUS_RING} ${on ? 'bg-cw-purple border-cw-purple' : 'bg-cw-bg3 border-cw-bdr'}`}
    >
      <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-[left] duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${on ? 'left-[15px]' : 'left-[1px]'}`} />
    </button>
  );
}

function SetRow({ label, desc, control }: { label: string; desc?: string; control: ReactNode }) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-cw-bdr last:border-b-0">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-cw-txt leading-5">{label}</div>
        {desc && <div className="text-[11px] text-cw-txt3 mt-0.5 leading-4">{desc}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Pill({
  tone = 'neutral', dot = false, pulse = false, mono = false, className = '', children,
}: { tone?: Tone; dot?: boolean; pulse?: boolean; mono?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 py-[3px] rounded border text-[10px] font-semibold leading-none whitespace-nowrap ${mono ? 'font-mono' : ''} ${TONE_PILL[tone]} ${className}`}>
      {dot && (
        <span className={`relative inline-flex w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[tone]}`}>
          {pulse && <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${TONE_DOT[tone]}`} />}
        </span>
      )}
      {children}
    </span>
  );
}

function SectionCard({
  title, icon: Icon, description, actions, children, className = '', tone = 'neutral', flush = false,
}: {
  title: string; icon?: LucideIcon; description?: string; actions?: ReactNode; children: ReactNode;
  className?: string; tone?: 'neutral' | 'danger'; flush?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={`bg-cw-bg2 border rounded-lg flex flex-col min-w-0 ${tone === 'danger' ? 'border-cw-red/30' : 'border-cw-bdr'} ${className}`}
    >
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 px-4 sm:px-5 py-3 border-b ${tone === 'danger' ? 'border-cw-red/20' : 'border-cw-bdr'}`}>
        <div className="min-w-0">
          <h2 className={`text-[13px] font-semibold leading-5 flex items-center gap-2 ${tone === 'danger' ? 'text-cw-red' : 'text-cw-txt'}`}>
            {Icon && <Icon size={14} className={tone === 'danger' ? 'text-cw-red' : 'text-cw-txt3'} />}
            <span className="truncate">{title}</span>
          </h2>
          {description && <p className="text-[11px] text-cw-txt3 leading-4 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">{actions}</div>}
      </div>
      <div className={flush ? '' : 'px-4 sm:px-5 py-2'}>{children}</div>
    </section>
  );
}

function EmptyState({
  icon: Icon, title, hint, action,
}: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 px-4 py-8">
      <div className="w-8 h-8 rounded-md border border-dashed border-cw-bdr bg-cw-bg/60 flex items-center justify-center text-cw-txt3">
        <Icon size={14} />
      </div>
      <div className="text-[12px] font-medium text-cw-txt2">{title}</div>
      {hint && <div className="text-[11px] text-cw-txt3 max-w-[340px] leading-4">{hint}</div>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

function Modal({
  title, description, onClose, children, footer,
}: { title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-cw-bg2 border border-cw-bdr rounded-lg w-full max-w-[440px] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-cw-bdr">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-cw-txt leading-5">{title}</h2>
            {description && <p className="text-[11px] text-cw-txt3 leading-4 mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={`${BTN_BASE} p-1 -mr-1 text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 border-none bg-transparent`}>
            <XIcon size={14} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-cw-bdr bg-cw-bg/40 rounded-b-lg">{footer}</div>}
      </div>
    </div>
  );
}

function Avatar({ src, fallback, size = 32, className = '' }: { src?: string | null; fallback: string; size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-cw-purple/10 border border-cw-purple/30 flex items-center justify-center text-cw-purple font-semibold overflow-hidden shrink-0 ${className}`}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: Math.round(size * 0.4) }}>{fallback}</span>}
    </div>
  );
}

const TABS: { id: TabType; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'account', label: 'Account', icon: User, hint: 'Profile, identity, leaderboard' },
  { id: 'general', label: 'General', icon: Sliders, hint: 'Merge policy, automation, alerts' },
  { id: 'billing', label: 'Billing & Usage', icon: CreditCard, hint: 'Plan, usage, invoices' },
  { id: 'team', label: 'Workspace & Team', icon: Users, hint: 'Members and audit log' },
  { id: 'developers', label: 'Developers & API', icon: Code2, hint: 'API keys and webhooks' },
];

// ─── Billing: subscription tiers ─────────────────────────────────────────────
// Prices and checkout links match the public pricing page. The Free tier quota
// (10 PR scans per period) is enforced server-side by the budget sentinel
// (`prQuotaLimit` defaults to 10); there is no API endpoint exposing the
// per-period count yet, so the meter reflects the plan limit with the usage
// value below as the hook point once an endpoint exists.
const FREE_PLAN_SCAN_LIMIT = 10;
const FREE_PLAN_SCANS_USED = 0;

const POLAR_PRO_CHECKOUT = 'https://buy.polar.sh/polar_cl_F6pFlJMO8NB1edLEiNLZ3ED0arMmOtoFUtpBc1J7ibY';
const POLAR_TEAM_CHECKOUT = 'https://buy.polar.sh/polar_cl_G8nQdTjkiE3TT0f9HwQtEzZAA1FrGatie2AYr1PiFep';

type PlanId = 'free' | 'pro' | 'team';

const PLANS: { id: PlanId; name: string; price: string; unit: string; tagline: string; features: string[]; recommended?: boolean }[] = [
  {
    id: 'free', name: 'Free', price: '$0', unit: '/ month',
    tagline: 'Start for free with zero credit card required.',
    features: [
      '10 free PR scans (lifetime trial)',
      'Unlimited connected repositories',
      'All 8 core agents (Security, Architecture, Bloat, AI Era)',
      'Tree-sitter AST parsing & secret scanning',
      'Standard community review priority',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: '$19', unit: '/ month', recommended: true,
    tagline: 'For individual developers shipping daily.',
    features: [
      'Unlimited autonomous PR code reviews',
      'High priority (Fast review queue)',
      'Claude 3.5 Sonnet agentic reasoning',
      'Automated PR fix branches & code suggestions',
      'Ephemeral Firecracker microVM sandboxes',
      'Everything in Free',
    ],
  },
  {
    id: 'team', name: 'Team', price: '$39', unit: '/ month / seat',
    tagline: 'For engineering organizations and teams.',
    features: [
      'Unlimited autonomous PR code reviews',
      'Highest dedicated execution priority',
      'Compliance agent (SOC2 & GDPR audits)',
      'Manager escalation routing & auto-merge controls',
      'Custom codeward.yml rules engine',
      'Organization team dashboard & audit logs',
      'Everything in Pro',
    ],
  },
];

export function Settings() {
  const { data: session } = useSession();
  const { activeWorkspace, setOpenInviteDrawer } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    const fromUrl = searchParams.get('tab') as TabType;
    if (fromUrl && ['account', 'general', 'billing', 'team', 'developers'].includes(fromUrl)) {
      return fromUrl;
    }
    const fromStorage = localStorage.getItem('codeward_settings_tab') as TabType;
    if (fromStorage && ['account', 'general', 'billing', 'team', 'developers'].includes(fromStorage)) {
      return fromStorage;
    }
    return 'account';
  });

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
    localStorage.setItem('codeward_settings_tab', tab);
  };
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // User Profile State
  const [fullName, setFullName] = useState(session?.user?.name || 'Kelvin Maina');
  const [savingName, setSavingName] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Global Community Leaderboard State
  const [leaderboardOptIn, setLeaderboardOptIn] = useState<boolean>(true);
  const [leaderboardRank, setLeaderboardRank] = useState<number>(4);
  const [leaderboardScore, setLeaderboardScore] = useState<number>(1346);
  const [updatingOptIn, setUpdatingOptIn] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${API_URL}/api/stats/leaderboard`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.currentUser) {
          setLeaderboardOptIn(d.currentUser.optedIn);
          if (d.currentUser.rank) setLeaderboardRank(d.currentUser.rank);
          if (d.currentUser.score) setLeaderboardScore(d.currentUser.score);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleOptIn = async () => {
    setUpdatingOptIn(true);
    const nextVal = !leaderboardOptIn;
    try {
      const res = await fetch(`${API_URL}/api/stats/leaderboard/opt-in`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optIn: nextVal }),
      });
      if (res.ok) {
        setLeaderboardOptIn(nextVal);
        toast.success(nextVal ? 'Opted in to Global Leaderboard' : 'Hidden from Global Leaderboard');
      } else {
        toast.error('Failed to update leaderboard preference');
      }
    } catch {
      toast.error('Failed to update leaderboard preference');
    } finally {
      setUpdatingOptIn(false);
    }
  };

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
  const [dailyLogins, setDailyLogins] = useState<DailyLoginSummary[]>([]);
  const [auditLogsCollapsed, setAuditLogsCollapsed] = useState(false);
  const [dailyLoginsCollapsed, setDailyLoginsCollapsed] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<TeamMember | null>(null);
  const [revokingInvite, setRevokingInvite] = useState(false);
  
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
          id: m.id,
          userId: m.userId || m.id,
          name: m.name || m.userName || 'Unknown User',
          email: m.email || m.userEmail || 'No email',
          image: m.image || m.userImage,
          role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
          status: 'Active' as const,
          isOwner: m.isOwner,
          invitedAt: m.invitedAt ? new Date(m.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Workspace Creator',
          joinedAt: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Joined',
          loginsToday: m.loginsToday || 0,
          totalLogins: m.totalLogins || 0,
          lastLoginAt: m.lastLoginAt
        }));
        const pending = (data.pendingInvites || []).map((i: any) => ({
          id: i.id,
          userId: undefined,
          name: 'Pending Invite',
          email: i.email,
          role: i.role.charAt(0).toUpperCase() + i.role.slice(1),
          status: 'Invited' as const,
          isOwner: false,
          invitedAt: i.invitedAt ? new Date(i.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
          joinedAt: 'Pending',
          loginsToday: 0,
          totalLogins: 0,
          lastLoginAt: null
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
          setDailyLogins(data.dailyLogins || []);
        })
        .catch(console.error);
    }
  }, [activeWorkspace?.id, activeWorkspace?.role]);

  const handleRemoveMember = async () => {
    if (!memberToRemove || !activeWorkspace?.id) return;
    try {
      setRemovingMember(true);
      const targetId = memberToRemove.userId || memberToRemove.id;
      const res = await fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/members/${targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to remove member');
        return;
      }
      toast.success(data.message || 'Member removed and notified via email');
      setTeamMembers(prev => prev.filter(m => m.id !== memberToRemove.id && m.userId !== memberToRemove.userId));
      setMemberToRemove(null);

      // Refresh audit logs
      fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/logs`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          setAuditLogs((d.logs || []).map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
            user: l.actorName || 'System',
            action: l.action,
            ip: l.ipAddress || 'Unknown',
            status: l.status
          })));
          setDailyLogins(d.dailyLogins || []);
        })
        .catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'Error removing member');
    } finally {
      setRemovingMember(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!inviteToRevoke || !activeWorkspace?.id) return;
    try {
      setRevokingInvite(true);
      const res = await fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/invites/${inviteToRevoke.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to revoke invitation');
        return;
      }
      toast.success(data.message || 'Invitation revoked');
      setTeamMembers(prev => prev.filter(m => m.id !== inviteToRevoke.id));
      setInviteToRevoke(null);

      // Refresh audit logs
      fetch(`${API_URL}/api/workspaces/${activeWorkspace.id}/logs`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          setAuditLogs((d.logs || []).map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
            user: l.actorName || 'System',
            action: l.action,
            ip: l.ipAddress || 'Unknown',
            status: l.status
          })));
        })
        .catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'Error revoking invitation');
    } finally {
      setRevokingInvite(false);
    }
  };

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

  // ── Billing portal & live billing info ─────────────────────────────────────
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingInfo, setBillingInfo] = useState<{
    plan: PlanId;
    trialPrsUsed: number;
    trialPrLimit: number;
    prQuotaLimit: number;
    hasSubscription: boolean;
    currentPeriodEnd?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch(`${API_URL}/api/users/me/billing-info`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setBillingInfo({
            plan: (data.plan as PlanId) || 'free',
            trialPrsUsed: data.trialPrsUsed ?? 0,
            trialPrLimit: data.trialPrLimit ?? FREE_PLAN_SCAN_LIMIT,
            prQuotaLimit: data.prQuotaLimit ?? 100,
            hasSubscription: Boolean(data.hasSubscription),
            currentPeriodEnd: data.currentPeriodEnd || null,
          });
        }
      })
      .catch((err) => console.warn('[Settings] Could not fetch billing info:', err));
  }, [session?.user]);

  const handleOpenBillingPortal = async () => {
    if (!session?.user) {
      toast.error('Please sign in to access billing management');
      return;
    }
    setOpeningPortal(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/portal`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || data.error || 'Failed to open billing portal session');
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error('[Billing Portal Error]:', err);
      toast.error(err?.message || 'Unable to open billing portal');
      setOpeningPortal(false);
    }
  };

  // ── Billing checkout (shared with the public pricing page) ─────────────────
  const goProCheckout = () => {
    if (session?.user) {
      window.location.href = `${POLAR_PRO_CHECKOUT}?client_reference_id=${encodeURIComponent(session.user.id)}&customer_email=${encodeURIComponent(session.user.email)}`;
    } else {
      toast.error('Sign in to upgrade your plan');
    }
  };
  const goTeamCheckout = () => {
    if (session?.user) {
      window.location.href = `${POLAR_TEAM_CHECKOUT}?client_reference_id=${encodeURIComponent(session.user.id)}&customer_email=${encodeURIComponent(session.user.email)}`;
    } else {
      toast.error('Sign in to upgrade your plan');
    }
  };

  const currentPlan: PlanId = billingInfo?.plan || 'free';
  const effectiveScanLimit = currentPlan === 'free' ? (billingInfo?.trialPrLimit || FREE_PLAN_SCAN_LIMIT) : (billingInfo?.prQuotaLimit || 100);
  const effectiveScansUsed = currentPlan === 'free' ? (billingInfo?.trialPrsUsed || FREE_PLAN_SCANS_USED) : 0;
  const freeUsagePct = Math.min(100, Math.round((effectiveScansUsed / effectiveScanLimit) * 100));
  const activeTabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-cw-bg text-cw-txt">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24">

        {/* ── Context line ────────────────────────────────────────────────── */}
        <p className="text-[12px] text-cw-txt2 leading-5 mb-5">
          Manage your workspace options, account security, billing, and API credentials.
        </p>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-start">

          {/* ── Section navigation ─────────────────────────────────────────── */}
          <nav aria-label="Settings sections" className="w-full lg:w-[220px] shrink-0 lg:sticky lg:top-0">
            {/* Mobile / tablet: horizontal segmented tabs */}
            <div className="lg:hidden -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto no-scrollbar">
              <div className="inline-flex items-center gap-0.5 rounded-md border border-cw-bdr bg-cw-bg2 p-0.5 min-w-max">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-[11.5px] font-medium whitespace-nowrap transition-colors cursor-pointer ${FOCUS_RING} ${isActive ? 'bg-cw-bg3 text-cw-txt shadow-sm' : 'text-cw-txt3 hover:text-cw-txt'}`}
                    >
                      <Icon size={13} className={isActive ? 'text-cw-purple' : ''} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: vertical list */}
            <ul className="hidden lg:flex flex-col gap-0.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-md transition-colors cursor-pointer border ${FOCUS_RING} ${
                        isActive
                          ? 'bg-cw-bg2 border-cw-bdr text-cw-txt'
                          : 'border-transparent text-cw-txt2 hover:bg-cw-bg2/60 hover:text-cw-txt'
                      }`}
                    >
                      <Icon size={14} className={`mt-[3px] shrink-0 ${isActive ? 'text-cw-purple' : 'text-cw-txt3'}`} />
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-medium leading-5">{tab.label}</span>
                        <span className="block text-[10.5px] text-cw-txt3 leading-4 truncate">{tab.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ── Section content ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            <div className="flex items-center gap-2 mb-1">
              <activeTabMeta.icon size={14} className="text-cw-txt3" />
              <h1 className="text-[15px] font-semibold text-cw-txt tracking-tight leading-5">{activeTabMeta.label}</h1>
            </div>

            {/* ── TAB 1: ACCOUNT ── */}
            {activeTab === 'account' && (
              <>
                <SectionCard
                  title="Profile"
                  icon={User}
                  description="Your identity across Codeward and connected repositories"
                  actions={
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        window.location.reload();
                      }}
                      className={`${BTN_SECONDARY} hover:text-cw-red hover:border-cw-red/40`}
                      title="Sign out"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b border-cw-bdr">
                    <Avatar src={session?.user?.image} fallback={fullName.charAt(0).toUpperCase()} size={48} />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="settings-full-name" className={`${MICRO_LABEL} block mb-1.5`}>Full name</label>
                      <div className="flex gap-2">
                        <input
                          id="settings-full-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={`${INPUT} w-full max-w-[280px]`}
                        />
                        <button type="button" onClick={handleSaveName} disabled={savingName} className={BTN_SECONDARY}>
                          {savingName ? <LoaderCircle size={12} className="animate-spin" /> : null}
                          {savingName ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <SetRow
                    label="Email"
                    desc={userEmail}
                    control={
                      <button type="button" onClick={() => toast.info('Email change verification sent to ' + userEmail)} className={BTN_GHOST_SM}>
                        Change
                      </button>
                    }
                  />
                  <div className="flex items-start sm:items-center justify-between gap-4 py-3 border-b border-cw-bdr">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-cw-txt leading-5">User ID</div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5 font-mono truncate">{userId}</div>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(userId, setCopiedId)} className={`${BTN_GHOST_SM} shrink-0`}>
                      {copiedId ? <Check size={12} className="text-cw-green" /> : <Copy size={12} />}
                      {copiedId ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <SetRow
                    label="Sign-in methods"
                    desc="Manage third-party accounts for signing in to Codeward."
                    control={
                      <button type="button" onClick={() => toast.info('GitHub & Google OAuth sign-in methods active')} className={BTN_GHOST_SM}>
                        Manage
                      </button>
                    }
                  />
                </SectionCard>

                <SectionCard
                  title="Subscription & PR quota"
                  icon={Sparkles}
                  description="Your active Codeward plan and pull request review capacity"
                  actions={
                    <button type="button" onClick={() => setActiveTab('billing')} className={BTN_PRIMARY}>
                      {currentPlan === 'free' ? 'Upgrade plan' : 'Manage subscription'} <ArrowUpRight size={12} />
                    </button>
                  }
                >
                  <div className="flex items-center justify-between py-3 border-b border-cw-bdr">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-cw-txt tracking-tight capitalize">{currentPlan} Plan</span>
                      <Pill tone={currentPlan === 'free' ? 'neutral' : 'purple'} dot>
                        {currentPlan === 'free' ? 'Free trial' : 'Active subscription'}
                      </Pill>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-cw-txt">
                      {currentPlan === 'pro' ? '$19 / mo' : currentPlan === 'team' ? '$39 / seat / mo' : '$0 / mo'}
                    </span>
                  </div>
                  <SetRow
                    label="PR review quota"
                    desc={currentPlan === 'free'
                      ? `${effectiveScanLimit} lifetime PR reviews included. Force-pushes to the same PR do not consume additional slots.`
                      : 'Unlimited autonomous PR code reviews across all connected repositories.'}
                    control={
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-cw-txt">
                        {effectiveScansUsed} / {currentPlan === 'free' ? effectiveScanLimit : '∞'}
                      </span>
                    }
                  />
                  <SetRow
                    label="Review queue priority"
                    desc={currentPlan === 'team' ? 'Highest priority (Dedicated sandbox compute)' : currentPlan === 'pro' ? 'High priority (Fast review queue)' : 'Standard community queue'}
                    control={
                      <Pill tone={currentPlan === 'free' ? 'neutral' : 'purple'}>
                        {currentPlan === 'team' ? 'Dedicated' : currentPlan === 'pro' ? 'Fast Queue' : 'Standard'}
                      </Pill>
                    }
                  />
                </SectionCard>

                <SectionCard
                  title="Global community leaderboard"
                  icon={Globe}
                  description="Display your technical debt lines cleared and rank on the community feed alongside other engineers."
                >
                  <div className="flex items-center justify-between gap-4 py-3 border-b border-cw-bdr">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={session?.user?.image || `https://api.dicebear.com/9.x/disco/svg?seed=${encodeURIComponent(session?.user?.name || 'you')}`}
                        alt="DiceBear Disco Avatar"
                        className="w-9 h-9 rounded-full border border-cw-bdr bg-cw-bg3 object-cover shrink-0"
                        onError={(e) => {
                          const fallback = `https://api.dicebear.com/9.x/disco/svg?seed=${encodeURIComponent(session?.user?.name || 'you')}`;
                          const img = e.target as HTMLImageElement;
                          if (img.src !== fallback) img.src = fallback;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-cw-txt leading-5 flex items-center gap-2">
                          Show on global leaderboard
                          <Pill tone={leaderboardOptIn ? 'green' : 'neutral'} dot>{leaderboardOptIn ? 'Opted in' : 'Hidden'}</Pill>
                        </div>
                        <div className="text-[11px] text-cw-txt3 leading-4 mt-0.5">Visible to every engineer on the global feed.</div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {updatingOptIn && <LoaderCircle size={12} className="animate-spin text-cw-txt3" />}
                      <Toggle on={leaderboardOptIn} onChange={handleToggleOptIn} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 -mx-4 sm:-mx-5 -mb-2 divide-x divide-cw-bdr">
                    <div className="px-4 sm:px-5 py-3">
                      <div className={MICRO_LABEL}>Global rank</div>
                      <div className="text-[20px] font-semibold tracking-tight tabular-nums text-cw-purple mt-1">#{leaderboardRank}</div>
                    </div>
                    <div className="px-4 sm:px-5 py-3">
                      <div className={MICRO_LABEL}>Lines cleared</div>
                      <div className="text-[20px] font-semibold tracking-tight tabular-nums text-cw-green mt-1">{leaderboardScore.toLocaleString()}</div>
                    </div>
                    <div className="px-4 sm:px-5 py-3 min-w-0 col-span-2 sm:col-span-1 border-t sm:border-t-0 border-cw-bdr">
                      <div className={MICRO_LABEL}>Avatar style</div>
                      <div className="text-[12.5px] font-medium text-cw-txt mt-2 flex items-center gap-1.5 truncate">
                        <Sparkles size={12} className="text-cw-purple shrink-0" /> DiceBear Disco
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Danger zone" icon={AlertTriangle} tone="danger">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-cw-txt leading-5">Delete account</div>
                      <div className="text-[11px] text-cw-txt3 leading-4 mt-0.5">This will permanently delete your account, workspace data, and all repository connections.</div>
                    </div>
                    <button type="button" onClick={() => setShowDeleteDialog(true)} className={`${BTN_DANGER} shrink-0`}>
                      <Trash2 size={12} /> Delete account
                    </button>
                  </div>
                </SectionCard>

                <DeleteAccountDialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                  onSuccess={async () => {
                    toast.success('Account deletion queued. You will be logged out.');
                    await signOut();
                    window.location.reload();
                  }}
                />
              </>
            )}

            {/* ── TAB 2: GENERAL ── */}
            {activeTab === 'general' && (
              <>
                <SectionCard
                  title="Auto-merge policy"
                  icon={GitMerge}
                  description="Per repository. Controls what happens after Guardian approves a Codeward auto-fix PR."
                >
                  <p className="text-[11px] text-cw-txt3 leading-4 py-3 border-b border-cw-bdr">
                    Manual: nothing merges without your click. Auto: if you don't respond within the window, the PR merges on your
                    standing authorization. High and critical-severity fixes always require a manual click.
                  </p>

                  {repos.length === 0 ? (
                    <EmptyState icon={Inbox} title="No connected repositories yet." hint="Connect a repository to configure its merge policy." />
                  ) : (
                    <>
                      <SetRow
                        label="Target repository"
                        control={
                          <div className="relative">
                            <select
                              aria-label="Target repository"
                              value={selectedRepo ?? ''}
                              onChange={(e) => setSelectedRepo(Number(e.target.value))}
                              className={`${SELECT} max-w-[240px] font-mono text-[11px]`}
                            >
                              {repos.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cw-txt3" />
                          </div>
                        }
                      />
                      <SetRow
                        label="Merge policy mode"
                        desc={mergeMode === 'auto' ? `Unactioned approved PRs merge after ${timeoutMinutes >= 60 ? `${Math.round(timeoutMinutes / 60)}h` : `${timeoutMinutes}m`}.` : 'Every merge requires your explicit click.'}
                        control={
                          <div className="relative">
                            <select
                              aria-label="Merge policy mode"
                              value={mergeMode === 'manual' ? 'manual' : String(timeoutMinutes)}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === 'manual') { setMergeMode('manual'); }
                                else { setMergeMode('auto'); setTimeoutMinutes(Number(v)); }
                                toast.success('Auto-merge policy saved');
                              }}
                              className={SELECT}
                            >
                              <option value="manual">Manual approval required</option>
                              <option value="120">Auto-merge after 2 hours</option>
                              <option value="720">Auto-merge after 12 hours</option>
                              <option value="1440">Auto-merge after 24 hours</option>
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cw-txt3" />
                          </div>
                        }
                      />
                    </>
                  )}
                </SectionCard>

                <SectionCard title="Autonomous engine & trust mode" icon={Zap} description="How far agents may go without asking">
                  <SetRow label="Auto-refactor low-risk files" desc="Utilities, helpers, test files. Never touches business logic without asking." control={<Toggle on={toggles.autoRefactor} onChange={() => toggleHandler('autoRefactor')} />} />
                  <SetRow label="Auto-deploy to ephemeral staging" desc="After sandbox passes all security gates, deploy to staging automatically." control={<Toggle on={toggles.autoDeploy} onChange={() => toggleHandler('autoDeploy')} />} />
                  <SetRow label="Auto rollback on test failure" desc="Automatically revert commits that break verification tests." control={<Toggle on={toggles.autoRollback} onChange={() => toggleHandler('autoRollback')} />} />
                  <SetRow label="Aggressive deduplication" desc="Deep-scan code for duplicate utility patterns across repos." control={<Toggle on={toggles.aggressiveDedup} onChange={() => toggleHandler('aggressiveDedup')} />} />
                  <SetRow label="PR mode (requires manual review)" desc="Open a pull request and review before committing directly." control={<Toggle on={toggles.prMode} onChange={() => toggleHandler('prMode')} />} />
                  <SetRow label="Dry run only" desc="Analyse and report without applying any changes." control={<Toggle on={toggles.dryRunOnly} onChange={() => toggleHandler('dryRunOnly')} />} />
                </SectionCard>

                <SectionCard title="Notifications & alerts" icon={Mail} description="Where Codeward reaches you">
                  <SetRow label="Slack integration alerts" desc="Receive instant notifications in your Slack channel on security findings." control={<Toggle on={toggles.slack} onChange={() => toggleHandler('slack')} />} />
                  <SetRow label="Email digest (weekly summary)" desc="Weekly summary report of debt eliminated and tests generated." control={<Toggle on={toggles.email} onChange={() => toggleHandler('email')} />} />
                  <SetRow label="Mobile push notifications" desc="Alerts on critical vulnerability fixes waiting for approval." control={<Toggle on={toggles.push} onChange={() => toggleHandler('push')} />} />
                  <SetRow label="Codeward AI proactive alerts" desc="Agent notifies you when it spots recurring architecture smells." control={<Toggle on={toggles.aiAlerts} onChange={() => toggleHandler('aiAlerts')} />} />
                </SectionCard>
              </>
            )}

            {/* ── TAB 3: BILLING & USAGE ── */}
            {activeTab === 'billing' && (
              <>
                <SectionCard
                  title="Current plan"
                  icon={CreditCard}
                  description="Your subscription, billing method, and monthly PR review quota"
                  flush
                  actions={
                    <button
                      type="button"
                      onClick={handleOpenBillingPortal}
                      disabled={openingPortal}
                      className={`${BTN_SECONDARY} text-[11px] h-7 px-2.5 gap-1.5`}
                      title="Open Polar customer portal to manage cards, subscriptions, and download invoices"
                    >
                      {openingPortal ? <LoaderCircle size={12} className="animate-spin text-cw-purple" /> : <CreditCard size={12} />}
                      <span>Manage Payment & Billing</span>
                      <ArrowUpRight size={11} className="text-cw-txt3" />
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-cw-bdr">
                    <div className="px-4 sm:px-5 py-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[20px] font-semibold tracking-tight text-cw-txt capitalize">{currentPlan}</span>
                        <Pill tone={currentPlan === 'free' ? 'neutral' : 'purple'} dot>Current plan</Pill>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[24px] leading-none font-semibold tracking-tight tabular-nums text-cw-txt">
                          {currentPlan === 'pro' ? '$19' : currentPlan === 'team' ? '$39' : '$0'}
                        </span>
                        <span className="text-[11px] text-cw-txt3">/ month</span>
                      </div>
                      <p className="text-[11px] text-cw-txt3 leading-4">
                        {currentPlan === 'free'
                          ? `${effectiveScanLimit} free PR scans included in your lifetime trial. Upgrade to Pro for unlimited autonomous code reviews.`
                          : `Autonomous PR reviews active on your ${currentPlan} plan. Managed securely via Polar.`}
                        {billingInfo?.currentPeriodEnd && (
                          <span className="block mt-1 font-medium text-cw-txt2">
                            Renews on {new Date(billingInfo.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="px-4 sm:px-5 py-4 flex flex-col gap-3 border-t md:border-t-0 border-cw-bdr">
                      <div className="flex items-center justify-between gap-3">
                        <span className={MICRO_LABEL}>PR scans quota</span>
                        <span className="font-mono text-[12px] font-semibold tabular-nums text-cw-txt">
                          {effectiveScansUsed} <span className="text-cw-txt3 font-normal">/ {effectiveScanLimit}</span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label="PR scans used"
                        aria-valuemin={0}
                        aria-valuemax={effectiveScanLimit}
                        aria-valuenow={effectiveScansUsed}
                        className="h-1.5 w-full rounded-full bg-cw-bg3 overflow-hidden"
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ${freeUsagePct >= 100 ? 'bg-cw-red' : freeUsagePct >= 80 ? 'bg-cw-amber' : 'bg-cw-purple'}`}
                          style={{ width: `${freeUsagePct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px] text-cw-txt3">
                        <span>{Math.max(0, effectiveScanLimit - effectiveScansUsed)} scans remaining</span>
                        {currentPlan === 'free' ? (
                          <button type="button" onClick={goProCheckout} className={BTN_LINK}>
                            Remove the limit <ArrowUpRight size={11} />
                          </button>
                        ) : (
                          <button type="button" onClick={handleOpenBillingPortal} className={BTN_LINK}>
                            Manage plan in Polar <ArrowUpRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <section aria-label="Subscription plans" className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3 px-0.5">
                    <div>
                      <h2 className="text-[13px] font-semibold text-cw-txt leading-5">Plans</h2>
                      <p className="text-[11px] text-cw-txt3 leading-4">Switch plans at any time. Billing is handled securely by Polar.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {PLANS.map((plan) => {
                      const isCurrent = plan.id === currentPlan;
                      return (
                        <article
                          key={plan.id}
                          aria-label={`${plan.name} plan`}
                          className={`relative bg-cw-bg2 rounded-lg border p-4 sm:p-5 flex flex-col gap-4 transition-colors ${
                            plan.recommended ? 'border-cw-purple/50 shadow-[0_0_0_1px_var(--cw-purple)_inset]' : 'border-cw-bdr hover:border-cw-txt3/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-[14px] font-semibold tracking-tight ${plan.recommended ? 'text-cw-purple' : 'text-cw-txt'}`}>{plan.name}</h3>
                                {isCurrent && <Pill tone="neutral">Current</Pill>}
                                {plan.recommended && !isCurrent && <Pill tone="purple">Recommended</Pill>}
                              </div>
                              <p className="text-[11px] text-cw-txt3 leading-4 mt-1">{plan.tagline}</p>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[26px] leading-none font-semibold tracking-tight tabular-nums text-cw-txt">{plan.price}</span>
                            <span className="text-[11px] text-cw-txt3">{plan.unit}</span>
                          </div>
                          <ul className="flex flex-col gap-2 border-t border-cw-bdr pt-4 text-[12px] text-cw-txt2 flex-1">
                            {plan.features.map((feature, i) => {
                              const emphasis = plan.id === 'free' && i === 0;
                              return (
                                <li key={feature} className={`flex items-start gap-2 leading-4 ${emphasis ? 'text-cw-txt font-medium' : ''}`}>
                                  <Check size={13} className={`shrink-0 mt-[1px] ${plan.recommended || emphasis ? 'text-cw-purple' : 'text-cw-green'}`} />
                                  <span>{feature}</span>
                                </li>
                              );
                            })}
                          </ul>
                          {plan.id === 'free' && (
                            <div className="rounded-md border border-cw-bdr bg-cw-bg/60 px-3 py-2 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={MICRO_LABEL}>Monthly limit</span>
                                <span className="font-mono font-semibold tabular-nums text-cw-txt">{effectiveScansUsed} / {effectiveScanLimit}</span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-cw-bg3 overflow-hidden">
                                <div className="h-full rounded-full bg-cw-purple" style={{ width: `${freeUsagePct}%` }} />
                              </div>
                            </div>
                          )}
                          {isCurrent ? (
                            <button type="button" onClick={handleOpenBillingPortal} className={`${BTN_SECONDARY} w-full justify-center`}>
                              <Check size={12} /> Manage Plan in Portal
                            </button>
                          ) : plan.id === 'pro' ? (
                            <button type="button" onClick={goProCheckout} className={`${BTN_PRIMARY} w-full justify-center`}>
                              Upgrade to Pro <ArrowUpRight size={12} />
                            </button>
                          ) : (
                            <button type="button" onClick={goTeamCheckout} className={`${BTN_SECONDARY} w-full justify-center`}>
                              Upgrade to Team <ArrowUpRight size={12} />
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <SectionCard
                  title="Invoices & receipts"
                  icon={FileText}
                  description="Payment history, tax receipts, and payment method updates via Polar"
                  flush
                  actions={
                    <button
                      type="button"
                      onClick={handleOpenBillingPortal}
                      disabled={openingPortal}
                      className={`${BTN_SECONDARY} text-[11px] h-7 px-2.5 gap-1.5`}
                    >
                      {openingPortal ? <LoaderCircle size={12} className="animate-spin text-cw-purple" /> : <CreditCard size={12} />}
                      <span>Manage Invoices & Cards</span>
                      <ArrowUpRight size={11} className="text-cw-txt3" />
                    </button>
                  }
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md border border-cw-bdr bg-cw-bg3/50 flex items-center justify-center text-cw-purple shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-cw-txt">Self-Serve Invoices & Billing Portal</div>
                        <p className="text-[11px] text-cw-txt3 leading-4">
                          Download official PDF receipts, update VAT/tax identifiers, replace cards, or manage active subscriptions directly via Polar.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenBillingPortal}
                      disabled={openingPortal}
                      className={`${BTN_PRIMARY} text-[11px] shrink-0`}
                    >
                      {openingPortal ? (
                        <>
                          <LoaderCircle size={12} className="animate-spin" />
                          <span>Opening Portal...</span>
                        </>
                      ) : (
                        <>
                          <span>Open Customer Portal</span>
                          <ArrowUpRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── TAB 4: WORKSPACE & TEAM ── */}
            {activeTab === 'team' && (
              <>
                <SectionCard
                  title="Workspace members"
                  icon={Users}
                  description="People with access to this workspace, invite lifecycle, and daily active sessions."
                  flush
                  actions={
                    isAdminOrOwner ? (
                      <button type="button" onClick={() => setOpenInviteDrawer(true)} className={BTN_PRIMARY}>
                        <Plus size={13} /> Invite member
                      </button>
                    ) : undefined
                  }
                >
                  {teamMembers.length === 0 ? (
                    <EmptyState icon={Users} title="No members loaded yet." hint="Members and pending invites for the active workspace appear here." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/40 border-b border-cw-bdr">
                            <th scope="col" className={`${TH} min-w-[220px]`}>Member</th>
                            <th scope="col" className={`${TH} w-[80px]`}>Role</th>
                            <th scope="col" className={`${TH} w-[90px]`}>Status</th>
                            <th scope="col" className={`${TH} w-[110px] hidden xl:table-cell whitespace-nowrap`}>When Invited</th>
                            <th scope="col" className={`${TH} w-[110px] hidden lg:table-cell whitespace-nowrap`}>When Joined</th>
                            <th scope="col" className={`${TH} w-[130px] whitespace-nowrap`}>Daily Logins</th>
                            {isAdminOrOwner && <th scope="col" className={`${TH} w-[100px] text-right whitespace-nowrap`}><span className="sr-only">Actions</span></th>}
                          </tr>
                        </thead>
                        <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                          {teamMembers.map((m) => {
                            const isOnline = onlineUserIds.includes(m.userId || m.id);
                            const displayStatus = isOnline ? 'Online' : (m.status === 'Invited' ? 'Invited' : 'Offline');
                            const tone: Tone = isOnline ? 'green' : (m.status === 'Invited' ? 'amber' : 'neutral');
                            const isSelf = session?.user?.id === (m.userId || m.id);

                            return (
                              <tr key={m.id} className="hover:bg-cw-bg3/40 transition-colors">
                                <td className={TD}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar src={m.image} fallback={m.name.charAt(0)} size={32} />
                                    <div className="min-w-0">
                                      <div className="font-medium text-cw-txt truncate flex items-center gap-1.5">
                                        <span className="truncate">{m.name}</span>
                                        {m.isOwner && (
                                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-cw-purple/15 text-cw-purple font-mono font-medium shrink-0">Owner</span>
                                        )}
                                        {isSelf && (
                                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-cw-bg3 text-cw-txt3 font-mono shrink-0">You</span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-cw-txt3 font-mono truncate">{m.email}</div>
                                      {/* Responsive compact join and login info on mobile/tablet */}
                                      <div className="lg:hidden flex flex-wrap items-center gap-1.5 mt-1 text-[10.5px] text-cw-txt3 font-mono">
                                        <span>{m.status === 'Invited' ? 'Pending invite' : `Joined ${m.joinedAt}`}</span>
                                        {m.status !== 'Invited' && (
                                          <>
                                            <span className="text-cw-txt3/40">•</span>
                                            <span className="text-cw-purple/90 font-medium">{(m.loginsToday ?? 0)} today</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className={TD}><Pill tone="neutral">{m.role}</Pill></td>
                                <td className={TD}><Pill tone={tone} dot pulse={isOnline}>{displayStatus}</Pill></td>
                                <td className={`${TD} hidden xl:table-cell text-cw-txt3 text-[11px] whitespace-nowrap tabular-nums`}>
                                  {m.invitedAt}
                                </td>
                                <td className={`${TD} hidden lg:table-cell text-cw-txt3 text-[11px] whitespace-nowrap tabular-nums`}>
                                  {m.status === 'Invited' ? (
                                    <span className="text-cw-amber italic">Pending invite</span>
                                  ) : (
                                    m.joinedAt
                                  )}
                                </td>
                                <td className={`${TD} whitespace-nowrap`}>
                                  {m.status === 'Invited' ? (
                                    <span className="text-cw-txt3 font-mono text-[11px]">—</span>
                                  ) : (m.loginsToday ?? 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap bg-cw-purple/10 text-cw-purple border border-cw-purple/20 shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cw-purple shrink-0 animate-pulse" />
                                      <span className="tabular-nums font-semibold text-cw-txt">{m.loginsToday}</span>
                                      <span className="text-[10px] font-sans uppercase font-medium text-cw-purple/75 tracking-wider">today</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap bg-cw-bg3/50 text-cw-txt3 border border-cw-bdr/60 shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cw-txt3/40 shrink-0" />
                                      <span className="tabular-nums font-semibold text-cw-txt3">0</span>
                                      <span className="text-[10px] font-sans uppercase font-medium text-cw-txt3/60 tracking-wider">today</span>
                                    </span>
                                  )}
                                </td>
                                {isAdminOrOwner && (
                                  <td className={`${TD} text-right whitespace-nowrap`}>
                                    {m.status === 'Invited' ? (
                                      <button
                                        type="button"
                                        onClick={() => setInviteToRevoke(m)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-cw-amber hover:text-white bg-cw-amber/10 hover:bg-cw-amber border border-cw-amber/30 rounded-md transition-colors cursor-pointer shrink-0"
                                        title="Revoke invitation"
                                      >
                                        <Trash2 size={11} />
                                        <span>Revoke</span>
                                      </button>
                                    ) : !m.isOwner && !isSelf ? (
                                      <button
                                        type="button"
                                        onClick={() => setMemberToRemove(m)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-cw-red hover:text-white bg-cw-red/10 hover:bg-cw-red border border-cw-red/30 rounded-md transition-colors cursor-pointer shrink-0"
                                        title="Remove member from workspace"
                                      >
                                        <Trash2 size={11} />
                                        <span>Remove</span>
                                      </button>
                                    ) : null}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                {isAdminOrOwner && (
                  <SectionCard
                    title="Audit & activity log"
                    icon={History}
                    description="Chronological log of administrative actions, invitations, joinings, removals, and daily logins."
                    flush
                    actions={
                      <button
                        type="button"
                        onClick={() => setAuditLogsCollapsed(!auditLogsCollapsed)}
                        className={`${BTN_SECONDARY} text-[11px] h-7 px-2.5 gap-1.5`}
                        title={auditLogsCollapsed ? 'Expand audit log' : 'Collapse audit log'}
                      >
                        <span>{auditLogsCollapsed ? 'Expand Log' : 'Collapse Log'}</span>
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-200 ${auditLogsCollapsed ? '-rotate-90' : 'rotate-0'}`}
                        />
                      </button>
                    }
                  >
                    {auditLogs.length === 0 ? (
                      <EmptyState icon={History} title="No audit events recorded yet." hint="Administrative actions in this workspace will be logged here." />
                    ) : auditLogsCollapsed ? (
                      <div className="px-4 sm:px-5 py-3 text-[11.5px] text-cw-txt3 flex items-center justify-between bg-cw-bg/20">
                        <span>Audit log entries collapsed ({auditLogs.length} events recorded).</span>
                        <button
                          type="button"
                          onClick={() => setAuditLogsCollapsed(false)}
                          className="text-cw-purple hover:underline font-medium text-[11px] cursor-pointer"
                        >
                          Click to expand
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left border-collapse">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/40">
                              <th scope="col" className={TH}>Timestamp</th>
                              <th scope="col" className={TH}>Actor</th>
                              <th scope="col" className={TH}>Action</th>
                              <th scope="col" className={`${TH} text-right`}>IP address</th>
                            </tr>
                          </thead>
                          <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                            {auditLogs.map((log) => {
                              const isRemoval = log.action.toLowerCase().includes('removed');
                              const isRevokeOrExpiry = log.action.toLowerCase().includes('expired') || log.action.toLowerCase().includes('revoked');
                              const dotClass = isRemoval 
                                ? TONE_DOT.red 
                                : isRevokeOrExpiry 
                                  ? TONE_DOT.amber 
                                  : TONE_DOT.green;

                              return (
                                <tr key={log.id} className="hover:bg-cw-bg3/40 transition-colors">
                                  <td className={`${TD} font-mono text-[11px] text-cw-txt3 whitespace-nowrap`}>{log.timestamp}</td>
                                  <td className={`${TD} font-medium text-cw-txt whitespace-nowrap`}>{log.user}</td>
                                  <td className={`${TD} text-cw-txt2`}>
                                    <span className="inline-flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                                      {log.action}
                                    </span>
                                  </td>
                                  <td className={`${TD} text-right font-mono text-[11px] text-cw-txt3 whitespace-nowrap`}>{log.ip}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {dailyLogins.length > 0 && (
                      <div className="border-t border-cw-bdr">
                        <button
                          type="button"
                          onClick={() => setDailyLoginsCollapsed((prev) => !prev)}
                          className="w-full px-4 sm:px-5 py-3 bg-cw-bg/30 hover:bg-cw-bg3/30 border-b border-cw-bdr flex items-center justify-between transition-colors text-left group cursor-pointer"
                          aria-expanded={!dailyLoginsCollapsed}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Activity size={14} className="text-cw-purple shrink-0" />
                            <span className="text-[12.5px] font-semibold text-cw-txt group-hover:text-cw-purple transition-colors">
                              Daily Login & Activity History
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cw-purple/10 text-cw-purple border border-cw-purple/20 shrink-0">
                              {dailyLogins.length} {dailyLogins.length === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 text-cw-txt3 group-hover:text-cw-txt transition-colors">
                            <span className="hidden sm:inline text-[11px] font-mono text-cw-txt3">
                              {dailyLoginsCollapsed ? 'Click to expand' : 'Times logged in each day'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cw-txt2 bg-cw-bg2 border border-cw-bdr px-2 py-0.5 rounded-md group-hover:border-cw-purple/40">
                              <span>{dailyLoginsCollapsed ? 'Expand' : 'Collapse'}</span>
                              <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${dailyLoginsCollapsed ? '-rotate-90' : 'rotate-0'}`}
                              />
                            </span>
                          </div>
                        </button>
                        
                        {!dailyLoginsCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left border-collapse">
                              <thead>
                                <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/20">
                                  <th scope="col" className={TH}>Date</th>
                                  <th scope="col" className={TH}>Member</th>
                                  <th scope="col" className={`${TH} whitespace-nowrap`}>Logins Recorded</th>
                                  <th scope="col" className={`${TH} text-right whitespace-nowrap`}>Last Activity</th>
                                </tr>
                              </thead>
                              <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                                {dailyLogins.map((dl) => (
                                  <tr key={dl.id} className="hover:bg-cw-bg3/40 transition-colors">
                                    <td className={`${TD} font-mono text-[11px] text-cw-txt2 whitespace-nowrap`}>{dl.loginDate}</td>
                                    <td className={TD}>
                                      <div className="font-medium text-cw-txt">{dl.userName || 'Member'}</div>
                                      <div className="text-[11px] text-cw-txt3 font-mono">{dl.userEmail}</div>
                                    </td>
                                    <td className={`${TD} whitespace-nowrap`}>
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium whitespace-nowrap bg-cw-green/10 text-cw-green border border-cw-green/25 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cw-green shrink-0 animate-pulse" />
                                        <span className="tabular-nums font-semibold">{dl.loginCount}</span>
                                        <span className="text-cw-green/80 text-[10px] font-sans uppercase tracking-wider">{dl.loginCount === 1 ? 'login' : 'logins'}</span>
                                      </span>
                                    </td>
                                    <td className={`${TD} text-right font-mono text-[11px] text-cw-txt3 whitespace-nowrap`}>
                                      {new Date(dl.lastLoginAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                )}
              </>
            )}

            {/* ── TAB 5: DEVELOPERS & API ── */}
            {activeTab === 'developers' && (
              <>
                <SectionCard
                  title="API keys"
                  icon={KeyRound}
                  description="Authenticate CLI scripts, CI/CD pipelines, and external automated tools."
                  flush
                  actions={
                    <button type="button" onClick={() => setShowKeyModal(true)} className={BTN_PRIMARY}>
                      <Plus size={13} /> Generate new key
                    </button>
                  }
                >
                  {apiKeys.length === 0 ? (
                    <EmptyState icon={KeyRound} title="No API keys yet." hint="Generate a key to authenticate the CLI or a CI pipeline." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/40">
                            <th scope="col" className={TH}>Key name</th>
                            <th scope="col" className={TH}>Token prefix</th>
                            <th scope="col" className={TH}>Created</th>
                            <th scope="col" className={TH}>Last used</th>
                            <th scope="col" className={`${TH} text-right`}><span className="sr-only">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                          {apiKeys.map((key) => (
                            <tr key={key.id} className="hover:bg-cw-bg3/40 transition-colors">
                              <td className={`${TD} font-medium text-cw-txt`}>{key.name}</td>
                              <td className={`${TD} font-mono text-[11px] text-cw-purple whitespace-nowrap`}>{key.prefix}</td>
                              <td className={`${TD} text-cw-txt3 text-[11px] whitespace-nowrap tabular-nums`}>{key.createdAt}</td>
                              <td className={`${TD} text-cw-txt3 text-[11px] whitespace-nowrap`}>{key.lastUsed}</td>
                              <td className={`${TD} text-right`}>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeApiKey(key.id)}
                                  className={`${BTN_GHOST_SM} hover:text-cw-red hover:border-cw-red/40`}
                                  title="Revoke key"
                                >
                                  <Trash2 size={12} /> Revoke
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Incoming webhook"
                  icon={Webhook}
                  description="Add this endpoint URL in your GitHub or GitLab repository settings to trigger Codeward scans on push events."
                >
                  <div className="py-3 border-b border-cw-bdr">
                    <div className={`${MICRO_LABEL} mb-1.5`}>Endpoint URL</div>
                    <div className="flex gap-2">
                      <code className="flex-1 min-w-0 px-2.5 py-1.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg text-cw-purple font-mono truncate">
                        {webhookUrl}
                      </code>
                      <button type="button" onClick={() => copyToClipboard(webhookUrl, setCopiedWebhook)} className={`${BTN_SECONDARY} shrink-0`}>
                        {copiedWebhook ? <Check size={12} className="text-cw-green" /> : <Copy size={12} />}
                        {copiedWebhook ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="py-3">
                    <div className={`${MICRO_LABEL} mb-1.5`}>HMAC webhook secret</div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        aria-label="HMAC webhook secret"
                        value="••••••••••••••••••••••••••••"
                        readOnly
                        className={`${INPUT} flex-1 min-w-0 font-mono`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRotatedSecret(true);
                          toast.success('HMAC Secret token rotated');
                          setTimeout(() => setRotatedSecret(false), 2000);
                        }}
                        className={`${BTN_SECONDARY} shrink-0`}
                      >
                        <RefreshCw size={12} className={rotatedSecret ? 'animate-spin text-cw-purple' : ''} /> Rotate secret
                      </button>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Outgoing webhooks"
                  icon={ExternalLink}
                  description="Send live JSON event payloads from Codeward to your internal APIs or Slack endpoints."
                  flush
                  actions={
                    <button type="button" onClick={() => setShowWebhookModal(true)} className={BTN_PRIMARY}>
                      <Plus size={13} /> Add destination
                    </button>
                  }
                >
                  {webhooks.length === 0 ? (
                    <EmptyState icon={ExternalLink} title="No outgoing webhooks configured." hint="Add a destination to receive event payloads." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.08em] text-cw-txt3 bg-cw-bg/40">
                            <th scope="col" className={TH}>Endpoint URL</th>
                            <th scope="col" className={TH}>Events</th>
                            <th scope="col" className={TH}>Status</th>
                            <th scope="col" className={`${TH} text-right`}><span className="sr-only">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody className="text-[12px] text-cw-txt divide-y divide-cw-bdr">
                          {webhooks.map((wh) => (
                            <tr key={wh.id} className="hover:bg-cw-bg3/40 transition-colors">
                              <td className={`${TD} font-mono text-[11px] text-cw-txt max-w-[280px]`}>
                                <span className="block truncate">{wh.url}</span>
                              </td>
                              <td className={TD}>
                                <div className="flex flex-wrap gap-1">
                                  {wh.events.map((ev) => <Pill key={ev} tone="neutral" mono>{ev}</Pill>)}
                                </div>
                              </td>
                              <td className={TD}>
                                <Pill tone={wh.status === 'failing' ? 'red' : 'green'} dot>{wh.status === 'failing' ? 'Failing' : 'Active'}</Pill>
                              </td>
                              <td className={`${TD} text-right whitespace-nowrap`}>
                                <div className="inline-flex items-center gap-2">
                                  <button type="button" onClick={() => toast.success('Test payload sent to ' + wh.url)} className={BTN_GHOST_SM}>
                                    <Send size={11} /> Test
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWebhook(wh.id)}
                                    className={`${BTN_GHOST_SM} hover:text-cw-red hover:border-cw-red/40`}
                                    title="Remove destination"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        </div>

        {/* Modal: Generate API Key */}
        {showKeyModal && (
          <Modal
            title="Generate new API key"
            description="Give your API key a descriptive name to identify its usage."
            onClose={() => {
              setShowKeyModal(false);
              setCreatedKeySecret(null);
            }}
            footer={
              !createdKeySecret ? (
                <>
                  <button type="button" onClick={() => setShowKeyModal(false)} className={BTN_SECONDARY}>Cancel</button>
                  <button type="button" onClick={handleCreateApiKey} className={BTN_PRIMARY}>Generate key</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyModal(false);
                    setCreatedKeySecret(null);
                  }}
                  className={BTN_PRIMARY}
                >
                  Done
                </button>
              )
            }
          >
            {!createdKeySecret ? (
              <>
                <label htmlFor="settings-new-key-name" className={`${MICRO_LABEL} block mb-1.5`}>Key name</label>
                <input
                  id="settings-new-key-name"
                  type="text"
                  autoFocus
                  placeholder="e.g. Production CI/CD Runner"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateApiKey(); }}
                  className={`${INPUT} w-full`}
                />
              </>
            ) : (
              <>
                <div className="rounded-md border border-cw-amber/30 bg-cw-amber/10 px-3 py-2 mb-4 text-[11.5px] text-cw-amber flex items-start gap-2 leading-4">
                  <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
                  <span>Save this API key secret now. You will not be able to see it again.</span>
                </div>
                <label htmlFor="settings-created-key" className={`${MICRO_LABEL} block mb-1.5`}>API key secret</label>
                <div className="flex gap-2">
                  <input
                    id="settings-created-key"
                    type="text"
                    readOnly
                    value={createdKeySecret}
                    className={`${INPUT} w-full font-mono text-[11px] text-cw-purple`}
                  />
                  <button type="button" onClick={() => copyToClipboard(createdKeySecret, setCopiedKeySecret)} className={`${BTN_PRIMARY} shrink-0`}>
                    {copiedKeySecret ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKeySecret ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}

        {/* Modal: Add Webhook */}
        {showWebhookModal && (
          <Modal
            title="Add webhook destination"
            description="Enter an HTTP(S) endpoint URL to receive real-time Codeward event payloads."
            onClose={() => setShowWebhookModal(false)}
            footer={
              <>
                <button type="button" onClick={() => setShowWebhookModal(false)} className={BTN_SECONDARY}>Cancel</button>
                <button type="button" onClick={handleCreateWebhook} className={BTN_PRIMARY}>Add webhook</button>
              </>
            }
          >
            <label htmlFor="settings-new-webhook-url" className={`${MICRO_LABEL} block mb-1.5`}>Payload endpoint URL</label>
            <input
              id="settings-new-webhook-url"
              type="url"
              autoFocus
              placeholder="https://api.yourcompany.com/webhooks/codeward"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWebhook(); }}
              className={`${INPUT} w-full font-mono text-[11px]`}
            />
          </Modal>
        )}

        {/* Modal: Remove Member ("Throw away") */}
        {memberToRemove && (
          <Modal
            title="Remove workspace member"
            description="Revoke workspace access and send formal notification."
            onClose={() => setMemberToRemove(null)}
            footer={
              <>
                <button type="button" onClick={() => setMemberToRemove(null)} className={BTN_SECONDARY}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removingMember}
                  onClick={handleRemoveMember}
                  className={BTN_DANGER}
                >
                  {removingMember ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  <span>{removingMember ? 'Removing & Notifying...' : 'Remove Member'}</span>
                </button>
              </>
            }
          >
            <div className="text-[12px] text-cw-txt2 space-y-3">
              <p>
                Are you sure you want to remove <strong className="text-cw-txt">{memberToRemove.name}</strong> (<span className="font-mono text-cw-txt3">{memberToRemove.email}</span>) from <strong>{activeWorkspace?.name}</strong>?
              </p>
              <div className="p-3 rounded-md bg-cw-bg border border-cw-bdr text-[11px] text-cw-txt3 leading-relaxed">
                📧 An automated email notification will be dispatched informing them that their access as a <span className="font-semibold text-cw-txt capitalize">{memberToRemove.role}</span> has been terminated. All repository permissions and audit logs for this workspace will be immediately revoked.
              </div>
            </div>
          </Modal>
        )}

        {/* Modal: Revoke Invitation */}
        {inviteToRevoke && (
          <Modal
            title="Revoke workspace invitation"
            description="Invalidate pending magic invitation link."
            onClose={() => setInviteToRevoke(null)}
            footer={
              <>
                <button type="button" onClick={() => setInviteToRevoke(null)} className={BTN_SECONDARY}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={revokingInvite}
                  onClick={handleRevokeInvite}
                  className={BTN_DANGER}
                >
                  {revokingInvite ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  <span>{revokingInvite ? 'Revoking...' : 'Revoke Invitation'}</span>
                </button>
              </>
            }
          >
            <p className="text-[12px] text-cw-txt2 leading-relaxed">
              Are you sure you want to revoke the pending invitation for <strong className="text-cw-txt">{inviteToRevoke.email}</strong>? The 7-day magic link sent to them will be immediately invalidated and cannot be used to join.
            </p>
          </Modal>
        )}

      </div>
    </div>
  );
}
