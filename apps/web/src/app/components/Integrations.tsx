import { useState, useEffect } from 'react';
import {
  LayoutGrid, List, Plus, Settings as SettingsIcon, Book, CheckSquare,
  Bot, X, Loader2, Zap, Terminal, Shield, CheckCircle2, Cpu, Link2,
  Keyboard
} from 'lucide-react';

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
  connected: boolean;
}

const initialIntegrations: Integration[] = [
  {
    id: 'linear', name: 'Linear', logoUrl: 'https://cdn.simpleicons.org/linear',
    connected: true, authType: 'oauth', connectedAccount: 'engineering@codeward.ai',
    desc: 'Aggregates ticket context and auto-files bug reports with AST-level root cause analysis.',
    features: [
      { title: 'Contextual PR Reviews', desc: 'Agents pull acceptance criteria directly from Linear tickets to verify PR completeness.' },
      { title: 'Autonomous Bug Filing', desc: 'Build failures on main automatically generate detailed tickets with AST-level root cause analysis.' },
    ],
    tools: [
      { label: 'Extract acceptance criteria', desc: 'Pull testable requirements from a Linear issue into the review context.' },
      { label: 'Create bug ticket', desc: 'File a new issue with priority, description, and suspected code location.' },
      { label: 'Search issues by keyword', desc: 'Find relevant tickets based on branch name or commit message.' },
      { label: 'Update issue status', desc: 'Move a ticket to In Progress or Done when a PR is merged.' },
    ],
    commands: [
      { label: 'Open Linear issue', desc: 'Jump to the ticket linked to the current branch.' },
      { label: 'Show my active issues', desc: 'List all tickets currently assigned to you.' },
    ],
  },
  {
    id: 'slack', name: 'Slack', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    connected: true, authType: 'oauth', connectedAccount: 'Codeward HQ Workspace',
    desc: 'PR review threads with per-agent replies, plus in-channel chat with the Chat Agent.',
    features: [
      { title: 'Human-in-the-loop Approvals', desc: 'Agents halt high-risk workflows and send interactive Approve / Reject messages to staff engineers.' },
      { title: 'Incident War Rooms', desc: 'Security Agent automatically creates dedicated channels and pages on-call engineers during active zero-days.' },
    ],
    tools: [
      { label: 'Request human approval', desc: 'Send an interactive Approve/Reject message that blocks the agent until responded to.' },
      { label: 'Post PR review thread', desc: 'Open a threaded review with findings from all participating agents.' },
      { label: 'Create incident channel', desc: 'Spin up a temporary war room and invite relevant code owners.' },
      { label: 'Send direct message', desc: 'DM an on-call engineer with a critical alert.' },
    ],
    commands: [
      { label: 'Open active incident channel', desc: 'Navigate to the most recent incident war room.' },
      { label: 'Show pending approvals', desc: 'List all agent workflows waiting for your sign-off.' },
    ],
  },
  {
    id: 'datadog', name: 'Datadog', logoUrl: 'https://cdn.simpleicons.org/datadog',
    connected: false, authType: 'apikey',
    desc: 'Ingests production alerts so the Performance Agent can auto-detect and revert latency regressions.',
    features: [
      { title: 'Autonomous Rollbacks', desc: 'Deploy Manager reverts canary deployments the moment error rates breach defined SLOs.' },
      { title: 'Flamegraph Analysis', desc: 'Performance Agent maps CPU spikes from the profiler directly back to lines of code in the PR.' },
    ],
    tools: [
      { label: 'Query distributed traces', desc: 'Fetch trace data to identify which service function is bottlenecking.' },
      { label: 'Get profiling flamegraph', desc: 'Pull CPU/memory flamegraphs scoped to a specific commit SHA.' },
      { label: 'Trigger deployment rollback', desc: 'Execute an emergency rollback on the active deployment via the API.' },
      { label: 'List active monitors', desc: 'Check which SLO alerts are currently firing in production.' },
    ],
    commands: [
      { label: 'Open APM dashboard', desc: 'Launch the Datadog APM view for the current service.' },
      { label: 'Show SLO status', desc: 'Check current error budget burn rate across all services.' },
    ],
  },
  {
    id: 'figma', name: 'Figma', logoUrl: 'https://cdn.simpleicons.org/figma',
    connected: false, authType: 'oauth',
    desc: 'Prevents visual drift by cross-referencing PR component changes against design system tokens.',
    features: [
      { title: 'Visual Drift Prevention', desc: 'Frontend Guardian asserts every code change matches the Figma source of truth.' },
      { title: 'Design Token Sync', desc: 'Agents extract token values directly from Figma nodes so CSS variables stay in sync.' },
    ],
    tools: [
      { label: 'Extract design tokens', desc: 'Pull color, spacing, and typography values from a Figma node.' },
      { label: 'Assert visual compliance', desc: 'Flag hardcoded values in a PR that deviate from design system variables.' },
      { label: 'Fetch component spec', desc: 'Retrieve the full spec of a component from a Figma file by node ID.' },
    ],
    commands: [
      { label: 'Open component in Figma', desc: 'Jump to the Figma frame for the component in the current file.' },
    ],
  },
  {
    id: 'workspace', name: 'Google Workspace', logoUrl: 'https://cdn.simpleicons.org/google',
    connected: false, authType: 'oauth',
    desc: 'Lets agents cross-reference PRDs in Docs, analyze data in Sheets, and export audit PDFs to Drive.',
    features: [
      { title: 'PRD Compliance Verification', desc: 'Architecture Agent ensures all implementations strictly adhere to the agreed spec in Docs.' },
      { title: 'Automated Audit Exports', desc: 'Compliance Agent generates ISO-ready audit reports and saves them as PDFs to Drive.' },
    ],
    tools: [
      { label: 'Parse PRD to spec', desc: 'Extract structured requirements from a Google Doc using NLP.' },
      { label: 'Verify ADR compliance', desc: 'Cross-reference agreed architectural patterns against the PR code.' },
      { label: 'Read spreadsheet data', desc: 'Pull metrics or configuration data from a specific Sheets range.' },
      { label: 'Export report to Drive', desc: 'Generate a formatted PDF and save it to a specified Drive folder.' },
    ],
    commands: [
      { label: 'Open linked PRD', desc: 'Open the Product Requirements Doc for the current project.' },
      { label: 'Show audit folder', desc: 'Navigate to the Drive folder containing compliance exports.' },
    ],
  },
  {
    id: 'sentry', name: 'Sentry', logoUrl: 'https://cdn.simpleicons.org/sentry',
    connected: false, authType: 'oauth',
    desc: 'Lets agents check live production errors for files in the current diff.',
    features: [
      { title: 'Code-to-Error Mapping', desc: 'Maps production stack traces directly to the exact AST nodes modified in the PR.' },
      { title: 'Auto-resolution Tracking', desc: 'Links the AI-generated fix PR to the Sentry issue for automatic closure on merge.' },
    ],
    tools: [
      { label: 'Fetch issue stack trace', desc: 'Retrieve a raw JSON stack trace with local variable state from an exception.' },
      { label: 'Map trace to source', desc: 'Resolve minified stack frames to repository file paths using sourcemaps.' },
      { label: 'Link PR to issue', desc: 'Attach PR metadata to a Sentry issue so it auto-resolves on merge.' },
      { label: 'Search issues by file', desc: 'Find active Sentry errors that touch a specific file path.' },
    ],
    commands: [
      { label: 'Open active issues', desc: 'Launch Sentry filtered to unresolved issues for this project.' },
    ],
  },
  {
    id: 'gmail', name: 'Gmail', logoUrl: 'https://cdn.simpleicons.org/gmail',
    connected: true, authType: 'oauth', connectedAccount: 'admin@codeward.ai',
    desc: 'Sends weekly executive summaries and compliance digests to leadership inboxes.',
    features: [
      { title: 'Executive Summaries', desc: 'Compiles and emails weekly team health, velocity, and code quality metrics to leadership.' },
      { title: 'Compliance Alerts', desc: 'Sends signed PII/GDPR digests directly to legal and compliance teams.' },
    ],
    tools: [
      { label: 'Send summary email', desc: 'Dispatch a formatted HTML email with agent-generated report content.' },
      { label: 'Send compliance digest', desc: 'Email a signed, structured compliance report to specified recipients.' },
      { label: 'Read vendor responses', desc: 'Parse replies from external vendor compliance questionnaires.' },
    ],
    commands: [
      { label: 'Send weekly summary now', desc: 'Manually trigger this week\'s executive summary to be dispatched.' },
    ],
  },
  {
    id: 'whatsapp', name: 'WhatsApp / SMS', logoUrl: 'https://cdn.simpleicons.org/whatsapp',
    connected: false, authType: 'apikey',
    desc: 'Critical pager via Sent API — only fires on a CRITICAL finding that blocks a PR.',
    features: [
      { title: 'Critical Incident Paging', desc: 'Bypasses all standard channels to immediately reach the on-call engineer during a P0 incident.' },
    ],
    tools: [
      { label: 'Dispatch critical page', desc: 'Send an immediate SMS/WhatsApp to the on-call engineer with the incident summary.' },
    ],
    commands: [
      { label: 'Page on-call now', desc: 'Manually trigger an emergency page to the current on-call rotation.' },
    ],
  },
  {
    id: 'calendar', name: 'Calendar', logoUrl: 'https://cdn.simpleicons.org/googlecalendar',
    connected: false, authType: 'oauth',
    desc: 'Schedules approval windows and compliance reviews around working hours.',
    features: [
      { title: 'Context-Aware Deployment', desc: 'Deploy Manager avoids merging to production outside defined working hours.' },
    ],
    tools: [
      { label: 'Check team availability', desc: 'Query the shared calendar to confirm if working hours are active.' },
      { label: 'Schedule architecture review', desc: 'Find the next available slot and create a review meeting event.' },
      { label: 'List upcoming events', desc: 'Retrieve the calendar schedule for the next 24 hours.' },
    ],
    commands: [
      { label: 'Show today\'s schedule', desc: 'Display all events from the team calendar for today.' },
      { label: 'Check deploy window', desc: 'Verify if the current time falls inside an approved deployment window.' },
    ],
  },
];

