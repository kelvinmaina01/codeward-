import React, { useState, useEffect, useRef } from 'react';
import * as HugeIcons from 'hugeicons-react';
import { agentCanvasData, AgentData } from './AgentCanvasData';
import { RepoSelector, RepoOption } from './RepoSelector';
import { API_URL, WS_URL } from '../../../lib/api';
import './AgentCanvas.css';

/** Escalating patience loader for the canvas initial data fetch */
function CanvasLoader() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 4000);
    const t3 = setTimeout(() => setPhase(3), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const msgs = [
    'Loading agent data…',
    'Almost there…',
    'Hang tight, syncing agents…',
    'Taking a bit longer than usual…',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', gap: '1rem' }}>
      <span style={{
        width: 28, height: 28,
        border: '3px solid var(--cw-purple)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.75s linear infinite',
      }} />
      <span
        key={phase}
        style={{ fontSize: 12, color: 'var(--cw-txt3)', fontFamily: 'var(--font-sans)', transition: 'opacity 0.4s' }}
      >
        {msgs[phase]}
      </span>
    </div>
  );
}

export interface AgentCanvasProps {
  repoId?: string;
  repoFilter?: string;
  onRepoChange?: (repoId: string) => void;
  repoList?: RepoOption[];
  viewMode?: 'stream' | 'canvas';
  onViewModeChange?: (mode: 'stream' | 'canvas') => void;
}

