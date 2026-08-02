import { useState, useEffect, useRef } from 'react';
import { useRoutes, Navigate, useNavigate, useLocation, useParams, NavLink } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import {
  LayoutDashboard, Radio, GitCompare, ShieldAlert, BarChart3,
  Bot, Monitor, Clock, GitFork, Award, Settings as SettingsIcon,
  Sun, Moon, Circle, Menu, LogOut, LucideIcon, ChevronDown, Plus, Blocks, Bell, Globe, X,
  LayoutGrid, TerminalSquare, Sparkles, FileText, BadgeCheck, GitPullRequest
} from 'lucide-react';
import { Theme, Screen } from './components/types';
import { AuthPage } from './components/AuthPage';
import { ConnectRepo } from './components/ConnectRepo';
import { Dashboard } from './components/Dashboard';
import { GordonIcon } from './components/GordonIcon';
import { LiveFeed } from './components/LiveFeed';
import { DiffViewer } from './components/DiffViewer';
import { Security } from './components/Security';
import { DebtReport } from './components/DebtReport';
import { AIAgent } from './components/AIAgent';
import { Staging } from './components/Staging';
import { DeployHistory } from './components/DeployHistory';
import { Repositories } from './components/Repositories';
import { Certificate } from './components/Certificate';
import { Settings } from './components/Settings';
import { Integrations } from './components/Integrations';
import { Alerts } from './components/Alerts';
import { IssuesAndPRs } from './components/IssuesAndPRs';
import { RunDetail } from './components/RunDetail';
import { CommitHistory } from './components/CommitHistory';
import { LegalPage } from './components/legal/LegalPage';
import { useSession, signOut } from '../lib/auth';
import { Toaster } from 'sonner';
import { API_URL } from '../lib/api';
import CodewardHero from './components/LandingHero';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { TeamDrawer } from './components/drawers/TeamDrawer';
import { InviteDrawer } from './components/drawers/InviteDrawer';
import { HelpDrawer } from './components/HelpDrawer';
import { ComparePage } from './components/ComparePage';
import { BlogsPage } from './components/BlogsPage';
import { SingleBlogPage } from './components/SingleBlogPage';
import { BookDemo } from './components/BookDemo';
import { UserProfilePopover } from './components/UserProfilePopover';
import { NotificationsPopover } from './components/NotificationsPopover';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminFeed } from './components/admin/AdminFeed';
import { AdminRuns } from './components/admin/AdminRuns';
import { AdminRepos } from './components/admin/AdminRepos';
import { AdminSecurity } from './components/admin/AdminSecurity';
import { AdminBloat } from './components/admin/AdminBloat';
import { AdminBroken } from './components/admin/AdminBroken';
import { AdminArchitecture } from './components/admin/AdminArchitecture';
import { AdminCompliance } from './components/admin/AdminCompliance';
import { AdminAgents } from './components/admin/AdminAgents';
import { AdminRevenue } from './components/admin/AdminRevenue';
import { AdminCustomers } from './components/admin/AdminCustomers';
import { AdminGrowth } from './components/admin/AdminGrowth';
import { AdminBilling } from './components/admin/AdminBilling';
import { AdminSandbox } from './components/admin/AdminSandbox';
import { AdminGitHubApp } from './components/admin/AdminGitHubApp';
import { AdminAlerts } from './components/admin/AdminAlerts';
import { AdminSettings } from './components/admin/AdminSettings';
import { InviteAcceptPage } from './components/InviteAcceptPage';
import { blogs } from './data/blogs';
import { comparisons } from './data/comparisons';

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
    { id: 'commits', label: 'Commit History', dot: 'p', icon: GitFork, path: '/dashboard/commits' },
    { id: 'issuesprs', label: 'Issues & PRs', dot: 'p', icon: GitPullRequest, path: '/dashboard/issues-prs' },
    { id: 'security', label: 'Security', dot: 'r', badge: 3, icon: ShieldAlert, path: '/dashboard/security' },
    { id: 'debt', label: 'Debt report', dot: 'a', icon: BarChart3, path: '/dashboard/debt' },
  ]},
  { group: 'AI Agent', items: [
    { id: 'agent', label: 'Gordon', dot: 'p', beta: true, icon: GordonIcon as unknown as LucideIcon, path: '/dashboard/agent' },
  ]},
  { group: 'Deploy', items: [
    { id: 'staging', label: 'Staging', dot: 'a', icon: Monitor, path: '/dashboard/staging' },
    { id: 'history', label: 'Audit log', dot: '', icon: Clock, path: '/dashboard/history' },
  ]},
  { group: 'Health', items: [
    { id: 'repos', label: 'Repositories', dot: '', icon: GitFork, path: '/dashboard/repos' },
    { id: 'cert', label: 'Certificate', dot: 'g', icon: Award, path: '/dashboard/cert' },
    { id: 'settings', label: 'Settings', dot: '', icon: SettingsIcon, path: '/dashboard/settings' },
    { id: 'integrations', label: 'Integrations', dot: 'b', icon: Blocks, path: '/dashboard/integrations' },
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
  history:   { title: 'Audit Log', sub: 'Autonomous interventions and checks' },
  repos:     { title: 'Repositories', sub: 'Connected GitHub repositories' },
  cert:      { title: 'Health certificate', sub: 'Shareable health status' },
  settings:  { title: 'Settings', sub: 'Manage your Codeward preferences' },
  integrations: { title: 'Integrations', sub: 'Connect external tools and MCP servers' },
  alerts:    { title: 'Alerts center', sub: 'Active incidents & notifications' },
  issuesprs: { title: 'Issues & PRs', sub: 'Escalated issues and pull requests across your repos' },
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
      case 'dashboard':    return <Dashboard onRunClick={(repoId, runId) => setRunDetailTarget({ repoId, runId })} />;
      case 'livefeed':     return <LiveFeed viewMode={liveFeedView} />;
      case 'diff':         return <DiffViewer />;
      case 'issuesprs':    return <IssuesAndPRs />;
      case 'security':     return <Security />;
      case 'debt':         return <DebtReport />;
      case 'agent':        return <AIAgent />;
      case 'staging':      return <Staging onRunClick={(repoId, runId) => setRunDetailTarget({ repoId, runId })} />;
      case 'history':      return <DeployHistory onRunClick={(repoId, runId) => setRunDetailTarget({ repoId, runId })} />;
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
              {screen === 'livefeed' && (
                <div className="inline-flex items-center gap-1 bg-cw-bg2 border border-cw-bdr p-1 rounded-xl shrink-0 whitespace-nowrap shadow-sm">
                  <button
                    type="button"
                    onClick={() => setLiveFeedView('stream')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                      liveFeedView === 'stream'
                        ? 'bg-cw-purple text-white shadow-md'
                        : 'text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3/50'
                    }`}
                  >
                    <TerminalSquare size={13} className="shrink-0" />
                    <span className="whitespace-nowrap font-semibold">Stream</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveFeedView('canvas')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                      liveFeedView === 'canvas'
                        ? 'bg-cw-purple text-white shadow-md'
                        : 'text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3/50'
                    }`}
                  >
                    <LayoutGrid size={13} className="shrink-0" />
                    <span className="whitespace-nowrap font-semibold">Agent Canvas</span>
                  </button>
                </div>
              )}

              <button onClick={() => setIsGlobalFeedOpen(true)} className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[12px] sm:text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Globe size={14} /> <span className="hidden sm:inline">Global feed</span>
              </button>
              
              <div className="flex items-center border border-cw-bdr rounded-md bg-cw-bg2 overflow-hidden shrink-0">
                <button onClick={() => navigate('/dashboard/agent')} className="px-2.5 sm:px-3 py-1.5 text-cw-txt text-[12px] sm:text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-1.5 border-r border-cw-bdr whitespace-nowrap">
                  <Sparkles size={14} /> <span className="hidden sm:inline">Skills</span>
                </button>
                <button onClick={() => window.open('/docs', '_blank')} className="px-2.5 sm:px-3 py-1.5 text-cw-txt text-[12px] sm:text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                  <FileText size={14} /> <span className="hidden sm:inline">Docs</span>
                </button>
              </div>

              <div onClick={() => navigate('/dashboard/settings')} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg text-[13px] font-medium text-cw-txt cursor-pointer hover:bg-cw-bg2 transition-colors whitespace-nowrap shrink-0">
                <BadgeCheck size={14} className="text-cw-purple" /> Free Tier
              </div>

              <button 
                onClick={() => setIsHelpDrawerOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt font-medium text-[13px] transition whitespace-nowrap shrink-0"
              >
                Need help? <span className="text-[10px] bg-cw-bg px-1.5 py-0.5 rounded border border-cw-bdr text-cw-txt2 font-mono shrink-0">H</span>
              </button>
            </div>

            </div>
          </div>

          <div className={`flex-1 overflow-hidden flex flex-col ${screen === 'agent' ? 'pt-[52px]' : ''}`}>
            {renderScreen()}
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
          <div className="w-[400px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right">
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
              <div className="flex flex-col gap-3">
                {[
                  { user: 'alex-dev', score: 2450, rank: 1, org: 'acme-corp' },
                  { user: 'sarah-j', score: 1840, rank: 2, org: 'pied-piper' },
                  { user: 'michael.t', score: 1520, rank: 3, org: 'hooli' },
                  { user: 'you', score: 1346, rank: 4, org: 'acme-corp' },
                  { user: 'jenny_k', score: 980, rank: 5, org: 'stark-ind' },
                ].map(u => (
                  <div key={u.user} className={`flex items-center gap-4 p-4 rounded-xl border ${u.user === 'you' ? 'bg-cw-blue/5 border-cw-blue/30' : 'bg-cw-bg2 border-cw-bdr'}`}>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-[12px] ${u.rank === 1 ? 'bg-cw-amber text-cw-bg' : u.rank === 2 ? 'bg-cw-txt3 text-cw-bg' : u.rank === 3 ? 'bg-cw-txt2 text-cw-bg' : 'bg-cw-bg3 text-cw-txt'}`}>
                      #{u.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-cw-txt text-[13px] truncate">{u.user}</div>
                      <div className="text-[11px] text-cw-txt3 truncate">{u.org}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-bold text-cw-green">{u.score}</div>
                      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider">lines cleared</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-cw-bg2 border border-cw-bdr rounded-xl">
                <h3 className="text-[12px] font-semibold text-cw-txt mb-2">Want to appear on the leaderboard?</h3>
                <p className="text-[12px] text-cw-txt2 mb-4 leading-relaxed">
                  You can opt-in to show your cleared debt to the global community in your Settings.
                </p>
                <button onClick={() => { setIsGlobalFeedOpen(false); navigate('/dashboard/settings'); }} className="w-full px-4 py-2 bg-cw-bg text-cw-txt border border-cw-bdr rounded-lg text-[12px] font-medium hover:bg-cw-bg3 transition-colors">
                  Go to Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" theme={theme as any} richColors />
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
    element: (
      <RequireUnauth>
        <CodewardHero />
      </RequireUnauth>
    )
  },
  {
    path: "/pricing",
    element: <CodewardHero />
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
    element: (
      <RequireUnauth>
        <AuthPage onBack={() => {}} theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />
      </RequireUnauth>
    )
  },
  {
    path: "/signup",
    element: (
      <RequireUnauth>
        <AuthPage onBack={() => {}} theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />
      </RequireUnauth>
    )
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

import { CookieConsent } from './components/CookieConsent';

export default function App() {
  const element = useRoutes(routes);
  return (
    <HelmetProvider>
      <WorkspaceProvider>
        {element}
        <CookieConsent />
        <TeamDrawer />
        <InviteDrawer />
      </WorkspaceProvider>
    </HelmetProvider>
  );
}
