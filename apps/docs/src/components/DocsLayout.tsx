import { Link, Outlet, useLocation } from 'react-router';
import { Book01Icon, CodeIcon, CpuIcon, PuzzleIcon, Rocket01Icon, Search01Icon, File01Icon } from 'hugeicons-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

type Theme = 'dark' | 'cream' | 'white';
const themeOrder: Theme[] = ['dark', 'cream', 'white'];

export default function DocsLayout() {
  const location = useLocation();
  const [themeIdx, setThemeIdx] = useState(0);

  const theme = themeOrder[themeIdx];
  const cycleTheme = () => setThemeIdx(i => (i + 1) % themeOrder.length);

  // Sync theme with body for styling outside the layout (if needed)
  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  const sidebarSections = [
    {
      title: 'Getting Started',
      icon: Book01Icon,
      items: [
        { name: 'Welcome', path: '/guide/getting-started/welcome' },
        { name: 'Quickstart (5 min)', path: '/guide/getting-started/quickstart' },
        { name: 'How it works', path: '/guide/getting-started/how-it-works' },
      ]
    },
    {
      title: 'Core Concepts',
      icon: PuzzleIcon,
      items: [
        { name: 'Mode 1 â€” On connect', path: '/guide/concepts/mode-1' },
        { name: 'Mode 2 â€” On push', path: '/guide/concepts/mode-2' },
        { name: 'Debt scoring model', path: '/guide/concepts/scoring' },
      ]
    },
    {
      title: 'Agents',
      icon: CpuIcon,
      items: [
        { name: 'Overview (15 agents)', path: '/agents/overview' },
      ]
    },
    {
      title: 'Analyzer Agents',
      icon: Search01Icon,
      items: [
        { name: 'Security', path: '/agents/security' },
        { name: 'Bloat', path: '/agents/bloat' },
        { name: 'Broken Code', path: '/agents/broken-code' },
        { name: 'Architecture', path: '/agents/architecture' },
        { name: 'AI-Era', path: '/agents/ai-era' },
        { name: 'Compliance', path: '/agents/compliance' },
        { name: 'Data & DX', path: '/agents/data-dx' },
        { name: 'Performance', path: '/agents/performance' },
        { name: 'Testing', path: '/agents/testing' },
        { name: 'Dependencies', path: '/agents/dependencies' },
        { name: 'Documentation', path: '/agents/documentation' },
        { name: 'Style', path: '/agents/style' },
      ]
    },
    {
      title: 'Core System Agents',
      icon: CpuIcon,
      items: [
        { name: 'Orchestrator', path: '/agents/orchestrator' },
        { name: 'Guardian', path: '/agents/guardian' },
        { name: 'Chat', path: '/agents/chat' },
      ]
    },
    {
      title: 'Skills Reference',
      icon: File01Icon,
      items: [
        { name: 'All Skills', path: '/skills/all' },
        { name: 'Security Skills', path: '/skills/security' },
        { name: 'Bloat Skills', path: '/skills/bloat' },
      ]
    },
    {
      title: 'Integrations',
      icon: PuzzleIcon,
      items: [
        { name: 'Overview', path: '/integrations' },
        { name: 'GitHub (Native)', path: '/integrations' },
        { name: 'Slack', path: '/integrations' },
        { name: 'Gmail', path: '/integrations' },
        { name: 'WhatsApp / SMS', path: '/integrations' },
        { name: 'Google Drive', path: '/integrations' },
        { name: 'Sentry', path: '/integrations' },
        { name: 'MCP Servers', path: '/integrations' },
      ]
    },
    {
      title: 'Reference',
      icon: CodeIcon,
      items: [
        { name: 'API References', path: '/api-reference/intro' },
        { name: 'Changelog', path: '/changelog' },
      ]
    }
  ];

  return (
    <div className={`theme-${theme} h-screen overflow-hidden bg-cw-bg text-cw-txt font-sans flex flex-col transition-colors duration-250`}>
      {/* Top Navbar */}
      <header className="h-20 border-b border-cw-bdr flex items-center px-6 justify-between shrink-0 z-50 bg-cw-bg transition-colors duration-250">
        <Link to="/" className="text-xl font-semibold flex items-center gap-3">
          <img src="https://i.ibb.co/jkgWWhgZ/codewrdlogo-png.png" alt="Codeward Logo" className="h-16 w-16 object-contain" />
          <span>Codeward Docs</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="gap-6 text-sm font-medium text-cw-txt2 hidden md:flex">
            <Link to="/" className="hover:text-cw-txt transition-colors">Home</Link>
            <Link to="/guide/getting-started/welcome" className="hover:text-cw-txt transition-colors">Guide</Link>
            <Link to="/api-reference/intro" className="hover:text-cw-txt transition-colors">API References</Link>
            <Link to="/agents/overview" className="hover:text-cw-txt transition-colors">Agents</Link>
            <Link to="/integrations" className="hover:text-cw-txt transition-colors">Integrations</Link>
          </nav>
          
          <button 
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cw-bdr text-xs font-medium text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg2 transition-all"
            title="Toggle Theme"
          >
            <div
              className="w-2.5 h-2.5 rounded-full border border-cw-bdr"
              style={{ backgroundColor: theme === 'cream' ? '#c5a882' : theme === 'white' ? '#ebebeb' : '#3a3f4a' }}
            />
            {theme === 'dark' ? 'Dark' : theme === 'cream' ? 'Cream' : 'Light'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-cw-bdr overflow-y-auto hidden md:block shrink-0 pb-10 custom-scrollbar">
          <div className="p-4 space-y-6">
            {sidebarSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.title} className="space-y-1">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-cw-txt uppercase tracking-wider mb-2 px-2">
                    <SectionIcon size={16} className="text-cw-txt3" />
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname === item.path + '/';
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={clsx(
                          "flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors",
                          isActive 
                            ? "bg-cw-bg2 text-cw-blue font-medium" 
                            : "text-cw-txt2 hover:bg-cw-bg2 hover:text-cw-txt"
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-4xl mx-auto p-8 pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
