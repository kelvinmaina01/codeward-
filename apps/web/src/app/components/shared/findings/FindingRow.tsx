import { memo, type ReactNode } from 'react';
import {
  ArrowRight01Icon, GitPullRequestIcon, AlertCircleIcon
} from 'hugeicons-react';
import { Brain } from 'lucide-react';

import {
  type RealAlert, type Tone, TONE_DOT, TONE_PILL, FOCUS_RING,
  severityTone, timeAgo, isAdvisory, isMemoryDismissed, deriveExposure, locatorOf,
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
  /** Compact mode: hides secondary details (source, repo, timestamp) when side drawer/pull is open. */
  compact?: boolean;
}

/** One-line finding preview. Everything past the title is progressive disclosure. */
function FindingRowImpl({
  alert,
  selected = false,
  onSelect,
  action,
  showRepo = true,
  className = '',
  compact = false,
}: FindingRowProps) {
  const advisory = isAdvisory(alert);
  const memoryDismissed = isMemoryDismissed(alert);
  const exposure = alert.kind === 'finding' ? deriveExposure(alert) : null;
  const tone: Tone = advisory ? 'neutral' : severityTone(alert.severity);
  const locator = locatorOf(alert);
  const KindIcon = alert.kind === 'autofix' ? GitPullRequestIcon : alert.kind === 'escalation' ? AlertCircleIcon : null;
  const interactive = typeof onSelect === 'function';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={onSelect}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); } } : undefined}
      className={`relative grid items-center gap-x-2.5 min-h-10 sm:min-h-11 pl-3.5 pr-2.5 border-b border-cw-bdr last:border-b-0 transition-colors
        grid-cols-[minmax(0,1fr)_auto_auto]
        ${interactive ? `cursor-pointer hover:bg-cw-bg3/60 ${FOCUS_RING} focus-visible:ring-inset` : ''}
        ${selected ? 'bg-cw-bg3/70' : ''} ${className}`}
    >
      {/* Severity rail — the only colour a row carries by default */}
      <span aria-hidden="true" className={`absolute left-0 top-2 bottom-2 w-0.5 ${TONE_DOT[tone]}`} />

      {/* Title + locator */}
      <div className="min-w-0 py-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5 overflow-hidden">
        <div className="min-w-0 flex items-center gap-1.5 shrink truncate">
          {KindIcon && <KindIcon size={14} className="text-cw-txt3 shrink-0" />}
          {/* Advisory titles read as secondary — the gate is not waiting on them */}
          <span className={`text-[13px] sm:text-[14px] font-medium truncate ${advisory ? 'text-cw-txt2' : 'text-cw-txt'}`}>{alert.title}</span>
          {/* Autonomous AI suppression is the one thing a developer must be able to see at row level, so it survives the sm: breakpoint */}
          {memoryDismissed && (
            <span
              className={`inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[11px] font-medium shrink-0 ${TONE_PILL.purple}`}
              title="Dismissed by AI memory — the agent deferred to an unverified memory it did not re-check this run. Reported, not blocking. A human should settle it."
            >
              <Brain size={11} strokeWidth={1.5} /> AI Memory
            </span>
          )}

        </div>
        {locator && (
          <span className="font-mono text-[11px] sm:text-[12px] text-cw-txt3 truncate shrink min-w-0" title={alert.file ?? undefined}>
            {locator}
          </span>
        )}
      </div>

      {/* Chips + meta */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 tabular-nums">
        <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL[severityTone(alert.severity)]}`}>
          {alert.severity}
        </span>
        {/* Exposure — the axis that decides whether this can stop a merge, distinct from how bad it is */}
        {exposure === 'DIRECT' && (
          <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL.red}`} title="Direct exposure — first-party code or a production dependency it imports. Can block the merge.">
            Direct
          </span>
        )}
        {exposure === 'TRANSITIVE' && (
          <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL.neutral}`} title="Transitive — a dev, build-time or nested dependency. Not reachable from this application.">
            Transitive
          </span>
        )}
        {advisory && (
          <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-medium ${TONE_PILL.amber}`} title="Reported, does not block the merge">
            Advisory
          </span>
        )}
        {!compact && (
          <span className="hidden md:inline text-[12px] text-cw-txt3 max-w-[180px] truncate">
            {alert.source}{showRepo && alert.repo ? ` · ${alert.repo.split('/').pop()}` : ''}
          </span>
        )}
        {!compact && alert.createdAt && (
          <span className="hidden lg:inline text-[12px] text-cw-txt3 w-[56px] text-right">
            {timeAgo(alert.createdAt)}
          </span>
        )}
      </div>

      {/* Trailing action */}
      <div className="flex items-center justify-end shrink-0 pl-1">
        {action ?? (interactive ? <ArrowRight01Icon size={15} className={`transition-colors ${selected ? 'text-cw-txt' : 'text-cw-txt3'}`} /> : null)}
      </div>
    </div>
  );
}

/**
 * Memoised so paging 25 more rows into a list does not re-render the rows already on screen.
 */
export const FindingRow = memo(FindingRowImpl, (a, b) =>
  a.alert === b.alert &&
  a.selected === b.selected &&
  a.showRepo === b.showRepo &&
  a.className === b.className &&
  a.compact === b.compact &&
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
