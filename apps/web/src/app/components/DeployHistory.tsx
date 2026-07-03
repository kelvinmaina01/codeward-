import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { API_URL } from '../../lib/api';

interface Props {
  onRunClick?: (repoId: number, runId: number) => void;
}

interface HistoryRow {
  runId: number;
  repoId: number;
  repoFullName: string;
  commitSha: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  completed:     'bg-[#166534] text-white',
  running:       'bg-[#1D4ED8] text-white',
  queued:        'bg-[#374151] text-white',
  failed:        'bg-[#991B1B] text-white',
  agent_failed:  'bg-[#92400E] text-white',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-[#22C55E]' : score >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] text-cw-txt2 font-mono">{score}/100</div>
      <div className="w-16 h-[3px] bg-cw-bg3 rounded-sm">
        <div className={`h-[3px] rounded-sm ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function DeployHistory({ onRunClick }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL STATUSES');
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/reports/recent?limit=100`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data?.runs) setRows(data.runs); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    const matchSearch = !search || r.repoFullName.toLowerCase().includes(search.toLowerCase()) || r.commitSha.includes(search);
    const matchStatus = filterStatus === 'ALL STATUSES' || r.status.toUpperCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {/* Header description */}
      <div className="text-[11px] text-cw-txt3 mb-3">
        Audit log of all autonomous interventions and checks.
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-3.5 items-center">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-cw-txt3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commits..."
            className="w-full py-1.5 pr-2.5 pl-7 border border-cw-bdr rounded-md text-[11px] bg-cw-bg2 text-cw-txt outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="py-1.5 px-2.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg2 text-cw-txt outline-none cursor-pointer"
        >
          {['ALL STATUSES', 'COMPLETED', 'RUNNING', 'QUEUED', 'FAILED'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-[10px] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[48px_130px_1fr_100px_120px_100px] gap-2 px-3.5 py-2 text-[9px] font-bold text-cw-txt3 uppercase tracking-[.08em] border-b border-cw-bdr bg-cw-bg3">
          <span>RUN ID</span><span>REPOSITORY</span><span>COMMIT</span><span>STATUS</span><span>SCORE</span><span>TIME</span>
        </div>

        {loading ? (
          <div className="px-3.5 py-6 text-center text-cw-txt3 text-[11px]">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-cw-txt3 text-[11px]">No runs found.</div>
        ) : filtered.map((row) => {
          const st = statusStyle[row.status] || statusStyle.queued;
          return (
            <div
              key={row.runId}
              onClick={() => onRunClick?.(row.repoId, row.runId)}
              className="grid grid-cols-[48px_130px_1fr_100px_120px_100px] gap-2 px-3.5 py-2.5 text-[11px] cursor-pointer transition-colors hover:bg-cw-bg3 border-b border-cw-bg3 last:border-b-0"
            >
              <span className="text-cw-txt3 font-mono">#{row.runId}</span>
              <span className="text-cw-txt font-medium">{row.repoFullName}</span>
              <div>
                <span className="font-mono text-cw-blue">→ {row.commitSha.slice(0, 7)}</span>
              </div>
              <span className={`${st} text-[9px] font-bold px-[7px] py-[3px] rounded tracking-[.04em] inline-block h-fit uppercase`}>
                {row.status}
              </span>
              <div>
                {row.overallScore != null ? <ScoreBar score={row.overallScore} /> : <span className="text-cw-txt3 text-[10px]">N/A</span>}
              </div>
              <span className="text-cw-txt3 text-[10px]">{new Date(row.createdAt).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
