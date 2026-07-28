import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../../lib/api';
import { AgentCanvas } from './AgentCanvas';
import { Bot, Cpu, Terminal, LayoutGrid, CheckCircle2, AlertTriangle, ShieldCheck, Radio, Sparkles } from 'lucide-react';

const clsColor: Record<string, string> = {
  ok: 'text-cw-green',
  err: 'text-cw-red',
  inf: 'text-cw-blue',
  warn: 'text-cw-amber',
  plain: 'text-cw-txt3',
};

type LogEntry = {
  ts: string;
  cls: string;
  text: string;
  cursor?: boolean;
};

interface AgentCardState {
  id: string;
  agent: string;
  repo: string;
  sha: string;
  status: string;
  step: 'init' | 'cloned' | 'scanning' | 'autofix' | 'done' | 'error';
  score?: number | null;
  findingsCount?: number;
  error?: string;
  updatedAt: string;
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

interface LiveFeedProps {
  viewMode: 'stream' | 'canvas';
}

export function LiveFeed({ viewMode }: LiveFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamDisplay, setStreamDisplay] = useState<'cards' | 'terminal'>('cards');
  const [cardEvents, setCardEvents] = useState<AgentCardState[]>([]);
  const cardsMap = useRef<Map<string, AgentCardState>>(new Map());

