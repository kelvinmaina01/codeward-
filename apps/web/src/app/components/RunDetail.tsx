import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, GitMerge, Clock, ExternalLink, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

interface Props {
  sha?: string;
  onBack: () => void;
}

interface LogLine {
  ts: string;
  text: string;
  color: 'plain' | 'ok' | 'warn' | 'info';
}

interface PRData {
  title: string;
  author: string;
  authorAvatar: string;
  additions: number;
  deletions: number;
  state: string;
  merged: boolean;
  head: string;
  base: string;
  html_url: string;
}

const allLogs: LogLine[] = [
  { ts: '00:00', text: 'Fetching details from intercept...', color: 'info' },
  { ts: '01:20', text: 'Spinning up Fly.io Sandbox (codeward-sandbox-node20)...', color: 'plain' },
  { ts: '02:45', text: 'Injecting repository context & dummy environments...', color: 'plain' },
  { ts: '04:10', text: 'Running pre-merge test suite...', color: 'info' },
  { ts: '05:30', text: '142/142 tests passed.', color: 'ok' },
  { ts: '06:05', text: 'Scanning for new vulnerabilities...', color: 'info' },
  { ts: '07:22', text: 'No critical vulnerabilities found.', color: 'ok' },
  { ts: '08:00', text: 'Analysis complete. PR is safe to merge.', color: 'ok' },
];

const logColors: Record<string, string> = {
  ok: 'text-green-400',
  warn: 'text-amber-400',
  info: 'text-blue-400',
  plain: 'text-[#aaa]',
};

