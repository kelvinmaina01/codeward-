import { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface Props {
  onRunClick?: (sha: string) => void;
}

const auditRows = [
  { id: 11, repo: 'frontend-app', sha: '941a699', msg: 'perf: optimize database queries', status: 'PASSED', tests: { pass: 80, total: 80 }, time: 'Jun 8 20:30:19' },
  { id: 8,  repo: 'mobile-backend', sha: '7f6d34a', msg: 'feat: push notification sm...', status: 'RUNNING', tests: null, time: 'Jun 5 23:45:25' },
  { id: 3,  repo: 'frontend-app', sha: 'f1a4d53', msg: 'fix: duplicate error handler removed', status: 'FAILED', tests: { pass: 61, total: 80 }, time: 'Jun 5 23:25:25' },
  { id: 1,  repo: 'api-gateway', sha: 'a1f9b21', msg: 'feat: add rate limiting middleware', status: 'PASSED', tests: { pass: 142, total: 142 }, time: 'Jun 5 21:55:25' },
  { id: 4,  repo: 'frontend-app', sha: '8b3c71e', msg: 'chore: update dependencies and remove dead code', status: 'PASSED', tests: { pass: 89, total: 89 }, time: 'Jun 5 20:51:25' },
  { id: 9,  repo: 'mobile-backend', sha: 'b2c8a91', msg: 'refactor: consolidate API response formatters', status: 'PASSED', tests: { pass: 113, total: 115 }, time: 'Jun 5 19:53:49' },
  { id: 5,  repo: 'auth-service', sha: 'c9e5f02', msg: 'feat: implement JWT refresh token rotation', status: 'PASSED', tests: { pass: 201, total: 201 }, time: 'Jun 5 17:55:25' },
  { id: 2,  repo: 'api-gateway', sha: 'd7c2e80', msg: 'refactor: extract auth helpers into shared utils', status: 'PASSED', tests: { pass: 133, total: 138 }, time: 'Jun 5 17:55:29' },
  { id: 6,  repo: 'data-pipeline', sha: '2d8a19f', msg: 'wip: refactor pipeline stage handlers', status: 'FAILED', tests: { pass: 33, total: 67 }, time: 'Jun 4 23:35:35' },
  { id: 10, repo: 'api-gateway', sha: '9a1f55d', msg: 'fix: handle null pointer in request validator', status: 'PASSED', tests: { pass: 142, total: 142 }, time: 'Jun 4 13:35:25' },
  { id: 7,  repo: 'data-pipeline', sha: 'e4b07c3', msg: 'fix: memory leak in stream processor', status: 'ROLLED BACK', tests: { pass: 12, total: 67 }, time: 'Jun 3 23:55:25' },
];

const statusStyle: Record<string, string> = {
  PASSED:       'bg-[#166534] text-white',
  RUNNING:      'bg-[#1D4ED8] text-white',
  FAILED:       'bg-[#991B1B] text-white',
  'ROLLED BACK':'bg-[#92400E] text-white',
};

function TestBar({ pass, total }: { pass: number; total: number }) {
  const pct = Math.round((pass / total) * 100);
  const color = pct === 100 ? 'bg-[#22C55E]' : pct > 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] text-cw-txt2 font-mono">{pass}/{total}</div>
      <div className="w-16 h-[3px] bg-cw-bg3 rounded-sm">
        <div className={`h-[3px] rounded-sm ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DeployHistory({ onRunClick }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL STATUSES');

  const filtered = auditRows.filter(r => {
    const matchSearch = !search || r.repo.includes(search) || r.sha.includes(search) || r.msg.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL STATUSES' || r.status === filterStatus;
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
          {['ALL STATUSES', 'PASSED', 'RUNNING', 'FAILED', 'ROLLED BACK'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-cw-bg2 border border-cw-bdr rounded-[10px] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[48px_130px_1fr_100px_120px_100px] gap-2 px-3.5 py-2 text-[9px] font-bold text-cw-txt3 uppercase tracking-[.08em] border-b border-cw-bdr bg-cw-bg3">
          <span>RUN ID</span><span>REPOSITORY</span><span>COMMIT</span><span>STATUS</span><span>TESTS</span><span>TIME</span>
        </div>

        {filtered.map((row, i) => {
          const st = statusStyle[row.status] || statusStyle.PASSED;
          return (
            <div
              key={row.id}
              onClick={() => onRunClick?.(row.sha)}
              className={`grid grid-cols-[48px_130px_1fr_100px_120px_100px] gap-2 px-3.5 py-2.5 text-[11px] cursor-pointer transition-colors hover:bg-cw-bg3 ${i < filtered.length - 1 ? 'border-b border-cw-bg3' : ''}`}
            >
              <span className="text-cw-txt3 font-mono">#{row.id}</span>
              <span className="text-cw-txt font-medium">{row.repo}</span>
              <div>
                <span className="font-mono text-cw-blue">→ {row.sha}</span>
                <div className="text-cw-txt2 text-[10px] mt-px overflow-hidden text-ellipsis whitespace-nowrap">{row.msg}</div>
              </div>
              <span className={`${st} text-[9px] font-bold px-[7px] py-[3px] rounded tracking-[.04em] inline-block h-fit`}>
                {row.status}
              </span>
              <div>
                {row.tests ? <TestBar pass={row.tests.pass} total={row.tests.total} /> : <span className="text-cw-txt3 text-[10px]">N/A</span>}
              </div>
              <span className="text-cw-txt3 text-[10px]">{row.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
