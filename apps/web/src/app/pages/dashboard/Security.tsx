import { useEffect, useState } from 'react';
import { Loader, ShieldCheck, AlertCircle, ChevronDown } from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { FindingRow, FindingGroupHeader } from '../../components/shared/findings/FindingRow';
import { FindingDetailBody } from '../../components/shared/findings/FindingDrawer';
import { LoadMoreRow } from '../../components/shared/findings/LoadMoreRow';
import { type RealAlert as SharedAlert, groupByExposure, EYEBROW } from '../../components/shared/findings/finding-ui';
import { usePagedList } from '../../../lib/usePagedList';

interface RealAlert extends SharedAlert {
  id: string;
  kind: string;
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
}

/** A row that opens inline. Native <details> gives progressive disclosure with no component state. */
function ExpandableFinding({ issue }: { issue: RealAlert }) {
  return (
    <details className="group border-b border-cw-bdr last:border-b-0">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        <FindingRow
          alert={issue}
          showRepo={false}
          className="border-b-0 group-open:bg-cw-bg3/70"
          action={<ChevronDown size={16} className="text-cw-txt3 transition-transform group-open:rotate-180 group-open:text-cw-txt" />}
        />
      </summary>
      <div className="px-5 pb-5 pt-1 bg-cw-bg border-t border-cw-bdr">
        <FindingDetailBody alert={issue} />
      </div>
    </details>
  );
}

export function Security() {
  const [issues, setIssues] = useState<RealAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        // Real security-relevant findings only, from the real alerts feed.
        const sec = (data.alerts || []).filter((a: RealAlert) => a.kind === 'finding' && a.source === 'Security Agent');
        setIssues(sec);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Derivations and windowing hooks come before the early returns (hooks must be unconditional).
  const { blocking, advisory } = groupByExposure<RealAlert>(issues);
  const critical = issues.filter((i) => i.severity === 'CRITICAL').length;
  const repos = Array.from(new Set(issues.map((i) => i.repo))).filter(Boolean);
  const pagedBlocking = usePagedList<RealAlert>(blocking);
  const pagedAdvisory = usePagedList<RealAlert>(advisory);

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={20} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red text-[14px] flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 pb-24 flex flex-col gap-5">

        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-cw-txt tracking-tight leading-7">Security</h1>
          <p className="text-[13px] text-cw-txt3 leading-5 mt-0.5">
            Open Security Agent findings{repos.length === 1 ? ` in ${repos[0]}` : repos.length > 1 ? ` across ${repos.length} repositories` : ''}. Blocking findings gate the merge; advisories are reported and let it through.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
          {[
            { label: 'Blocking', val: blocking.length, cls: blocking.length > 0 ? 'text-cw-red' : 'text-cw-txt' },
            { label: 'Advisory', val: advisory.length, cls: 'text-cw-txt' },
            { label: 'Critical', val: critical, cls: critical > 0 ? 'text-cw-red' : 'text-cw-txt' },
            { label: 'Total open', val: issues.length, cls: 'text-cw-txt' },
          ].map((k) => (
            <div key={k.label} className="px-4 py-3 border-r border-b sm:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-1">
              <span className={EYEBROW}>{k.label}</span>
              <span className={`text-[22px] leading-7 font-semibold tabular-nums ${k.cls}`}>{k.val}</span>
            </div>
          ))}
        </div>

        {issues.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-cw-bdr rounded-md">
            <ShieldCheck size={24} className="mx-auto mb-3 text-cw-green" />
            <div className="text-[14px] text-cw-txt">No open critical or high security findings.</div>
            <div className="text-[13px] text-cw-txt3 mt-1">Real Security Agent findings across your repos appear here.</div>
          </div>
        ) : (
          <div className="border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
            {blocking.length > 0 && (
              <section aria-label="Blocking">
                <FindingGroupHeader label="Blocking" count={blocking.length} tone="red" hint="Direct exposure — gates the merge" />
                {pagedBlocking.visible.map((issue) => <ExpandableFinding key={issue.id} issue={issue} />)}
                {pagedBlocking.hasMore && <LoadMoreRow remaining={pagedBlocking.remaining} pageSize={pagedBlocking.pageSize} onClick={pagedBlocking.showMore} />}
              </section>
            )}
            {advisory.length > 0 && (
              <section aria-label="Advisory">
                <FindingGroupHeader label="Advisory" count={advisory.length} tone="neutral" hint="Transitive — reported, never blocks" />
                {pagedAdvisory.visible.map((issue) => <ExpandableFinding key={issue.id} issue={issue} />)}
                {pagedAdvisory.hasMore && <LoadMoreRow remaining={pagedAdvisory.remaining} pageSize={pagedAdvisory.pageSize} onClick={pagedAdvisory.showMore} />}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