  useEffect(() => {
    if (viewMode === 'stream' && streamDisplay === 'terminal') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode, streamDisplay]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/feed`);

    ws.onopen = () => {
      setLogs((prev) => [
        ...prev,
        {
          ts: new Date().toISOString().split('T')[1].slice(0, 8),
          cls: 'inf',
          text: 'Connected to live Codeward agent stream...',
        },
      ]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const time = new Date().toISOString().split('T')[1].slice(0, 8);

        if (data.type === 'agent_active' || data.type === 'agent_completed' || data.type === 'agent_failed') {
          const { repo, sha, agent, status, score, error, step, findingsCount } = data.payload;

          // Update raw terminal log
          if (data.type === 'agent_active') {
            setLogs((prev) => [
              ...prev,
              {
                ts: time,
                cls: 'plain',
                text: `[${repo}] [${(sha || '').slice(0, 7)}] ${agent}: ${status || 'active'}...`,
              },
            ]);
          } else if (data.type === 'agent_completed') {
            setLogs((prev) => [
              ...prev,
              {
                ts: time,
                cls: 'ok',
                text: `[${repo}] [${(sha || '').slice(0, 7)}] ${agent} finished (Score: ${score}/100, Findings: ${findingsCount ?? 0})`,
              },
            ]);
          } else if (data.type === 'agent_failed') {
            setLogs((prev) => [
              ...prev,
              {
                ts: time,
                cls: 'err',
                text: `[${repo}] [${(sha || '').slice(0, 7)}] ${agent} FAILED: ${error}`,
              },
            ]);
          }

          // Update card state
          const key = `${repo}-${sha}-${agent}`;
          const currentStep = step ?? (data.type === 'agent_completed' ? 'done' : data.type === 'agent_failed' ? 'error' : 'scanning');

          const cardState: AgentCardState = {
            id: key,
            agent,
            repo,
            sha: sha ?? '',
            status: status || (data.type === 'agent_completed' ? 'Completed' : 'Running'),
            step: currentStep,
            score,
            findingsCount,
            error,
            updatedAt: time,
          };

          cardsMap.current.set(key, cardState);
          setCardEvents(Array.from(cardsMap.current.values()).reverse());
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => { try { ws.close(); } catch {} };
      } else if (ws.readyState === WebSocket.OPEN) {
        try { ws.close(); } catch {}
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {viewMode === 'canvas' ? (
        <AgentCanvas />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden px-6 py-4 bg-cw-bg">
          {/* View toggle header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-cw-bdr/50 shrink-0">
            <div>
              <div className="text-[14px] font-bold text-cw-txt flex items-center gap-2">
                Live Agent Execution Feed
                {cardEvents.some((c) => c.step !== 'done' && c.step !== 'error') && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cw-purple/20 text-cw-purple border border-cw-purple/30 animate-pulse">
                    <Radio size={10} /> Live scanning
                  </span>
                )}
              </div>
              <div className="text-[11px] text-cw-txt3 mt-0.5">Real-time sandbox containers, tool steps, and agent findings as they run.</div>
            </div>

            <div className="flex items-center gap-1.5 bg-cw-bg2 border border-cw-bdr p-1 rounded-lg">
              <button
                onClick={() => setStreamDisplay('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  streamDisplay === 'cards' ? 'bg-cw-purple text-white' : 'text-cw-txt3 hover:text-cw-txt'
                }`}
              >
                <LayoutGrid size={13} /> Cards
              </button>
              <button
                onClick={() => setStreamDisplay('terminal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  streamDisplay === 'terminal' ? 'bg-cw-purple text-white' : 'text-cw-txt3 hover:text-cw-txt'
                }`}
              >
                <Terminal size={13} /> Terminal
              </button>
            </div>
          </div>

          {streamDisplay === 'cards' ? (
            <div className="flex-1 overflow-y-auto pr-1">
              {cardEvents.length === 0 ? (
                <div className="py-20 text-center text-cw-txt3 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cw-bg2 border border-cw-bdr flex items-center justify-center text-cw-purple">
                    <Bot size={24} />
                  </div>
                  <div className="text-[14px] font-medium text-cw-txt2">No active agent streams yet</div>
                  <div className="text-[12px] text-cw-txt3 max-w-sm">
                    Connect a repository or trigger a scan to see real-time agent execution cards, sandbox container steps, and live scores.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                  {cardEvents.map((card) => {
                    const isDone = card.step === 'done';
                    const isErr = card.step === 'error';
                    const pct = STEP_PROGRESS[card.step] ?? 50;
                    const agentName = AGENT_LABELS[card.agent] ?? card.agent;

                    return (
                      <div
                        key={card.id}
                        className={`bg-cw-bg2 border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 ${
                          isErr
                            ? 'border-cw-red/40 bg-cw-red/[0.03]'
                            : isDone
                            ? 'border-cw-green/30 bg-cw-green/[0.02]'
                            : 'border-cw-purple/40 bg-cw-purple/[0.03]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                isErr ? 'bg-cw-red/10 border-cw-red/30 text-cw-red' : isDone ? 'bg-cw-green/10 border-cw-green/30 text-cw-green' : 'bg-cw-purple/10 border-cw-purple/30 text-cw-purple'
                              }`}>
                                <Cpu size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-bold text-cw-txt truncate">{agentName}</div>
                                <div className="text-[10px] text-cw-txt3 font-mono truncate">{card.repo}</div>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isErr
                                ? 'bg-cw-red/20 text-cw-red'
                                : isDone
                                ? 'bg-cw-green/20 text-cw-green'
                                : 'bg-cw-purple/20 text-cw-purple animate-pulse'
                            }`}>
                              {card.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-cw-txt3 flex items-center justify-between mb-3 font-mono">
                            <span>Commit: <span className="text-cw-txt2">{card.sha.slice(0, 7)}</span></span>
                            <span>{card.updatedAt}</span>
                          </div>

                          {/* Step Progress Bar */}
                          {!isDone && !isErr && (
                            <div className="mb-3">
                              <div className="flex justify-between text-[10px] text-cw-txt3 mb-1">
                                <span>Sandbox Step</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full bg-cw-bg3 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-cw-purple h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {isErr && card.error && (
                            <div className="p-2.5 rounded-lg bg-cw-red/10 border border-cw-red/20 text-[11px] text-cw-red flex items-start gap-2 mb-2">
                              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                              <span className="break-words">{card.error}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer Status / Score */}
                        <div className="pt-3 border-t border-cw-bdr/50 flex items-center justify-between text-[11px] mt-2">
                          <span className="text-cw-txt3">
                            {isDone ? `${card.findingsCount ?? 0} findings detected` : 'Analysis running in sandbox'}
                          </span>
                          {isDone && card.score != null && (
                            <span className="font-bold text-cw-green px-2 py-0.5 rounded bg-cw-green/10 border border-cw-green/25">
                              Score: {card.score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-cw-log-bg rounded-lg px-4 py-3 font-mono text-[11px] leading-[1.7] overflow-y-auto h-full border border-cw-bdr">
                {logs.map((l, i) => (
                  <div key={i} className="flex gap-2.5 mb-[1px]">
                    <span className="text-cw-txt3 shrink-0">{l.ts}</span>
                    <span className={clsColor[l.cls] || 'text-cw-txt2'}>
                      {l.text}
                      {l.cursor && <span className="inline-block w-[7px] h-[11px] bg-cw-txt2 rounded-[1px] align-middle ml-1 animate-[blink_0.8s_infinite]" />}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
