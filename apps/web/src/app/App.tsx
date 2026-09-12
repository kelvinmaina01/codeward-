import { useState, useEffect, useRef, lazy, Suspense, startTransition } from 'react';
import { useRoutes, Navigate, useNavigate, useLocation, useParams, NavLink } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import {
  LayoutDashboard, Radio, GitCompare, ShieldAlert, BarChart3,
  Bot, Monitor, Clock, GitFork, Award, Settings as SettingsIcon,
  Sun, Moon, Circle, Menu, LogOut, LucideIcon, ChevronDown, Plus, Blocks, Bell, Globe, X,
  LayoutGrid, TerminalSquare, Sparkles, FileText, BadgeCheck, GitPullRequest
} from 'lucide-react';
import { Theme, Screen } from './components/types';

// Auth Pages (eagerly loaded — needed on first paint)
import { AuthPage } from './pages/auth/AuthPage';
import { ConnectRepo } from './pages/auth/ConnectRepo';
import { InviteAcceptPage } from './pages/auth/InviteAcceptPage';

// Marketing Pages (eagerly loaded — landing page needs instant paint)
import CodewardHero from './pages/marketing/LandingHero';
import PricingPage from './pages/marketing/PricingPage';
import { BlogsPage } from './pages/marketing/BlogsPage';
import { SingleBlogPage } from './pages/marketing/SingleBlogPage';
import { ComparePage } from './pages/marketing/ComparePage';
import { BookDemo } from './pages/marketing/BookDemo';

// Dashboard Pages — lazy loaded (users are auth-gated; saves ~40% initial bundle)
const Dashboard     = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const LiveFeed      = lazy(() => import('./pages/dashboard/LiveFeed').then(m => ({ default: m.LiveFeed })));
const Security      = lazy(() => import('./pages/dashboard/Security').then(m => ({ default: m.Security })));
const DebtReport    = lazy(() => import('./pages/dashboard/DebtReport').then(m => ({ default: m.DebtReport })));
const AIAgent       = lazy(() => import('./pages/dashboard/AIAgent').then(m => ({ default: m.AIAgent })));
const Staging       = lazy(() => import('./pages/dashboard/Staging').then(m => ({ default: m.Staging })));
const DeployHistory = lazy(() => import('./pages/dashboard/DeployHistory').then(m => ({ default: m.DeployHistory })));
const Repositories  = lazy(() => import('./pages/dashboard/Repositories').then(m => ({ default: m.Repositories })));
const Certificate   = lazy(() => import('./pages/dashboard/Certificate').then(m => ({ default: m.Certificate })));
const Settings      = lazy(() => import('./pages/dashboard/Settings').then(m => ({ default: m.Settings })));
const Integrations  = lazy(() => import('./pages/dashboard/Integrations').then(m => ({ default: m.Integrations })));
const Alerts        = lazy(() => import('./pages/dashboard/Alerts').then(m => ({ default: m.Alerts })));
const IssuesAndPRs  = lazy(() => import('./pages/dashboard/IssuesAndPRs').then(m => ({ default: m.IssuesAndPRs })));
const RunDetail     = lazy(() => import('./pages/dashboard/RunDetail').then(m => ({ default: m.RunDetail })));
const CommitHistory = lazy(() => import('./pages/dashboard/CommitHistory').then(m => ({ default: m.CommitHistory })));