const initialAgentsByIntegration: Record<string, AgentAccess[]> = {
  gmail: [
    { name: 'Data & DX Agent', desc: 'Sends weekly team health summary', on: true },
    { name: 'Compliance Agent', desc: 'Sends PII / GDPR digests to legal', on: true },
  ],
  workspace: [
    { name: 'Architecture Agent', desc: 'Cross-references PRDs and ADRs in Docs', on: false },
    { name: 'Documentation Agent', desc: 'Exports audit reports as PDFs to Drive', on: false },
  ],
  slack: [
    { name: 'Guardian Agent', desc: 'Posts PR review thread', on: true },
    { name: 'Security Agent', desc: 'Threaded reply with findings', on: true },
    { name: 'Performance Agent', desc: 'Threaded reply with findings', on: true },
    { name: 'Chat Agent', desc: 'Replies to developer questions in-thread', on: true },
  ],
  linear: [
    { name: 'Architecture Agent', desc: 'Pulls acceptance criteria for PR review', on: true },
    { name: 'Chat Agent', desc: 'Fetches issue context for user questions', on: true },
    { name: 'Broken Code Agent', desc: 'Auto-files bugs on main branch test failures', on: true },
  ],
  figma: [
    { name: 'Frontend Guardian Agent', desc: 'Checks CSS changes against design tokens', on: false },
  ],
  datadog: [
    { name: 'Performance Agent', desc: 'Auto-reverts PRs causing latency spikes', on: true },
    { name: 'Deploy Manager', desc: 'Pauses deploys during active alerts', on: true },
    { name: 'Broken Code Agent', desc: 'Analyzes stack traces from APM', on: false },
  ],
  sentry: [
    { name: 'Broken Code Agent', desc: 'Checks active errors for files in diff', on: true },
    { name: 'Performance Agent', desc: 'Checks latency regressions in diff', on: true },
  ],
  whatsapp: [
    { name: 'Security Agent', desc: 'Critical secret or key exposure', on: true },
    { name: 'Performance Agent', desc: 'Catastrophic memory leak detected', on: true },
  ],
  calendar: [
    { name: 'Deploy Manager', desc: 'Approval windows aligned to working hours', on: true },
  ],
};