function formatLogTimestamp(ts: string | number | undefined, idx = 0): string {
  if (!ts || ts === '--') return ts || '--';
  // If already in HH:mm:ss.SSS format (e.g. "14:44:50.294"), return as is
  if (typeof ts === 'string' && /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(ts)) {
    return ts;
  }
  // If in mm:ss format (e.g. "00:03"), convert to 14:44:ss.ms
  if (typeof ts === 'string' && /^\d{2}:\d{2}$/.test(ts)) {
    const [mins, secs] = ts.split(':').map(Number);
    const baseH = 14;
    const baseM = 44 + (mins || 0);
    const finalM = baseM % 60;
    const finalH = baseH + Math.floor(baseM / 60);
    const s = String(secs || 0).padStart(2, '0');
    const ms = String((idx * 47 + 294) % 1000).padStart(3, '0');
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}:${s}.${ms}`;
  }
  const parsed = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }
  return String(ts);
}

const mapLiveLogType = (level?: string, msg?: string): 'info' | 'tool' | 'pass' | 'fail' | 'warn' => {
  const lower = (msg || '').toLowerCase();
  if (level === 'err' || lower.includes('critical') || lower.includes('fail') || lower.includes('block') || lower.includes('error')) return 'fail';
  if (level === 'warn' || lower.includes('high') || lower.includes('warn') || lower.includes('duplicate')) return 'warn';
  if (level === 'ok' || lower.includes('pass') || lower.includes('clean') || lower.includes('completed') || lower.includes('rate limit ok')) return 'pass';
  const isTool = level === 'inf' || lower.includes('executing tool') || lower.includes('├─') || lower.includes('→') || lower.includes('->') || lower.includes('run_') || lower.includes('check_') || lower.includes('scan_');
  if (isTool) return 'tool';
  return 'info';
};

export function AgentCanvas({ repoId, repoFilter, onRepoChange, repoList, viewMode = 'canvas', onViewModeChange }: AgentCanvasProps = {}) {
  const [internalRepoList, setInternalRepoList] = useState<RepoOption[]>(repoList || []);
  const [activeFilter, setActiveFilter] = useState<string>(repoFilter || repoId || 'All');
  const [agents, setAgents] = useState<AgentData[]>(agentCanvasData);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'findings' | 'sandbox' | 'config' | 'summary'>('logs');
  const [runInfo, setRunInfo] = useState<{ id: number | string; commitSha?: string; status?: string; score?: number | null }>({ id: '1' });
  const [stats, setStats] = useState<{ agentsActive: string; criticalIssues: number; linesFixed: number; decision: string }>({
    agentsActive: '--',
    criticalIssues: 0,
    linesFixed: 0,
    decision: 'PASS',
  });

  const activeAgent = agents.find(a => a.id === activeAgentId);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [canvasLoading, setCanvasLoading] = useState(true);

  // Sync activeFilter with prop changes
  useEffect(() => {
    if (repoFilter !== undefined) {
      setActiveFilter(repoFilter);
    } else if (repoId !== undefined) {
      setActiveFilter(repoId);
    }
  }, [repoFilter, repoId]);

  useEffect(() => {
    if (repoList && repoList.length > 0) {
      setInternalRepoList(repoList);
    }
  }, [repoList]);

  // Load connected repositories if not passed from parent
  useEffect(() => {
    if (!repoList || repoList.length === 0) {
      fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { repos: [] }))
        .then((d) => {
          if (d.repos && Array.isArray(d.repos)) {
            setInternalRepoList(d.repos);
          }
        })
        .catch(() => {});
    }
  }, [repoList]);

  const handleRepoChange = (val: string) => {
    setActiveFilter(val);
    onRepoChange?.(val);
  };

  // Fetch real agent canvas data from API
  useEffect(() => {
    let cancelled = false;
    const targetId = activeFilter !== 'All' ? activeFilter : undefined;
    const query = targetId ? `?repoId=${targetId}` : '';
    setCanvasLoading(true);
    fetch(`${API_URL}/api/reports/canvas${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.agents && Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents(data.agents);
        }
        if (data?.run) {
          setRunInfo(data.run);
        }
        if (data?.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => {
        console.warn('AgentCanvas fetch error, using dynamic fallback:', err);
      })
      .finally(() => {
        if (!cancelled) setCanvasLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  // Auto-scroll logs
  useEffect(() => {
    const targetAgentId = sessionStorage.getItem('cw_target_agent_id');
    if (targetAgentId) {
      const exists = agents.some((a) => a.id === targetAgentId);
      if (exists) {
        setActiveAgentId(targetAgentId);
      }
      sessionStorage.removeItem('cw_target_agent_id');
    }
  }, [agents]);

  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, activeAgent?.logs.length]);

  // Live WebSocket feed for real-time agent updates and log streaming
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isMounted = true;

    const connectWs = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws/feed`);

        ws.onopen = () => {
          // WebSocket connected
        };

        ws.onmessage = (event) => {
          try {
            const { type, payload } = JSON.parse(event.data);
            if (!payload || !payload.agent) return;

            // Optional repo filter: only accept if 'All' or matches repo fullName/id
            if (activeFilter !== 'All' && payload.repo) {
              const selectedRepo = internalRepoList.find(
                (r) => String(r.id) === activeFilter || r.fullName === activeFilter
              );
              if (selectedRepo && selectedRepo.fullName !== payload.repo && String(selectedRepo.id) !== String(payload.repo)) {
                return;
              }
            }

            // Normalize orchestrator sub-phases to 'orchestrator'
            const rawAgentId = String(payload.agent || '');
            const targetAgentId = rawAgentId.startsWith('orchestrator') ? 'orchestrator' : rawAgentId;

            // Format real-time timestamp HH:mm:ss.SSS
            const now = payload.tsMs ? new Date(payload.tsMs) : new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            const clockTime = `${h}:${m}:${s}.${ms}`;

            const rawMsg = payload.message || (payload.status ? `${payload.agent}: ${payload.status}` : undefined);

            if (payload.runId) {
              setRunInfo((prev) => ({
                ...prev,
                id: payload.runId,
                commitSha: payload.sha ? (payload.sha.slice(0, 7)) : prev.commitSha,
              }));
            }

            setAgents((currentAgents) => {
              return currentAgents.map((agent) => {
                if (agent.id !== targetAgentId) return agent;

                // Append real-time log entry
                let nextLogs = agent.logs;
                if (rawMsg) {
                  const newLog = {
                    t: clockTime,
                    type: mapLiveLogType(payload.level, rawMsg),
                    msg: rawMsg,
                  };
                  // Avoid duplicate consecutive identical messages
                  const lastLog = agent.logs[agent.logs.length - 1];
                  if (!lastLog || lastLog.msg !== rawMsg || lastLog.t !== clockTime) {
                    nextLogs = [...agent.logs.slice(-199), newLog];
                  }
                }

                if (type === 'agent_active') {
                  const step = payload.step;
                  const stepProgress: Record<string, number> = {
                    init: 20,
                    cloned: 40,
                    scanning: 65,
                    tool: 75,
                    autofix: 85,
                    retrying: 50,
                  };
                  const nextProgress = step && stepProgress[step] ? stepProgress[step] : Math.min(90, Math.max(agent.progress, 35));

                  const nextMetrics = [...agent.metrics];
                  if (step) {
                    const idx = nextMetrics.findIndex((m) => m.t.startsWith('Step:'));
                    if (idx >= 0) {
                      nextMetrics[idx] = { t: `Step: ${step}`, c: 'purple' };
                    } else {
                      nextMetrics.unshift({ t: `Step: ${step}`, c: 'purple' });
                    }
                  }

                  return {
                    ...agent,
                    status: 'running',
                    model: payload.model || agent.model,
                    statusText: payload.status || agent.statusText,
                    label: step ? `Step: ${step}` : agent.label,
                    progress: nextProgress,
                    metrics: nextMetrics.slice(0, 3),
                    logs: nextLogs,
                  };
                }

                if (type === 'agent_completed') {
                  const isBlocked = payload.score != null && payload.score < 60;
                  const finalStatus = isBlocked ? 'blocked' : 'passed';
                  const finalScore = payload.score !== undefined ? payload.score : agent.score;

                  const nextMetrics = agent.metrics.filter((m) => !m.t.startsWith('Step:'));
                  if (finalScore != null) {
                    nextMetrics.unshift({
                      t: `Score: ${finalScore}`,
                      c: finalScore >= 80 ? 'green' : finalScore >= 60 ? 'amber' : 'red',
                    });
                  }

                  const findingsText = payload.findingsCount !== undefined
                    ? `${payload.findingsCount} finding${payload.findingsCount === 1 ? '' : 's'}`
                    : 'Completed';

                  return {
                    ...agent,
                    status: finalStatus,
                    score: finalScore,
                    label: findingsText,
                    statusText: payload.findingsCount !== undefined
                      ? `${payload.findingsCount} findings recorded`
                      : 'Completed successfully',
                    progress: 100,
                    metrics: nextMetrics.slice(0, 3),
                    logs: nextLogs,
                  };
                }

                if (type === 'agent_failed') {
                  return {
                    ...agent,
                    status: 'blocked',
                    statusText: payload.error || 'Execution failed',
                    label: 'Failed',
                    progress: 100,
                    logs: nextLogs,
                  };
                }

                return {
                  ...agent,
                  logs: nextLogs,
                };
              });
            });
          } catch {
            // Ignore malformed WS frames
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        if (isMounted) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws?.close();
            } catch {}
          };
        } else {
          try {
            ws.close();
          } catch {}
        }
      }
    };
  }, [activeFilter, internalRepoList]);

  // Keep top stats synchronized with real-time agent updates
  useEffect(() => {
    const runningCount = agents.filter((a) => a.status === 'running').length;
    const completedCount = agents.filter((a) => a.status === 'passed' || a.status === 'blocked').length;
    const hasCritical = agents.some((a) =>
      a.statusText.toLowerCase().includes('critical') || a.findings.some((f) => f.sev === 'critical')
    );
    const anyBlocked = agents.some((a) => a.status === 'blocked');

    setStats((prev) => ({
      ...prev,
      agentsActive: runningCount > 0 ? `${runningCount} active · ${completedCount}/${agents.length}` : `${completedCount} / ${agents.length}`,
      decision: anyBlocked || hasCritical ? 'BLOCKED' : runningCount > 0 ? 'RUNNING' : 'PASS',
    }));
  }, [agents]);

  const renderHugeIcon = (iconName: string, size = 16) => {
    // Attempt to dynamically find the icon, fallback to a standard one
    const IconComp = (HugeIcons as any)[iconName] || (HugeIcons as any)['CircleIcon'] || (() => <span>•</span>);
    return <IconComp size={size} className="hugeicon" />;
  };

  return (
    <div className="agent-canvas-container">
      <div className="canvas-wrap">
        <div className="top-bar w-full">
          <div className="top-row flex items-center justify-between flex-wrap gap-3 w-full">
            <div className="top-left flex items-center gap-2.5 shrink-0 min-w-0">
              <div className="logo">Agent <span>Canvas</span></div>
              <div className="run-badge">Run #{runInfo.id}</div>
            </div>
            <div className="top-right flex items-center gap-2.5 flex-wrap">
              {onViewModeChange && (
                <div className="inline-flex p-0.5 bg-cw-bg2 border border-cw-bdr rounded-lg items-center shadow-xs">
                  <button
                    type="button"
                    onClick={() => onViewModeChange('stream')}
                    className={`px-2.5 py-1 rounded-md text-[11px] sm:text-[12px] font-medium transition-all cursor-pointer ${
                      viewMode === 'stream'
                        ? 'bg-cw-purple text-white font-semibold shadow-xs'
                        : 'text-cw-txt2 hover:text-cw-txt'
                    }`}
                  >
                    Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('canvas')}
                    className={`px-2.5 py-1 rounded-md text-[11px] sm:text-[12px] font-medium transition-all cursor-pointer ${
                      viewMode === 'canvas'
                        ? 'bg-cw-purple text-white font-semibold shadow-xs'
                        : 'text-cw-txt2 hover:text-cw-txt'
                    }`}
                  >
                    Agent Canvas
                  </button>
                </div>
              )}
              <RepoSelector
                options={internalRepoList}
                value={activeFilter}
                onChange={(val) => handleRepoChange(String(val))}
                showAllOption={true}
                allOptionLabel="All connected repositories"
              />
            </div>
          </div>
          <div className="top-stats">
            <div className="stat"><div className="stat-label">Agents Active</div><div className="stat-val">{stats.agentsActive}</div></div>
            <div className="stat"><div className="stat-label">Critical Issues</div><div className="stat-val text-cw-red">{stats.criticalIssues}</div></div>
            <div className="stat"><div className="stat-label">Lines Auto-Fixed</div><div className="stat-val text-cw-green">{stats.linesFixed}</div></div>
            <div className="stat"><div className="stat-label">Orchestrator Decision</div><div className={`stat-val font-bold ${stats.decision === 'BLOCKED' ? 'text-cw-red' : 'text-cw-green'}`}>{stats.decision}</div></div>
          </div>
        </div>

        <div className="canvas-grid">
          {canvasLoading ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <CanvasLoader />
            </div>
          ) : agents.map(agent => (
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
                    <span className="log-time">{formatLogTimestamp(log.t, idx)}</span>
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
