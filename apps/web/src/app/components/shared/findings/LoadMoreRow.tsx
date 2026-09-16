import { ChevronDown } from 'lucide-react';
import { FOCUS_RING } from './finding-ui';

interface LoadMoreRowProps {
  remaining: number;
  pageSize: number;
  onClick: () => void;
}

/** Terminal row of a windowed list. Same 44px grammar as FindingRow so the list stays one object. */
export function LoadMoreRow({ remaining, pageSize, onClick }: LoadMoreRowProps) {
  const next = Math.min(pageSize, remaining);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-11 px-4 border-t border-cw-bdr bg-cw-bg flex items-center justify-center gap-2 text-[13px] font-medium text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3/60 transition-colors cursor-pointer ${FOCUS_RING} focus-visible:ring-inset`}
    >
      <ChevronDown size={14} />
      Show {next} more
      <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">· {remaining} remaining</span>
    </button>
  );
}