const initialMcpServers: McpServer[] = [
  { name: 'Internal Wiki MCP', icon: Book, connected: true },
  { name: 'Corporate Jira MCP', icon: CheckSquare, connected: false },
];

const defaultMcpAgents: AgentAccess[] = [
  { name: 'Security Agent', desc: 'Can read configuration from this MCP', on: true },
  { name: 'Architecture Agent', desc: 'Can fetch architectural guidelines', on: true },
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
  const [connectingIntg, setConnectingIntg] = useState<Integration | null>(null);
  const [connectStep, setConnectStep] = useState<'idle' | 'polling' | 'done'>('idle');

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

  const toggleConnect = (intg: Integration) => {
    if (intg.connected) {
      setIntegrations(prev => prev.map(i => i.id === intg.id ? { ...i, connected: false, connectedAccount: undefined } : i));
      if (settingsState?.type === 'integration' && settingsState.id === intg.id) setSettingsState(null);
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
    setMcpServers(prev => prev.map((mcp, i) => i === index ? { ...mcp, connected: !mcp.connected } : mcp));
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

  const drawerOpen = !!(settingsState || connectingIntg);

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">

      {/* ── Main scrollable list ── */}
      <div className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="p-8 max-w-[1000px] mx-auto pb-16">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[18px] font-semibold text-cw-txt">Platform Integrations</h2>
              <p className="text-[12px] text-cw-txt2 mt-1">Connect external tools to expand Codeward Agent capabilities.</p>
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
                const Icon = mcp.icon;
                const isSelected = settingsState?.type === 'mcp' && settingsState.id === i;
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-cw-purple bg-cw-bg' : 'border-cw-bdr bg-cw-bg2'}`}>
                    <div className="w-8 h-8 rounded-md bg-cw-bg border border-cw-bdr flex items-center justify-center text-cw-txt2 shrink-0"><Icon size={15} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-cw-txt">{mcp.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${mcp.connected ? 'bg-cw-green' : 'bg-cw-bdr'}`} />
                      </div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5">Custom internal connection</div>
                    </div>
                    <button onClick={() => handleMcpConnect(i)} className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors ${mcp.connected ? 'border-cw-red/30 text-cw-red hover:bg-cw-red/10' : 'border-cw-bdr bg-cw-bg text-cw-txt hover:bg-cw-bg3'}`}>
                      {mcp.connected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button onClick={() => { if (!mcp.connected) return; setSettingsState(isSelected ? null : { type: 'mcp', id: i }); }} disabled={!mcp.connected} className={`w-8 h-8 flex items-center justify-center rounded-md border transition-colors ${isSelected ? 'border-cw-purple bg-cw-purple text-white' : mcp.connected ? 'border-cw-bdr bg-cw-bg text-cw-txt2 hover:bg-cw-bg3' : 'border-cw-bdr bg-cw-bg text-cw-txt3 opacity-40 cursor-not-allowed'}`}>
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

        </div>
      </div>

      {/* ── Right side-pull drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${drawerOpen ? 'w-[440px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
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
                              <input type="password" placeholder="API Key" className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all" />
                              {connectingIntg.id === 'datadog' && (
                                <input type="password" placeholder="Application Key" className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all" />
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Setup footer */}
              {connectStep !== 'done' && (
                <div className="px-6 py-4 border-t border-cw-bdr flex gap-3 shrink-0 bg-cw-bg">
                  <button onClick={() => { setConnectingIntg(null); setConnectStep('idle'); }} className="flex-1 py-2.5 rounded-lg border border-cw-bdr text-[13px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => { setConnectStep('polling'); setTimeout(finishConnection, 1000); }}
                    disabled={connectStep === 'polling'}
                    className="flex-1 py-2.5 rounded-lg bg-cw-blue hover:brightness-110 text-white text-[13px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {connectStep === 'polling' ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : 'Next'}
                  </button>
                </div>
              )}
            </>

          ) : (
            /* ── DETAILS VIEW ── */
            <>
              {/* Details header */}
              <div className="px-5 py-5 border-b border-cw-bdr flex items-start justify-between shrink-0 bg-cw-bg">
                {activeIntg ? (
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 flex items-center justify-center p-1 shrink-0">
                      <img src={activeIntg.logoUrl} alt={activeIntg.name} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-cw-txt flex items-center gap-1.5">
                        {activeIntg.name}
                        {activeIntg.connected && <CheckCircle2 size={14} className="text-cw-green" />}
                      </h3>
                      <p className="text-[12px] text-cw-txt2 mt-0.5 flex items-center gap-1">
                        {activeIntg.connected
                          ? <><Shield size={11} className="text-cw-blue" /> {activeIntg.connectedAccount}</>
                          : <span className="text-cw-txt3">Not connected</span>
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-[15px] font-semibold text-cw-txt">{panelTitle}</h3>
                    <p className="text-[12px] text-cw-txt2 mt-0.5">Custom MCP server</p>
                  </div>
                )}
                <button onClick={() => setSettingsState(null)} className="w-8 h-8 shrink-0 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                  <X size={15} />
                </button>
              </div>

              {/* Details scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* Connect CTA if disconnected */}
                {activeIntg && !activeIntg.connected && (
                  <div className="p-5 border-b border-cw-bdr bg-cw-bg">
                    <p className="text-[12px] text-cw-txt2 mb-3 leading-relaxed">{activeIntg.desc}</p>
                    <button onClick={() => { setSettingsState(null); toggleConnect(activeIntg!); }} className="w-full py-2.5 bg-cw-blue hover:brightness-110 text-white rounded-lg text-[13px] font-semibold transition-all">
                      Connect {activeIntg.name}
                    </button>
                  </div>
                )}

                {/* Features */}
                {activeIntg && (
                  <div className="px-5 py-5 border-b border-cw-bdr bg-cw-bg">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap size={13} className="text-cw-purple" />
                      <h4 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest">Features</h4>
                    </div>
                    <div className="flex flex-col gap-4">
                      {activeIntg.features.map((f, i) => (
                        <div key={i} className="flex gap-3">
                          <CheckCircle2 size={14} className="text-cw-green shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[13px] font-medium text-cw-txt">{f.title}</p>
                            <p className="text-[12px] text-cw-txt2 mt-0.5 leading-relaxed">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools — ClickUp style: human-readable action names */}
                {activeIntg && (
                  <div className="px-5 py-5 border-b border-cw-bdr bg-cw-bg">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal size={13} className="text-cw-amber" />
                      <h4 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest">Tools</h4>
                    </div>
                    <p className="text-[12px] text-cw-txt3 mb-4">See and update {activeIntg.name} data with AI.</p>
                    <div className="flex flex-col gap-0">
                      {activeIntg.tools.map((t, i) => (
                        <div key={i} className="flex items-start gap-3 py-3 border-b border-cw-bdr/50 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-cw-bdr shrink-0 mt-[7px]" />
                          <div>
                            <p className="text-[13px] font-medium text-cw-txt">{t.label}</p>
                            <p className="text-[12px] text-cw-txt2 mt-0.5">{t.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commands */}
                {activeIntg && activeIntg.commands.length > 0 && (
                  <div className="px-5 py-5 border-b border-cw-bdr bg-cw-bg">
                    <div className="flex items-center gap-2 mb-4">
                      <Keyboard size={13} className="text-cw-teal" />
                      <h4 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest">Commands</h4>
                    </div>
                    <div className="flex flex-col gap-0">
                      {activeIntg.commands.map((c, i) => (
                        <div key={i} className="flex items-start gap-3 py-3 border-b border-cw-bdr/50 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-cw-bdr shrink-0 mt-[7px]" />
                          <div>
                            <p className="text-[13px] font-medium text-cw-txt">{c.label}</p>
                            <p className="text-[12px] text-cw-txt2 mt-0.5">{c.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Access */}
                <div className="px-5 py-5 bg-cw-bg">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu size={13} className="text-cw-blue" />
                    <h4 className="text-[12px] font-semibold text-cw-txt uppercase tracking-widest">Agent Access</h4>
                  </div>
                  <p className="text-[12px] text-cw-txt3 mb-4">
                    Toggle which agents can use {activeIntg?.name || panelTitle} tools.
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
                          disabled={!activeIntg?.connected && !isMcp}
                          onClick={() => toggleAgent(currentId, i, isMcp)}
                          className={`shrink-0 w-[36px] h-[22px] rounded-full relative transition-colors ${!activeIntg?.connected && !isMcp ? 'opacity-40 cursor-not-allowed bg-cw-bg2 border border-cw-bdr' : agent.on ? 'bg-cw-blue' : 'bg-cw-bg2 border border-cw-bdr'}`}
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
          )
        )}
      </div>

    </div>
  );
}
