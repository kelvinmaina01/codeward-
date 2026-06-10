import { Link, ExternalLink, CheckCircle, ShieldCheck, TrendingDown, Zap } from 'lucide-react';

interface Props {
  onRunClick?: (sha: string) => void;
}

export function Staging({ onRunClick }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 mb-3">
        <div className="text-[15px] font-medium mb-1 text-cw-txt">my-api · commit 3fa2c1</div>
        <div className="text-[11px] text-cw-txt3 mb-3">Deployed 4 minutes ago · all 142 tests passed · 3 debt items fixed by agent</div>

        <div className="flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-3 py-2 text-[11px] text-cw-blue mb-2.5 cursor-pointer hover:bg-[#DBEAFE] transition-colors">
          <ExternalLink size={13} /> staging-3fa2c1.codeward.app — open live preview
        </div>

        <div className="grid grid-cols-4 gap-2 my-3">
          {[
            { icon: <CheckCircle size={18} className="text-cw-green" />, label: '142/142 tests passed' },
            { icon: <ShieldCheck size={18} className="text-cw-blue" />, label: '0 critical vulns' },
            { icon: <TrendingDown size={18} className="text-cw-purple" />, label: '−247 lines removed' },
            { icon: <Zap size={18} className="text-cw-amber" />, label: 'p99 < 120ms' },
          ].map((c, i) => (
            <div key={i} className="bg-cw-bg3 rounded-lg p-2.5 text-center">
              <div className="mb-1 flex justify-center">{c.icon}</div>
              <div className="text-[10px] text-cw-txt2">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="text-xs text-cw-txt2 mb-2.5">
          Score: <strong className="text-cw-green">91/100</strong> · Security: ✓ · Broken code: ✓ · Architecture: 1 warning (N+1 on /api/users)
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => alert('Merged to production! Post-deploy monitoring active.')}
            className="px-3 py-1.5 text-[11px] rounded-md border-none bg-cw-green text-white cursor-pointer font-medium hover:opacity-90 transition-opacity"
          >
            ✓ Approve — merge to production
          </button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer hover:bg-cw-bg3 transition-colors">
            ✕ Reject
          </button>
          <button className="px-3 py-1.5 text-[11px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer hover:bg-cw-bg3 transition-colors" onClick={() => onRunClick && onRunClick('3fa2c1')}>
            View full diff
          </button>
        </div>
        <div className="text-[10px] text-cw-txt3 mt-2">Auto-approves in 1h 52m if no action taken (configurable in Settings)</div>
      </div>
    </div>
  );
}
