import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Lock, Shield, FileText, Settings2, CheckCircle2, Loader2, Terminal as TerminalIcon, type LucideIcon } from 'lucide-react';
import { agentCanvasData, AgentData } from './AgentCanvasData';
import { RepoSelector, RepoOption } from './RepoSelector';
import { API_URL, WS_URL } from '../../../lib/api';
import { RunTimeline, agentIcon, statusTone } from './RunTimeline';
import { EYEBROW, TONE_PILL, TONE_TEXT, FOCUS_RING, type Tone } from './findings/finding-ui';

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
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={18} className="animate-spin text-cw-purple" />
      <span key={phase} className="text-[13px] text-cw-txt3">{msgs[phase]}</span>
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

// ── Presentation-only helpers ─────────────────────────────────────────────────
const LOG_TONE: Record<string, string> = {
  info: 'text-cw-txt2',
  tool: 'text-cw-blue',
  pass: 'text-cw-green',
  fail: 'text-cw-red',
  warn: 'text-cw-amber',
};

const OP_ICON: Record<string, LucideIcon> = {
  Lock01Icon: Lock, Shield01Icon: Shield, File01Icon: FileText, Settings01Icon: Settings2,
};

const DETAIL_TABS: { key: 'logs' | 'findings' | 'sandbox' | 'config' | 'summary'; label: string }[] = [
  { key: 'logs', label: 'Logs' },
  { key: 'findings', label: 'Findings' },
  { key: 'sandbox', label: 'Sandbox' },
  { key: 'config', label: 'Config' },
  { key: 'summary', label: 'Summary' },
];

const SEV_TONE: Record<string, Tone> = { critical: 'red', high: 'amber', medium: 'blue', info: 'neutral' };

/** REST is the source of truth for status/score/progress; keep the client's log tail when it is longer
 *  (worker-level events like "Completed" are broadcast without a runId and are never persisted). */
function mergeAgents(prev: AgentData[], next: AgentData[]): AgentData[] {
  const byId = new Map(prev.map((a) => [a.id, a]));
  return next.map((n) => {
    const p = byId.get(n.id);
    return p && p.logs.length > n.logs.length ? { ...n, logs: p.logs } : n;
  });
}

