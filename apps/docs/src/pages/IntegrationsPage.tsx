import {
  Bug01Icon,
  Calendar01Icon,
  ServerStack01Icon,
  CheckListIcon,
  Shield01Icon,
  ConnectIcon,
} from 'hugeicons-react';

interface Integration {
  id: string;
  name: string;
  logoUrl: string;
  connected: boolean;
  desc: string;
  accentColor: string;
  category: string;
  agents: string[];
}

const integrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    logoUrl: 'https://cdn.simpleicons.org/github/ffffff',
    connected: true,
    desc: 'Native integration. Intercepts every PR, posts inline comments, creates Issues, and runs Check Runs that can block merges.',
    accentColor: 'var(--cw-txt)',
    category: 'Native (Always On)',
    agents: ['Guardian Agent', 'All Analyzer Agents'],
  },
  {
    id: 'slack',
    name: 'Slack',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    connected: true,
    desc: 'PR review threads with per-agent replies posted directly in your channels. Includes in-channel chat with the Chat Agent.',
    accentColor: 'var(--cw-purple)',
    category: 'Notifications',
    agents: ['Guardian Agent', 'Security Agent', 'Performance Agent', 'Chat Agent'],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    logoUrl: 'https://cdn.simpleicons.org/gmail',
    connected: true,
    desc: 'Sends weekly executive summaries and compliance digests to leadership inboxes. Email fallback for PR reviews.',
    accentColor: 'var(--cw-red)',
    category: 'Notifications',
    agents: ['Data & DX Agent', 'Compliance Agent', 'Guardian Agent'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp / SMS',
    logoUrl: 'https://cdn.simpleicons.org/whatsapp',
    connected: true,
    desc: 'Critical pager via Sent API — only fires on a CRITICAL finding that blocks a PR. Never used for routine notifications.',
    accentColor: 'var(--cw-green)',
    category: 'Notifications',
    agents: ['Security Agent', 'Performance Agent', 'Broken Code Agent'],
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    logoUrl: 'https://cdn.simpleicons.org/googledrive',
    connected: false,
    desc: 'Lets the Architecture Agent cross-reference PRDs and ADRs against code. Also exports full audit PDFs to your Drive.',
    accentColor: 'var(--cw-blue)',
    category: 'Data & Storage',
    agents: ['Architecture Agent', 'Documentation Agent', 'Compliance Agent'],
  },
  {
    id: 'sentry',
    name: 'Sentry',
    logoUrl: 'https://cdn.simpleicons.org/sentry',
    connected: false,
    desc: 'Lets agents check live production errors for files in the current diff. Detects regressions before they reach prod.',
    accentColor: 'var(--cw-amber)',
    category: 'Data & Storage',
    agents: ['Broken Code Agent', 'Performance Agent'],
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    logoUrl: 'https://cdn.simpleicons.org/googlecalendar',
    connected: false,
    desc: 'Schedules approval windows and compliance reviews around working hours. Prevents weekend deploys automatically.',
    accentColor: 'var(--cw-teal)',
    category: 'Data & Storage',
    agents: ['Deploy Manager', 'Compliance Agent'],
  },
];

const mcpServers = [
  {
    name: 'Internal Wiki MCP',
    icon: CheckListIcon,
    desc: 'Connects agents to your internal knowledge base. Architecture and Documentation agents can read guidelines and write reports.',
    connected: true,
    color: 'var(--cw-blue)',
    agents: ['Security Agent', 'Architecture Agent', 'Documentation Agent', 'Data & DX Agent'],
  },
  {
    name: 'Corporate Jira MCP',
    icon: ServerStack01Icon,
    desc: 'Lets the Guardian Agent automatically create and link Jira tickets for unresolved high-severity findings.',
    connected: false,
    color: 'var(--cw-purple)',
    agents: ['Guardian Agent', 'Compliance Agent'],
  },
];

const categories = ['Native (Always On)', 'Notifications', 'Data & Storage'];

