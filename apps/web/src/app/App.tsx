import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from 'react-router';
import {
  LayoutDashboard, Radio, GitCompare, ShieldAlert, BarChart3,
  Bot, Monitor, Clock, GitFork, Award, Settings as SettingsIcon,
  Sun, Moon, Circle, Menu, LogOut, LucideIcon, ChevronDown, Plus, Blocks, Bell, Globe, X,
  LayoutGrid, TerminalSquare, Sparkles, FileText, BadgeCheck
} from 'lucide-react';
import { Theme, Screen } from './components/types';
import { AuthPage } from './components/AuthPage';
import { ConnectRepo } from './components/ConnectRepo';
import { Dashboard } from './components/Dashboard';
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
import { RunDetail } from './components/RunDetail';
import { LegalPage } from './components/legal/LegalPage';
import { useSession, signOut } from '../lib/auth';
import { Toaster } from 'sonner';
import { API_URL } from '../lib/api';
import CodewardHero from './components/LandingHero';
import { ComparePage } from './components/ComparePage';
import { BlogsPage } from './components/BlogsPage';
import { SingleBlogPage } from './components/SingleBlogPage';
import { BookDemo } from './components/BookDemo';
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

interface NavItem { id: Screen; label: string; dot: 'g'|'a'|'r'|'b'|'p'|''; badge?: number; icon: LucideIcon; path: string; }
interface NavGroup { group: string; items: NavItem[] }

