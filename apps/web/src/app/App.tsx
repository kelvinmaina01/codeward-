import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Radio, GitCompare, ShieldAlert, BarChart3,
  Bot, Monitor, Clock, GitFork, Award, Settings as SettingsIcon,
  Sun, Moon, Circle, Menu, LogOut, LucideIcon, UsersRound, ChevronDown, Plus, Blocks, Bell, Globe, X
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

type Page = 'signin' | 'signup' | 'connect' | 'app' | 'terms' | 'privacy';
const themeOrder: Theme[] = ['dark', 'cream', 'white'];

const themeIcons: Record<Theme, React.ReactNode> = {
  cream: <Circle size={14} fill="#c5a882" color="#c5a882" />,
  dark: <Moon size={14} />,
  white: <Sun size={14} />,
};
const themeLabels: Record<Theme, string> = { cream: 'Cream', dark: 'Dark', white: 'White' };

// We map the screenshot labels to our existing Screen components for the PoC
// We store the icon component reference instead of an instantiated element.
// This ensures that any new feature added automatically inherits the exact
// same bold, firm styling in the render loop.
interface NavItem { id: Screen; label: string; dot: 'g'|'a'|'r'|'b'|'p'|''; badge?: number; icon: LucideIcon }
interface NavGroup { group: string; items: NavItem[] }

const nav: NavGroup[] = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', dot: 'g', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', dot: 'r', badge: 7, icon: Bell },
    { id: 'livefeed', label: 'Live feed', dot: 'a', badge: 1, icon: Radio },
  ]},
  { group: 'Analysis', items: [
    { id: 'diff', label: 'Diff viewer', dot: 'b', icon: GitCompare },
    { id: 'security', label: 'Security', dot: 'r', badge: 3, icon: ShieldAlert },
    { id: 'debt', label: 'Debt report', dot: 'a', icon: BarChart3 },
  ]},
  { group: 'AI Agent', items: [
    { id: 'agent', label: 'Codeward AI', dot: 'p', icon: Bot },
  ]},
  { group: 'Deploy', items: [
    { id: 'staging', label: 'Staging', dot: 'a', icon: Monitor },
    { id: 'history', label: 'Audit log', dot: '', icon: Clock },
  ]},
  { group: 'Health', items: [
    { id: 'repos', label: 'Repositories', dot: '', icon: GitFork },
    { id: 'cert', label: 'Certificate', dot: 'g', icon: Award },
    { id: 'settings', label: 'Settings', dot: '', icon: SettingsIcon },
    { id: 'integrations', label: 'Integrations', dot: 'b', icon: Blocks },
  ]},
];

const dotColors: Record<string, string> = {
  g: 'bg-[#16A34A]', a: 'bg-[#D97706]', r: 'bg-[#DC2626]', b: 'bg-[#3B6FD4]', p: 'bg-[#6D28D9]', '': 'bg-cw-bdr',
};

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

