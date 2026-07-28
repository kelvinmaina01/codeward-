import { useEffect, useState, useRef } from 'react';
import { Radio, ChevronDown, ChevronUp, X, Bot, Cpu, ArrowUpRight } from 'lucide-react';
import { WS_URL } from '../../lib/api';

export interface AgentRunEvent {
  id: string;
  agent: string;
  repo: string;
  sha: string;
  status: string;
  step?: 'init' | 'cloned' | 'scanning' | 'autofix' | 'done' | 'error';
  score?: number | null;
  findingsCount?: number;
  error?: string;
  time: string;
}

const AGENT_LABELS: Record<string, string> = {
  bloat: 'Bloat Agent',
  security: 'Security Agent',
  guardian: 'Guardian Agent',
  architecture: 'Architecture Agent',
  compliance: 'Compliance Agent',
  data_dx: 'Data & DX Agent',
  ai_era: 'AI-Era Agent',
  broken_code: 'Broken Code Agent',
  orchestrator_phase1: 'Ingestion Orchestrator',
  orchestrator_phase2: 'Dispatch Orchestrator',
  orchestrator_phase3: 'Decision Orchestrator',
};

const STEP_PROGRESS: Record<string, number> = {
  init: 20,
  cloned: 45,
  scanning: 75,
  autofix: 90,
  done: 100,
  error: 100,
};

export function FloatingStreamWidget({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventsMap = useRef<Map<string, AgentRunEvent>>(new Map());

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_URL}/ws/feed`);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = (e) => {
        try {
          const { type, payload } = JSON.parse(e.data);
          if (type === 'agent_active' || type === 'agent_completed' || type === 'agent_failed') {
            const key = `${payload.repo}-${payload.sha}-${payload.agent}`;
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const ev: AgentRunEvent = {
              id: key,
              agent: payload.agent,
              repo: payload.repo,
              sha: payload.sha ?? '',
              status: payload.status,
              step: payload.step ?? (type === 'agent_completed' ? 'done' : type === 'agent_failed' ? 'error' : 'scanning'),
              score: payload.score,
              findingsCount: payload.findingsCount,
              error: payload.error,
              time,
            };

            eventsMap.current.set(key, ev);
            setEvents(Array.from(eventsMap.current.values()).reverse().slice(0, 10));
          }
        } catch { /* ignore malformed frames */ }
      };
    } catch { /* WS unavailable */ }

    return () => {
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => { try { ws.close(); } catch {} };
        } else if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch {}
        }
      }
    };
  }, []);

  const activeCount = events.filter((e) => e.step !== 'done' && e.step !== 'error').length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-cw-purple/40 bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt shadow-xl hover:border-cw-purple transition-all duration-200 group active:scale-95"
      >
        <div className="relative flex items-center justify-center">
          <Radio size={15} className={`text-cw-purple ${activeCount > 0 ? 'animate-pulse' : ''}`} />
          {activeCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cw-green animate-ping" />}
        </div>
        <span className="text-xs font-semibold">Live Agent Stream</span>
        {activeCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cw-purple text-white">
            {activeCount} active
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cw-bdr bg-cw-bg3/60 shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={14} className={`text-cw-purple ${activeCount > 0 ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-bold text-cw-txt">Agent Live Stream</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-cw-green' : 'bg-cw-txt3'}`} title={connected ? 'Connected' : 'Connecting'} />
        </div>
        <div className="flex items-center gap-1">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/admin/feed')}
              title="Open full page feed"
              className="p-1 text-cw-txt3 hover:text-cw-purple transition-colors rounded"
            >
              <ArrowUpRight size={14} />
            </button>
          )}
          <button
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Expand' : 'Minimize'}
            className="p-1 text-cw-txt3 hover:text-cw-txt transition-colors rounded"
          >
            {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close stream widget"
            className="p-1 text-cw-txt3 hover:text-cw-red transition-colors rounded"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Events List */}
          <div className="flex-1 max-h-[360px] overflow-y-auto p-3 flex flex-col gap-2.5">
            {events.length === 0 ? (
              <div className="py-8 text-center text-cw-txt3 text-xs flex flex-col items-center gap-2">
                <Bot size={24} className="opacity-40" />
                <span>Waiting for agent execution jobs...</span>
                <span className="text-[10px] opacity-75">Live step updates will stream here automatically.</span>
              </div>
            ) : (
              events.map((ev) => {
                const pct = STEP_PROGRESS[ev.step ?? 'scanning'] ?? 50;
                const isDone = ev.step === 'done';
                const isErr = ev.step === 'error';
                const agentName = AGENT_LABELS[ev.agent] ?? ev.agent;

                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      isErr
                        ? 'border-cw-red/30 bg-cw-red/5'
                        : isDone
                        ? 'border-cw-green/30 bg-cw-green/5'
                        : 'border-cw-purple/30 bg-cw-purple/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-cw-txt truncate">
                        <Cpu size={13} className={isErr ? 'text-cw-red' : isDone ? 'text-cw-green' : 'text-cw-purple'} />
                        <span className="truncate">{agentName}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isErr ? 'bg-cw-red/20 text-cw-red' : isDone ? 'bg-cw-green/20 text-cw-green' : 'bg-cw-purple/20 text-cw-purple animate-pulse'
                      }`}>
                        {ev.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-cw-txt3 font-mono">
                      <span className="truncate max-w-[170px]" title={ev.repo}>{ev.repo}</span>
                      <span>{ev.sha.slice(0, 7)}</span>
                    </div>

                    {/* Step progress bar */}
                    {!isDone && !isErr && (
                      <div className="w-full bg-cw-bg3 h-1.5 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="bg-cw-purple h-full transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}

                    {isDone && ev.score != null && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-cw-green/20">
                        <span className="text-cw-txt2">Scan result:</span>
                        <span className="font-bold text-cw-green">Score {ev.score}/100</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {onNavigate && (
            <div className="p-2 border-t border-cw-bdr bg-cw-bg3/40 shrink-0 flex justify-center">
              <button
                onClick={() => onNavigate('/admin/feed')}
                className="text-[11px] font-medium text-cw-purple hover:underline flex items-center gap-1"
              >
                Open Full Live Feed <ArrowUpRight size={11} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
