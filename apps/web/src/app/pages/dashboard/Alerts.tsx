import { useState, useEffect } from 'react';
import { AlertCircle, ShieldCheck, Loader } from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { RepoSelector } from '../../components/shared/RepoSelector';
import { FindingRow, FindingGroupHeader } from '../../components/shared/findings/FindingRow';
import { FindingDrawer, DrawerShell } from '../../components/shared/findings/FindingDrawer';
import { LoadMoreRow } from '../../components/shared/findings/LoadMoreRow';
import { type RealAlert as SharedAlert, groupByExposure, EYEBROW } from '../../components/shared/findings/finding-ui';
import { usePagedList, type PagedList } from '../../../lib/usePagedList';

interface RealAlert extends SharedAlert {
  id: string;
  kind: 'finding' | 'escalation' | 'autofix';
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  runId: number;
  repoId: number;
  createdAt: string;
}

interface AlertStats { total: number; critical: number; high: number; fixesOpened: number; }

export function Alerts() {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total: 0, critical: 0, high: 0, fixesOpened: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'autofix'>('all');
  const [sourceTab, setSourceTab] = useState<string>('All');
  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setAlerts(data.alerts || []);
        setStats(data.stats || { total: 0, critical: 0, high: 0, fixesOpened: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Real category tabs, derived from the sources actually present in the data (no fake tabs).
  const sourceTabs = ['All', ...Array.from(new Set(alerts.map((a) => a.source)))];
  // Real repo + org filters for personalizing reports before viewing/sending.
  const repoOptions = ['All', ...Array.from(new Set(alerts.map((a) => a.repo)))];
  const orgOptions = Array.from(new Set(alerts.map((a) => a.repo.split('/')[0])));

  const filtered = alerts.filter((a) => {
    const matchesSeverity = filter === 'all' ? true : filter === 'autofix' ? a.kind === 'autofix' : a.severity === filter;
    const matchesSource = sourceTab === 'All' || a.source === sourceTab;
    const matchesRepo = repoFilter === 'All' || a.repo === repoFilter || (orgOptions.includes(repoFilter) && a.repo.split('/')[0] === repoFilter);
    return matchesSeverity && matchesSource && matchesRepo;
  });
  const selected = alerts.find((a) => a.id === selectedId) || null;

  // Inbox grouping (pure derivation from `filtered`): what gates the merge, what is advisory, what the agents did.
  const findingsOnly = filtered.filter((a) => a.kind === 'finding');
  const activity = filtered.filter((a) => a.kind !== 'finding');
  const { blocking, advisory } = groupByExposure<RealAlert>(findingsOnly);

  // Windowed rendering per group; any filter change snaps every group back to page 1.
  const pageKey = `${sourceTab}|${repoFilter}|${filter}`;
  const pagedBlocking = usePagedList<RealAlert>(blocking, { resetKey: pageKey });
  const pagedAdvisory = usePagedList<RealAlert>(advisory, { resetKey: pageKey });
  const pagedActivity = usePagedList<RealAlert>(activity, { resetKey: pageKey });

  const groups: { key: string; label: string; hint: string; tone: 'red' | 'neutral' | 'blue'; page: PagedList<RealAlert> }[] = [
    { key: 'blocking', label: 'Blocking', hint: 'Direct exposure — gates the merge', tone: 'red', page: pagedBlocking },
    { key: 'advisory', label: 'Advisory', hint: 'Transitive — reported, never blocks', tone: 'neutral', page: pagedAdvisory },
    { key: 'activity', label: 'Agent activity', hint: 'Escalated issues and auto-fix pull requests', tone: 'blue', page: pagedActivity },
  ];

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto w-full min-w-0">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 pb-24 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold text-cw-txt tracking-tight leading-7">Alerts</h1>
              <p className="text-[13px] text-cw-txt3 leading-5 mt-0.5">
                What needs a human: blocking findings, advisories, escalated issues and auto-fix PRs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {alerts.length > 0 && (
                <RepoSelector
                  options={repoOptions.filter((r) => r !== 'All').map((r) => ({ id: r, fullName: r }))}
                  value={repoFilter}
                  onChange={(val, name) => setRepoFilter(val === 'All' ? 'All' : name)}
                  showAllOption={true}
                  allOptionLabel="All repos & orgs"
                />
              )}
            </div>
          </div>

          {/* Summary strip — real counts */}
          {!loading && !error && alerts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
              {[
                { label: 'Blocking', val: blocking.length, cls: blocking.length > 0 ? 'text-cw-red' : 'text-cw-txt' },
                { label: 'Advisory', val: advisory.length, cls: 'text-cw-txt' },
                { label: 'Critical', val: stats.critical, cls: stats.critical > 0 ? 'text-cw-red' : 'text-cw-txt' },
                { label: 'Auto-fix PRs', val: stats.fixesOpened, cls: 'text-cw-txt' },
              ].map((k) => (
                <div key={k.label} className="px-4 py-3 border-r border-b sm:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-1">
                  <span className={EYEBROW}>{k.label}</span>
                  <span className={`text-[22px] leading-7 font-semibold tabular-nums ${k.cls}`}>{k.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Source tabs (real, derived from data) */}
          {!loading && !error && alerts.length > 0 && (
            <div className="flex gap-1 border-b border-cw-bdr overflow-x-auto -mb-1">
              {sourceTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSourceTab(tab)}
                  className={`h-9 px-3 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${sourceTab === tab ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center"><Loader size={20} className="animate-spin text-cw-purple" /></div>
          ) : error ? (
            <div className="py-10 text-cw-red text-[14px] flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-cw-bdr rounded-md">
              <ShieldCheck size={24} className="mx-auto mb-3 text-cw-green" />
              <div className="text-[14px] text-cw-txt">No alerts{filter !== 'all' ? ' for this filter' : ''}.</div>
              <div className="text-[13px] text-cw-txt3 mt-1">High-severity findings, escalations, and auto-fix PRs will appear here as your agents run.</div>
            </div>
          ) : (
            <div className="border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
              {groups.filter((g) => g.page.total > 0).map((g) => (
                <section key={g.key} aria-label={g.label}>
                  <FindingGroupHeader label={g.label} count={g.page.total} tone={g.tone} hint={g.hint} />
                  {g.page.visible.map((alert) => (
                    <FindingRow
                      key={alert.id}
                      alert={alert}
                      selected={selectedId === alert.id}
                      onSelect={() => setSelectedId((prev) => (prev === alert.id ? null : alert.id))}
                    />
                  ))}
                  {g.page.hasMore && <LoadMoreRow remaining={g.page.remaining} pageSize={g.page.pageSize} onClick={g.page.showMore} />}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <DrawerShell open={!!selected}>
        {selected && <FindingDrawer alert={selected} kicker="Alert" onClose={() => setSelectedId(null)} />}
      </DrawerShell>
    </div>
  );
}
