import { useState } from 'react';
import {
  LayoutDashboard, Radio, GitCompare, ShieldAlert, BarChart3,
  Bot, Monitor, Clock, GitFork, Award, Settings as SettingsIcon,
  Sun, Moon, Circle, Menu, LogOut, LucideIcon, UsersRound
} from 'lucide-react';
import { Theme, Screen } from './components/types';
import { LandingPage } from './components/LandingPage';
import { AuthPage, MockUser } from './components/AuthPage';
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
import { RunDetail } from './components/RunDetail';

type Page = 'landing' | 'signin' | 'signup' | 'connect' | 'app';
const themeOrder: Theme[] = ['cream', 'dark', 'white'];

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
};

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [user, setUser] = useState<MockUser | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [themeIdx, setThemeIdx] = useState(0);
  const [runDetailSha, setRunDetailSha] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);

  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);

  const handleAuth = (u: MockUser) => {
    setUser(u);
    setPage('connect');
  };

  const handleConnect = (_repos: string[]) => {
    setPage('app');
  };

  if (page === 'landing') return <LandingPage onGetStarted={() => { setAuthMode('signup'); setPage('signin'); }} onSignIn={() => { setAuthMode('signin'); setPage('signin'); }} />;
  if (page === 'signin') return <AuthPage mode={authMode} onAuth={handleAuth} onBack={() => setPage('landing')} />;
  if (page === 'connect' && user) return <ConnectRepo user={user} onConnect={handleConnect} onSkip={() => setPage('app')} />;

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
      case 'repos':     return <Repositories />;
      case 'cert':      return <Certificate />;
      case 'settings':  return <Settings />;
    }
  };

  const displayUser = user || { name: 'Admin Manager', login: 'admin', avatar: 'AM', orgs: ['acme-corp'] };

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
        {/* Logo Area */}
        <div className="h-[60px] px-6 flex items-center border-b border-cw-bdr shrink-0">
          <div className="text-base font-semibold tracking-[-0.03em] whitespace-nowrap">
            Admin<span className="text-cw-blue">Panel</span>
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
          <div className="w-8 h-8 rounded-full bg-cw-blue flex items-center justify-center text-[12px] text-white font-semibold shrink-0">
            {displayUser.avatar}
          </div>
          <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isSidebarPinned ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-[13px] text-cw-txt font-medium">{displayUser.name}</div>
          </div>
          <button 
            onClick={() => { setUser(null); setPage('landing'); }} 
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

      </div>
    </div>
  );
}