const RECONCILE_DEBOUNCE_MS = 800;
const RUNNING_HEARTBEAT_MS = 10_000;

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

  // ── Reconciliation: the DB is the source of truth; the socket is a hint ──────────────
  // Some lanes only ever receive `agent_active`: Guardian reviews run inside another agent's
  // job and have no job of their own, so no `agent_completed` for "guardian" is ever emitted
  // and a WS-only model leaves that lane "running" forever. Every terminal event, every
  // (re)connect, and a heartbeat while anything is running re-reads /api/reports/canvas and
  // lets it win. A request sequence number discards responses superseded by a newer request.
  const requestSeq = useRef(0);
  const reconcileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFilterRef = useRef(activeFilter);
  activeFilterRef.current = activeFilter;

  const loadCanvas = useCallback((filter: string, silent: boolean) => {
    const seq = ++requestSeq.current;
    const targetId = filter !== 'All' ? filter : undefined;
    const query = targetId ? `?repoId=${targetId}` : '';
    if (!silent) setCanvasLoading(true);
    return fetch(`${API_URL}/api/reports/canvas${query}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (seq !== requestSeq.current) return; // superseded by a newer request
        if (data?.agents && Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents((prev) => mergeAgents(prev, data.agents));
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
        if (!silent && seq === requestSeq.current) setCanvasLoading(false);
      });
  }, []);

  /** Debounced silent refetch — bursts of terminal events collapse into one request. */
  const scheduleReconcile = useCallback(() => {
    if (reconcileTimer.current) clearTimeout(reconcileTimer.current);
    reconcileTimer.current = setTimeout(() => {
      reconcileTimer.current = null;
      loadCanvas(activeFilterRef.current, true);
    }, RECONCILE_DEBOUNCE_MS);
  }, [loadCanvas]);

  useEffect(() => () => { if (reconcileTimer.current) clearTimeout(reconcileTimer.current); }, []);

  // Initial + filter-change load (visible loader)
  useEffect(() => {
    loadCanvas(activeFilter, false);
  }, [activeFilter, loadCanvas]);

  // Safety net: while anything is running, poll so a frame lost during a socket gap
  // can never strand the UI in a loading state.
  const anyRunning = agents.some((a) => a.status === 'running');
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => loadCanvas(activeFilterRef.current, true), RUNNING_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [anyRunning, loadCanvas]);

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
    let hasConnectedOnce = false;

    const connectWs = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws/feed`);

        ws.onopen = () => {
          // Anything that happened while we were disconnected is only in the DB — reconcile.
          if (hasConnectedOnce) scheduleReconcile();
          hasConnectedOnce = true;
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

            // Terminal events are hints; the DB decides. This is what clears lanes (Guardian)
            // that only ever receive `agent_active` from inside another agent's job.
            if (type === 'agent_completed' || type === 'agent_failed') {
              scheduleReconcile();
            }
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
  }, [activeFilter, internalRepoList, scheduleReconcile]);

  // Keep top stats synchronized with real-time agent updates
  useEffect(() => {
    const runningCount = agents.filter((a) => a.status === 'running').length;
    const completedCount = agents.filter((a) => a.status === 'passed' || a.status === 'blocked').length;
    // A real critical is a critical finding, or a status line counting one or more criticals.
    // A plain substring test used to match "PASS — 0 critical issues" and flip the decision to BLOCKED.
    const hasCritical = agents.some((a) =>
      /\b[1-9]\d*\s+critical\b/i.test(a.statusText) || a.findings.some((f) => f.sev === 'critical')
    );
    const anyBlocked = agents.some((a) => a.status === 'blocked');

    setStats((prev) => ({
      ...prev,
      agentsActive: runningCount > 0 ? `${runningCount} active · ${completedCount}/${agents.length}` : `${completedCount} / ${agents.length}`,
      decision: anyBlocked || hasCritical ? 'BLOCKED' : runningCount > 0 ? 'RUNNING' : 'PASS',
    }));
  }, [agents]);

  // ── Presentation-only derivations ───────────────────────────────────────────
  const decisionTone: Tone = stats.decision === 'BLOCKED' ? 'red' : stats.decision === 'RUNNING' ? 'purple' : 'green';
  const dispatched = agents.filter((a) => a.status !== 'idle');
  // With no agent selected the log pane shows every dispatched agent's log, agent-prefixed, in order.
  const mergedLogs = dispatched.flatMap((a) => a.logs.map((log, idx) => ({ ...log, agent: a.name, key: `${a.id}-${idx}` })));
  const ActiveIcon = activeAgent ? agentIcon(activeAgent.icon) : TerminalIcon;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-cw-bg text-cw-txt">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-cw-bdr flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-[16px] font-semibold text-cw-txt tracking-tight">Run timeline</h2>
          <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">#{runInfo.id}{runInfo.commitSha ? ` · ${runInfo.commitSha}` : ''}</span>
          <span className={`inline-flex items-center h-6 px-2 rounded border font-mono text-[12px] font-semibold ${TONE_PILL[decisionTone]}`}>
            {stats.decision === 'BLOCKED' ? 'BLOCK' : stats.decision}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onViewModeChange && (
            <div className="inline-flex h-8 p-0.5 bg-cw-bg2 border border-cw-bdr rounded-md items-center">
              <button
                type="button"
                onClick={() => onViewModeChange('stream')}
                className={`h-full px-2.5 rounded text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'stream' ? 'bg-cw-bg3 text-cw-txt' : 'text-cw-txt3 hover:text-cw-txt'}`}
              >
                Stream
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('canvas')}
                className={`h-full px-2.5 rounded text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'canvas' ? 'bg-cw-bg3 text-cw-txt' : 'text-cw-txt3 hover:text-cw-txt'}`}
              >
                Timeline
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

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-cw-bdr bg-cw-bg2 shrink-0">
        {[
          { label: 'Agents', val: stats.agentsActive, cls: 'text-cw-txt' },
          { label: 'Critical issues', val: stats.criticalIssues, cls: stats.criticalIssues > 0 ? 'text-cw-red' : 'text-cw-txt' },
          { label: 'Lines auto-fixed', val: stats.linesFixed, cls: 'text-cw-txt' },
          { label: 'Gate decision', val: stats.decision === 'BLOCKED' ? 'BLOCK' : stats.decision, cls: TONE_TEXT[decisionTone] },
        ].map((k) => (
          <div key={k.label} className="px-4 sm:px-6 py-3 border-r border-b md:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-1 min-w-0">
            <span className={EYEBROW}>{k.label}</span>
            <span className={`text-[20px] leading-7 font-semibold tabular-nums truncate ${k.cls}`}>{k.val}</span>
          </div>
        ))}
      </div>

      {/* Body: pipeline + log pane */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {canvasLoading ? (
            <CanvasLoader />
          ) : (
            <RunTimeline agents={agents} runInfo={runInfo} stats={stats} activeAgentId={activeAgentId} onSelect={(id) => setActiveAgentId(id)} />
          )}
        </div>

        <div className="lg:w-[46%] xl:w-[44%] shrink-0 min-h-[280px] lg:min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-cw-bdr bg-cw-log-bg">
          {/* Pane header */}
          <div className="h-11 px-4 border-b border-cw-bdr flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ActiveIcon size={15} className={activeAgent ? TONE_TEXT[statusTone(activeAgent.status)] : 'text-cw-txt3'} />
              <span className="text-[13px] font-medium text-cw-txt truncate">{activeAgent ? activeAgent.name : 'All dispatched agents'}</span>
              {!activeAgent && <span className="text-[12px] text-cw-txt3 hidden sm:inline">· select an agent to inspect</span>}
            </div>
            {activeAgent && (
              <button
                type="button"
                onClick={() => setActiveAgentId(null)}
                aria-label="Back to all agents"
                className={`w-7 h-7 rounded-md border border-cw-bdr hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt cursor-pointer ${FOCUS_RING}`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tabs (agent selected) */}
          {activeAgent && (
            <div className="px-2 border-b border-cw-bdr flex items-center gap-1 shrink-0 overflow-x-auto">
              {DETAIL_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`h-9 px-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === t.key ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt'}`}
                >
                  {t.label}{t.key === 'findings' ? ` (${activeAgent.findings.length})` : ''}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* No selection: merged stream */}
            {!activeAgent && (
              <div className="font-jetbrains text-[13px] leading-6 px-4 py-3">
                {mergedLogs.length === 0 ? (
                  <div className="text-cw-txt3 py-10 text-center">No run logs captured yet.</div>
                ) : mergedLogs.map((log, idx) => (
                  <div key={log.key} className="flex items-start gap-3 hover:bg-white/[0.03] px-1 rounded">
                    <span className="text-cw-txt3 shrink-0 tabular-nums text-[12px] pt-px">{formatLogTimestamp(log.t, idx)}</span>
                    <span className="text-cw-txt3 shrink-0 text-[12px] pt-px w-[110px] truncate hidden md:inline">{log.agent}</span>
                    <span className={`break-words flex-1 ${LOG_TONE[log.type] ?? 'text-cw-txt2'}`}>{log.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Logs tab */}
            {activeAgent && activeTab === 'logs' && (
              <div className="font-jetbrains text-[13px] leading-6 px-4 py-3">
                {activeAgent.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 hover:bg-white/[0.03] px-1 rounded">
                    <span className="text-cw-txt3 shrink-0 tabular-nums text-[12px] pt-px">{formatLogTimestamp(log.t, idx)}</span>
                    <span className={`break-words flex-1 ${LOG_TONE[log.type] ?? 'text-cw-txt2'}`}>
                      {log.msg}
                      {idx === activeAgent.logs.length - 1 && activeAgent.status === 'running' && (
                        <span className="inline-block w-[7px] h-[14px] ml-1 align-middle bg-cw-txt2 animate-pulse" />
                      )}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Findings tab */}
            {activeAgent && activeTab === 'findings' && (
              <div className="flex flex-col">
                {activeAgent.findings.map((f, idx) => (
                  <details key={idx} className="group border-b border-cw-bdr">
                    <summary className="list-none cursor-pointer min-h-11 px-4 py-2 flex items-center gap-3 hover:bg-cw-bg3/60 [&::-webkit-details-marker]:hidden">
                      <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider shrink-0 ${TONE_PILL[SEV_TONE[f.sev] ?? 'neutral']}`}>{f.sev}</span>
                      <span className="text-[14px] text-cw-txt truncate">{f.title}</span>
                    </summary>
                    <p className="px-4 pb-3 text-[13px] leading-5 text-cw-txt2">{f.desc}</p>
                  </details>
                ))}
                {activeAgent.findings.length === 0 && (
                  <div className="text-center text-cw-txt3 py-10 text-[13px]">No findings recorded.</div>
                )}
              </div>
            )}

            {/* Sandbox tab */}
            {activeAgent && activeTab === 'sandbox' && (
              <div className="flex flex-col">
                {activeAgent.sandbox.map((op, idx) => {
                  const OpIcon = OP_ICON[op.icon] ?? Settings2;
                  return (
                    <div key={idx} className="min-h-11 px-4 py-2 border-b border-cw-bdr flex items-center gap-3">
                      <OpIcon size={15} className="text-cw-txt3 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-mono text-cw-txt truncate">{op.name}</div>
                        <div className="text-[12px] text-cw-txt3 truncate">{op.status}</div>
                      </div>
                      {op.active && <Loader2 size={14} className="animate-spin text-cw-purple shrink-0" />}
                      {op.done && <CheckCircle2 size={14} className="text-cw-green shrink-0" />}
                    </div>
                  );
                })}
                {activeAgent.sandbox.length === 0 && (
                  <div className="text-center text-cw-txt3 py-10 text-[13px]">No sandbox operations executed.</div>
                )}
              </div>
            )}

            {/* Config tab */}
            {activeAgent && activeTab === 'config' && (
              <div className="flex flex-col">
                {Object.entries(activeAgent.config).map(([key, val], idx) => (
                  <div key={idx} className="min-h-10 px-4 py-2 border-b border-cw-bdr grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-center">
                    <span className="font-mono text-[12px] text-cw-txt3 truncate">{key}</span>
                    <span className="font-mono text-[13px] text-cw-txt break-all">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary tab */}
            {activeAgent && activeTab === 'summary' && (
              <div className="p-4 flex flex-col gap-4">
                {activeAgent.score !== null && (
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[32px] leading-none font-semibold tabular-nums ${TONE_TEXT[activeAgent.score < 50 ? 'red' : activeAgent.score < 90 ? 'amber' : 'green']}`}>{activeAgent.score}</span>
                    <span className="text-[13px] text-cw-txt3">/ 100</span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
                  {[
                    { label: 'Critical', val: activeAgent.summary.criticals, cls: activeAgent.summary.criticals > 0 ? 'text-cw-red' : 'text-cw-txt' },
                    { label: 'High', val: activeAgent.summary.highs, cls: 'text-cw-txt' },
                    { label: 'Auto-fixed', val: activeAgent.summary.fixed, cls: 'text-cw-green' },
                    { label: 'Lines removed', val: activeAgent.summary.linesRemoved, cls: 'text-cw-txt' },
                  ].map((k) => (
                    <div key={k.label} className="px-3 py-2.5 border-r border-b sm:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-0.5">
                      <span className={EYEBROW}>{k.label}</span>
                      <span className={`text-[18px] leading-6 font-semibold tabular-nums ${k.cls}`}>{k.val}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[13px] text-cw-txt2">Total runtime <span className="font-mono text-cw-txt">{activeAgent.summary.duration}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