export function RunDetail({ sha, onBack }: Props) {
  const [visibleLogs, setVisibleLogs] = useState<LogLine[]>([]);
  const [prData, setPrData] = useState<PRData | null>(null);
  const [loadingPr, setLoadingPr] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
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
    }, 400);

    return () => clearInterval(interval);
  }, [sha]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs]);

  useEffect(() => {
    // In reality, we'd use the real repo owner/name and PR number from props/context
    // We fetch from our new API endpoint
    const fetchPR = async () => {
      setLoadingPr(true);
      try {
        // Hitting our backend octokit bridge
        const res = await fetch(`${API_URL}/api/repos/acme-corp/my-api/pr/42`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPrData(data);
        } else {
          // Mocking the data if API isn't fully linked locally for the demo
          setPrData({
            title: 'Fix authentication bypass and update JWT signing',
            author: 'johndoe',
            authorAvatar: 'https://avatars.githubusercontent.com/u/9919?s=40&v=4',
            additions: 124,
            deletions: 42,
            state: 'open',
            merged: false,
            head: 'fix-auth',
            base: 'main',
            html_url: 'https://github.com'
          });
        }
      } catch (err) {
        // Fallback mock
        setPrData({
          title: 'Fix authentication bypass and update JWT signing',
          author: 'johndoe',
          authorAvatar: 'https://avatars.githubusercontent.com/u/9919?s=40&v=4',
          additions: 124,
          deletions: 42,
          state: 'open',
          merged: false,
          head: 'fix-auth',
          base: 'main',
          html_url: 'https://github.com'
        });
      }
      setLoadingPr(false);
    };

    fetchPR();
  }, [sha]);

  const handleMerge = async () => {
    setIsMerging(true);
    try {
      // Hit our backend merge endpoint
      // const res = await fetch(`${API_URL}/api/repos/acme-corp/my-api/pr/42/merge`, { method: 'POST', credentials: 'include' });
      await new Promise(r => setTimeout(r, 1200)); // Simulate API call
      
      setPrData(prev => prev ? { ...prev, merged: true, state: 'merged' } : null);
      toast.success('Successfully merged to main!');
    } catch (e) {
      toast.error('Failed to merge PR.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleSchedule = () => {
    toast.success('Merge scheduled for off-peak hours (2:00 AM).');
  };

  return (
    <div className="flex-1 flex flex-col bg-cw-bg2 overflow-hidden relative border-l border-cw-bdr">
      {/* Header */}
      <div className="bg-cw-bg border-b border-cw-bdr px-5 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-cw-bg3 border border-cw-bdr flex items-center justify-center">
            <RefreshCw size={14} className={`${running ? 'text-cw-blue animate-spin' : 'text-cw-green'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-cw-txt">PR Intercept Analysis</span>
            </div>
            <div className="text-[11px] text-cw-txt2 mt-0.5">Run ID: {displayId}</div>
          </div>
        </div>
        <button 
          onClick={onBack} 
          className="w-8 h-8 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content (Vertical Flow) */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">
        
        {/* NATIVE PR CONTEXT HEADER */}
        {loadingPr ? (
          <div className="h-24 bg-cw-bg3 animate-pulse rounded-xl" />
        ) : prData ? (
          <div className="bg-cw-bg border border-cw-bdr rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={prData.authorAvatar} alt={prData.author} className="w-10 h-10 rounded-full border border-cw-bdr" />
                <div>
                  <h3 className="text-[15px] font-bold text-cw-txt leading-tight m-0">{prData.title}</h3>
                  <div className="flex items-center gap-2 text-[12px] text-cw-txt2 mt-1">
                    <span className="font-medium">{prData.author}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><GitBranch size={12} /> {prData.head} <span className="text-cw-txt3">→</span> {prData.base}</span>
                  </div>
                </div>
              </div>
              <div className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase ${prData.merged ? 'bg-cw-purple/10 text-cw-purple border border-cw-purple/20' : 'bg-cw-green/10 text-cw-green border border-cw-green/20'}`}>
                {prData.merged ? 'Merged' : 'Safe to Merge'}
              </div>
            </div>

            <div className="flex gap-4 text-[12px] text-cw-txt3 mt-1">
              <span className="text-cw-green">+{prData.additions} additions</span>
              <span className="text-cw-red">-{prData.deletions} deletions</span>
            </div>
          </div>
        ) : null}

        {/* MERGE CONTROL PANEL (ACTION ZONE) */}
        {!running && prData && !prData.merged && (
          <div className="bg-cw-bg border border-cw-bdr rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <div className="text-[11px] font-bold text-cw-txt tracking-[0.06em] mb-1">MERGE CONTROLS</div>
            <div className="flex gap-3">
              <button 
                onClick={handleMerge}
                disabled={isMerging}
                className="flex-1 bg-cw-green hover:brightness-110 text-white font-bold text-[13px] py-2.5 rounded-lg border-none cursor-pointer flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isMerging ? <RefreshCw size={16} className="animate-spin" /> : <GitMerge size={16} />}
                Merge Now
              </button>
              
              <div className="relative flex-1">
                <select 
                  onChange={(e) => { if (e.target.value) handleSchedule(); e.target.value = ""; }}
                  className="w-full bg-cw-bg3 hover:bg-cw-bdr border border-cw-bdr text-cw-txt text-[13px] font-medium py-2.5 px-3 rounded-lg cursor-pointer appearance-none outline-none transition-colors"
                >
                  <option value="" disabled selected>Schedule Merge...</option>
                  <option value="smart">Let System Decide (Smart Queue)</option>
                  <option value="tonight">Merge Tonight (2:00 AM)</option>
                  <option value="weekend">Merge This Weekend</option>
                </select>
                <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cw-txt3 pointer-events-none" />
              </div>
            </div>
            <a 
              href={prData.html_url} 
              target="_blank" 
              rel="noreferrer"
              className="text-[11px] bg-cw-bg3 hover:bg-cw-bdr border border-cw-bdr text-cw-txt py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 mt-2 transition-colors no-underline w-full font-medium shadow-sm"
            >
              <ExternalLink size={12} /> View Full PR on GitHub
            </a>
          </div>
        )}

        {/* TERMINAL LOGS (STRICT DARK MODE) */}
        <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#2d3139] flex flex-col shadow-inner">
          <div className="px-4 py-2.5 bg-[#161b27] border-b border-[#2d3139] flex justify-between items-center">
            <span className="text-[10px] font-bold text-blue-400 tracking-[.06em]">SANDBOX TERMINAL LOGS</span>
          </div>
          <div className="p-4 font-mono text-[12px] leading-[1.8] min-h-[220px]">
            {visibleLogs.filter(Boolean).map((l, i) => (
              <div key={i} className="flex gap-3 mb-1">
                <span className="text-[#555] shrink-0 w-10">{l.ts}</span>
                <span className={logColors[l.color]}>{l.text}</span>
              </div>
            ))}
            {running && (
              <div className="flex gap-3">
                <span className="text-[#555] w-10"> </span>
                <span className="inline-block w-[7px] h-[12px] bg-[#e8e8e6] animate-pulse align-middle rounded-sm" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

      </div>
    </div>
  );
}

