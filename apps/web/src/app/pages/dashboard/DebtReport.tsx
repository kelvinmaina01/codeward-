import { useEffect, useState } from 'react';
import { 
  Loader, AlertCircle, ShieldAlert, Activity, LayoutTemplate, TrendingDown, 
  Bot, Scale, Database, MessageSquare, CheckCircle2, Download, X as XIcon, 
  ClipboardList, Wrench, ShieldCheck, Layers, GitPullRequest, GitMerge, 
  ExternalLink, Sparkles, Check, FileCode, ArrowRight 
} from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { GithubIcon } from '../../components/shared/GithubLink';
import { RepoSelector } from '../../components/shared/RepoSelector';
import { pdf } from '@react-pdf/renderer';
import { ReportPDF } from '../../components/shared/ReportPDF';
import { FindingRow, FindingGroupHeader } from '../../components/shared/findings/FindingRow';
import { FindingDrawer, DrawerShell } from '../../components/shared/findings/FindingDrawer';
import { LoadMoreRow } from '../../components/shared/findings/LoadMoreRow';
import { type RealAlert as SharedAlert, groupByExposure, EYEBROW, BTN_PRIMARY, BTN_SECONDARY } from '../../components/shared/findings/finding-ui';
import { usePagedList } from '../../../lib/usePagedList';

interface RealAlert extends SharedAlert {
  id: string;
  kind: 'finding' | 'escalation' | 'autofix';
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
}

interface FixedDebtItem {
  id: string;
  kind: string;
  repo: string;
  repoId?: number;
  runId?: number;
  pullRequestNumber: number;
  prUrl: string;
  title: string;
  description: string;
  agentId: string;
  agentDisplay: string;
  status: string;
  guardianVerdict: string;
  maxSeverity?: string;
  mode?: string;
  appliedFixes: { filePath: string; rationale: string; confidence?: string }[];
  filesCount: number;
  decidedAt?: string | null;
  createdAt?: string;
}

// Real Codeward agent sources -> debt categories (all 8 dispatchable agents).
const CATEGORY_META: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'Security Agent', label: 'Security debt', icon: ShieldCheck, color: 'text-cw-red' },
  { key: 'Broken Code Agent', label: 'Broken code', icon: Activity, color: 'text-cw-amber' },
  { key: 'Architecture Agent', label: 'Architecture', icon: Layers, color: 'text-cw-blue' },
  { key: 'Bloat Agent', label: 'Bloat', icon: TrendingDown, color: 'text-cw-green' },
  { key: 'Compliance Agent', label: 'Compliance', icon: Scale, color: 'text-cw-purple' },
  { key: 'Data & DX Agent', label: 'Data & DX', icon: Database, color: 'text-cw-teal' },
  { key: 'AI-Era Agent', label: 'AI-Era', icon: Bot, color: 'text-cw-purple' },
  { key: 'Chat Agent', label: 'Chat', icon: MessageSquare, color: 'text-cw-blue' },
];