// Shared Components & Drawers
import { GordonIcon } from './components/shared/GordonIcon';
import { GitHubStarButton } from './components/shared/GitHubStarButton';
const DiffViewer          = lazy(() => import('./components/shared/DiffViewer').then(m => ({ default: m.DiffViewer })));
import { LegalPage } from './components/legal/LegalPage';
import { WorkspaceSwitcher } from './components/modals/WorkspaceSwitcher';
import { TeamDrawer } from './components/drawers/TeamDrawer';
import { InviteDrawer } from './components/drawers/InviteDrawer';
import { HelpDrawer } from './components/drawers/HelpDrawer';
import { UserProfilePopover } from './components/modals/UserProfilePopover';
import { NotificationsPopover } from './components/modals/NotificationsPopover';
import { CookieConsent } from './components/modals/CookieConsent';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Admin Portal Pages — lazy loaded
const AdminLayout      = lazy(() => import('./admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminOverview    = lazy(() => import('./admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminFeed        = lazy(() => import('./admin/AdminFeed').then(m => ({ default: m.AdminFeed })));
const AdminRuns        = lazy(() => import('./admin/AdminRuns').then(m => ({ default: m.AdminRuns })));
const AdminRepos       = lazy(() => import('./admin/AdminRepos').then(m => ({ default: m.AdminRepos })));
const AdminSecurity    = lazy(() => import('./admin/AdminSecurity').then(m => ({ default: m.AdminSecurity })));
const AdminBloat       = lazy(() => import('./admin/AdminBloat').then(m => ({ default: m.AdminBloat })));
const AdminBroken      = lazy(() => import('./admin/AdminBroken').then(m => ({ default: m.AdminBroken })));
const AdminArchitecture = lazy(() => import('./admin/AdminArchitecture').then(m => ({ default: m.AdminArchitecture })));
const AdminCompliance  = lazy(() => import('./admin/AdminCompliance').then(m => ({ default: m.AdminCompliance })));
const AdminAgents      = lazy(() => import('./admin/AdminAgents').then(m => ({ default: m.AdminAgents })));
const AdminRevenue     = lazy(() => import('./admin/AdminRevenue').then(m => ({ default: m.AdminRevenue })));
const AdminCustomers   = lazy(() => import('./admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminGrowth      = lazy(() => import('./admin/AdminGrowth').then(m => ({ default: m.AdminGrowth })));
const AdminBilling     = lazy(() => import('./admin/AdminBilling').then(m => ({ default: m.AdminBilling })));
const AdminSandbox     = lazy(() => import('./admin/AdminSandbox').then(m => ({ default: m.AdminSandbox })));
const AdminGitHubApp   = lazy(() => import('./admin/AdminGitHubApp').then(m => ({ default: m.AdminGitHubApp })));
const AdminAlerts      = lazy(() => import('./admin/AdminAlerts').then(m => ({ default: m.AdminAlerts })));
const AdminSettings    = lazy(() => import('./admin/AdminSettings').then(m => ({ default: m.AdminSettings })));

import { useSession, signOut } from '../lib/auth';
import { Toaster } from 'sonner';
import { API_URL } from '../lib/api';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { blogs } from './data/blogs';
import { comparisons } from './data/comparisons';

/**
 * Smart page-level loader with escalating patience messages.
 * Shows a spinner immediately, then progressively more reassuring
 * copy if the module takes longer than expected.
 */
function PageLoader({ inline = false }: { inline?: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // After 1.5s: "Almost there..."
    const t1 = setTimeout(() => setPhase(1), 1500);
    // After 4s: "Hang tight, fetching data..."
    const t2 = setTimeout(() => setPhase(2), 4000);
    // After 8s: "Taking a bit longer than usual..."
    const t3 = setTimeout(() => setPhase(3), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const messages = [
    '',
    'Almost there\u2026',
    'Hang tight, fetching data\u2026',
    'Taking a bit longer than usual\u2026',
  ];

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-cw-txt3">
        <span className="w-5 h-5 border-2 border-cw-purple border-t-transparent rounded-full animate-spin" />
        <span
          key={phase}
          className="text-[12px] font-medium animate-in fade-in duration-500 text-center"
        >
          {messages[phase]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 h-full min-h-[300px] bg-cw-bg">
      <span className="w-7 h-7 border-[3px] border-cw-purple border-t-transparent rounded-full animate-spin" />
      <span
        key={phase}
        className="text-[13px] font-medium text-cw-txt3 animate-in fade-in duration-500"
      >
        {messages[phase]}
      </span>
    </div>
  );
}


function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-cw-txt">{title}</h2>
        <p className="text-cw-txt2">I am actively building out this page right now!</p>
      </div>
    </div>
  );
}

const themeOrder: Theme[] = ['dark', 'cream', 'white'];

const themeIcons: Record<Theme, React.ReactNode> = {
  cream: <Circle size={14} fill="#c5a882" color="#c5a882" />,
  dark: <Moon size={14} />,
  white: <Sun size={14} />,
};

interface NavItem { id: Screen; label: string; dot: 'g'|'a'|'r'|'b'|'p'|''; badge?: number; beta?: boolean; icon: LucideIcon; path: string; }
interface NavGroup { group: string; items: NavItem[] }

const nav: NavGroup[] = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', dot: 'g', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'alerts', label: 'Alerts', dot: 'r', badge: 7, icon: Bell, path: '/dashboard/alerts' },
    { id: 'livefeed', label: 'Live feed', dot: 'a', badge: 1, icon: Radio, path: '/dashboard/livefeed' },
  ]},
  { group: 'Analysis', items: [
    { id: 'diff', label: 'Diff viewer', dot: 'b', icon: GitCompare, path: '/dashboard/diff' },
    // { id: 'commits', label: 'Commit History', dot: 'p', icon: GitFork, path: '/dashboard/commits' }, // Hidden: PR-only policy
    { id: 'issuesprs', label: 'Issues & PRs (Codeward agent)', dot: 'p', icon: GitPullRequest, path: '/dashboard/issues-prs' },
    { id: 'security', label: 'Security', dot: 'r', badge: 3, icon: ShieldAlert, path: '/dashboard/security' },
    { id: 'debt', label: 'Debt report', dot: 'a', icon: BarChart3, path: '/dashboard/debt' },
  ]},
  { group: 'AI Agent', items: [
    { id: 'agent', label: 'Gordon', dot: 'p', beta: true, icon: GordonIcon as unknown as LucideIcon, path: '/dashboard/agent' },
  ]},
  { group: 'Deploy', items: [
    { id: 'staging', label: 'Staging', dot: 'a', icon: Monitor, path: '/dashboard/staging' },
    { id: 'history', label: 'Runs', dot: '', icon: Clock, path: '/dashboard/history' },
  ]},
  { group: 'Health', items: [
    { id: 'repos', label: 'Repositories', dot: '', icon: GitFork, path: '/dashboard/repos' },
    { id: 'cert', label: 'Certificate', dot: 'g', icon: Award, path: '/dashboard/cert' },
    { id: 'settings', label: 'Settings', dot: '', icon: SettingsIcon, path: '/dashboard/settings' },
    // { id: 'integrations', label: 'Integrations', dot: 'b', icon: Blocks, path: '/dashboard/integrations' },
  ]},
];

const topbarConfig: Partial<Record<string, { title: string; sub: string }>> = {
  dashboard: { title: 'Dashboard', sub: 'Overview of connected repositories' },
  livefeed:  { title: 'Live run feed', sub: 'Real-time analysis runs' },
  diff:      { title: 'Diff viewer', sub: 'Inspect agent-modified files' },
  security:  { title: 'Security panel', sub: 'Vulnerabilities and security health' },
  debt:      { title: 'Debt report', sub: 'Codebase health and technical debt' },
  agent:     { title: 'Gordon', sub: 'Your principal-engineer agent — answers from real run data, not guesses' },
  staging:   { title: 'Staging', sub: 'Deployments awaiting approval' },
  history:   { title: 'Runs', sub: 'Autonomous interventions and agent run history' },
  repos:     { title: 'Repositories', sub: 'Connected GitHub repositories' },
  cert:      { title: 'Health certificate', sub: 'Shareable health status' },
  settings:  { title: 'Settings', sub: 'Manage your Codeward preferences' },
  integrations: { title: 'Integrations', sub: 'Connect external tools and MCP servers' },
  alerts:    { title: 'Alerts center', sub: 'Active incidents & notifications' },
  issuesprs: { title: 'Issues & PRs (Codeward Agent)', sub: 'Real escalated GitHub issues and pull requests opened by Codeward agents' },
  commits:   { title: 'Commit History', sub: 'Agent activity per commit' },
};

// Map URL paths to screen IDs
const pathToScreen = (pathname: string): string => {
  if (pathname.match(/^\/dashboard\/repos\/\d+\/commits/)) return 'commits';
  if (pathname === '/dashboard/commits') return 'commits';
  const exact: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/dashboard/alerts': 'alerts',
    '/dashboard/livefeed': 'livefeed',
    '/dashboard/diff': 'diff',
    '/dashboard/issues-prs': 'issuesprs',
    '/dashboard/security': 'security',
    '/dashboard/debt': 'debt',
    '/dashboard/agent': 'agent',
    '/dashboard/staging': 'staging',
    '/dashboard/history': 'history',
    '/dashboard/runs': 'history',
    '/dashboard/repos': 'repos',
    '/dashboard/cert': 'cert',
    '/dashboard/settings': 'settings',
    '/dashboard/integrations': 'integrations',
  };
  return exact[pathname] ?? 'dashboard';
};

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <div className="h-screen bg-cw-bg flex items-center justify-center text-cw-txt2 text-sm">Loading…</div>;
  if (!session?.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireUnauth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <div className="h-screen bg-cw-bg flex items-center justify-center text-cw-txt2 text-sm">Loading…</div>;
  if (session?.user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
function DashboardLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [themeIdx, setThemeIdx] = useState(0);
  const [runDetailTarget, setRunDetailTarget] = useState<{ repoId: number; runId: number } | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [globalOrgs, setGlobalOrgs] = useState<string[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');
  const [isGlobalFeedOpen, setIsGlobalFeedOpen] = useState(false);
  const [liveFeedView, setLiveFeedView] = useState<'stream' | 'canvas'>('canvas');
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Global Feed Leaderboard State
  const [leaderboardList, setLeaderboardList] = useState<Array<{
    id: string;
    user: string;
    name: string;
    org: string;
    score: number;
    rank: number;
    avatar: string;
    isCurrentUser: boolean;
  }>>([]);
  const [currentUserLeaderboard, setCurrentUserLeaderboard] = useState<{
    id: string | null;
    user: string;
    name: string;
    optedIn: boolean;
    rank: number;
    score: number;
    avatar: string;
  } | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [expandedLeaderboardId, setExpandedLeaderboardId] = useState<string | null>(null);
  const [trajectories, setTrajectories] = useState<Record<string, Array<{ date: string; linesCleared: number }>>>({});
  const [loadingTrajectoryId, setLoadingTrajectoryId] = useState<string | null>(null);

  const toggleTrajectoryExpand = (entityId: string) => {
    if (expandedLeaderboardId === entityId) {
      setExpandedLeaderboardId(null);
      return;
    }
    setExpandedLeaderboardId(entityId);
    if (!trajectories[entityId]) {
      setLoadingTrajectoryId(entityId);
      fetch(`${API_URL}/api/stats/leaderboard/${encodeURIComponent(entityId)}/trajectory`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.trajectory) {
            setTrajectories((prev) => ({ ...prev, [entityId]: d.trajectory }));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingTrajectoryId(null));
    }
  };

  useEffect(() => {
    if (isGlobalFeedOpen) {
      setLoadingLeaderboard(true);
      fetch(`${API_URL}/api/stats/leaderboard`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.leaderboard) {
            setLeaderboardList(d.leaderboard);
            setCurrentUserLeaderboard(d.currentUser ?? null);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [isGlobalFeedOpen]);

  const toggleLeaderboardOptIn = async (newVal: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/stats/leaderboard/opt-in`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optIn: newVal }),
      });
      if (res.ok) {
        toast.success(newVal ? 'Opted in to Global Leaderboard!' : 'Hidden from Global Leaderboard');
        fetch(`${API_URL}/api/stats/leaderboard`, { credentials: 'include' })
          .then((r) => r.json())
          .then((d) => {
            if (d?.leaderboard) {
              setLeaderboardList(d.leaderboard);
              setCurrentUserLeaderboard(d.currentUser ?? null);
            }
          });
      }
    } catch {
      toast.error('Failed to update leaderboard preference');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsHelpDrawerOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);

  useEffect(() => {
    const themeClasses = ['theme-dark', 'theme-cream', 'theme-white'];
    document.documentElement.classList.remove(...themeClasses);
    document.documentElement.classList.add(`theme-${theme}`);
    document.body.classList.remove(...themeClasses);
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const screen = pathToScreen(location.pathname);

  useEffect(() => {
    if (screen === 'livefeed' && sessionStorage.getItem('cw_target_agent_id')) {
      setLiveFeedView('canvas');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (session?.user && globalOrgs.length === 0) {
      fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' })
        .then(async res => {
          const text = await res.text();
          try { return JSON.parse(text); } catch { throw new Error('API returned non-JSON response.'); }
        })
        .then(data => {
          if (data?.orgs) {
            setGlobalOrgs(data.orgs);
            if (!activeOrg && data.orgs.length > 0) {
              const firstOrg = data.orgs[0];
              setActiveOrg(typeof firstOrg === 'string' ? firstOrg : firstOrg.name || '');
            }
          }
        })
        .catch(err => console.error('Failed to load connected repos:', err.message));
    }
  }, [session, globalOrgs.length, activeOrg]);

  const displayUser = session?.user
    ? { name: session.user.name, avatar: session.user.image ? null : session.user.name.charAt(0).toUpperCase() }
    : { name: 'Admin Manager', avatar: 'AM' };

  const topbar = topbarConfig[screen] ?? { title: 'Codeward', sub: '' };

  const renderScreen = () => {
    // Commits page — accessible from sidebar (/dashboard/commits) or per-repo (/dashboard/repos/:id/commits)
    const commitsMatch = location.pathname.match(/^\/dashboard\/repos\/(\d+)\/commits/);
    if (commitsMatch || screen === 'commits') {
      const repoId = commitsMatch ? Number(commitsMatch[1]) : undefined;
      return <CommitHistory repoId={repoId} repoFullName={commitsMatch ? undefined : 'Global feed'} onBack={() => navigate(commitsMatch ? '/dashboard/repos' : '/dashboard')} />;
    }

    switch (screen) {
      case 'dashboard':    return <Dashboard onRunClick={(repoId, runId) => startTransition(() => setRunDetailTarget({ repoId, runId }))} />;
      case 'livefeed':     return <LiveFeed viewMode={liveFeedView} onViewModeChange={setLiveFeedView} />;
      case 'diff':         return <DiffViewer />;
      case 'issuesprs':    return <IssuesAndPRs />;
      case 'security':     return <Security />;
      case 'debt':         return <DebtReport />;
      case 'agent':        return <AIAgent />;
      case 'staging':      return <Staging onRunClick={(repoId, runId) => startTransition(() => setRunDetailTarget({ repoId, runId }))} />;
      case 'history':      return <DeployHistory onRunClick={(repoId, runId) => startTransition(() => setRunDetailTarget({ repoId, runId }))} />;
      case 'repos':        return <Repositories activeOrg={activeOrg} />;
      case 'cert':         return <Certificate />;
      case 'settings':     return <Settings />;
      case 'integrations': return <Integrations />;
      case 'alerts':       return <Alerts />;
    }
  };

  return (
    <div className={`theme-${theme} flex h-screen overflow-hidden font-sans bg-cw-bg text-cw-txt text-[13px] leading-relaxed transition-colors duration-250`}>
      {/* SIDEBAR */}
      <div className={`${isSidebarPinned ? 'w-[240px]' : 'w-0'} bg-cw-bg2 border-r border-cw-bdr flex flex-col overflow-x-hidden overflow-y-auto transition-[width] duration-300 ease-in-out z-20 shrink-0`}>
        {/* Workspace Switcher */}
        <div className={`h-[60px] px-4 flex items-center border-b border-cw-bdr shrink-0 transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0 overflow-hidden border-0'}`}>
          <WorkspaceSwitcher />
        </div>

        {/* Nav */}
        <div className="flex-1 py-4 overflow-x-hidden">
          {nav.map(group => (
            <div key={group.group} className="mb-4">
              <div className={`px-5 pb-2 text-[10px] font-medium text-cw-txt tracking-[0.07em] uppercase whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
                {group.group}
              </div>
              {group.items.map(item => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-[23px] py-2.5 text-[13px] cursor-pointer relative transition-colors ${isActive ? 'text-cw-txt font-semibold' : 'text-cw-txt2 font-medium hover:bg-cw-bg3 hover:text-cw-txt'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cw-blue" />}
                      <div className={`${isActive ? 'text-cw-blue' : 'text-cw-txt3 group-hover:text-cw-txt'} shrink-0 transition-colors`}>
                        <item.icon size={20} strokeWidth={2.5} absoluteStrokeWidth />
                      </div>
                      <div className={`flex items-center flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
                        {item.label}
                        {item.beta && <span className="ml-auto text-[9px] px-[6px] py-[1px] rounded-full border border-cw-purple text-cw-purple font-semibold tracking-wide">BETA</span>}
                        {item.badge && <span className="ml-auto text-[10px] px-[6px] py-[2px] rounded-full bg-cw-red text-white font-medium">{item.badge}</span>}
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with User Profile Popover & Notifications Bell Icon */}
        <div className="mt-auto p-4 border-t border-cw-bdr relative flex items-center justify-between gap-2">
          {userPopoverOpen && (
            <UserProfilePopover
              onClose={() => setUserPopoverOpen(false)}
              onOpenThemeModal={cycleTheme}
            />
          )}

          {/* User Profile Block */}
          <div
            onClick={() => setUserPopoverOpen((prev) => !prev)}
            className="flex items-center gap-3 whitespace-nowrap overflow-hidden transition-all duration-300 cursor-pointer p-1.5 rounded-xl hover:bg-cw-bg3 flex-1 min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-cw-purple/20 border border-cw-purple/40 flex items-center justify-center text-[12px] text-cw-purple font-bold shrink-0 overflow-hidden shadow-sm">
              {session?.user?.image ? <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" /> : displayUser.avatar}
            </div>
            <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-[13px] text-cw-txt font-bold flex items-center justify-between">
                <span className="truncate">{displayUser.name}</span>
                <span className="text-[9px] text-cw-txt3 ml-1">⇕</span>
              </div>
              <div className="text-[10px] text-cw-txt3 font-medium">Personal Workspace</div>
            </div>
          </div>

          {/* Sidebar Footer Notifications Bell Icon (Matching Bell placement with anchored left edge popover) */}
          <div className="relative">
            {notificationsOpen && (
              <NotificationsPopover
                anchorRef={bellRef}
                onClose={() => setNotificationsOpen(false)}
              />
            )}
            <button
              ref={bellRef}
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className={`w-8 h-8 rounded-xl border border-cw-bdr bg-cw-bg3 text-cw-txt hover:text-cw-purple flex items-center justify-center cursor-pointer transition-all shrink-0 relative shadow-sm ${
                isSidebarPinned ? 'opacity-100' : 'opacity-0'
              }`}
              title="Notifications"
            >
              <Bell size={15} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cw-red text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                1
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-cw-bg relative">
          {/* Topbar */}
          <div className={`flex items-center justify-between gap-2 transition-all duration-300 ${screen === 'agent' ? 'absolute top-0 left-0 right-0 z-30 px-4 sm:px-5 h-[52px] pointer-events-none' : 'px-4 sm:px-8 h-[64px] sm:h-[80px] border-b border-cw-bdr bg-cw-bg shrink-0'}`}>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
              <button
                onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt flex items-center justify-center cursor-pointer hover:bg-cw-bg3 transition-colors shrink-0 pointer-events-auto shadow-sm"
              >
                <Menu size={18} />
              </button>
              {screen !== 'agent' && (
                <div className="shrink-0 min-w-0">
                  <h1 className="text-[15px] sm:text-[18px] md:text-[20px] font-bold text-cw-txt tracking-tight leading-none flex items-center gap-2 whitespace-nowrap shrink-0">
                    {topbar.title}
                  </h1>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto relative overflow-x-auto no-scrollbar shrink-0">
              {screen === 'repos' && (
                <button
                  onClick={() => navigate('/connect')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-cw-purple hover:brightness-110 text-white text-[12px] sm:text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                >
                  <Plus size={14} /> <span className="hidden sm:inline">Connect new repo</span><span className="sm:hidden">Connect</span>
                </button>
              )}

              <button onClick={() => setIsGlobalFeedOpen(true)} className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[12px] sm:text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Globe size={14} /> <span className="hidden sm:inline">Global feed</span>
              </button>
              
              <button onClick={() => navigate('/dashboard/agent')} className="px-2.5 sm:px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[12px] sm:text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Sparkles size={14} /> <span className="hidden sm:inline">Skills</span>
              </button>

              <a href="https://discord.gg/nnMH4URBsK" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cw-bdr bg-[#5865F2]/10 text-[13px] font-medium text-cw-txt no-underline cursor-pointer hover:bg-[#5865F2]/20 border-[#5865F2]/30 transition-colors whitespace-nowrap shrink-0">
                <svg width="14" height="14" viewBox="0 0 127.14 96.36" fill="currentColor" className="text-[#5865F2]">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0c2.64-27.38-4.51-51.11-19.32-72.15ZM42.63,65.22c-5.22,0-9.49-4.77-9.49-10.6s4.19-10.6,9.49-10.6,9.54,4.77,9.49,10.6c0,5.83-4.27,10.6-9.49,10.6Zm41.83,0c-5.22,0-9.49-4.77-9.49-10.6s4.19-10.6,9.49-10.6,9.54,4.77,9.49,10.6c0,5.83-4.27,10.6-9.49,10.6Z"/>
                </svg> Discord
              </a>

              <GitHubStarButton variant="dashboard" />

              <button 
                onClick={() => setIsHelpDrawerOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt font-medium text-[13px] transition whitespace-nowrap shrink-0"
              >
                Need help? <span className="text-[10px] bg-cw-bg px-1.5 py-0.5 rounded border border-cw-bdr text-cw-txt2 font-mono shrink-0">H</span>
              </button>
            </div>

            </div>
            
          <div className={`flex-1 overflow-hidden flex flex-col ${screen === 'agent' ? 'pt-[52px]' : ''}`}>
            <Suspense fallback={<PageLoader />}>
              {renderScreen()}
            </Suspense>
          </div>
        </div>

        {/* RIGHT DRAWER */}
        {!!runDetailTarget && (
          <div className="w-[520px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right">
            <RunDetail repoId={runDetailTarget.repoId} runId={runDetailTarget.runId} onBack={() => setRunDetailTarget(null)} />
          </div>
        )}

        <HelpDrawer isOpen={isHelpDrawerOpen} onClose={() => setIsHelpDrawerOpen(false)} />

        {/* GLOBAL FEED DRAWER */}
        {isGlobalFeedOpen && (
          <div className="w-[420px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right">
            <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-cw-txt flex items-center gap-2"><Globe size={18} className="text-cw-blue" /> Global Feed</h2>
                <div className="text-[12px] text-cw-txt3 mt-0.5">Top performers clearing technical debt</div>
              </div>
              <button onClick={() => setIsGlobalFeedOpen(false)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-cw-bg">
              {loadingLeaderboard ? (
                <div className="py-16 text-center text-cw-txt3 flex items-center justify-center gap-2 text-xs">
                  <span className="w-3.5 h-3.5 border-2 border-cw-purple border-t-transparent rounded-full animate-spin" />
                  Loading leaderboard...
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {leaderboardList.map((u) => {
                    const isMe = u.isCurrentUser || u.user === 'you';
                    const isExpanded = expandedLeaderboardId === (u.id || u.user);
                    const userTrajectory = trajectories[u.id || u.user];
                    const isLoadingTrajectory = loadingTrajectoryId === (u.id || u.user);

                    return (
                      <div
                        key={u.id || u.user}
                        onClick={() => toggleTrajectoryExpand(u.id || u.user)}
                        className={`flex flex-col p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isMe
                            ? 'bg-cw-blue/5 border-cw-blue/40 shadow-xs hover:border-cw-blue/60'
                            : 'bg-cw-bg2 border-cw-bdr hover:border-cw-bdr/80 hover:bg-cw-bg3'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          {/* Rank Badge */}
                          <div
                            className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-[11px] shrink-0 ${
                              u.rank === 1
                                ? 'bg-amber-400 text-black shadow-xs'
                                : u.rank === 2
                                ? 'bg-slate-300 text-black shadow-xs'
                                : u.rank === 3
                                ? 'bg-amber-700 text-white shadow-xs'
                                : 'bg-cw-bg3 text-cw-txt3'
                            }`}
                          >
                            #{u.rank}
                          </div>

                          {/* DiceBear Disco Avatar */}
                          <img
                            src={u.avatar}
                            alt={u.user}
                            className="w-9 h-9 rounded-full border border-cw-bdr/60 object-cover bg-cw-bg3 shrink-0 shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/disco/svg?seed=${encodeURIComponent(u.user)}`;
                            }}
                          />

                          {/* User & Org */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-cw-txt text-[13px] truncate">
                                {u.user === 'you' ? `${session?.user?.name || 'You'} (You)` : (u.name || u.user)}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cw-blue/20 text-cw-blue">YOU</span>
                              )}
                            </div>
                            <div className="text-[11px] text-cw-txt3 truncate font-mono mt-0.5">{u.org}</div>
                          </div>

                          {/* Score Badge & Expand Chevron */}
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <div className="text-[14px] font-bold text-cw-green font-mono">{u.score.toLocaleString()}</div>
                              <div className="text-[9px] text-cw-txt3 uppercase tracking-wider">lines cleared</div>
                            </div>
                            <ChevronDown
                              size={14}
                              className={`text-cw-txt3 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-cw-txt' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Expandable Trajectory Graph */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-cw-bdr/50 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between text-[11px] text-cw-txt3 mb-2 font-mono">
                              <span className="flex items-center gap-1.5 font-semibold text-cw-txt">
                                <span className="w-1.5 h-1.5 rounded-full bg-cw-green animate-pulse" />
                                30-DAY TRAJECTORY
                              </span>
                              <span className="text-cw-green font-semibold">
                                +{u.score.toLocaleString()} lines
                              </span>
                            </div>

                            {isLoadingTrajectory ? (
                              <div className="py-6 flex items-center justify-center gap-2 text-xs text-cw-txt3">
                                <span className="w-3.5 h-3.5 border-2 border-cw-purple border-t-transparent rounded-full animate-spin" />
                                Loading trajectory...
                              </div>
                            ) : (userTrajectory && userTrajectory.length > 0) ? (
                              <div className="h-[110px] w-full pt-1">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={userTrajectory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={`grad-${u.id || u.user}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#0b0f17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
                                      itemStyle={{ color: '#10b981', fontWeight: 600 }}
                                      formatter={(val: any) => [`${Number(val).toLocaleString()} lines`, 'Cleared']}
                                      labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Area type="monotone" dataKey="linesCleared" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill={`url(#grad-${u.id || u.user})`} dot={{ r: 2, fill: '#10b981' }} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="py-4 text-center text-[11px] text-cw-txt3">
                                Recent verified impact: <span className="font-mono text-cw-green font-semibold">+{u.score.toLocaleString()}</span> lines cleared.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Opt-in Callout */}
              <div className="mt-8 p-4 bg-cw-bg2 border border-cw-bdr rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold text-cw-txt">Leaderboard Privacy</h3>
                  {currentUserLeaderboard && (
                    <button
                      type="button"
                      onClick={() => toggleLeaderboardOptIn(!currentUserLeaderboard.optedIn)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer border ${
                        currentUserLeaderboard.optedIn
                          ? 'bg-cw-green/10 text-cw-green border-cw-green/30 hover:bg-cw-green/20'
                          : 'bg-cw-bg3 text-cw-txt2 border-cw-bdr hover:text-cw-txt'
                      }`}
                    >
                      {currentUserLeaderboard.optedIn ? '✓ Opted In' : 'Hidden'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-cw-txt2 mb-3 leading-relaxed">
                  {currentUserLeaderboard?.optedIn
                    ? 'Your debt-clearing achievements are public on the global feed.'
                    : 'You are currently hidden. Opt in to show your cleared debt to the community.'}
                </p>
                <button
                  onClick={() => {
                    setIsGlobalFeedOpen(false);
                    navigate('/dashboard/settings');
                  }}
                  className="w-full px-4 py-2 bg-cw-bg text-cw-txt border border-cw-bdr rounded-lg text-[12px] font-medium hover:bg-cw-bg3 transition-colors cursor-pointer"
                >
                  Manage in Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}

function ConnectRepoWrapper() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [globalOrgs, setGlobalOrgs] = useState<string[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');

  if (!session?.user) return null;
  return (
    <ConnectRepo
      user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
      onConnect={() => navigate('/dashboard')}
      onSkip={() => navigate('/dashboard')}
      activeOrg={activeOrg}
      setActiveOrg={setActiveOrg}
      orgs={globalOrgs}
      theme="dark"
      onCycleTheme={() => {}}
    />
  );
}

function DocsPlaceholderPage() {
  return (
    <div className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center font-['DM_Sans'] p-6">
      <h1 className="text-4xl font-bold mb-4">Documentation</h1>
      <p className="text-white/60 mb-6">Learn how to connect, analyze, and automate reviews for your repositories.</p>
      <a href="/" className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors">Return home</a>
    </div>
  );
}

export const routes = [
  {
    path: "/",
    element: <CodewardHero />
  },
  {
    path: "/pricing",
    element: <PricingPage />
  },
  {
    path: "/agents/:agentId",
    element: <CodewardHero />,
    getStaticPaths: () => [
      "/agents/security",
      "/agents/bloat",
      "/agents/broken-code",
      "/agents/architecture",
      "/agents/ai-era",
      "/agents/orchestrator"
    ]
  },
  {
    path: "/solutions/:solutionId",
    element: <CodewardHero />,
    getStaticPaths: () => [
      "/solutions/ci-cd-shield",
      "/solutions/tech-debt",
      "/solutions/compliance",
      "/solutions/secrets",
      "/solutions/flaky-tests",
      "/solutions/enterprise"
    ]
  },
  {
    path: "/docs",
    element: <DocsPlaceholderPage />
  },
  {
    path: "/docs/*",
    element: <DocsPlaceholderPage />,
    getStaticPaths: () => [
      "/docs/intro",
      "/docs/setup",
      "/docs/agents",
      "/docs/security"
    ]
  },
  {
    path: "/login",
    element: <AuthPage theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />
  },
  {
    path: "/signup",
    element: <AuthPage theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />
  },
  {
    path: "/connect",
    element: (
      <RequireAuth>
        <ConnectRepoWrapper />
      </RequireAuth>
    )
  },
  {
    path: "/terms",
    element: <LegalPage type="terms" onBack={() => {}} theme="dark" onCycleTheme={() => {}} themeIcon={<Moon size={14} />} />
  },
  {
    path: "/privacy",
    element: <LegalPage type="privacy" onBack={() => {}} theme="dark" onCycleTheme={() => {}} themeIcon={<Moon size={14} />} />
  },
  {
    path: "/trust",
    element: <LegalPage type="trust" onBack={() => {}} theme="dark" onCycleTheme={() => {}} themeIcon={<Moon size={14} />} />
  },
  {
    path: "/dashboard/commits",
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    )
  },
  {
    path: "/dashboard/*",
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    )
  },
  {
    path: "/dashboard/repos/:repoId/commits",
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    )
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminOverview /> },
      { path: "feed", element: <AdminFeed /> },
      { path: "runs", element: <AdminRuns /> },
      { path: "repos", element: <AdminRepos /> },
      { path: "security", element: <AdminSecurity /> },
      { path: "bloat", element: <AdminBloat /> },
      { path: "broken", element: <AdminBroken /> },
      { path: "architecture", element: <AdminArchitecture /> },
      { path: "agents", element: <AdminAgents /> },
      { path: "revenue", element: <AdminRevenue /> },
      { path: "customers", element: <AdminCustomers /> },
      { path: "growth", element: <AdminGrowth /> },
      { path: "billing", element: <AdminBilling /> },
      { path: "sandbox", element: <AdminSandbox /> },
      { path: "github", element: <AdminGitHubApp /> },
      { path: "alerts", element: <AdminAlerts /> },
      { path: "settings", element: <AdminSettings /> },
      { path: "*", element: <AdminOverview /> }
    ]
  },
  {
    path: "/compare/:competitorId",
    element: <ComparePage />,
    getStaticPaths: () => Object.keys(comparisons).map(key => `/compare/${key}`)
  },
  {
    path: "/blogs",
    element: <BlogsPage />
  },
  {
    path: "/blogs/:slug",
    element: <SingleBlogPage />,
    getStaticPaths: () => blogs.map(b => `/blogs/${b.slug}`)
  },
  {
    path: "/book-demo",
    element: <BookDemo />
  },
  {
    path: "/invite/:token",
    element: <InviteAcceptPage />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
];

import { trackEvent } from '../lib/telemetry';

function TelemetryTracker() {
  const location = useLocation();
  const dwellTimerRef = useRef<number>(0);
  const scrollMilestonesRef = useRef<Set<number>>(new Set());

  // 1. Session start & Entry landed
  useEffect(() => {
    trackEvent('session_start', {
      user_agent: navigator.userAgent,
      language: navigator.language,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
    });
    trackEvent('entry_landed', {
      landing_url: window.location.href,
    });

    // 10s Bounce prevention milestone
    const bounceTimer = setTimeout(() => {
      trackEvent('bounce_prevented', {
        active_time_sec: 10,
      });
    }, 10000);

    // Active Dwell Time Ticker (Heartbeat every 10 seconds)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        dwellTimerRef.current += 10;
        trackEvent('page_heartbeat', {
          dwell_seconds: dwellTimerRef.current,
        });
      }
    }, 10000);

    // Tab visibility change
    const handleVisibilityChange = () => {
      trackEvent('tab_visibility_change', {
        visibility: document.visibilityState,
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Exit intent detection (cursor mouseleave at top)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        trackEvent('exit_intent_detected', {
          top_distance: e.clientY,
        });
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearTimeout(bounceTimer);
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // 2. Page View & Scroll Depth Tracker per Route
  useEffect(() => {
    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
      title: document.title,
    });

    scrollMilestonesRef.current.clear();

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);
      const thresholds = [25, 50, 75, 100];

      thresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !scrollMilestonesRef.current.has(threshold)) {
          scrollMilestonesRef.current.add(threshold);
          trackEvent('scroll_depth_reached', {
            depth_percent: threshold,
            path: location.pathname,
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  return null;
}

export default function App() {
  const element = useRoutes(routes);
  return (
    <HelmetProvider>
      <WorkspaceProvider>
        <TelemetryTracker />
        {element}
        <CookieConsent />
        <TeamDrawer />
        <InviteDrawer />
      </WorkspaceProvider>
    </HelmetProvider>
  );
}
