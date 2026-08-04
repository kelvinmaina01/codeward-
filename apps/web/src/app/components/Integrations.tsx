import { useState, useEffect } from 'react';
import {
  LayoutGrid, List, Plus, Settings as SettingsIcon, Book, CheckSquare,
  Bot, X, Loader2, Zap, Terminal, Shield, CheckCircle2, Cpu, Link2,
  Keyboard, HelpCircle
} from 'lucide-react';
import { IntegrationSettingsDrawer } from './IntegrationSettingsDrawer';
import { ConnectorRequestDrawer } from './ConnectorRequestDrawer';
import { McpConnectionDrawer, type McpProvider } from './McpConnectionDrawer';
import { API_URL } from '../../lib/api';

interface Integration {
  id: string;
  name: string;
  logoUrl: string;
  connected: boolean;
  desc: string;
  authType: 'oauth' | 'apikey';
  connectedAccount?: string;
  features: { title: string; desc: string }[];
  tools: { label: string; desc: string }[];
  commands: { label: string; desc: string }[];
}

interface AgentAccess {
  name: string;
  desc: string;
  on: boolean;
}

interface McpServer {
  name: string;
  icon: React.ElementType;
  provider: McpProvider;
  /** URL to a real logo */
  logoUrl: string;
  /** One-line description shown on the card */
  desc: string;
  connected: boolean;
}

const defaultMcpAgents: AgentAccess[] = [
  { name: 'Base Agent', desc: 'Can use tools implicitly without asking', on: true },
  { name: 'Research Agent', desc: 'Will ask permission before taking destructive actions', on: false },
  { name: 'Deploy Agent', desc: 'Read-only access to all server tools', on: true },
];

const initialMcpServers: McpServer[] = [
  {
    name: 'PostgreSQL Database',
    provider: 'postgres',
    logoUrl: 'https://cdn.simpleicons.org/postgresql',
    desc: 'Read-only SQL queries across your tables',
    connected: false,
  },
  {
    name: 'Redis Cache',
    provider: 'redis',
    logoUrl: 'https://cdn.simpleicons.org/redis',
    desc: 'Key inspection, TTL reads, cursor-paginated SCAN',
    connected: false,
  },
];

const initialAgentsByIntegration: Record<string, AgentAccess[]> = {
  'google': [...defaultMcpAgents],
  'workspace': [...defaultMcpAgents],
  'linear': [...defaultMcpAgents],
  'slack': [...defaultMcpAgents],
  'github': [...defaultMcpAgents],
  'sentry': [...defaultMcpAgents],
  'figma': [...defaultMcpAgents],
  'datadog': [...defaultMcpAgents],
};

