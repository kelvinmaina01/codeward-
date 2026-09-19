import { useState, useEffect } from 'react';
import { AlertCircleIcon, Shield02Icon, Loading03Icon } from 'hugeicons-react';
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

  const repoOptions = Array.from(new Set(alerts.map((a) => a.repo).filter(Boolean)));
  const orgOptions = Array.from(new Set(repoOptions.map((r) => r.split('/')[0])));
  const sourceTabs = ['All', ...Array.from(new Set(alerts.map((a) => a.source).filter(Boolean)))];

  const filtered = alerts.filter((a) => {
    const matchesSeverity = filter === 'all' ? true : filter === 'autofix' ? a.kind === 'autofix' : a.severity === filter;
    const matchesSource = sourceTab === 'All' || a.source === sourceTab;
    const matchesRepo = repoFilter === 'All' || a.repo === repoFilter || (orgOptions.includes(repoFilter) && a.repo.split('/')[0] === repoFilter);
    return matchesSeverity && matchesSource && matchesRepo;
  });
  const selected = alerts.find((a) => a.id === selectedId) || null;

  // Sort newest-first so every group renders the most recent alerts at the top.
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // Inbox grouping (pure derivation from `sorted`): what gates the merge, what is advisory, what the agents did.
  const findingsOnly = sorted.filter((a) => a.kind === 'finding');
  const activity = sorted.filter((a) => a.kind !== 'finding');
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

  const hasDrawer = !!selected;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto w-full min-w-0">
        <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 lg:px-6 py-4 pb-20 flex flex-col gap-4">

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

          {/* Summary strip — clickable severity/type gates */}
          {!loading && !error && alerts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
              {([
                { label: 'Blocking', filterVal: 'all' as const, val: blocking.length, cls: blocking.length > 0 ? 'text-cw-red' : 'text-cw-txt' },
                { label: 'Advisory', filterVal: 'all' as const, val: advisory.length, cls: 'text-cw-txt' },
                { label: 'Critical', filterVal: 'CRITICAL' as const, val: stats.critical, cls: stats.critical > 0 ? 'text-cw-red' : 'text-cw-txt' },
                { label: 'Auto-fix PRs', filterVal: 'autofix' as const, val: stats.fixesOpened, cls: 'text-cw-txt' },
              ] as const).map((k) => {
                const active = filter === k.filterVal && k.filterVal !== 'all';
                return (
                  <button
                    key={k.label}
                    type="button"
                    onClick={() => setFilter(k.filterVal === 'all' ? 'all' : (filter === k.filterVal ? 'all' : k.filterVal))}
                    className={`px-4 py-3 border-r border-b sm:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-1 text-left transition-colors cursor-pointer ${active ? 'bg-cw-purple/5 ring-1 ring-inset ring-cw-purple/30' : 'hover:bg-cw-bg3'}`}
                  >
                    <span className={EYEBROW}>{k.label}</span>
                    <span className={`text-[22px] leading-7 font-semibold tabular-nums ${k.cls}`}>{k.val}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Severity filter pills */}
          {!loading && !error && alerts.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div role="group" aria-label="Severity filter" className="inline-flex items-center rounded-md border border-cw-bdr bg-cw-bg2 p-0.5">
                {([['all', 'All'], ['CRITICAL', 'Critical'], ['HIGH', 'High'], ['autofix', 'Auto-fix PRs']] as const).map(([val, label]) => {
                  const active = filter === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(val as any)}
                      className={`px-2.5 py-1 rounded-[5px] text-[13px] font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cw-purple/60 focus-visible:ring-offset-1 focus-visible:ring-offset-cw-bg ${active ? 'bg-cw-bg3 text-cw-txt' : 'text-cw-txt3 hover:text-cw-txt'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
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
            <div className="py-20 flex justify-center"><Loading03Icon size={20} className="animate-spin text-cw-purple" /></div>
          ) : error ? (
            <div className="py-10 text-cw-red text-[14px] flex items-center justify-center gap-2"><AlertCircleIcon size={16} /> {error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-cw-bdr rounded-md">
              <Shield02Icon size={24} className="mx-auto mb-3 text-cw-green" />
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
                      compact={hasDrawer}
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
      <DrawerShell open={hasDrawer}>
        {selected && <FindingDrawer alert={selected} kicker="Alert" onClose={() => setSelectedId(null)} />}
      </DrawerShell>
    </div>
  );
}
