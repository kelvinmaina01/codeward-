import { useState, useEffect } from 'react';
import {
  LayoutGrid, List, Mail, HardDrive, MessageCircle, Hash, Bug,
  Calendar, Settings as SettingsIcon, Book, CheckSquare, Plus,
  Bot, X
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  logoUrl: string;
  connected: boolean;
  desc: string;
}

interface AgentAccess {
  name: string;
  desc: string;
  on: boolean;
}

interface McpServer {
  name: string;
  icon: React.ElementType;
  connected: boolean;
}

const initialIntegrations: Integration[] = [
  { id: 'gmail', name: 'Gmail', logoUrl: 'https://cdn.simpleicons.org/gmail', connected: true, desc: 'Sends weekly executive summaries and compliance digests to leadership inboxes.' },
  { id: 'gdrive', name: 'Google Drive', logoUrl: 'https://cdn.simpleicons.org/googledrive', connected: false, desc: 'Lets the Architecture Agent cross-reference PRDs and ADRs against code, and exports audit PDFs.' },
  { id: 'whatsapp', name: 'WhatsApp / SMS', logoUrl: 'https://cdn.simpleicons.org/whatsapp', connected: true, desc: 'Critical pager via Sent API — only fires on a CRITICAL finding that blocks a PR.' },
  { id: 'slack', name: 'Slack', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg', connected: true, desc: 'PR review threads with per-agent replies, plus in-channel chat with the Chat Agent.' },
  { id: 'sentry', name: 'Sentry', logoUrl: 'https://cdn.simpleicons.org/sentry', connected: false, desc: 'Lets agents check live production errors for files in the current diff.' },
  { id: 'calendar', name: 'Calendar', logoUrl: 'https://cdn.simpleicons.org/googlecalendar', connected: false, desc: 'Schedules approval windows and compliance reviews around working hours.' },
];

const initialAgentsByIntegration: Record<string, AgentAccess[]> = {
  gmail: [
    { name: 'Data & DX Agent', desc: 'Sends weekly team health summary', on: true },
    { name: 'Compliance Agent', desc: 'Sends PII / GDPR digests to legal', on: true },
    { name: 'Guardian Agent', desc: 'Email fallback for PR reviews', on: false },
  ],
  gdrive: [
    { name: 'Architecture Agent', desc: 'Cross-references PRDs and ADRs', on: false },
    { name: 'Documentation Agent', desc: 'Exports audit reports as PDFs', on: false },
    { name: 'Compliance Agent', desc: 'Stores audit trail records', on: false },
  ],
  whatsapp: [
    { name: 'Security Agent', desc: 'Critical secret or key exposure', on: true },
    { name: 'Performance Agent', desc: 'Catastrophic memory leak detected', on: true },
    { name: 'Broken Code Agent', desc: 'Build-breaking regression on main', on: false },
  ],
  slack: [
    { name: 'Guardian Agent', desc: 'Posts PR review thread', on: true },
    { name: 'Security Agent', desc: 'Threaded reply with findings', on: true },
    { name: 'Performance Agent', desc: 'Threaded reply with findings', on: true },
    { name: 'Chat Agent', desc: 'Replies to developer questions in-thread', on: true },
  ],
  sentry: [
    { name: 'Broken Code Agent', desc: 'Checks active errors for files in diff', on: true },
    { name: 'Performance Agent', desc: 'Checks latency regressions in diff', on: true },
    { name: 'Documentation Agent', desc: 'No production context needed', on: false },
  ],
  calendar: [
    { name: 'Deploy Manager', desc: 'Approval windows aligned to working hours', on: true },
    { name: 'Compliance Agent', desc: 'Schedules audit review meetings', on: false },
  ],
};

const initialMcpServers: McpServer[] = [
  { name: 'Internal Wiki MCP', icon: Book, connected: true },
  { name: 'Corporate Jira MCP', icon: CheckSquare, connected: false },
];

const defaultMcpAgents: AgentAccess[] = [
  { name: 'Security Agent', desc: 'Can read configuration from this MCP', on: true },
  { name: 'Architecture Agent', desc: 'Can fetch architectural guidelines', on: true },
  { name: 'Documentation Agent', desc: 'Can read/write documentation to this MCP', on: false },
  { name: 'Data & DX Agent', desc: 'Can sync metrics', on: true },
];

export function Integrations() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [agentsByIntegration, setAgentsByIntegration] = useState(initialAgentsByIntegration);
  const [mcpServers, setMcpServers] = useState(initialMcpServers);
  const [mcpAgents, setMcpAgents] = useState<Record<number, AgentAccess[]>>({
    0: [...defaultMcpAgents],
    1: [...defaultMcpAgents]
  });
  
  const [settingsState, setSettingsState] = useState<{ type: 'integration' | 'mcp', id: string | number } | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsState(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const toggleConnect = (id: string) => {
    setIntegrations(prev => prev.map(intg => 
      intg.id === id ? { ...intg, connected: !intg.connected } : intg
    ));
    if (settingsState?.type === 'integration' && settingsState.id === id) setSettingsState(null);
  };

  const toggleMcp = (index: number) => {
    setMcpServers(prev => prev.map((mcp, i) => 
      i === index ? { ...mcp, connected: !mcp.connected } : mcp
    ));
    if (settingsState?.type === 'mcp' && settingsState.id === index) setSettingsState(null);
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
        updated[indexOrId as number] = updated[indexOrId as number].map((a, i) => 
          i === agentIndex ? { ...a, on: !a.on } : a
        );
        return updated;
      });
    } else {
      setAgentsByIntegration(prev => {
        const updated = { ...prev };
        updated[indexOrId as string] = updated[indexOrId as string].map((a, i) => 
          i === agentIndex ? { ...a, on: !a.on } : a
        );
        return updated;
      });
    }
  };

  let panelTitle = '';
  let activeAgents: AgentAccess[] = [];
  let currentId: string | number = '';
  let isMcp = false;

  if (settingsState?.type === 'integration') {
    const intg = integrations.find(i => i.id === settingsState.id);
    if (intg) {
      panelTitle = `Agent Access — ${intg.name}`;
      activeAgents = agentsByIntegration[settingsState.id as string] || [];
      currentId = settingsState.id;
    }
  } else if (settingsState?.type === 'mcp') {
    const mcp = mcpServers[settingsState.id as number];
    if (mcp) {
      panelTitle = `Agent Access — ${mcp.name}`;
      activeAgents = mcpAgents[settingsState.id as number] || [];
      currentId = settingsState.id;
      isMcp = true;
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      {/* Main Left Content */}
      <div className="flex-1 overflow-y-auto w-full transition-all duration-300">
        <div className="p-8 max-w-[1000px] mx-auto pb-16">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[18px] font-semibold text-cw-txt">Platform Integrations</h2>
              <p className="text-[12px] text-cw-txt2 mt-1">Connect external tools (GitHub is native and excluded from this list).</p>
            </div>
            <div className="flex border border-cw-bdr rounded-md overflow-hidden">
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors ${viewMode === 'grid' ? 'bg-cw-bg3 text-cw-txt font-medium' : 'bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3'}`}
              >
                <LayoutGrid size={14} /> Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors border-l border-cw-bdr ${viewMode === 'list' ? 'bg-cw-bg3 text-cw-txt font-medium' : 'bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3'}`}
              >
                <List size={14} /> List
              </button>
            </div>
          </div>

          {/* Platform Integrations */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
            {integrations.map(intg => {
              const bgOpacityClass = intg.connected ? 'bg-cw-bg' : 'bg-cw-bg2';
              const isSelected = settingsState?.type === 'integration' && settingsState.id === intg.id;
              
              return (
                <div key={intg.id} className={`border ${isSelected ? 'border-cw-purple shadow-sm' : 'border-cw-bdr'} rounded-lg p-4 transition-all duration-300 ${bgOpacityClass} ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                  <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1 min-w-0' : ''}>
                    
                    {/* Icon & Title Row */}
                    <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border border-cw-bdr bg-cw-bg p-2 shadow-sm">
                          <img src={intg.logoUrl} alt={intg.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="text-[14px] font-medium text-cw-txt">{intg.name}</div>
                      </div>
                      {viewMode === 'grid' && (
                        <div className={`w-2 h-2 rounded-full ${intg.connected ? 'bg-[#16A34A]' : 'bg-cw-bdr'}`} />
                      )}
                    </div>
                    
                    {/* Description */}
                    <div className={`text-[12px] text-cw-txt2 leading-relaxed ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      {intg.desc}
                    </div>
                    {viewMode === 'list' && (
                      <div className={`w-2 h-2 rounded-full shrink-0 mx-2 ${intg.connected ? 'bg-[#16A34A]' : 'bg-cw-bdr'}`} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-2 shrink-0 ${viewMode === 'grid' ? 'mt-4' : ''}`}>
                    <button 
                      onClick={() => toggleConnect(intg.id)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
                        intg.connected 
                          ? 'border-cw-red/30 text-cw-red hover:bg-cw-red/10' 
                          : 'border-cw-blue bg-cw-blue text-white hover:brightness-110'
                      }`}
                    >
                      {intg.connected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button 
                      onClick={() => {
                        if (!intg.connected) return;
                        setSettingsState(isSelected ? null : { type: 'integration', id: intg.id });
                      }}
                      disabled={!intg.connected}
                      className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors ${
                        isSelected 
                          ? 'border-cw-purple bg-cw-purple text-white' 
                          : intg.connected 
                            ? 'border-cw-bdr bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3 cursor-pointer' 
                            : 'border-cw-bdr bg-cw-bg text-cw-txt3 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <SettingsIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MCP Servers */}
          <div className="mt-10 mb-4">
            <h2 className="text-[14px] font-semibold text-cw-txt uppercase tracking-wider mb-3">Model Context Protocol (MCP) Servers</h2>
            <div className="flex flex-col gap-2">
              {mcpServers.map((mcp, i) => {
                const Icon = mcp.icon;
                const isSelected = settingsState?.type === 'mcp' && settingsState.id === i;
                
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-cw-purple bg-cw-bg shadow-sm' : 'border-cw-bdr bg-cw-bg2'}`}>
                    <div className="w-8 h-8 rounded-md bg-cw-bg border border-cw-bdr flex items-center justify-center text-cw-txt2 shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-cw-txt">{mcp.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${mcp.connected ? 'bg-[#16A34A]' : 'bg-cw-bdr'}`} />
                      </div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">Custom internal connection</div>
                    </div>
                    <button 
                      onClick={() => toggleMcp(i)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${
                        mcp.connected 
                          ? 'border-cw-red/30 text-cw-red hover:bg-cw-red/10' 
                          : 'border-cw-bdr bg-cw-bg text-cw-txt hover:bg-cw-bg3'
                      }`}
                    >
                      {mcp.connected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button 
                      onClick={() => {
                        if (!mcp.connected) return;
                        setSettingsState(isSelected ? null : { type: 'mcp', id: i });
                      }}
                      disabled={!mcp.connected}
                      className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors ${
                        isSelected 
                          ? 'border-cw-purple bg-cw-purple text-white' 
                          : mcp.connected 
                            ? 'border-cw-bdr bg-cw-bg text-cw-txt2 hover:bg-cw-bg3 cursor-pointer' 
                            : 'border-cw-bdr bg-cw-bg text-cw-txt3 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <SettingsIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button 
              onClick={addMcp}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-cw-txt2 hover:text-cw-txt transition-colors"
            >
              <Plus size={14} /> Add MCP server
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Settings Panel (Flex Sibling) */}
      <div 
        className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${settingsState ? 'w-[440px] min-w-[320px] lg:w-[440px] md:w-[380px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}
      >
        {settingsState && (
          <>
            <div className="px-6 py-5 border-b border-cw-bdr flex items-start justify-between bg-cw-bg shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-[15px] font-semibold text-cw-txt truncate">{panelTitle}</h3>
                <p className="text-[12px] text-cw-txt2 mt-1">Choose which agents can read from or act on {settingsState?.type === 'integration' ? integrations.find(i => i.id === settingsState.id)?.name : mcpServers[settingsState.id as number]?.name}.</p>
              </div>
              <button 
                onClick={() => setSettingsState(null)} 
                className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-cw-bg">
              <div className="flex flex-col">
                {activeAgents.map((agent, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-cw-bdr/50 last:border-0">
                    <div className="pr-4">
                      <div className="flex items-center gap-2 text-[13px] text-cw-txt font-medium">
                        <Bot size={15} className="text-cw-txt3" /> {agent.name}
                      </div>
                      <div className="text-[12px] text-cw-txt2 ml-6 mt-1 leading-snug">{agent.desc}</div>
                    </div>
                    <button
                      onClick={() => toggleAgent(currentId, i, isMcp)}
                      className={`shrink-0 w-[36px] h-[22px] rounded-full relative transition-colors ${agent.on ? 'bg-[#3B6FD4]' : 'bg-cw-bg2 border border-cw-bdr'}`}
                    >
                      <div className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all duration-200 shadow-sm ${agent.on ? 'left-[18px]' : 'left-[2px] border border-cw-bdr'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
