import React, { useState, useEffect, useRef } from 'react';
import * as HugeIcons from 'hugeicons-react';
import { agentCanvasData, AgentData } from './AgentCanvasData';
import './AgentCanvas.css';

export function AgentCanvas() {
  const [agents, setAgents] = useState<AgentData[]>(agentCanvasData);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'findings' | 'sandbox' | 'config' | 'summary'>('logs');

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, activeAgent?.logs.length]);

  // Simulate streaming logs for "running" agents
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(currentAgents =>
        currentAgents.map(agent => {
          if (agent.status === 'running') {
            const possibleLogs = [
              "Scanning abstract syntax tree...",
              "Evaluating cyclomatic complexity...",
              "Cross-referencing CVE database...",
              "Simulating adversarial payload...",
              "Running isolated jest instance...",
              "Memory profiler running..."
            ];
            const randomLog = possibleLogs[Math.floor(Math.random() * possibleLogs.length)];
            const newLog = {
              t: '04:' + Math.floor(Math.random() * 60).toString().padStart(2, '0'),
              type: 'info' as const,
              msg: randomLog
            };
            return {
              ...agent,
              logs: [...agent.logs, newLog]
            };
          }
          return agent;
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const renderHugeIcon = (iconName: string, size = 16) => {
    // Attempt to dynamically find the icon, fallback to a standard one
    const IconComp = (HugeIcons as any)[iconName] || (HugeIcons as any)['CircleIcon'] || (() => <span>•</span>);
    return <IconComp size={size} className="hugeicon" />;
  };

  return (
    <div className="agent-canvas-container">
      <div className="canvas-wrap">
        <div className="top-bar">
          <div className="top-row">
            <div className="top-left">
              <div className="logo">Agent <span>Canvas</span></div>
              <div className="run-badge">Run #247</div>
            </div>
          </div>
          <div className="top-stats">
            <div className="stat"><div className="stat-label">Agents Active</div><div className="stat-val">15 / 15</div></div>
            <div className="stat"><div className="stat-label">Critical Issues</div><div className="stat-val text-cw-red">1</div></div>
            <div className="stat"><div className="stat-label">Lines Auto-Fixed</div><div className="stat-val text-cw-green">38</div></div>
            <div className="stat"><div className="stat-label">Orchestrator Decision</div><div className="stat-val font-bold text-cw-red">BLOCKED</div></div>
          </div>
        </div>

        <div className="canvas-grid">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`agent-card ${activeAgentId === agent.id ? 'active-card' : ''}`}
              style={{ '--agent-accent': agent.color } as React.CSSProperties}
              onClick={() => setActiveAgentId(agent.id)}
            >
              <div className="card-header">
                <div className="agent-title">
                  <span className="agent-icon" style={{ color: agent.color }}>{renderHugeIcon(agent.icon, 18)}</span>
                  {agent.name}
                </div>
                <div className={`status-dot ${agent.status}`} title={agent.status} />
              </div>
              <div className="model-badge" style={{ alignSelf: 'flex-start', marginBottom: '8px' }}>
                {agent.model}
              </div>
              <div className="card-body">
                <div className="main-status">{agent.label}</div>
                <div className={`status-large ${
                  agent.statusText.toLowerCase().includes('critical') || agent.statusText.includes('BLOCK') ? 'red' :
                  agent.statusText.includes('passing') || agent.statusText.includes('fresh') ? 'green' : 'amber'
                }`}>
                  {agent.statusText}
                </div>
              </div>
              <div className="card-footer">
                {agent.metrics.map((m, idx) => (
                  <div key={idx} className={`metric-pill ${m.c}`}>{m.t}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeAgent && (
        <div className="detail-panel animate-in slide-in-from-right">
          <div className="detail-header">
            <div className="detail-title">
              <span className="agent-icon" style={{ color: activeAgent.color }}>{renderHugeIcon(activeAgent.icon, 18)}</span>
              {activeAgent.name}
            </div>
            <button className="close-btn" onClick={() => setActiveAgentId(null)}>
              {renderHugeIcon('Cancel01Icon', 20)}
            </button>
          </div>
          <div className="detail-tabs">
            <div className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Logs</div>
            <div className={`tab ${activeTab === 'findings' ? 'active' : ''}`} onClick={() => setActiveTab('findings')}>Findings ({activeAgent.findings.length})</div>
            <div className={`tab ${activeTab === 'sandbox' ? 'active' : ''}`} onClick={() => setActiveTab('sandbox')}>Sandbox Ops</div>
            <div className={`tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>Config</div>
            <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</div>
          </div>
          
          <div className="detail-content">
            {/* Logs Tab */}
            <div className={`tab-pane ${activeTab === 'logs' ? 'active' : ''}`}>
              <div className="terminal-view">
                {activeAgent.logs.map((log, idx) => (
                  <div key={idx} className={`log-line log-type-${log.type}`}>
                    <span className="log-time">{log.t}</span>
                    <span className="log-msg">
                      {log.msg}
                      {idx === activeAgent.logs.length - 1 && activeAgent.status === 'running' && (
                        <span className="terminal-cursor" />
                      )}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Findings Tab */}
            <div className={`tab-pane ${activeTab === 'findings' ? 'active' : ''}`}>
              {activeAgent.findings.map((f, idx) => (
                <div key={idx} className={`finding-item ${f.sev}`}>
                  <div className="finding-header">
                    <span className={`sev-badge sev-${f.sev}`}>{f.sev}</span>
                    <span className="finding-title">{f.title}</span>
                  </div>
                  <div className="finding-desc">{f.desc}</div>
                </div>
              ))}
              {activeAgent.findings.length === 0 && (
                <div className="text-center text-cw-txt3 mt-8 text-[12px]">No findings recorded.</div>
              )}
            </div>

            {/* Sandbox Ops Tab */}
            <div className={`tab-pane ${activeTab === 'sandbox' ? 'active' : ''}`}>
              {activeAgent.sandbox.map((op, idx) => (
                <div key={idx} className="sandbox-op">
                  <div className="op-icon">
                    {renderHugeIcon(op.icon, 16)}
                  </div>
                  <div className="op-info">
                    <div className="op-name">{op.name}</div>
                    <div className="op-status">{op.status}</div>
                  </div>
                  {op.active && <div className="op-spinner" />}
                  {op.done && renderHugeIcon('CheckmarkCircle01Icon', 16)}
                </div>
              ))}
              {activeAgent.sandbox.length === 0 && (
                <div className="text-center text-cw-txt3 mt-8 text-[12px]">No sandbox operations executed.</div>
              )}
            </div>

            {/* Config Tab */}
            <div className={`tab-pane ${activeTab === 'config' ? 'active' : ''}`}>
              <div style={{ background: 'var(--color-cw-bg2)', border: '1px solid var(--color-cw-bdr)', borderRadius: '8px', padding: '12px' }}>
                {Object.entries(activeAgent.config).map(([key, val], idx) => (
                  <div key={idx} className="config-row">
                    <div className="config-key">{key}</div>
                    <div className="config-val">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Tab */}
            <div className={`tab-pane ${activeTab === 'summary' ? 'active' : ''}`}>
              {activeAgent.score !== null && (
                <div className={`score-circle ${activeAgent.score < 50 ? 'red' : activeAgent.score < 90 ? 'amber' : 'green'}`}>
                  {activeAgent.score}
                </div>
              )}
              <div className="summary-grid">
                <div className="summary-box">
                  <div className="s-val red">{activeAgent.summary.criticals}</div>
                  <div className="s-lbl">Critical</div>
                </div>
                <div className="summary-box">
                  <div className="s-val">{activeAgent.summary.highs}</div>
                  <div className="s-lbl">High</div>
                </div>
                <div className="summary-box">
                  <div className="s-val text-cw-green">{activeAgent.summary.fixed}</div>
                  <div className="s-lbl">Auto-Fixed</div>
                </div>
                <div className="summary-box">
                  <div className="s-val">{activeAgent.summary.linesRemoved}</div>
                  <div className="s-lbl">Lines Removed</div>
                </div>
              </div>
              <div className="text-center text-[12px] text-cw-txt2 mt-4">
                Total runtime: <strong>{activeAgent.summary.duration}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