export default function IntegrationsPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--cw-blue) 15%, transparent)' }}
          >
            <ConnectIcon size={22} style={{ color: 'var(--cw-blue)' }} />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--cw-txt)' }}>
            Integrations
          </h1>
        </div>
        <p style={{ color: 'var(--cw-txt2)' }} className="text-base max-w-2xl leading-relaxed">
          Codeward connects your entire dev toolchain. GitHub is always-on and native. Everything
          else — Slack, Gmail, WhatsApp, Drive, Sentry — is optional and controlled per-agent.
        </p>
      </div>

      {/* Integration sections by category */}
      {categories.map((cat) => {
        const catIntegrations = integrations.filter((i) => i.category === cat);
        return (
          <div key={cat} className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2
                className="text-xs font-bold uppercase tracking-widest shrink-0"
                style={{ color: 'var(--cw-txt3)' }}
              >
                {cat}
              </h2>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cw-bdr)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catIntegrations.map((intg) => (
                <IntegrationCard key={intg.id} intg={intg} />
              ))}
            </div>
          </div>
        );
      })}

      {/* MCP Servers */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-widest shrink-0"
            style={{ color: 'var(--cw-txt3)' }}
          >
            MCP Servers
          </h2>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cw-bdr)' }} />
        </div>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--cw-txt2)' }}>
          Model Context Protocol (MCP) servers let agents connect to any internal tool — wikis,
          Jira, custom APIs — using a standardised interface.
        </p>
        <div className="flex flex-col gap-4">
          {mcpServers.map((mcp) => {
            const Icon = mcp.icon;
            return (
              <div
                key={mcp.name}
                className="rounded-xl p-5 border"
                style={{ borderColor: 'var(--cw-bdr)', backgroundColor: 'var(--cw-bg2)' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--cw-blue) 12%, transparent)',
                    }}
                  >
                    <Icon size={20} style={{ color: mcp.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: 'var(--cw-txt)' }}>
                        {mcp.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: mcp.connected
                            ? 'color-mix(in srgb, var(--cw-green) 15%, transparent)'
                            : 'color-mix(in srgb, var(--cw-txt3) 15%, transparent)',
                          color: mcp.connected ? 'var(--cw-green)' : 'var(--cw-txt3)',
                        }}
                      >
                        {mcp.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed mb-3"
                      style={{ color: 'var(--cw-txt2)' }}
                    >
                      {mcp.desc}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {mcp.agents.map((agent) => (
                        <span
                          key={agent}
                          className="text-xs px-2 py-0.5 rounded border font-medium"
                          style={{
                            borderColor: 'var(--cw-bdr)',
                            color: 'var(--cw-txt3)',
                            backgroundColor: 'var(--cw-bg)',
                          }}
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add your own MCP CTA */}
      <div
        className="rounded-xl p-6 border mb-8"
        style={{
          borderColor: 'color-mix(in srgb, var(--cw-purple) 30%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--cw-purple) 6%, transparent)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Shield01Icon size={20} style={{ color: 'var(--cw-purple)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--cw-txt)' }}>
            Connect your own MCP server
          </h3>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--cw-txt2)' }}>
          Any tool with an MCP-compatible API can be connected to Codeward in minutes. Agents will
          automatically gain read/write access to that tool's data, controlled by per-agent toggles
          in the dashboard.
        </p>
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ color: 'var(--cw-purple)' }}
        >
          Learn about MCP →
        </a>
      </div>
    </div>
  );
}

function IntegrationCard({ intg }: { intg: Integration }) {
  const isConnected = intg.connected;
  return (
    <div
      className="rounded-xl p-5 border flex flex-col transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: isConnected
          ? `color-mix(in srgb, ${intg.accentColor} 40%, var(--cw-bdr))`
          : 'var(--cw-bdr)',
        backgroundColor: 'var(--cw-bg2)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border p-2.5"
          style={{ borderColor: 'var(--cw-bdr)', backgroundColor: 'var(--cw-bg)' }}
        >
          <img src={intg.logoUrl} alt={intg.name} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--cw-txt)' }}>
              {intg.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{
                backgroundColor: isConnected
                  ? 'color-mix(in srgb, var(--cw-green) 15%, transparent)'
                  : 'color-mix(in srgb, var(--cw-txt3) 12%, transparent)',
                color: isConnected ? 'var(--cw-green)' : 'var(--cw-txt3)',
              }}
            >
              {isConnected ? '● Connected' : '○ Not connected'}
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cw-txt3)' }}>
            {intg.category}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--cw-txt2)' }}>
        {intg.desc}
      </p>

      {/* Agent access tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {intg.agents.map((agent) => (
          <span
            key={agent}
            className="text-xs px-2 py-0.5 rounded border font-medium"
            style={{
              borderColor: `color-mix(in srgb, ${intg.accentColor} 35%, var(--cw-bdr))`,
              color: intg.accentColor,
              backgroundColor: `color-mix(in srgb, ${intg.accentColor} 8%, transparent)`,
            }}
          >
            {agent}
          </span>
        ))}
      </div>

      {/* CTA */}
      {intg.id !== 'github' ? (
        <button
          className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-90"
          style={{
            borderColor: isConnected
              ? 'color-mix(in srgb, var(--cw-red) 40%, transparent)'
              : intg.accentColor,
            color: isConnected ? 'var(--cw-red)' : 'var(--cw-bg)',
            backgroundColor: isConnected ? 'transparent' : intg.accentColor,
          }}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      ) : (
        <span className="text-xs font-medium" style={{ color: 'var(--cw-green)' }}>
          ✓ Always active
        </span>
      )}
    </div>
  );
}
