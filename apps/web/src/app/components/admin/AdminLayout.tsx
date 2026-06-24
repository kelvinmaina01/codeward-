import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, Radio, List, GitFork, ShieldAlert, Package, 
  AlertTriangle, Network, Bot, ClipboardCheck, Database, MessageSquare,
  DollarSign, Users, TrendingUp, CreditCard, Server, Github, Bell, 
  Settings, Download, Calendar, MoreHorizontal, Moon, Sun, Circle, Menu
} from 'lucide-react';
import { Theme } from '../types';
import { Toaster } from 'sonner';

const themeOrder: Theme[] = ['dark', 'cream', 'white'];

const themeIcons: Record<Theme, React.ReactNode> = {
  cream: <Circle size={14} fill="#c5a882" color="#c5a882" />,
  dark: <Moon size={14} />,
  white: <Sun size={14} />,
};

const adminRoomNames = [
  "War Room",
  "Cockpit",
  "Command Center",
  "Mission Control",
  "Operations Hub",
  "Control Tower",
  "Situation Room",
  "Nerve Center",
  "Bridge",
  "Strategic Center",
  "Tactical Center",
  "Command Post",
  "Headquarters",
  "The Hive"
];

const getRandomRoomName = () => adminRoomNames[Math.floor(Math.random() * adminRoomNames.length)];

interface NavItem { 
  id: string; 
  label: string; 
  icon: any; 
  path: string; 
  badge?: { text: string; type: 'running' | 'critical' | 'flaky' | 'default' };
}

interface NavGroup { 
  group: string; 
  items: NavItem[] 
}

const nav: NavGroup[] = [
  { group: 'OVERVIEW', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'livefeed', label: 'Live feed', icon: Radio, path: '/admin/feed', badge: { text: '3 running', type: 'running' } },
    { id: 'runs', label: 'All runs', icon: List, path: '/admin/runs' },
    { id: 'repos', label: 'Repositories', icon: GitFork, path: '/admin/repos' },
  ]},
  { group: 'AGENTS', items: [
    { id: 'agents', label: 'All Agents', icon: Bot, path: '/admin/agents', badge: { text: '2 critical', type: 'critical' } },
  ]},
  { group: 'BUSINESS', items: [
    { id: 'revenue', label: 'Revenue', icon: DollarSign, path: '/admin/revenue' },
    { id: 'customers', label: 'Customers', icon: Users, path: '/admin/customers' },
    { id: 'growth', label: 'Growth', icon: TrendingUp, path: '/admin/growth' },
    { id: 'billing', label: 'Billing', icon: CreditCard, path: '/admin/billing' },
  ]},
  { group: 'INFRA', items: [
    { id: 'sandbox', label: 'Sandbox Cluster', icon: Server, path: '/admin/sandbox' },
    { id: 'github', label: 'GitHub App', icon: Github, path: '/admin/github' },
    { id: 'alerts', label: 'Alerts', icon: Bell, path: '/admin/alerts', badge: { text: '5', type: 'default' } },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ]},
];

export function AdminLayout() {
  const [themeIdx, setThemeIdx] = useState(1); // Default to cream as in the mockup
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [roomName] = useState(() => getRandomRoomName());
  
  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);
  
  const location = useLocation();

  const renderBadge = (badge?: NavItem['badge']) => {
    if (!badge) return null;
    
    let colorClass = 'bg-cw-bg3 text-cw-txt2';
    if (badge.type === 'running') colorClass = 'bg-cw-amber/20 text-cw-amber';
    if (badge.type === 'critical') colorClass = 'bg-cw-red/10 text-cw-red';
    if (badge.type === 'flaky') colorClass = 'bg-cw-amber/20 text-cw-amber';
    
    return (
      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className={`theme-${theme} flex h-screen overflow-hidden font-sans bg-cw-bg text-cw-txt text-[13px] leading-relaxed transition-colors duration-250`}>
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'w-[250px]' : 'w-0'} bg-cw-bg2 border-r border-cw-bdr flex flex-col overflow-x-hidden overflow-y-auto transition-[width] duration-300 z-20 shrink-0`}>
        {/* Brand */}
        <div className="p-5 border-b border-cw-bdr shrink-0">
          <div className="flex items-center">
            <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" className="w-5 h-5 object-contain -mr-1" />
            <div>
              <h1 className="text-[16px] font-bold tracking-widest text-cw-txt leading-none">CODEWARD</h1>
              <div className="text-[11px] text-cw-txt3 mt-1">Admin {roomName.toLowerCase()} - Beta</div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 py-4 overflow-x-hidden">
          {nav.map(group => (
            <div key={group.group} className="mb-6">
              <div className="px-5 mb-2 text-[10px] font-bold text-cw-txt3 tracking-wider uppercase whitespace-nowrap">
                {group.group}
              </div>
              <div className="flex flex-col px-3">
                {group.items.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        isActive ? 'bg-cw-bg3 text-cw-txt font-semibold' : 'text-cw-txt2 hover:bg-cw-bg3/50 hover:text-cw-txt'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} className={isActive ? 'text-cw-txt' : 'text-cw-txt3'} strokeWidth={isActive ? 2.5 : 2} />
                        <div className="flex items-center flex-1 whitespace-nowrap">
                          {item.label}
                          {renderBadge(item.badge)}
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-cw-bdr flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cw-purple flex items-center justify-center text-[12px] text-white font-bold shrink-0">
            KM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-cw-txt font-medium truncate">Kelvin Maina</div>
            <div className="text-[11px] text-cw-txt3 truncate">Super Admin</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-cw-bg">
        {/* Topbar */}
        <div className="h-[70px] px-8 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-cw-txt2 hover:text-cw-txt transition-colors">
              <Menu size={20} />
            </button>
            <h2 className="text-[16px] font-bold text-cw-txt">{roomName}</h2>
            <div className="px-3 py-1 rounded-full bg-cw-green/10 text-cw-green text-[12px] font-medium flex items-center gap-2 border border-cw-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-cw-green animate-pulse" />
              All systems operational
            </div>
          </div>
          
          <div className="flex items-center">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors">
              <Calendar size={14} /> June 2026
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors">
              <Download size={14} /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cw-bdr bg-cw-bg text-cw-txt text-[13px] font-medium hover:bg-cw-bg3 transition-colors">
              <Bell size={14} /> 5
            </button>
            <div className="h-6 w-px bg-cw-bdr mx-1" />
            <button onClick={cycleTheme} className="w-8 h-8 rounded-full border border-cw-bdr flex items-center justify-center text-cw-txt2 hover:bg-cw-bg3 transition-colors">
              {themeIcons[theme]}
            </button>
            <button className="w-8 h-8 rounded-full bg-cw-bg3 flex items-center justify-center text-cw-txt2 hover:bg-cw-txt transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-right" theme={theme as any} richColors />
    </div>
  );
}

