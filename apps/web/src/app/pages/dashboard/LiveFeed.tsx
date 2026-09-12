import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, WS_URL } from '../../../lib/api';
import { mockLiveFeedLogs } from '../../../lib/mockAgentData';
import { AgentCanvas } from '../../components/shared/AgentCanvas';
import { RepoSelector } from '../../components/shared/RepoSelector';
import { 
  Bot, Radio, Download, Copy, Check, Terminal as TerminalIcon, Sparkles, Filter, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

/** Escalating patience loader — shows reassuring copy when things take time */
function StreamLoader() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 4000);
    const t3 = setTimeout(() => setPhase(3), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const msgs = ['Loading execution logs…', 'Almost there…', 'Hang tight, fetching run history…', 'Taking a bit longer than usual…'];
  return (
    <div className="py-14 text-center flex flex-col items-center gap-3 font-jetbrains">
      <RefreshCw size={16} className="animate-spin text-cw-purple" />
      <span key={phase} className="text-[12px] text-cw-txt3 animate-in fade-in duration-500">
        {msgs[phase]}
      </span>
    </div>
  );
}

const clsColor: Record<string, string> = {
  ok: 'text-cw-green font-medium',
  err: 'text-cw-red font-medium',
  inf: 'text-cw-blue font-medium',
  warn: 'text-cw-amber font-medium',
  plain: 'text-cw-txt2',
};

export type LogItem = {
  id?: string;
  runId?: number;
  repoId?: number;
  repoFullName?: string;
  agent?: string;
  logType?: 'build' | 'run' | 'system';
  level: string;
  tsMs: number;
  message: string;
  meta?: any;
};

interface LiveFeedProps {
  viewMode?: 'stream' | 'canvas';
  onViewModeChange?: (mode: 'stream' | 'canvas') => void;
}