export default function App() {
  const { data: session, isPending } = useSession();
  const [page, setPage] = useState<Page>('signin');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [themeIdx, setThemeIdx] = useState(0);
  const [runDetailSha, setRunDetailSha] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [globalOrgs, setGlobalOrgs] = useState<string[]>([]);
  const [activeOrg, setActiveOrg] = useState<string>('');
  const [isGlobalFeedOpen, setIsGlobalFeedOpen] = useState(false);

  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);

  useEffect(() => {
    if (!isPending) {
      if (session?.user && (page === 'signin' || page === 'signup')) {
        setPage('connect');
      } else if (!session?.user && page !== 'signin' && page !== 'signup' && page !== 'terms' && page !== 'privacy') {
        setPage('signin');
      }

      if (session?.user && globalOrgs.length === 0) {
        fetch('http://localhost:3001/api/repos/connected', { credentials: 'include' })
          .then(async res => {
            const text = await res.text();
            try {
              return JSON.parse(text);
            } catch (e) {
              throw new Error('API returned non-JSON response.');
            }
          })
          .then(data => {
            if (data && data.orgs) {
              setGlobalOrgs(data.orgs);
              if (!activeOrg && data.orgs.length > 0) {
                const firstOrg = data.orgs[0];
                setActiveOrg(typeof firstOrg === 'string' ? firstOrg : firstOrg.name || '');
              }
            }
          })
          .catch(err => {
            console.error('Failed to load connected repos:', err.message);
          });
      }
    }
  }, [session, isPending, page, globalOrgs.length, activeOrg]);

  const handleConnect = (_repos: string[]) => {
    setPage('app');
  };

  if (page === 'signin' || page === 'signup') return <AuthPage onBack={() => setPage('signin')} theme={theme} onCycleTheme={cycleTheme} onNavigate={(p) => setPage(p)} />;
  if (page === 'connect' && session?.user) return <ConnectRepo user={{ name: session.user.name, email: session.user.email, image: session.user.image }} onConnect={handleConnect} onSkip={() => setPage('app')} activeOrg={activeOrg} setActiveOrg={setActiveOrg} orgs={globalOrgs} theme={theme} onCycleTheme={cycleTheme} />;
  if (page === 'terms') return <LegalPage type="terms" onBack={() => setPage('signin')} theme={theme} onCycleTheme={cycleTheme} themeIcon={themeIcons[theme]} />;
  if (page === 'privacy') return <LegalPage type="privacy" onBack={() => setPage('signin')} theme={theme} onCycleTheme={cycleTheme} themeIcon={themeIcons[theme]} />;

  const showingRunDetail = !!runDetailSha;
  const topbar = topbarConfig[screen];

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard onRunClick={s => setRunDetailSha(s)} />;
      case 'livefeed':  return <LiveFeed />;
      case 'diff':      return <DiffViewer />;
      case 'security':  return <Security />;
      case 'debt':      return <DebtReport />;
      case 'agent':     return <AIAgent />;
      case 'staging':   return <Staging />;
      case 'history':   return <DeployHistory onRunClick={s => setRunDetailSha(s)} />;
      case 'repos':     return <Repositories activeOrg={activeOrg} />;
      case 'cert':      return <Certificate />;
      case 'settings':  return <Settings />;
      case 'integrations': return <Integrations />;
      case 'alerts':    return <Alerts />;
    }
  };

  const displayUser = session?.user ? { name: session.user.name, avatar: session.user.image ? null : session.user.name.charAt(0).toUpperCase() } : { name: 'Admin Manager', avatar: 'AM' };

  return (
    <div className={`theme-${theme} flex h-screen overflow-hidden font-sans bg-cw-bg text-cw-txt text-[13px] leading-relaxed transition-colors duration-250`}>
      {/* 
        SIDEBAR (Push layout)
        It sits inline, starting at w-0. 
        When opened, it expands to w-[240px], smoothly pushing the main content to the right.
      */}
      <div 
        className={`${isSidebarPinned ? 'w-[240px]' : 'w-0'} bg-cw-bg2 border-r border-cw-bdr flex flex-col overflow-x-hidden overflow-y-auto transition-[width] duration-300 ease-in-out z-20 shrink-0`}
      >
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
                const orgName = typeof orgObj === 'string' ? orgObj : orgObj.name;
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
              {group.items.map(item => {
                const active = screen === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => { setRunDetailSha(null); setScreen(item.id); }}
                    className={`group flex items-center gap-3 px-[23px] py-2.5 text-[13px] cursor-pointer relative transition-colors ${active ? 'text-cw-txt font-semibold' : 'text-cw-txt2 font-medium hover:bg-cw-bg3 hover:text-cw-txt'}`}
                  >
                    {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cw-blue" />}
                    
                    {/* Render the icon centrally with bold, firm styling standard */}
                    <div className={`${active ? 'text-cw-blue' : 'text-cw-txt3 group-hover:text-cw-txt'} shrink-0 transition-colors`}>
                      <item.icon size={20} strokeWidth={2.5} absoluteStrokeWidth />
                    </div>
                    
                    <div className={`flex items-center flex-1 whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
                      {item.label}
                      {item.badge && <span className="ml-auto text-[10px] px-[6px] py-[2px] rounded-full bg-cw-red text-white font-medium">{item.badge}</span>}
                    </div>
                  </div>
                );
              })}
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
              <button onClick={() => setPage('terms')} className="hover:text-cw-txt transition-colors">Terms</button>
              <button onClick={() => setPage('privacy')} className="hover:text-cw-txt transition-colors">Privacy</button>
            </div>
          </div>
          <button 
            onClick={async () => { await signOut(); setPage('signin'); }} 
            title="Sign out" 
            className={`bg-transparent border-none cursor-pointer text-cw-red p-1 hover:bg-cw-red/10 rounded transition-all duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER (Squeezes when sidebar expands) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Feed */}
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
                  onClick={() => setPage('connect')}
                  className="px-4 py-2 rounded-md bg-cw-purple hover:brightness-110 text-white text-[13px] font-medium transition-colors flex items-center gap-2 shadow-sm mr-2"
                >
                  <Plus size={14} /> Connect new repo
                </button>
              )}
              <button onClick={() => setIsGlobalFeedOpen(true)} className="px-4 py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2">
                <Globe size={14} /> Global feed
              </button>
              <button className="px-4 py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2">
                <UsersRound size={14} /> Overview
              </button>
              <button className="px-4 py-2 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors flex items-center gap-2">
                <LayoutDashboard size={14} /> Refresh
              </button>
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

        {/* RIGHT DRAWER (Push/Squeeze) */}
        {showingRunDetail && (
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
                <button onClick={() => { setIsGlobalFeedOpen(false); setScreen('settings'); }} className="w-full px-4 py-2 bg-cw-bg text-cw-txt border border-cw-bdr rounded-lg text-[12px] font-medium hover:bg-cw-bg3 transition-colors">
                  Go to Settings
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <Toaster position="bottom-right" theme={theme as any} richColors />
    </div>
  );
}
