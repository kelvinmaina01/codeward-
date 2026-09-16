import { memo, type ReactNode } from 'react';
import { ChevronRight, GitPullRequest, AlertCircle } from 'lucide-react';
import {
  type RealAlert, type Tone, TONE_DOT, TONE_PILL, FOCUS_RING,
  severityTone, timeAgo, isAdvisory, locatorOf,
} from './finding-ui';

interface FindingRowProps {
  alert: RealAlert;
  selected?: boolean;
  onSelect?: () => void;
  /** Optional right-hand action rendered instead of the chevron (e.g. "View fix"). */
  action?: ReactNode;
  /** Show the repo name in the meta column (hide when the list is already repo-scoped). */
  showRepo?: boolean;
  className?: string;
}

/** One-line finding preview. 44px tall; everything past the title is progressive disclosure. */
function FindingRowImpl({ alert, selected = false, onSelect, action, showRepo = true, className = '' }: FindingRowProps) {
  const advisory = isAdvisory(alert);
  const tone: Tone = advisory ? 'neutral' : severityTone(alert.severity);
  const locator = locatorOf(alert);
  const KindIcon = alert.kind === 'autofix' ? GitPullRequest : alert.kind === 'escalation' ? AlertCircle : null;
  const interactive = typeof onSelect === 'function';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={onSelect}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); } } : undefined}
      className={`relative grid items-center gap-x-3 min-h-11 pl-4 pr-3 border-b border-cw-bdr last:border-b-0 transition-colors
        grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto]
        ${interactive ? `cursor-pointer hover:bg-cw-bg3/60 ${FOCUS_RING} focus-visible:ring-inset` : ''}
        ${selected ? 'bg-cw-bg3/70' : ''} ${className}`}
    >
      {/* Severity rail — the only colour a row carries by default */}
      <span aria-hidden="true" className={`absolute left-0 top-2 bottom-2 w-0.5 ${TONE_DOT[tone]}`} />

      {/* Title + locator */}
      <div className="min-w-0 py-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <div className="min-w-0 flex items-center gap-2">
          {KindIcon && <KindIcon size={14} className="text-cw-txt3 shrink-0" />}
          <span className="text-[14px] font-medium text-cw-txt truncate">{alert.title}</span>
        </div>
        {locator && (
          <span className="font-mono text-[12px] text-cw-txt3 truncate shrink-0 sm:max-w-[260px]" title={alert.file ?? undefined}>
            {locator}
          </span>
        )}
      </div>

      {/* Chips + meta */}
      <div className="hidden sm:flex items-center gap-2 shrink-0 tabular-nums">
        <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL[severityTone(alert.severity)]}`}>
          {alert.severity}
        </span>
        {advisory && (
          <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-medium ${TONE_PILL.neutral}`} title="Transitive — reported, does not block the merge">
            Advisory
          </span>
        )}
        <span className="text-[12px] text-cw-txt3 max-w-[180px] truncate">
          {alert.source}{showRepo && alert.repo ? ` · ${alert.repo.split('/').pop()}` : ''}
        </span>
        {alert.createdAt && <span className="text-[12px] text-cw-txt3 w-[60px] text-right">{timeAgo(alert.createdAt)}</span>}
      </div>

      {/* Trailing action */}
      <div className="flex items-center justify-end shrink-0">
        {action ?? (interactive ? <ChevronRight size={16} className={`transition-colors ${selected ? 'text-cw-txt' : 'text-cw-txt3'}`} /> : null)}
      </div>
    </div>
  );
}

/**
 * Memoised so paging 25 more rows into a list does not re-render the rows already on screen.
 * The comparator deliberately ignores `onSelect` and `action` identity — pages recreate those
 * closures every render. CONTRACT: `onSelect` must not close over changing state (use a
 * functional setState update, or depend only on the row's own `alert`); `action` must derive
 * only from `alert`. Both are true for every current caller.
 */
export const FindingRow = memo(FindingRowImpl, (a, b) =>
  a.alert === b.alert &&
  a.selected === b.selected &&
  a.showRepo === b.showRepo &&
  a.className === b.className &&
  (a.action == null) === (b.action == null) &&
  (a.onSelect == null) === (b.onSelect == null)
);

/** Section header for a grouped list: "Blocking · 2" / "Advisory · 4". */
export function FindingGroupHeader({ label, count, tone = 'neutral', hint }: { label: string; count: number; tone?: Tone; hint?: string }) {
  return (
    <div className="flex items-center gap-2 h-9 px-4 border-b border-cw-bdr bg-cw-bg">
      <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <span className="text-[12px] font-semibold text-cw-txt">{label}</span>
      <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">{count}</span>
      {hint && <span className="hidden md:inline text-[12px] text-cw-txt3 ml-2 truncate">{hint}</span>}
    </div>
  );
}
