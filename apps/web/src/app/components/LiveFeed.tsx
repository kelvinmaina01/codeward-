import { useEffect, useRef } from 'react';
import { mockLiveFeedLogs } from '../../lib/mockAgentData';

const clsColor: Record<string, string> = {
  ok: 'text-[#22C55E]',
  err: 'text-[#EF4444]',
  inf: 'text-[#60A5FA]',
  warn: 'text-[#F59E0B]',
  plain: 'text-[#aaa]',
};

export function LiveFeed() {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="bg-[#0f1117] rounded-lg px-3 py-2.5 font-mono text-[11px] leading-[1.7] overflow-y-auto max-h-[520px]">
        {mockLiveFeedLogs.map((l, i) => (
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