function formatMillisTimestamp(tsMs: number): string {
  const d = new Date(tsMs);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

const getInitialLogs = (): LogItem[] => {
  const cached = typeof window !== 'undefined' ? localStorage.getItem('cw_livefeed_cache') : null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const now = Date.now();
  return mockLiveFeedLogs.map((m, idx) => ({
    id: `init-${idx}`,
    level: m.cls,
    tsMs: now - (mockLiveFeedLogs.length - idx) * 3500,
    message: m.text,
    logType: 'run',
  }));
};

export function LiveFeed({ viewMode = 'canvas', onViewModeChange }: LiveFeedProps) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogItem[]>(getInitialLogs);
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);

  // Load connected repositories
  useEffect(() => {
    fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { repos: [] }))
      .then((d) => setRepoList(d.repos ?? []))
      .catch(() => {});
  }, []);

  // Fetch persistent logs from Postgres API
  const loadPersistentLogs = (repoIdFilter: string) => {
    setLoading(true);
    const queryParam = repoIdFilter !== 'All' ? `?repoId=${repoIdFilter}` : '';
    fetch(`${API_URL}/api/reports/livefeed-logs${queryParam}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(data.logs);
          localStorage.setItem('cw_livefeed_cache', JSON.stringify(data.logs.slice(-200)));
        } else {
          // If server has no logs for this filter, preserve existing logs or default initial logs
          setLogs((prev) => (prev.length > 0 ? prev : getInitialLogs()));
        }
      })
      .catch((e) => {
        console.error('Failed to load livefeed logs from server:', e);
        const cached = localStorage.getItem('cw_livefeed_cache');
        if (cached) {
          try { setLogs(JSON.parse(cached)); } catch {}
        } else {
          setLogs(getInitialLogs());
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPersistentLogs(repoFilter);
  }, [repoFilter]);

  // Scroll to bottom on new log entries
  useEffect(() => {
    if (viewMode === 'stream') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode]);

  // Live WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/feed`);

    ws.onopen = () => {
      setIsLiveScanning(true);
      setLogs((prev) => {
        const hasWelcome = prev.some((l) => l.message.includes('Connected to live Codeward agent stream'));
        if (hasWelcome) return prev;
        return [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            level: 'inf',
            tsMs: Date.now(),
            message: '[system] Connected to live Codeward agent execution stream...',
            logType: 'system',
          },
        ];
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const tsMs = data.payload?.tsMs || Date.now();

        if (data.type === 'agent_active' || data.type === 'agent_completed' || data.type === 'agent_failed') {
          const { repo, sha, agent, status, score, error, findingsCount, runId, step } = data.payload;

          // Check repo filter matching
          if (repoFilter !== 'All') {
            const selectedRepo = repoList.find((r) => String(r.id) === repoFilter);
            if (selectedRepo && repo && selectedRepo.fullName.toLowerCase() !== String(repo).toLowerCase() && !selectedRepo.fullName.toLowerCase().endsWith(`/${String(repo).toLowerCase()}`)) {
              return; // Skip logs for non-selected repos
            }
          }

          let level = data.payload.level || 'plain';
          let message = data.payload.message || '';

          if (!message) {
            if (data.type === 'agent_active') {
              level = step === 'scanning' ? 'inf' : (step === 'autofix' ? 'warn' : 'plain');
              message = `[${repo}] [${(sha || '').slice(0, 7)}] ${agent}: ${status || 'active'}...`;
            } else if (data.type === 'agent_completed') {
              level = 'ok';
              message = `✅ [${repo}] [${(sha || '').slice(0, 7)}] ${agent} finished (Score: ${score}/100, Findings: ${findingsCount ?? 0})`;
            } else if (data.type === 'agent_failed') {
              level = 'err';
              message = `❌ [${repo}] [${(sha || '').slice(0, 7)}] ${agent} FAILED: ${error}`;
            }
          }

          const newLog: LogItem = {
            id: `ws-${Date.now()}-${Math.random()}`,
            runId,
            repoFullName: repo,
            agent,
            level,
            tsMs,
            message,
            meta: { step, score, findingsCount, error },
          };

          setLogs((prev) => {
            const next = [...prev, newLog];
            localStorage.setItem('cw_livefeed_cache', JSON.stringify(next.slice(-200)));
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onclose = () => {
      setIsLiveScanning(false);
    };

    return () => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => { try { ws.close(); } catch {} };
      } else if (ws.readyState === WebSocket.OPEN) {
        try { ws.close(); } catch {}
      }
    };
  }, [repoFilter, repoList]);

  // Actions: Copy, Download, Explain Logs
  const handleCopyLog = () => {
    if (logs.length === 0) return;
    const textToCopy = logs.map((l) => `${formatMillisTimestamp(l.tsMs)}  ${l.message}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Build and execution logs copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLog = () => {
    if (logs.length === 0) return;
    const textToDownload = logs.map((l) => `${formatMillisTimestamp(l.tsMs)}  ${l.message}`).join('\n');
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterName = repoFilter !== 'All' ? repoList.find((r) => String(r.id) === repoFilter)?.fullName.replace('/', '-') || 'repo' : 'all-repos';
    link.download = `codeward-${filterName}-${dateStr}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Log file downloaded!');
  };

  const handleExplainLogs = () => {
    if (logs.length === 0) return;
    const recentLogsSnippet = logs.slice(-40).map((l) => `${formatMillisTimestamp(l.tsMs)}  ${l.message}`).join('\n');
    const activeRepoName = repoFilter !== 'All' ? repoList.find((r) => String(r.id) === repoFilter)?.fullName : (logs[logs.length - 1]?.repoFullName || undefined);

    sessionStorage.setItem(
      'cw_gordon_explain_prompt',
      `Please analyze these execution and build logs, explain what happened, check the sandboxes and agent memory for root causes or findings:\n\n\`\`\`\n${recentLogsSnippet}\n\`\`\``
    );
    if (activeRepoName) {
      sessionStorage.setItem('cw_gordon_repo_tag', activeRepoName);
    }
    toast.info('Opening Gordon AI to analyze run logs...');
    navigate('/dashboard/agent');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-cw-bg text-cw-txt">
      {viewMode === 'canvas' ? (
        <AgentCanvas
          repoId={repoFilter !== 'All' ? repoFilter : undefined}
          repoFilter={repoFilter}
          onRepoChange={(val) => setRepoFilter(String(val))}
          repoList={repoList}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden px-6 py-4">
          
          {/* Header Bar with Repo Filter & Terminal Action Controls */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-cw-bdr/50 flex-wrap shrink-0 w-full">
            <div className="shrink-0 min-w-0">
              <div className="text-[14px] font-bold text-cw-txt flex items-center gap-2 flex-wrap">
                Live Agent Execution Feed
                {isLiveScanning && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cw-purple/20 text-cw-purple border border-cw-purple/30 animate-pulse">
                    <Radio size={10} /> Live streaming
                  </span>
                )}
              </div>
              <div className="text-[11px] text-cw-txt3 mt-0.5">
                Real-time sublogs, AST container steps, tool execution, and persistent run logs.
              </div>
            </div>

            {/* Filter & Terminal Actions Bar — wraps nicely on smaller widths */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {onViewModeChange && (
                <div className="inline-flex p-0.5 bg-cw-bg2 border border-cw-bdr rounded-lg items-center shadow-xs shrink-0">
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
                options={repoList}
                value={repoFilter}
                onChange={(val) => setRepoFilter(val)}
                showAllOption={true}
                allOptionLabel="All connected repositories"
              />

              {/* Terminal Action Buttons (Cloudflare-style) */}
              <div className="flex items-center rounded-lg border border-cw-bdr bg-cw-bg2 overflow-hidden shrink-0">
                <button
                  onClick={handleDownloadLog}
                  title="Download full log file"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 transition-colors border-r border-cw-bdr cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download log</span>
                </button>

                <button
                  onClick={handleCopyLog}
                  title="Copy log text to clipboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 transition-colors border-r border-cw-bdr cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-cw-green" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy run log'}</span>
                </button>

                <button
                  onClick={handleExplainLogs}
                  title="Ask Gordon AI to analyze sandbox state, memory, and logs"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-cw-purple hover:bg-cw-purple/10 transition-colors cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Explain logs</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Height Terminal Display with Sharp Edges */}
          <div className="flex-1 overflow-hidden rounded-none border border-cw-bdr bg-cw-log-bg flex flex-col shadow-inner">
            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 font-jetbrains text-[13px] md:text-[14px] leading-[1.8] select-text tracking-tight">
              {loading ? (
                <StreamLoader />
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-cw-txt3 flex flex-col items-center gap-2 font-jetbrains">
                  <Bot size={28} className="text-cw-txt3/40" />
                  <div className="text-sm">No run logs captured for this filter yet.</div>
                  <div className="text-xs text-cw-txt3/60">
                    Connect a repository or push a commit to trigger a live agent scan.
                  </div>
                </div>
              ) : (
                logs.map((l, i) => {
                  const tsFormatted = formatMillisTimestamp(l.tsMs);
                  const isSublog = l.message.startsWith('  ├─') || l.message.startsWith('  └─') || l.meta?.levelDepth === 1;

                  return (
                    <div 
                      key={l.id || i} 
                      className={`flex items-start gap-3.5 group hover:bg-white/[0.03] px-1.5 py-[2px] rounded transition-colors ${
                        isSublog ? 'pl-5' : ''
                      }`}
                    >
                      {/* Millisecond precision timestamp in JetBrains Mono */}
                      <span className="text-cw-txt3 shrink-0 select-none opacity-70 group-hover:opacity-100 font-jetbrains text-[11px] md:text-[12px] pt-[2px] font-medium">
                        {tsFormatted}
                      </span>

                      {/* Log text content in JetBrains Mono */}
                      <span className={`break-words flex-1 font-jetbrains text-[13px] md:text-[14px] ${clsColor[l.level] || 'text-cw-txt2'}`}>
                        {l.message}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
