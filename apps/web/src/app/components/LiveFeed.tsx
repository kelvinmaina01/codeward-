import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../../lib/api';
import { AgentCanvas } from './AgentCanvas';

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

interface LiveFeedProps {
  viewMode: 'stream' | 'canvas';
}

export function LiveFeed({ viewMode }: LiveFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (viewMode === 'stream') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/feed`);

    ws.onopen = () => {
      setLogs(prev => [...prev, {
        ts: new Date().toISOString().split('T')[1].slice(0, 8),
        cls: 'inf',
        text: 'Connected to live Codeward agent stream...'
      }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const time = new Date().toISOString().split('T')[1].slice(0, 8);
        
        if (data.type === 'agent_active') {
          setLogs(prev => [...prev, {
            ts: time,
            cls: 'plain',
            text: `[${data.payload.repo}] [${data.payload.sha.slice(0, 7)}] Launching ${data.payload.agent}...`
          }]);
        } else if (data.type === 'agent_completed') {
          setLogs(prev => [...prev, {
            ts: time,
            cls: 'ok',
            text: `[${data.payload.repo}] [${data.payload.sha.slice(0, 7)}] ${data.payload.agent} finished (Score: ${data.payload.score})`
          }]);
        } else if (data.type === 'agent_failed') {
          setLogs(prev => [...prev, {
            ts: time,
            cls: 'err',
            text: `[${data.payload.repo}] [${data.payload.sha.slice(0, 7)}] ${data.payload.agent} FAILED: ${data.payload.error}`
          }]);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {viewMode === 'canvas' ? (
        <AgentCanvas />
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="bg-cw-log-bg rounded-lg px-3 py-2.5 font-mono text-[11px] leading-[1.7] overflow-y-auto h-full border border-cw-bdr">
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
  );
}