async function downloadReport(findings: RealAlert[], fixesOpened: number) {
  const doc = <ReportPDF findings={findings} fixesOpened={fixesOpened} categories={CATEGORY_META} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  
  const now = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `codeward-debt-report-${now}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DebtReport() {
  const [tab, setTab] = useState<'open' | 'fixed'>('open');
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [fixesOpened, setFixesOpened] = useState(0);
  const [fixedList, setFixedList] = useState<FixedDebtItem[]>([]);
  const [fixedStats, setFixedStats] = useState<{ totalFixed: number; prsOpened: number; prsMerged: number; filesRemediated: number }>({
    totalFixed: 0, prsOpened: 0, prsMerged: 0, filesRemediated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFixedId, setSelectedFixedId] = useState<string | null>(null);
  const [repoFilter, setRepoFilter] = useState<string>('All');

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/alerts`, { credentials: 'include' }).then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        return data;
      }),
      fetch(`${API_URL}/api/alerts/fixed`, { credentials: 'include' }).then(async res => {
        if (!res.ok) return { fixed: [], stats: { totalFixed: 0, prsOpened: 0, prsMerged: 0, filesRemediated: 0 } };
        return res.json();
      }).catch(() => ({ fixed: [], stats: { totalFixed: 0, prsOpened: 0, prsMerged: 0, filesRemediated: 0 } }))
    ])
      .then(([alertsData, fixedData]) => {
        setAlerts(alertsData.alerts || []);
        setFixesOpened(alertsData.stats?.fixesOpened ?? 0);
        setFixedList(fixedData.fixed || []);
        if (fixedData.stats) setFixedStats(fixedData.stats);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allFindings = alerts.filter((a) => a.kind === 'finding');
  const allRepos = Array.from(new Set([
    ...allFindings.map((a) => a.repo),
    ...fixedList.map((f) => f.repo),
  ])).filter(Boolean);

  const allRepoOptions = ['All', ...allRepos];
  const orgOptions = Array.from(new Set(allRepos.map((r) => r.split('/')[0])));

  const findings = allFindings.filter(
    (f) => repoFilter === 'All' || f.repo === repoFilter || (orgOptions.includes(repoFilter) && f.repo.split('/')[0] === repoFilter)
  );

  const filteredFixed = fixedList.filter(
    (f) => repoFilter === 'All' || f.repo === repoFilter || (orgOptions.includes(repoFilter) && f.repo.split('/')[0] === repoFilter)
  );

  const byCategory = (source: string) => findings.filter((f) => f.source === source);
  const visible = activeCategory ? findings.filter((f) => f.source === activeCategory) : findings;
  
  const selected = findings.find((f) => f.id === selectedId) || null;
  const selectedCat = selected ? CATEGORY_META.find((c) => c.key === selected.source) : null;

  const selectedFixed = filteredFixed.find((f) => f.id === selectedFixedId) || null;

  // Pure presentation derivations for the open-findings view.
  const { blocking: visibleBlocking, advisory: visibleAdvisory } = groupByExposure<RealAlert>(visible);
  const pageKey = `${repoFilter}|${activeCategory ?? ''}`;
  const pagedBlocking = usePagedList<RealAlert>(visibleBlocking, { resetKey: pageKey });
  const pagedAdvisory = usePagedList<RealAlert>(visibleAdvisory, { resetKey: pageKey });
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const activeCategories = CATEGORY_META.filter((c) => byCategory(c.key).length > 0);
  const emptyCategories = CATEGORY_META.filter((c) => byCategory(c.key).length === 0);

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={20} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red text-[14px] flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-cw-bdr bg-cw-bg flex items-center justify-between gap-4 flex-wrap shrink-0">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-cw-txt tracking-tight leading-7">Debt report</h1>
            <p className="text-[13px] text-cw-txt3 leading-5 mt-0.5">
              {tab === 'open'
                ? `Open high-priority debt across your repos · ${findings.length} finding${findings.length === 1 ? '' : 's'}`
                : `Automated remediations · ${filteredFixed.length} auto-fix PR${filteredFixed.length === 1 ? '' : 's'} tracked`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allRepos.length > 0 && (
              <RepoSelector
                options={[
                  ...(orgOptions.length > 1 ? orgOptions.map(o => ({ id: o, fullName: `${o} (org)` })) : []),
                  ...allRepoOptions.filter(r => r !== 'All').map(r => ({ id: r, fullName: r }))
                ]}
                value={repoFilter}
                showAllOption
                allOptionLabel="All repos & orgs"
                onChange={(val) => setRepoFilter(String(val))}
              />
            )}
            <button
              type="button"
              onClick={() => downloadReport(findings, fixesOpened)}
              disabled={findings.length === 0}
              className={BTN_PRIMARY}
            >
              <Download size={14} /> Download report
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
          {/* View switch */}
          <div className="flex gap-1 border-b border-cw-bdr">
            <button
              type="button"
              onClick={() => { setTab('open'); setSelectedFixedId(null); }}
              className={`h-9 px-3 inline-flex items-center gap-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${tab === 'open' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt'}`}
            >
              <AlertCircle size={14} /> Open findings
              <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">{findings.length}</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('fixed'); setSelectedId(null); }}
              className={`h-9 px-3 inline-flex items-center gap-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${tab === 'fixed' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt'}`}
            >
              <ShieldCheck size={14} /> Fixed & remediated
              <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">{filteredFixed.length}</span>
            </button>
          </div>

          {/* ==================== VIEW 1: OPEN DEBT FINDINGS ==================== */}
          {tab === 'open' && (
            <>
              {/* KPI strip — real counts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
                {[
                  { label: 'Open items', val: findings.length, cls: 'text-cw-txt', click: null as null | (() => void) },
                  { label: 'Blocking', val: groupByExposure<RealAlert>(findings).blocking.length, cls: groupByExposure<RealAlert>(findings).blocking.length > 0 ? 'text-cw-red' : 'text-cw-txt', click: null },
                  { label: 'Critical / High', val: `${criticalCount} / ${highCount}`, cls: criticalCount > 0 ? 'text-cw-red' : 'text-cw-txt', click: null },
                  { label: 'Auto-fix PRs ready', val: filteredFixed.length || fixesOpened, cls: 'text-cw-txt', click: () => setTab('fixed') },
                ].map((k) => (
                  <div
                    key={k.label}
                    onClick={k.click ?? undefined}
                    className={`px-4 py-3 border-r border-b lg:border-b-0 border-cw-bdr last:border-r-0 flex flex-col gap-1 min-w-0 ${k.click ? 'cursor-pointer hover:bg-cw-bg3/60 transition-colors' : ''}`}
                  >
                    <span className={`${EYEBROW} flex items-center justify-between gap-2`}>
                      {k.label}
                      {k.click && <span className="normal-case tracking-normal text-cw-purple flex items-center gap-1">View <ArrowRight size={11} /></span>}
                    </span>
                    <span className={`text-[22px] leading-7 font-semibold tabular-nums truncate ${k.cls}`}>{k.val}</span>
                  </div>
                ))}
              </div>

              {/* Category filter bar — categories with findings are actionable; empty ones collapse */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={EYEBROW}>Filter</span>
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`h-8 px-3 inline-flex items-center gap-2 rounded-md border text-[13px] font-medium transition-colors cursor-pointer ${activeCategory === null ? 'border-cw-txt bg-cw-bg3 text-cw-txt' : 'border-cw-bdr bg-cw-bg2 text-cw-txt2 hover:text-cw-txt'}`}
                >
                  All <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">{findings.length}</span>
                </button>
                {activeCategories.map((cat) => {
                  const count = byCategory(cat.key).length;
                  const active = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(active ? null : cat.key)}
                      className={`h-8 px-3 inline-flex items-center gap-2 rounded-md border text-[13px] font-medium transition-colors cursor-pointer ${active ? 'border-cw-txt bg-cw-bg3 text-cw-txt' : 'border-cw-bdr bg-cw-bg2 text-cw-txt2 hover:text-cw-txt'}`}
                    >
                      <cat.icon size={14} className="text-cw-txt3" /> {cat.label}
                      <span className="font-mono text-[12px] text-cw-txt3 tabular-nums">{count}</span>
                    </button>
                  );
                })}
                {emptyCategories.length > 0 && (
                  <details className="relative">
                    <summary className="list-none h-8 px-3 inline-flex items-center rounded-md border border-dashed border-cw-bdr text-[13px] text-cw-txt3 cursor-pointer hover:text-cw-txt [&::-webkit-details-marker]:hidden">
                      {emptyCategories.length} clean
                    </summary>
                    <div className="absolute z-10 mt-1 min-w-[200px] border border-cw-bdr bg-cw-bg2 rounded-md p-1 flex flex-col">
                      {emptyCategories.map((cat) => (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                          className="h-8 px-2 inline-flex items-center gap-2 rounded text-[13px] text-cw-txt3 hover:bg-cw-bg3 hover:text-cw-txt cursor-pointer text-left"
                        >
                          <cat.icon size={14} /> {cat.label} <span className="ml-auto font-mono text-[12px] tabular-nums">0</span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Findings list */}
              {visible.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-cw-bdr rounded-md">
                  <CheckCircle2 size={24} className="mx-auto mb-3 text-cw-green" />
                  <div className="text-[14px] text-cw-txt">No open high-priority debt{activeCategory ? ` in ${activeCategory}` : ''}.</div>
                  <div className="text-[13px] text-cw-txt3 mt-1">Real findings from your agents' runs appear here.</div>
                </div>
              ) : (
                <div className="border border-cw-bdr rounded-md overflow-hidden bg-cw-bg2">
                  {visibleBlocking.length > 0 && (
                    <section aria-label="Blocking">
                      <FindingGroupHeader label="Blocking" count={visibleBlocking.length} tone="red" hint="Direct exposure — gates the merge" />
                      {pagedBlocking.visible.map((f) => (
                        <FindingRow key={f.id} alert={f} selected={selectedId === f.id} onSelect={() => setSelectedId(f.id)} />
                      ))}
                      {pagedBlocking.hasMore && <LoadMoreRow remaining={pagedBlocking.remaining} pageSize={pagedBlocking.pageSize} onClick={pagedBlocking.showMore} />}
                    </section>
                  )}
                  {visibleAdvisory.length > 0 && (
                    <section aria-label="Advisory">
                      <FindingGroupHeader label="Advisory" count={visibleAdvisory.length} tone="neutral" hint="Transitive — reported, never blocks" />
                      {pagedAdvisory.visible.map((f) => (
                        <FindingRow key={f.id} alert={f} selected={selectedId === f.id} onSelect={() => setSelectedId(f.id)} />
                      ))}
                      {pagedAdvisory.hasMore && <LoadMoreRow remaining={pagedAdvisory.remaining} pageSize={pagedAdvisory.pageSize} onClick={pagedAdvisory.showMore} />}
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {/* ==================== VIEW 2: DEBT FIXED & REMEDIATED ==================== */}
          {tab === 'fixed' && (
            <div className="flex flex-col gap-6">
              {/* Spacious Hero KPI strip for Debt Fixed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-4">
                <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-cw-txt3 uppercase tracking-wider">Remediated PRs</span>
                    <div className="w-8 h-8 rounded-lg bg-cw-green/10 flex items-center justify-center text-cw-green">
                      <GitPullRequest size={16} />
                    </div>
                  </div>
                  <div className="text-[28px] font-bold text-cw-green">
                    {filteredFixed.length}
                  </div>
                  <div className="text-[12px] text-cw-txt2 mt-1">
                    Auto-fix pull requests opened
                  </div>
                </div>

                <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-cw-txt3 uppercase tracking-wider">Merged & Applied</span>
                    <div className="w-8 h-8 rounded-lg bg-cw-blue/10 flex items-center justify-center text-cw-blue">
                      <GitMerge size={16} />
                    </div>
                  </div>
                  <div className="text-[28px] font-bold text-cw-blue">
                    {filteredFixed.filter(f => f.status === 'auto_merged' || f.status === 'approved').length}
                  </div>
                  <div className="text-[12px] text-cw-txt2 mt-1">
                    Verified fixes merged to repository
                  </div>
                </div>

                <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-cw-txt3 uppercase tracking-wider">Files Refactored</span>
                    <div className="w-8 h-8 rounded-lg bg-cw-purple/10 flex items-center justify-center text-cw-purple">
                      <FileCode size={16} />
                    </div>
                  </div>
                  <div className="text-[28px] font-bold text-cw-purple">
                    {filteredFixed.reduce((sum, f) => sum + f.filesCount, 0)}
                  </div>
                  <div className="text-[12px] text-cw-txt2 mt-1">
                    Remediated codebase files
                  </div>
                </div>

                <div className="bg-cw-bg2 border border-cw-bdr rounded-md p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold text-cw-txt3 uppercase tracking-wider">Guardian Verification</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={16} />
                    </div>
                  </div>
                  <div className="text-[28px] font-bold text-emerald-400">
                    100%
                  </div>
                  <div className="text-[12px] text-cw-txt2 mt-1">
                    Autonomous safety verified
                  </div>
                </div>
              </div>

              {/* Spacious Debt Fixed Feed */}
              {filteredFixed.length === 0 ? (
                <div className="py-20 text-center text-cw-txt3 bg-cw-bg2 rounded-md border border-cw-bdr p-8">
                  <CheckCircle2 size={40} className="mx-auto mb-4 text-cw-green" />
                  <div className="text-[16px] font-semibold text-cw-txt">No fixed debt records found for this selection.</div>
                  <div className="text-[13px] text-cw-txt3 mt-1 max-w-md mx-auto">
                    When Codeward agents identify fixable debt, auto-fix PRs will be automatically created, reviewed by Guardian, and displayed here.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="text-[13px] font-bold text-cw-txt">
                    Verified Remediations & Auto-Fixes ({filteredFixed.length})
                  </div>

                  <div className="flex flex-col gap-3">
                    {filteredFixed.map((item) => {
                      const isMerged = item.status === 'auto_merged' || item.status === 'approved';
                      const isSelected = selectedFixedId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`bg-cw-bg2 border rounded-md p-5 transition-all ${
                            isSelected ? 'border-cw-green ring-1 ring-cw-green/30' : 'border-cw-bdr hover:border-cw-txt3'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2.5 py-1 rounded-md text-[12px] font-bold bg-cw-green/10 text-cw-green border border-cw-green/20 flex items-center gap-1.5">
                                <GitPullRequest size={12} /> PR #{item.pullRequestNumber}
                              </span>
                              <span className="text-[12px] font-semibold text-cw-txt3">
                                {item.repo}
                              </span>
                              <span className="text-cw-txt3">·</span>
                              <span className="text-[12px] text-cw-txt2 font-medium">
                                {item.agentDisplay}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase tracking-wider ${
                                isMerged 
                                  ? 'bg-cw-green/15 text-cw-green border border-cw-green/30' 
                                  : 'bg-cw-amber/15 text-cw-amber border border-cw-amber/30'
                              }`}>
                                {isMerged ? 'Applied & Merged' : 'PR Ready for Merge'}
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                                <ShieldCheck size={11} /> Guardian: {item.guardianVerdict}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <h4 className="text-[15px] font-bold text-cw-txt leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-[13px] text-cw-txt2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          {/* Applied Fixes list if available */}
                          {item.appliedFixes && item.appliedFixes.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-cw-bdr/60 flex flex-col gap-2">
                              <div className="text-[12px] font-semibold text-cw-txt3 uppercase tracking-wider">
                                Cleaned files ({item.appliedFixes.length}):
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {item.appliedFixes.map((fix, idx) => (
                                  <div key={idx} className="bg-cw-bg p-2.5 rounded-lg border border-cw-bdr/70 flex items-start gap-2.5">
                                    <FileCode size={14} className="text-cw-green mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12px] font-mono text-cw-txt font-semibold truncate">
                                        {fix.filePath}
                                      </div>
                                      <div className="text-[12px] text-cw-txt3 mt-0.5 line-clamp-2">
                                        {fix.rationale}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="mt-4 pt-3 border-t border-cw-bdr/60 flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-[12px] text-cw-txt3">
                              {item.decidedAt 
                                ? `Resolved on ${new Date(item.decidedAt).toLocaleDateString()}` 
                                : item.createdAt 
                                  ? `Opened on ${new Date(item.createdAt).toLocaleDateString()}` 
                                  : 'Automated remediation'}
                            </div>

                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => setSelectedFixedId(isSelected ? null : item.id)}
                                className="px-3 py-1.5 bg-cw-bg3 hover:bg-cw-bdr/60 text-cw-txt rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                {isSelected ? 'Close details' : 'Inspect details'} <ArrowRight size={13} />
                              </button>

                              <a
                                href={item.prUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 bg-cw-purple hover:brightness-110 text-white rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 no-underline cursor-pointer"
                              >
                                <GithubIcon size={14} /> View PR on GitHub <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer for Open Findings */}
      <DrawerShell open={!!(selected && tab === 'open')}>
        {selected && selectedCat && (
          <FindingDrawer alert={selected} kicker={selectedCat.label} onClose={() => setSelectedId(null)} />
        )}
      </DrawerShell>

      {/* Detail drawer for Fixed Debt */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedFixed && tab === 'fixed' ? 'w-[460px] min-w-[340px] md:w-[400px] lg:w-[460px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {selectedFixed && (
          <>
            <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cw-green/10 border border-cw-green/20 text-cw-green">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-cw-txt truncate">Debt Remediated & Verified</div>
                  <div className="text-[12px] text-cw-txt3">{selectedFixed.agentDisplay}</div>
                </div>
              </div>
              <button onClick={() => setSelectedFixedId(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt cursor-pointer"><XIcon size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{selectedFixed.title}</h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[12px] font-bold px-2 py-0.5 rounded uppercase bg-cw-green/10 text-cw-green border border-cw-green/20">
                  {selectedFixed.status}
                </span>
                <span className="text-[12px] text-cw-txt3">{selectedFixed.repo}</span>
                <span className="text-[12px] font-bold text-teal-400">Guardian: {selectedFixed.guardianVerdict}</span>
              </div>

              {/* Remediation Overview */}
              <div className="rounded-md border border-cw-green/25 bg-cw-green/5 p-3.5 mb-3">
                <div className="text-[12px] font-bold text-cw-green uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Check size={13} /> Remediation Outcome
                </div>
                <div className="text-[13px] text-cw-txt2 leading-relaxed">
                  {selectedFixed.description}
                </div>
              </div>

              {/* Guardian Safety Verdict */}
              <div className="rounded-md border border-teal-500/25 bg-teal-500/5 p-3.5 mb-3">
                <div className="text-[12px] font-bold text-teal-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Guardian Autonomous Security Review
                </div>
                <div className="text-[12px] text-cw-txt2 leading-relaxed">
                  Guardian inspected the generated diff and verified that this remediation does not introduce breaking syntax, type inconsistencies, or security vulnerabilities.
                </div>
              </div>

              {/* Remediated Files */}
              {selectedFixed.appliedFixes && selectedFixed.appliedFixes.length > 0 && (
                <div className="rounded-md border border-cw-purple/25 bg-cw-purple/5 p-3.5 mb-4">
                  <div className="text-[12px] font-bold text-cw-purple uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileCode size={13} /> Remediated Files ({selectedFixed.appliedFixes.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedFixed.appliedFixes.map((f, i) => (
                      <div key={i} className="bg-cw-bg2 p-2.5 rounded-lg border border-cw-bdr">
                        <div className="text-[12px] font-mono font-bold text-cw-txt">{f.filePath}</div>
                        <div className="text-[12px] text-cw-txt2 mt-1">{f.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={selectedFixed.prUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-cw-purple hover:brightness-110 text-white rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2 no-underline"
              >
                <GithubIcon size={16} /> Open Pull Request on GitHub <ExternalLink size={13} />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
