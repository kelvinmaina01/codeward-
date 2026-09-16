import type { ReactNode } from 'react';
import { X, ClipboardList, Wrench, MapPin, ShieldOff, ShieldAlert } from 'lucide-react';
import { GithubLink, PlatformIcon, githubFileUrl, extractFilePaths, isValidRepoFullName } from '../GithubLink';
import {
  type RealAlert, TONE_PILL, EYEBROW, BTN_PRIMARY, FOCUS_RING,
  severityTone, timeAgo, isAdvisory, deriveExposure,
} from './finding-ui';

interface FindingDrawerProps {
  alert: RealAlert;
  onClose: () => void;
  /** Header label above the title, e.g. "Alert" or "Security debt". */
  kicker?: string;
  /** Optional extra content rendered before the GitHub CTA. */
  children?: ReactNode;
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-cw-bdr py-4 first:border-t-0 first:pt-0">
      <div className={`${EYEBROW} flex items-center gap-1.5 mb-2`}>{icon} {title}</div>
      {children}
    </section>
  );
}

/** Full detail for one finding. Structure is fixed — What / Where / Evidence / Gate / Fix — so a reader learns it once. */
export function FindingDrawer({ alert, onClose, kicker = 'Finding', children }: FindingDrawerProps) {
  return (
    <>
      <div className="h-14 px-5 border-b border-cw-bdr bg-cw-bg flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className={EYEBROW}>{kicker}</div>
          <div className="text-[12px] text-cw-txt3 truncate">{alert.source}{alert.repo ? ` · ${alert.repo}` : ''}{alert.createdAt ? ` · ${timeAgo(alert.createdAt)}` : ''}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className={`w-8 h-8 shrink-0 rounded-md border border-cw-bdr hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors cursor-pointer ${FOCUS_RING}`}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 bg-cw-bg2">
        <FindingDetailBody alert={alert} showTitle>{children}</FindingDetailBody>
      </div>
    </>
  );
}

/** The drawer's content without its chrome — reusable inline (e.g. inside a native <details>). */
export function FindingDetailBody({ alert, showTitle = false, children }: { alert: RealAlert; showTitle?: boolean; children?: ReactNode }) {
  const advisory = isAdvisory(alert);
  const exposure = deriveExposure(alert);
  const repoOk = isValidRepoFullName(alert.repo);
  const evidencePaths = alert.evidence ? extractFilePaths(alert.evidence).filter((p) => p !== alert.file) : [];

  return (
    <>
        {showTitle && <h3 className="text-[16px] font-semibold text-cw-txt leading-6 mb-3 text-balance">{alert.title}</h3>}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className={`inline-flex items-center h-6 px-2 rounded border text-[11px] font-semibold uppercase tracking-wider ${TONE_PILL[severityTone(alert.severity)]}`}>
            {alert.severity}
          </span>
          {alert.kind === 'finding' && (
            <span className={`inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] font-medium ${advisory ? TONE_PILL.neutral : TONE_PILL.red}`}>
              {advisory ? <ShieldOff size={11} /> : <ShieldAlert size={11} />}
              {advisory ? 'Advisory · transitive' : 'Direct'}
            </span>
          )}
          {alert.category && <span className="text-[12px] text-cw-txt3 uppercase tracking-wider">{alert.category}</span>}
        </div>

        <Section title="What Codeward found">
          <p className="text-[14px] text-cw-txt2 leading-6">{alert.description}</p>
        </Section>

        {alert.file && (
          <Section title="Where" icon={<MapPin size={12} />}>
            {repoOk ? (
              <a
                href={githubFileUrl(alert.repo, alert.file, alert.line)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[13px] text-cw-txt no-underline hover:underline break-all"
              >
                <PlatformIcon url={githubFileUrl(alert.repo, alert.file, alert.line)} size={13} className="shrink-0" />
                {alert.file}{alert.line != null ? `:${alert.line}` : ''}
              </a>
            ) : (
              <span className="font-mono text-[13px] text-cw-txt break-all">{alert.file}{alert.line != null ? `:${alert.line}` : ''}</span>
            )}
          </Section>
        )}

        {alert.evidence && (
          <Section title="Tool evidence" icon={<ClipboardList size={12} />}>
            <pre className="font-mono text-[12px] leading-5 text-cw-txt2 bg-cw-bg border border-cw-bdr rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">{alert.evidence}</pre>
            {evidencePaths.length > 0 && repoOk && (
              <div className="mt-2 flex flex-col gap-1">
                {evidencePaths.map((p) => (
                  <a key={p} href={githubFileUrl(alert.repo, p)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[12px] text-cw-blue no-underline hover:underline truncate">
                    <PlatformIcon url={githubFileUrl(alert.repo, p)} size={11} className="shrink-0" /> {p}
                  </a>
                ))}
              </div>
            )}
          </Section>
        )}

        {alert.kind === 'finding' && (
          <Section title="Merge gate">
            <p className="text-[14px] text-cw-txt2 leading-6">
              {exposure === 'TRANSITIVE'
                ? 'Reported as an advisory. The vulnerable code is not reachable from this application (a dev, build-time or nested dependency), so the merge is not gated on it.'
                : 'Direct exposure — first-party code or a production dependency imported by it. A Critical or High finding here blocks the merge.'}
            </p>
          </Section>
        )}

        {alert.suggestedFix && (
          <Section title="Suggested fix" icon={<Wrench size={12} />}>
            <p className="text-[14px] text-cw-txt2 leading-6">{alert.suggestedFix}</p>
          </Section>
        )}

        {children}

        {alert.htmlUrl && (
          <div className="pt-4 border-t border-cw-bdr">
            <GithubLink href={alert.htmlUrl} label={alert.kind === 'autofix' ? 'View the pull request' : 'Open on GitHub'} className={BTN_PRIMARY} />
          </div>
        )}
    </>
  );
}

/** Push-drawer shell: collapses to zero width when closed. Same transition the pages already use. */
export function DrawerShell({ open, width = 'md:w-[420px] lg:w-[480px]', children }: { open: boolean; width?: string; children: ReactNode }) {
  return (
    <div
      className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? `w-full ${width} opacity-100 z-30 absolute md:relative inset-y-0 right-0` : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'
      }`}
    >
      {open && children}
    </div>
  );
}
