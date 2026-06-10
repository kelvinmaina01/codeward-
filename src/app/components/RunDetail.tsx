import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface Props {
  sha?: string;
  onBack: () => void;
}

interface LogLine {
  ts: string;
  text: string;
  color: 'plain' | 'ok' | 'warn' | 'info';
  progress?: number;
}

const allLogs: LogLine[] = [
  { ts: '00:00', text: 'Fetching details...', color: 'info' },
  { ts: '01:20', text: 'Scanning records...', color: 'info' },
  { ts: '02:40', text: 'Analysis complete.', color: 'ok' },
];

const logColors: Record<string, string> = {
  ok: 'text-cw-green',
  warn: 'text-cw-amber',
  info: 'text-blue-400',
  plain: 'text-cw-txt3',
};

export function RunDetail({ sha, onBack }: Props) {
  const [visibleLogs, setVisibleLogs] = useState<LogLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const displayId = sha || 'u1';
  const running = visibleLogs.length < allLogs.length;

  useEffect(() => {
    setVisibleLogs([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < allLogs.length) {
        setVisibleLogs(prev => [...prev, allLogs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [sha]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs]);

  return (
    <div className="flex-1 flex flex-col bg-cw-bg overflow-hidden relative">
      {/* Drawer Header */}
      <div className="bg-cw-bg2 border-b border-cw-bdr px-5 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-cw-bg3 border border-cw-bdr flex items-center justify-center">
            <RefreshCw size={14} className={`${running ? 'text-cw-blue animate-spin' : 'text-cw-green'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-cw-txt">Detail View</span>
            </div>
            <div className="text-[11px] text-cw-txt2 mt-0.5">ID: {displayId}</div>
          </div>
        </div>
        <button 
          onClick={onBack} 
          className="w-8 h-8 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Content (Vertical Flow) */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        
        {/* Detail Box 1 */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl px-4 py-3.5">
          <div className="text-[10px] font-bold text-cw-txt tracking-[0.06em] mb-4">SUMMARY METRICS</div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-cw-bg3 pb-3">
              <span className="text-[11px] text-cw-txt3">STATUS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${running ? 'bg-blue-500/10 text-cw-blue border-blue-500/20' : 'bg-cw-green/10 text-cw-green border-cw-green/20'}`}>
                {running ? 'PROCESSING' : 'COMPLETE'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-cw-bg3 pb-3">
              <span className="text-[11px] text-cw-txt3">EXECUTION TIME</span>
              <span className="text-[13px] font-medium text-cw-txt font-mono">1.2s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-cw-txt3">LATEST UPDATE</span>
              <span className="text-[13px] font-medium text-cw-txt font-mono">Today, 20:31</span>
            </div>
          </div>
        </div>

        {/* Terminal / Logs Box */}
        <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-cw-bdr flex flex-col">
          <div className="px-4 py-2.5 bg-[#1a1d24] border-b border-[#2d3139] flex justify-between items-center">
            <span className="text-[10px] font-bold text-blue-400 tracking-[.06em]">SYSTEM LOGS</span>
          </div>
          <div className="p-4 font-mono text-[11px] leading-[1.8] min-h-[160px]">
            {visibleLogs.filter(Boolean).map((l, i) => (
              <div key={i} className="flex gap-3 mb-1">
                <span className="text-[#555] shrink-0 w-10">{l.ts}</span>
                <span className={logColors[l.color]}>{l.text}</span>
              </div>
            ))}
            {running && (
              <div className="flex gap-3">
                <span className="text-[#555] w-10"> </span>
                <span className="inline-block w-[7px] h-[11px] bg-[#e8e8e6] animate-pulse align-middle rounded-sm" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