export function Integrations() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [agentsByIntegration, setAgentsByIntegration] = useState(initialAgentsByIntegration);
  const [mcpServers, setMcpServers] = useState(initialMcpServers);
  const [mcpAgents, setMcpAgents] = useState<Record<number, AgentAccess[]>>({
    0: [...defaultMcpAgents],
    1: [...defaultMcpAgents]
  });

  const [settingsState, setSettingsState] = useState<{ type: 'integration' | 'mcp', id: string | number } | null>(null);
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);
  const [connectingIntg, setConnectingIntg] = useState<Integration | null>(null);
  const [connectStep, setConnectStep] = useState<'idle' | 'polling' | 'done'>('idle');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [appKeyInput, setAppKeyInput] = useState('');
  // Which MCP server is showing its connect form in the push drawer
  const [connectingMcp, setConnectingMcp] = useState<{ provider: McpProvider; index: number } | null>(null);

  // Fetch real connection states and catalog
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const [catRes, stateRes] = await Promise.all([
          fetch(`${API_URL}/api/integrations/catalog`),
          fetch(`${API_URL}/api/integrations`, { credentials: 'include' })
        ]);
        
        if (catRes.ok && stateRes.ok) {
          const { catalog } = await catRes.json();
          const { integrations: connectedData } = await stateRes.json();
          const connectedMap = new Map(connectedData.map((i: any) => [i.id, i]));
          
          const merged = catalog.map((cat: any) => {
            const meta = connectedMap.get(cat.id);
            return {
              ...cat,
              connected: !!meta,
              connectedAccount: meta?.email
            };
          });
          
          setIntegrations(merged);
          setIsLoaded(true);

          // Once loaded, check URL parameters for success/error
          const params = new URLSearchParams(window.location.search);
          const successProvider = params.get('success');
          const errorParam = params.get('error');

          if (successProvider) {
            const target = merged.find((i: Integration) => i.id === successProvider);
            if (target) {
              setConnectingIntg(target);
              setConnectStep('done');
            }
            window.history.replaceState({}, '', '/dashboard/integrations');
          }
          
          if (errorParam) {
            alert(`Integration failed: ${errorParam}`);
            window.history.replaceState({}, '', '/dashboard/integrations');
          }
        }
      } catch (e) {
        console.error('Failed to fetch integrations', e);
      }
    };
    fetchIntegrations();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectingIntg) { setConnectingIntg(null); setConnectStep('idle'); }
        else { setSettingsState(null); }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [connectingIntg]);

  const toggleConnect = async (intg: Integration) => {
    if (intg.connected) {
      try {
        await fetch(`${API_URL}/api/integrations/${intg.id}`, { 
          method: 'DELETE',
          credentials: 'include' 
        });
        setIntegrations(prev => prev.map(i => i.id === intg.id ? { ...i, connected: false, connectedAccount: undefined } : i));
        if (settingsState?.type === 'integration' && settingsState.id === intg.id) setSettingsState(null);
      } catch (e) {
        console.error('Failed to disconnect integration', e);
      }
    } else {
      setConnectingIntg(intg);
      setConnectStep('idle');
    }
  };

  const finishConnection = () => {
    if (connectingIntg) {
      const account = connectingIntg.authType === 'oauth' ? 'developer@codeward.ai' : 'API Key Authenticated';
      setIntegrations(prev => prev.map(i => i.id === connectingIntg.id ? { ...i, connected: true, connectedAccount: account } : i));
      setConnectStep('done');
    }
  };

  const confirmDone = () => {
    if (connectingIntg) {
      setSettingsState({ type: 'integration', id: connectingIntg.id });
      setConnectingIntg(null);
      setConnectStep('idle');
    }
  };

  const handleMcpConnect = (index: number) => {
    const mcp = mcpServers[index];
    if (mcp.connected) {
      // Disconnect — clear connected state
      setMcpServers(prev => prev.map((m, i) => i === index ? { ...m, connected: false } : m));
      if (settingsState?.type === 'mcp' && settingsState.id === index) setSettingsState(null);
    } else {
      // Open provider-specific connect form
      setConnectingMcp({ provider: mcp.provider, index });
      setSettingsState(null);
      setRequestDrawerOpen(false);
    }
  };

  const addMcp = () => {
    setMcpServers(prev => {
      const newIndex = prev.length;
      setMcpAgents(agents => ({ ...agents, [newIndex]: [...defaultMcpAgents] }));
      return [...prev, { name: 'New Custom MCP', icon: Plus, connected: false }];
    });
  };

  const toggleAgent = (indexOrId: string | number, agentIndex: number, isMcp: boolean) => {
    if (isMcp) {
      setMcpAgents(prev => {
        const updated = { ...prev };
        updated[indexOrId as number] = updated[indexOrId as number].map((a, i) => i === agentIndex ? { ...a, on: !a.on } : a);
        return updated;
      });
    } else {
      setAgentsByIntegration(prev => {
        const updated = { ...prev };
        updated[indexOrId as string] = updated[indexOrId as string].map((a, i) => i === agentIndex ? { ...a, on: !a.on } : a);
        return updated;
      });
    }
  };

  let activeIntg: Integration | undefined;
  let activeAgents: AgentAccess[] = [];
  let currentId: string | number = '';
  let isMcp = false;
  let panelTitle = '';

  if (settingsState?.type === 'integration') {
    activeIntg = integrations.find(i => i.id === settingsState.id);
    if (activeIntg) { activeAgents = agentsByIntegration[settingsState.id as string] || []; currentId = settingsState.id; }
  } else if (settingsState?.type === 'mcp') {
    const mcpObj = mcpServers[settingsState.id as number];
    if (mcpObj) { panelTitle = mcpObj.name; activeAgents = mcpAgents[settingsState.id as number] || []; currentId = settingsState.id; isMcp = true; }
  }

  const drawerOpen = !!connectingIntg || !!connectingMcp || settingsState?.type === 'mcp' || settingsState?.type === 'integration' || requestDrawerOpen;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">

      {/* ── Main scrollable list ── */}
      <div className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="p-8 max-w-[1000px] mx-auto pb-16">

          {/* Main Hero Banner */}
          <div className="relative w-full h-[220px] rounded-2xl overflow-hidden mb-10 border border-cw-bdr/50 shadow-lg group cursor-pointer">
            {/* Background Image */}
            <img 
              src="/integrations_banner.png" 
              alt="Integrations" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight max-w-md">
                Supercharge your <br />
                agent workflows <span className="text-cw-purple inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </h2>
              <p className="text-[14px] text-gray-300 max-w-xs mt-1 font-medium">
                Connect external tools to give Codeward agents superpowers.
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[18px] font-semibold text-cw-txt">Platform Integrations</h2>
              <p className="text-[12px] text-cw-txt2 mt-1">Manage existing connections and discover new ones.</p>
            </div>
            <div className="flex border border-cw-bdr rounded-md overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors ${viewMode === 'grid' ? 'bg-cw-bg3 text-cw-txt font-medium' : 'bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3'}`}><LayoutGrid size={14} /> Grid</button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors border-l border-cw-bdr ${viewMode === 'list' ? 'bg-cw-bg3 text-cw-txt font-medium' : 'bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3'}`}><List size={14} /> List</button>
            </div>
          </div>

          {/* Integrations grid/list */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
            {integrations.map(intg => {
              const isSelected = settingsState?.type === 'integration' && settingsState.id === intg.id;
              return (
                <div
                  key={intg.id}
                  className={`border rounded-lg p-4 transition-all duration-200 ${isSelected ? 'border-cw-purple ring-1 ring-cw-purple/20 bg-cw-bg' : 'border-cw-bdr bg-cw-bg2'} ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}
                >
                  <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1 min-w-0' : ''}>
                    <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 p-1">
                          <img src={intg.logoUrl} alt={intg.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-cw-txt">{intg.name}</div>
                          {intg.connectedAccount && <div className="text-[11px] text-cw-txt3 mt-0.5 truncate max-w-[140px]">{intg.connectedAccount}</div>}
                        </div>
                      </div>
                      {viewMode === 'grid' && <div className={`w-2 h-2 rounded-full ${intg.connected ? 'bg-cw-green' : 'bg-cw-bdr'}`} />}
                    </div>
                    <p className={`text-[12px] text-cw-txt2 leading-relaxed line-clamp-2 ${viewMode === 'list' ? 'flex-1' : ''}`}>{intg.desc}</p>
                    {viewMode === 'list' && <div className={`w-2 h-2 rounded-full shrink-0 mx-2 ${intg.connected ? 'bg-cw-green' : 'bg-cw-bdr'}`} />}
                  </div>
                  <div className={`flex items-center gap-2 shrink-0 ${viewMode === 'grid' ? 'mt-4' : ''}`}>
                    <button
                      onClick={() => toggleConnect(intg)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${intg.connected ? 'border-cw-red/30 text-cw-red hover:bg-cw-red/10' : 'border-cw-blue bg-cw-blue text-white hover:brightness-110'}`}
                    >
                      {intg.connected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button
                      title="View features, tools & agent access"
                      onClick={() => setSettingsState(isSelected ? null : { type: 'integration', id: intg.id })}
                      className={`w-8 h-8 flex items-center justify-center rounded-md border transition-all duration-150 ${
                        isSelected
                          ? 'border-cw-purple bg-cw-purple text-white shadow-sm'
                          : 'border-cw-bdr bg-cw-bg text-cw-txt2 hover:bg-cw-bg3 hover:border-cw-purple/40 hover:text-cw-purple'
                      }`}
                    >
                      <SettingsIcon size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MCP Servers */}
          <div className="mt-10">
            <h2 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest mb-3">Model Context Protocol (MCP) Servers</h2>
            <div className="flex flex-col gap-2">
              {mcpServers.map((mcp, i) => {
                const isSelected = settingsState?.type === 'mcp' && settingsState.id === i;
                const isConnecting = connectingMcp?.index === i;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${isSelected || isConnecting ? 'border-cw-purple bg-cw-bg' : 'border-cw-bdr bg-cw-bg2'}`}>
                    {/* Real logo */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-cw-bdr p-1.5">
                      <img src={mcp.logoUrl} alt={mcp.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-cw-txt">{mcp.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${mcp.connected ? 'bg-cw-green' : 'bg-cw-bdr'}`} />
                      </div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">{mcp.desc}</div>
                    </div>
                    {/* Provider-specific Connect / Disconnect */}
                    <button
                      onClick={() => handleMcpConnect(i)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors shrink-0 ${
                        mcp.connected
                          ? 'border-cw-red/30 text-cw-red hover:bg-cw-red/10'
                          : isConnecting
                            ? 'border-cw-purple bg-cw-purple text-white'
                            : 'border-cw-bdr bg-cw-bg text-cw-txt hover:bg-cw-bg3'
                      }`}
                    >
                      {mcp.connected ? 'Disconnect' : isConnecting ? 'Connecting…' : 'Connect'}
                    </button>
                    {/* Settings button — only active when connected */}
                    <button
                      onClick={() => {
                        if (!mcp.connected) return;
                        setConnectingMcp(null);
                        setSettingsState(isSelected ? null : { type: 'mcp', id: i });
                      }}
                      disabled={!mcp.connected}
                      title={mcp.connected ? `${mcp.name} settings` : 'Connect first to access settings'}
                      className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
                        isSelected
                          ? 'border-cw-purple bg-cw-purple text-white'
                          : mcp.connected
                            ? 'border-cw-bdr bg-cw-bg text-cw-txt2 hover:bg-cw-bg3'
                            : 'border-cw-bdr bg-cw-bg text-cw-txt3 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <SettingsIcon size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={addMcp} className="mt-3 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-cw-txt2 hover:text-cw-txt transition-colors">
              <Plus size={13} /> Add MCP server
            </button>
          </div>

          {/* Missing Integration CTA */}
          <div className="mt-12 p-6 border border-cw-bdr bg-cw-bg2 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-cw-bg border border-cw-bdr flex items-center justify-center">
                <HelpCircle size={18} className="text-cw-txt2" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-cw-txt">Missing an integration?</h3>
                <p className="text-[12px] text-cw-txt3 mt-0.5">Tell us what tool your agents need to connect to next.</p>
              </div>
            </div>
            <button onClick={() => setRequestDrawerOpen(true)} className="px-4 py-2 bg-cw-bg border border-cw-bdr hover:border-cw-purple hover:text-cw-purple transition-colors text-cw-txt font-medium text-[13px] rounded-lg">
              Request a Connector
            </button>
          </div>

        </div>
      </div>

      {/* ── Right side-pull drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${drawerOpen ? 'w-[520px] min-w-[360px] md:w-[440px] lg:w-[520px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {drawerOpen && (

          /* ── CONNECTION SETUP FLOW ── */
          connectingIntg ? (
            <>
              {/* Setup header */}
              <div className="px-4 py-2.5 border-b border-cw-bdr flex items-center justify-between shrink-0 bg-cw-bg">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <img src={connectingIntg.logoUrl} alt={connectingIntg.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-[10px] text-cw-txt3 leading-none mb-0.5">App Center / Setup</p>
                    <p className="text-[13px] font-semibold text-cw-txt leading-none">{connectingIntg.name}</p>
                  </div>
                </div>
                <button onClick={() => { setConnectingIntg(null); setConnectStep('idle'); }} className="w-7 h-7 rounded-md hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Setup body */}
              <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">

                {connectStep === 'done' ? (
                  /* ── SUCCESS STATE ── */
                  <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-cw-green/10 flex items-center justify-center mb-5">
                      <CheckCircle2 size={32} className="text-cw-green" />
                    </div>
                    <h3 className="text-[18px] font-semibold text-cw-txt mb-2">You're done!</h3>
                    <p className="text-[13px] text-cw-txt2 leading-relaxed mb-1">
                      {connectingIntg.name} is now connected to Codeward.
                    </p>
                    <p className="text-[12px] text-cw-txt3 mb-8">
                      We're syncing data, which may take a moment.
                    </p>
                    <button onClick={confirmDone} className="w-full py-2.5 bg-cw-blue hover:brightness-110 text-white rounded-lg text-[13px] font-semibold transition-all shadow-sm">
                      View integration details
                    </button>
                  </div>
                ) : (
                  /* ── INSTRUCTION STATE ── */
                  <>
                    {/* Glowing handshake */}
                    <div className="relative flex items-center justify-center py-10 shrink-0 overflow-hidden">
                      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, color-mix(in srgb, var(--cw-purple) 10%, transparent), transparent)' }} />
                      <div className="relative flex items-center gap-5 z-10">
                        {/* Integration logo — shrink slightly using padding since 3rd party SVGs lack intrinsic whitespace */}
                        <div className="w-12 h-12 flex items-center justify-center p-2.5">
                          <img src={connectingIntg.logoUrl} alt={connectingIntg.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-px bg-cw-bdr" />
                          <Link2 size={13} className="text-cw-txt3" />
                          <div className="w-4 h-px bg-cw-bdr" />
                        </div>
                        {/* Codeward logo — remove padding and scale slightly since the PNG has a lot of transparent padding baked in */}
                        <div className="w-12 h-12 flex items-center justify-center p-0">
                          <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" className="w-full h-full object-contain scale-125" />
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-6 flex flex-col gap-2.5">
                      {connectingIntg.id === 'workspace' ? (
                        <div className="flex flex-col items-center text-center mt-2">
                          <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="w-12 h-12 p-2 bg-white rounded-xl shadow-sm border border-cw-bdr flex items-center justify-center"><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-full h-full object-contain" /></div>
                            <div className="w-12 h-12 p-2 bg-white rounded-xl shadow-sm border border-cw-bdr flex items-center justify-center"><img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg" alt="Docs" className="w-full h-full object-contain" /></div>
                            <div className="w-12 h-12 p-2 bg-white rounded-xl shadow-sm border border-cw-bdr flex items-center justify-center"><img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Sheets" className="w-full h-full object-contain" /></div>
                            <div className="w-12 h-12 p-2 bg-white rounded-xl shadow-sm border border-cw-bdr flex items-center justify-center"><img src="https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png" alt="Calendar" className="w-full h-full object-contain" /></div>
                          </div>
                          <h4 className="text-[16px] font-semibold text-cw-txt mb-2">Unified Google Authorization</h4>
                          <p className="text-[13px] text-cw-txt2 leading-relaxed mb-6 px-2">
                            Codeward uses a single, secure OAuth flow for all Google applications. By connecting Google Workspace, you will authorize Codeward Agents to interact with your Drive files, Docs, Sheets, and Calendar all in one step.
                          </p>
                          <div className="flex gap-3.5 p-4 w-full text-left rounded-xl border border-cw-purple/40 bg-cw-bg2 shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-cw-purple text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">!</div>
                            <div>
                              <p className="text-[13px] font-medium text-cw-txt">Action required</p>
                              <p className="text-[12px] text-cw-txt2 mt-0.5">Click <span className="font-semibold text-cw-txt">Next</span> below to open the Google consent screen and grant access.</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[13px] font-semibold text-cw-txt mb-1">Connection instructions</p>

                          {connectingIntg.authType === 'oauth' ? (
                            <>
                              {[
                                { n: 1, active: connectStep === 'idle', title: <><span className="font-semibold">{connectingIntg.name}</span> will open in a new browser tab</>, sub: <span>If it doesn't open, <button className="text-cw-blue hover:underline">click here to retry</button>.</span> },
                                { n: 2, active: connectStep === 'polling', title: <>Follow {connectingIntg.name}'s authorization steps</>, sub: <span>Grant the requested permissions when prompted.</span> },
                                { n: 3, active: false, title: <>Click <span className="font-semibold">Next</span> below when finished</>, sub: null },
                              ].map(({ n, active, title, sub }) => (
                                <div key={n} className={`flex gap-3.5 p-4 rounded-xl border transition-all duration-200 ${active ? 'border-cw-purple/40 bg-cw-bg2 shadow-sm' : 'border-cw-bdr bg-cw-bg2 opacity-50'}`}>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${active ? 'bg-cw-purple text-white' : 'border border-cw-bdr text-cw-txt3'}`}>{n}</div>
                                  <div>
                                    <p className="text-[13px] text-cw-txt">{title}</p>
                                    {sub && <p className="text-[12px] text-cw-txt3 mt-0.5">{sub}</p>}
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <>
                              <div className="flex gap-3.5 p-4 rounded-xl border border-cw-purple/40 bg-cw-bg2 shadow-sm">
                                <div className="w-5 h-5 rounded-full bg-cw-purple text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</div>
                                <p className="text-[13px] text-cw-txt">
                                  Log into <span className="font-semibold">{connectingIntg.name}</span> and navigate to{' '}
                                  <span className="font-mono text-[11px] text-cw-blue bg-cw-bg border border-cw-bdr px-1.5 py-0.5 rounded">Org Settings → API Keys</span>
                                </p>
                              </div>
                              <div className="flex gap-3.5 p-4 rounded-xl border border-cw-bdr bg-cw-bg2">
                                <div className="w-5 h-5 rounded-full border border-cw-bdr text-cw-txt3 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</div>
                                <div className="flex-1 flex flex-col gap-2">
                                  <p className="text-[13px] font-medium text-cw-txt">Paste your credentials</p>
                                  <input 
                                    type="password" 
                                    placeholder="API Key" 
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all" 
                                  />
                                  {connectingIntg.id === 'datadog' && (
                                    <input 
                                      type="password" 
                                      placeholder="Application Key" 
                                      value={appKeyInput}
                                      onChange={(e) => setAppKeyInput(e.target.value)}
                                      className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all" 
                                    />
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Setup footer */}
              {connectStep !== 'done' && (
                <div className="px-6 py-4 border-t border-cw-bdr flex gap-3 shrink-0 bg-cw-bg">
                  <button onClick={() => { setConnectingIntg(null); setConnectStep('idle'); setApiKeyInput(''); setAppKeyInput(''); }} className="flex-1 py-2.5 rounded-lg border border-cw-bdr text-[13px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={async () => { 
                      setConnectStep('polling');
                      if (['gmail', 'workspace', 'calendar'].includes(connectingIntg.id)) {
                        window.location.href = `${API_URL}/api/integrations/google/${connectingIntg.id}/connect`;
                      } else if (connectingIntg.authType === 'oauth') {
                        window.location.href = `${API_URL}/api/integrations/${connectingIntg.id}/connect`;
                      } else if (connectingIntg.authType === 'apikey') {
                        try {
                          await fetch(`${API_URL}/api/integrations/${connectingIntg.id}/connect-key`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ apiKey: apiKeyInput, appKey: appKeyInput })
                          });
                          finishConnection();
                        } catch (e) {
                          console.error('Failed to save API keys:', e);
                          setConnectStep('idle');
                        }
                      } else {
                        setTimeout(finishConnection, 1000);
                      }
                    }}
                    disabled={connectStep === 'polling'}
                    className="flex-1 py-2.5 rounded-lg bg-cw-blue hover:brightness-110 text-white text-[13px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {connectStep === 'polling' ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : 'Next'}
                  </button>
                </div>
              )}
            </>

          ) : connectingMcp ? (
            /* ── MCP CONNECT FORM ── */
            <McpConnectionDrawer
              provider={connectingMcp.provider}
              onClose={() => setConnectingMcp(null)}
              onSaved={(_server) => {
                setMcpServers(prev => prev.map((m, i) =>
                  i === connectingMcp.index ? { ...m, connected: true } : m
                ));
                setConnectingMcp(null);
              }}
            />

          ) : (
            /* ── DETAILS / SETTINGS VIEW ── */
            settingsState?.type === 'mcp' ? (
            <>
              {/* Details header — uses the real logo */}
              <div className="px-5 py-4 border-b border-cw-bdr shrink-0 bg-cw-bg flex items-start justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {mcpServers[settingsState.id as number] && (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-cw-bdr p-1.5">
                      <img src={mcpServers[settingsState.id as number].logoUrl} alt={panelTitle} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-cw-txt truncate">{panelTitle}</div>
                    <div className="text-[11px] text-cw-txt3">{mcpServers[settingsState.id as number]?.desc}</div>
                  </div>
                </div>
                <button onClick={() => setSettingsState(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Details scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Agent Access */}
                <div>
                  <h3 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest mb-1">Agent Access</h3>
                  <p className="text-[12px] text-cw-txt3 mb-4">
                    Toggle which agents can use {panelTitle} tools.
                  </p>
                  <div className="flex flex-col gap-2">
                    {activeAgents.length > 0 ? activeAgents.map((agent, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-cw-bdr bg-cw-bg2">
                        <div className="pr-4">
                          <div className="flex items-center gap-2 text-[13px] text-cw-txt font-medium mb-0.5">
                            <Bot size={13} className="text-cw-txt3" /> {agent.name}
                          </div>
                          <p className="text-[12px] text-cw-txt2 ml-[21px]">{agent.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleAgent(currentId, i, isMcp)}
                          className={`shrink-0 w-[36px] h-[22px] rounded-full relative transition-colors ${agent.on ? 'bg-cw-blue' : 'bg-cw-bg2 border border-cw-bdr'}`}
                        >
                          <div className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all duration-200 shadow-sm ${agent.on ? 'left-[18px]' : 'left-[2px] border border-cw-bdr'}`} />
                        </button>
                      </div>
                    )) : (
                      <p className="text-[12px] text-cw-txt3 italic p-4 text-center border border-cw-bdr border-dashed rounded-lg">No agents mapped yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : settingsState?.type === 'integration' ? (
            <IntegrationSettingsDrawer
              integration={activeIntg}
              catalog={activeIntg}
              isOpen={true}
              onClose={() => setSettingsState(null)}
              onDisconnected={() => {
                setIntegrations(prev => prev.map(i => i.id === activeIntg?.id ? { ...i, connected: false, connectedAccount: undefined } : i));
                setSettingsState(null);
              }}
            />
          ) : requestDrawerOpen ? (
            <ConnectorRequestDrawer 
              isOpen={true}
              onClose={() => setRequestDrawerOpen(false)}
            />
          ) : null
          )
        )}
      </div>
    </div>
  );
}
