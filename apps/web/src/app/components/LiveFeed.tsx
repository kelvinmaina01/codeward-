import { useEffect, useRef, useState } from 'react';
import { mockLiveFeedLogs } from '../../lib/mockAgentData';

const clsColor: Record<string, string> = {
  ok: 'text-[#22C55E]',
  err: 'text-[#EF4444]',
  inf: 'text-[#60A5FA]',
  warn: 'text-[#F59E0B]',
  plain: 'text-[#aaa]',
};

type LogEntry = {
  ts: string;
  cls: string;
  text: string;
  cursor?: boolean;
};

export function LiveFeed() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>(mockLiveFeedLogs);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws/feed');

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
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="bg-[#0f1117] rounded-lg px-3 py-2.5 font-mono text-[11px] leading-[1.7] overflow-y-auto max-h-[520px]">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2.5 mb-[1px]">
            <span className="text-[#555] shrink-0">{l.ts}</span>
            <span className={clsColor[l.cls] || 'text-[#aaa]'}>
              {l.text}
              {l.cursor && <span className="inline-block w-[7px] h-[11px] bg-[#e8e8e6] rounded-[1px] align-middle ml-1 animate-[blink_0.8s_infinite]" />}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