const nav: NavGroup[] = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', dot: 'g', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'alerts', label: 'Alerts', dot: 'r', badge: 7, icon: Bell, path: '/dashboard/alerts' },
    { id: 'livefeed', label: 'Live feed', dot: 'a', badge: 1, icon: Radio, path: '/dashboard/livefeed' },
  ]},
  { group: 'Analysis', items: [
    { id: 'diff', label: 'Diff viewer', dot: 'b', icon: GitCompare, path: '/dashboard/diff' },
    { id: 'security', label: 'Security', dot: 'r', badge: 3, icon: ShieldAlert, path: '/dashboard/security' },
    { id: 'debt', label: 'Debt report', dot: 'a', icon: BarChart3, path: '/dashboard/debt' },
  ]},
  { group: 'AI Agent', items: [
    { id: 'agent', label: 'Codeward AI', dot: 'p', icon: Bot, path: '/dashboard/agent' },
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

const topbarConfig: Record<Screen, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard', sub: 'acme-corp · 4 repos guarded · all systems normal' },
  livefeed:  { title: 'Live run feed', sub: 'my-api · commit 3fa2c1 · running now' },
  diff:      { title: 'Diff viewer', sub: 'my-api · commit 3fa2c1 · 3 files changed by agent' },
  security:  { title: 'Security panel', sub: '3 critical · 2 high · 1 medium · last scan 4 min ago' },
  debt:      { title: 'Debt report', sub: 'my-api · all categories · this month' },
  agent:     { title: 'Codeward AI', sub: 'Your autonomous engineering agent — not just a chatbot' },
  staging:   { title: 'Staging', sub: '1 deployment awaiting approval' },
  history:   { title: 'Audit Log', sub: 'All autonomous interventions and checks · last 30 days' },
  repos:     { title: 'Repositories', sub: '4 repos · health score last 30 days' },
  cert:      { title: 'Health certificate', sub: 'shareable · updates on every scan' },
  settings:  { title: 'Settings', sub: 'acme-corp · my-api · trust & automation' },
  integrations: { title: 'Integrations', sub: 'Connect external tools and MCP servers' },
  alerts:    { title: 'Alerts center', sub: 'acme-corp · active incidents & notifications' },
};

// Map URL paths to screen IDs
const pathToScreen: Record<string, Screen> = {
  '/dashboard': 'dashboard',
  '/dashboard/alerts': 'alerts',
  '/dashboard/livefeed': 'livefeed',
  '/dashboard/diff': 'diff',
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

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <div className="h-screen bg-cw-bg flex items-center justify-center text-cw-txt2 text-sm">Loading…</div>;
  if (!session?.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Dashboard Layout ─────────────────────────────────────────────────────────
function DashboardLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [themeIdx, setThemeIdx] = useState(0);
  const [runDetailSha, setRunDetailSha] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [globalOrgs, setGlobalOrgs] = useState<string[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');
  const [isGlobalFeedOpen, setIsGlobalFeedOpen] = useState(false);
  const [liveFeedView, setLiveFeedView] = useState<'stream' | 'canvas'>('canvas');

  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);

  const screen: Screen = pathToScreen[location.pathname] ?? 'dashboard';

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

  const topbar = topbarConfig[screen];

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':    return <Dashboard onRunClick={s => setRunDetailSha(s)} />;
      case 'livefeed':     return <LiveFeed viewMode={liveFeedView} />;
      case 'diff':         return <DiffViewer />;
      case 'security':     return <Security />;
      case 'debt':         return <DebtReport />;
      case 'agent':        return <AIAgent />;
      case 'staging':      return <Staging />;
      case 'history':      return <DeployHistory onRunClick={s => setRunDetailSha(s)} />;
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
          <div className="relative w-full">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-cw-bg border border-cw-bdr hover:bg-cw-bg3 transition-colors text-left overflow-hidden">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded bg-cw-purple flex items-center justify-center text-white font-bold text-[10px] shrink-0 uppercase">
                  {(typeof activeOrg === 'string' ? activeOrg : (activeOrg as any)?.name || displayUser.name)?.charAt(0)}
                </div>
                <span className="text-[12px] font-semibold text-cw-txt truncate">
                  {typeof activeOrg === 'string' ? activeOrg : (activeOrg as any)?.name || displayUser.name}
                </span>
              </div>
              <ChevronDown size={14} className="text-cw-txt3 shrink-0 ml-2" />
            </button>
            <select
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={activeOrg}
              onChange={(e) => setActiveOrg(e.target.value)}
            >
              {globalOrgs.map((orgObj, i) => {
                const orgName = typeof orgObj === 'string' ? orgObj : (orgObj as any).name;
                if (!orgName) return null;
                return <option key={orgName + i} value={orgName}>{orgName}</option>;
              })}
            </select>
          </div>
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
                        {item.badge && <span className="ml-auto text-[10px] px-[6px] py-[2px] rounded-full bg-cw-red text-white font-medium">{item.badge}</span>}
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`mt-auto p-4 border-t border-cw-bdr flex items-center gap-3 whitespace-nowrap overflow-hidden transition-all duration-300`}>
          <div className="w-8 h-8 rounded-full bg-cw-blue flex items-center justify-center text-[12px] text-white font-semibold shrink-0 overflow-hidden">
            {session?.user?.image ? <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" /> : displayUser.avatar}
          </div>
          <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-[13px] text-cw-txt font-medium">{displayUser.name}</div>
            <div className="flex gap-2 text-[10px] text-cw-txt3 mt-0.5">
              <button onClick={() => navigate('/terms')} className="hover:text-cw-txt transition-colors">Terms</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-cw-txt transition-colors">Privacy</button>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); navigate('/login'); }}
            title="Sign out"
            className={`bg-transparent border-none cursor-pointer text-cw-red p-1 hover:bg-cw-red/10 rounded transition-all duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-cw-bg">
          {/* Topbar */}
          <div className="px-8 h-[80px] border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0 transition-all duration-300">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                className="w-9 h-9 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt flex items-center justify-center cursor-pointer hover:bg-cw-bg3 transition-colors shrink-0"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-[22px] font-bold text-cw-txt tracking-tight leading-none mb-1.5">{topbar.title}</h1>
                <div className="text-[13px] text-cw-txt2">{topbar.sub}</div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {screen === 'repos' && (
                <button
                  onClick={() => navigate('/connect')}
                  className="px-4 py-2 rounded-md bg-cw-purple hover:brightness-110 text-white text-[13px] font-medium transition-colors flex items-center gap-2 shadow-sm mr-2"
                >
                  <Plus size={14} /> Connect new repo
                </button>
              )}
              {screen === 'livefeed' && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={() => setLiveFeedView('stream')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors ${liveFeedView === 'stream' ? 'bg-cw-bg2 border-cw-bdr text-cw-txt shadow-sm' : 'border-transparent text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg2/50'}`}
                  >
                    <TerminalSquare size={14} /> Stream
                  </button>
                  <button
                    onClick={() => setLiveFeedView('canvas')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[12px] font-medium transition-colors ${liveFeedView === 'canvas' ? 'bg-cw-bg2 border-cw-bdr text-cw-txt shadow-sm' : 'border-transparent text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg2/50'}`}
                  >
                    <LayoutGrid size={14} /> Agent Canvas
                  </button>
                </div>
              )}
              <div className="flex-1" />
              <button onClick={() => setIsGlobalFeedOpen(true)} className="px-4 py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2">
                <Globe size={14} /> Global feed
              </button>
              
              <div className="flex items-center ml-2 border border-cw-bdr rounded-md bg-cw-bg2 overflow-hidden">
                <button className="px-3 py-1.5 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2 border-r border-cw-bdr">
                  <Sparkles size={14} /> Skills
                </button>
                <button className="px-3 py-1.5 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2">
                  <FileText size={14} /> Docs
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-md border border-cw-bdr bg-cw-bg text-[13px] font-medium text-cw-txt">
                <BadgeCheck size={14} className="text-cw-txt3" /> Free Tier
              </div>

              <button
                onClick={cycleTheme}
                className="w-9 h-9 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg3 transition-colors ml-2"
              >
                {themeIcons[theme]}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {renderScreen()}
          </div>
        </div>

        {/* RIGHT DRAWER */}
        {!!runDetailSha && (
          <div className="w-[450px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right">
            <RunDetail sha={runDetailSha!} onBack={() => setRunDetailSha(null)} />
          </div>
        )}

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

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="h-screen bg-[#05060a] flex items-center justify-center text-white/50 text-sm">Loading…</div>;

  return (
    <Routes>
      <Route path="/" element={<CodewardHero />} />
      <Route path="/login" element={<AuthPage onBack={() => {}} theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />} />
      <Route path="/signup" element={<AuthPage onBack={() => {}} theme="dark" onCycleTheme={() => {}} onNavigate={() => {}} />} />
      <Route path="/connect" element={
        <RequireAuth>
          <ConnectRepoWrapper />
        </RequireAuth>
      } />
      <Route path="/terms" element={<LegalPage type="terms" onBack={() => {}} theme="dark" onCycleTheme={() => {}} themeIcon={<Moon size={14} />} />} />
      <Route path="/privacy" element={<LegalPage type="privacy" onBack={() => {}} theme="dark" onCycleTheme={() => {}} themeIcon={<Moon size={14} />} />} />
      <Route path="/dashboard/*" element={
        <RequireAuth>
          <DashboardLayout />
        </RequireAuth>
      } />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="feed" element={<AdminFeed />} />
        <Route path="runs" element={<AdminRuns />} />
        <Route path="repos" element={<AdminRepos />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="bloat" element={<AdminBloat />} />
        <Route path="broken" element={<AdminBroken />} />
        <Route path="architecture" element={<AdminArchitecture />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="growth" element={<AdminGrowth />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="sandbox" element={<AdminSandbox />} />
        <Route path="github" element={<AdminGitHubApp />} />
        <Route path="alerts" element={<AdminAlerts />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<AdminOverview />} />
      </Route>
      <Route path="/compare/:competitorId" element={<ComparePage />} />
      <Route path="/blogs" element={<BlogsPage />} />
      <Route path="/blogs/:slug" element={<SingleBlogPage />} />
      <Route path="/book-demo" element={<BookDemo />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrapper for ConnectRepo that supplies the session user and navigate
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
