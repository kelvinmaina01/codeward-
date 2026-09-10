import { useEffect, useState } from 'react';
import { 
  Loader, AlertCircle, ShieldAlert, Activity, LayoutTemplate, TrendingDown, 
  Bot, Scale, Database, MessageSquare, CheckCircle2, Download, X as XIcon, 
  ClipboardList, Wrench, ShieldCheck, Layers, GitPullRequest, GitMerge, 
  ExternalLink, Sparkles, Check, FileCode, ArrowRight 
} from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { GithubIcon, GithubLink, PlatformIcon, githubFileUrl, extractFilePaths } from '../../components/shared/GithubLink';
import { RepoSelector } from '../../components/shared/RepoSelector';
import { pdf } from '@react-pdf/renderer';
import { ReportPDF } from '../../components/shared/ReportPDF';

interface RealAlert {
  id: string;
  kind: 'finding' | 'escalation' | 'autofix';
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  category?: string | null;
  title: string;
  description: string;
  source: string;
  repo: string;
  file?: string | null;
  line?: number | null;
  evidence?: string | null;
  suggestedFix?: string | null;
  htmlUrl?: string | null;
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

const sevChip: Record<string, string> = {
  CRITICAL: 'bg-cw-red/10 text-cw-red',
  HIGH: 'bg-cw-amber/10 text-cw-amber',
  INFO: 'bg-cw-blue/10 text-cw-blue',
};

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

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={24} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
        {/* Sleek top header bar with minimized height */}
        <div className="px-6 py-2.5 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-cw-txt">Debt report</div>
            <div className="text-[11px] text-cw-txt3">
              {tab === 'open' 
                ? `Real open high-priority debt across your repos · ${findings.length} findings` 
                : `Real automated remediations · ${filteredFixed.length} auto-fix PR(s) tracked`}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
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
              onClick={() => downloadReport(findings, fixesOpened)}
              disabled={findings.length === 0}
              className="flex items-center gap-2 bg-cw-purple hover:brightness-110 text-white px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 shrink-0 shadow-sm"
            >
              <Download size={13} /> Download report
            </button>
          </div>
        </div>

        <div className="px-6 pt-3.5 pb-6">
          {/* Sleek Segmented Toggle Button */}
          <div className="inline-flex p-1 bg-cw-bg2 border border-cw-bdr rounded-lg items-center mb-3.5">
            <button
              onClick={() => { setTab('open'); setSelectedFixedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                tab === 'open' 
                  ? 'bg-cw-purple text-white shadow-xs font-semibold' 
                  : 'text-cw-txt2 hover:text-cw-txt'
              }`}
            >
              <AlertCircle size={13} />
              <span>Open Findings</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                tab === 'open' ? 'bg-white/20 text-white' : 'bg-cw-bg3 text-cw-txt3'
              }`}>
                {findings.length}
              </span>
            </button>

            <button
              onClick={() => { setTab('fixed'); setSelectedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                tab === 'fixed' 
                  ? 'bg-cw-green text-white shadow-xs font-semibold' 
                  : 'text-cw-txt2 hover:text-cw-txt'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Debt Fixed & Remediated</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                tab === 'fixed' ? 'bg-white/20 text-white' : 'bg-cw-green/10 text-cw-green'
              }`}>
                {filteredFixed.length}
              </span>
            </button>
          </div>

          {/* ==================== VIEW 1: OPEN DEBT FINDINGS ==================== */}
          {tab === 'open' && (
            <>
              {/* KPI strip — real counts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 w-full gap-3 mb-6">
                {[
                  { label: 'Open items', val: findings.length, color: 'text-cw-purple', click: null },
                  { label: 'Critical', val: findings.filter((f) => f.severity === 'CRITICAL').length, color: 'text-cw-red', click: null },
                  { label: 'High', val: findings.filter((f) => f.severity === 'HIGH').length, color: 'text-cw-amber', click: null },
                  { label: 'Auto-fix PRs ready', val: filteredFixed.length || fixesOpened, color: 'text-cw-green', click: () => setTab('fixed') },
                ].map((k) => (
                  <div 
                    key={k.label} 
                    onClick={k.click ?? undefined}
                    className={`bg-cw-bg2 border border-cw-bdr rounded-xl p-4 w-full min-w-0 flex flex-col ${k.click ? 'cursor-pointer hover:border-cw-green/50 transition-colors' : ''}`}
                  >
                    <div className={`text-[20px] sm:text-[24px] font-bold truncate ${k.color}`}>
                      {k.val}
                    </div>
                    <div className="text-[11px] sm:text-[12px] text-cw-txt2 mt-0.5 truncate flex items-center justify-between">
                      <span>{k.label}</span>
                      {k.click && <span className="text-[10px] text-cw-green font-medium">View fixed &rarr;</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Real category cards — all 8 agents */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 w-full gap-3 mb-6">
                {CATEGORY_META.map((cat) => {
                  const count = byCategory(cat.key).length;
                  const active = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(active ? null : cat.key)}
                      className={`bg-cw-bg2 rounded-xl p-3 text-left border transition-all ${active ? 'border-cw-purple' : 'border-cw-bdr hover:border-cw-txt3'} min-w-0 w-full flex flex-col items-start cursor-pointer`}
                    >
                      <cat.icon size={16} className={`${cat.color} mb-2 shrink-0`} />
                      <div className="text-[11px] sm:text-[12px] font-semibold text-cw-txt leading-tight truncate w-full" title={cat.label}>{cat.label}</div>
                      <div className="text-[10px] sm:text-[11px] text-cw-txt3 mt-0.5 truncate w-full">{count} open</div>
                    </button>
                  );
                })}
              </div>

              {/* Real findings list */}
              {visible.length === 0 ? (
                <div className="py-16 text-center text-cw-txt3">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-cw-green" />
                  <div className="text-[14px] text-cw-txt2">No open high-priority debt{activeCategory ? ` in ${activeCategory}` : ''}.</div>
                  <div className="text-[12px] text-cw-txt3 mt-1">Real findings from your agents' runs appear here.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {visible.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`text-left bg-cw-bg2 border rounded-lg p-3.5 transition-colors cursor-pointer ${selectedId === f.id ? 'border-cw-purple' : 'border-cw-bdr hover:bg-cw-bg3'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-cw-txt">{f.title} <span className="text-cw-txt3 font-normal">· {f.repo}</span></div>
                          <div className="text-[12px] text-cw-txt2 mt-1 line-clamp-2">{f.description}</div>
                          {f.file && <div className="text-[10px] text-cw-txt3 font-mono mt-1">{f.file}{f.line != null ? `:${f.line}` : ''}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[f.severity]}`}>{f.severity}</span>
                          <span className="text-[10px] text-cw-txt3">{f.source.replace(' Agent', '')}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ==================== VIEW 2: DEBT FIXED & REMEDIATED ==================== */}
          {tab === 'fixed' && (
            <div className="flex flex-col gap-6">
              {/* Spacious Hero KPI strip for Debt Fixed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-4">
                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-cw-txt3 uppercase tracking-wider">Remediated PRs</span>
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

                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-cw-txt3 uppercase tracking-wider">Merged & Applied</span>
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

                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-cw-txt3 uppercase tracking-wider">Files Refactored</span>
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

                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-cw-txt3 uppercase tracking-wider">Guardian Verification</span>
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
                <div className="py-20 text-center text-cw-txt3 bg-cw-bg2 rounded-2xl border border-cw-bdr p-8">
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
                          className={`bg-cw-bg2 border rounded-xl p-5 transition-all shadow-sm ${
                            isSelected ? 'border-cw-green ring-1 ring-cw-green/30' : 'border-cw-bdr hover:border-cw-txt3'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-cw-green/10 text-cw-green border border-cw-green/20 flex items-center gap-1.5">
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
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isMerged 
                                  ? 'bg-cw-green/15 text-cw-green border border-cw-green/30' 
                                  : 'bg-cw-amber/15 text-cw-amber border border-cw-amber/30'
                              }`}>
                                {isMerged ? 'Applied & Merged' : 'PR Ready for Merge'}
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
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
                              <div className="text-[11px] font-semibold text-cw-txt3 uppercase tracking-wider">
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
                                      <div className="text-[11px] text-cw-txt3 mt-0.5 line-clamp-2">
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
                            <div className="text-[11px] text-cw-txt3">
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
                                className="px-3.5 py-1.5 bg-cw-purple hover:brightness-110 text-white rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 no-underline shadow-sm cursor-pointer"
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
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected && tab === 'open' ? 'w-[460px] min-w-[340px] md:w-[400px] lg:w-[460px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {selected && selectedCat && (
          <>
            <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cw-bg2 border border-cw-bdr ${selectedCat.color}`}><selectedCat.icon size={18} /></div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-cw-txt truncate">{selectedCat.label}</div>
                  <div className="text-[11px] text-cw-txt3">{selected.source}</div>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt cursor-pointer"><XIcon size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{selected.title}</h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[selected.severity]}`}>{selected.severity}</span>
                <span className="text-[11px] text-cw-txt3">{selected.repo}</span>
                {selected.file && <span className="text-[11px] text-cw-txt3 font-mono">{selected.file}{selected.line != null ? `:${selected.line}` : ''}</span>}
              </div>

              {/* What & why (purple) */}
              <div className="rounded-xl border border-cw-purple/25 bg-cw-purple/5 p-3.5 mb-3">
                <div className="text-[10px] font-bold text-cw-purple uppercase tracking-wide mb-1.5">What Codeward found</div>
                <div className="text-[13px] text-cw-txt2 leading-relaxed">{selected.description}</div>
              </div>

              {/* Where it was found — exact file:line CTA (blue) */}
              {selected.file && selected.file.includes('.') && (
                <div className="rounded-xl border border-cw-blue/25 bg-cw-blue/5 p-3.5 mb-3">
                  <div className="text-[10px] font-bold text-cw-blue uppercase tracking-wide mb-1.5">Where it was found</div>
                  <a href={githubFileUrl(selected.repo, selected.file, selected.line)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-cw-txt font-mono no-underline hover:underline">
                    <PlatformIcon url={githubFileUrl(selected.repo, selected.file, selected.line)} size={13} /> {selected.file}{selected.line != null ? `:${selected.line}` : ''}
                  </a>
                </div>
              )}

              {/* Evidence (red) — with per-file deep links to the exact spots */}
              {selected.evidence && (() => {
                const paths = extractFilePaths(selected.evidence).filter((p) => p !== selected.file);
                return (
                  <div className="rounded-xl border border-cw-red/25 bg-cw-red/5 p-3.5 mb-3">
                    <div className="text-[10px] font-bold text-cw-red uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><ClipboardList size={12} /> Tool evidence</div>
                    <div className="text-[11px] text-cw-txt2 font-mono leading-relaxed break-words">{selected.evidence}</div>
                    {paths.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 border-t border-cw-red/15 pt-2">
                        <div className="text-[10px] text-cw-txt3 mb-0.5">{paths.length} file{paths.length === 1 ? '' : 's'} — open the exact location:</div>
                        {paths.map((p) => (
                          <a key={p} href={githubFileUrl(selected.repo, p)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-cw-blue font-mono no-underline hover:underline truncate">
                            <PlatformIcon url={githubFileUrl(selected.repo, p)} size={11} className="shrink-0" /> {p}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Suggested fix (green) */}
              {selected.suggestedFix && (
                <div className="rounded-xl border border-cw-green/25 bg-cw-green/5 p-3.5 mb-3">
                  <div className="text-[10px] font-bold text-cw-green uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Wrench size={12} /> Suggested fix</div>
                  <div className="text-[13px] text-cw-txt2 leading-relaxed">{selected.suggestedFix}</div>
                </div>
              )}

              {selected.htmlUrl && (
                <GithubLink href={selected.htmlUrl} className="px-4 py-2 bg-cw-purple hover:brightness-110 text-white text-[12px] font-semibold rounded-lg mt-1" />
              )}
            </div>
          </>
        )}
      </div>

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
                  <div className="text-[11px] text-cw-txt3">{selectedFixed.agentDisplay}</div>
                </div>
              </div>
              <button onClick={() => setSelectedFixedId(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt cursor-pointer"><XIcon size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{selectedFixed.title}</h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-cw-green/10 text-cw-green border border-cw-green/20">
                  {selectedFixed.status}
                </span>
                <span className="text-[11px] text-cw-txt3">{selectedFixed.repo}</span>
                <span className="text-[11px] font-bold text-teal-400">Guardian: {selectedFixed.guardianVerdict}</span>
              </div>

              {/* Remediation Overview */}
              <div className="rounded-xl border border-cw-green/25 bg-cw-green/5 p-3.5 mb-3">
                <div className="text-[10px] font-bold text-cw-green uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Check size={13} /> Remediation Outcome
                </div>
                <div className="text-[13px] text-cw-txt2 leading-relaxed">
                  {selectedFixed.description}
                </div>
              </div>

              {/* Guardian Safety Verdict */}
              <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-3.5 mb-3">
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Guardian Autonomous Security Review
                </div>
                <div className="text-[12px] text-cw-txt2 leading-relaxed">
                  Guardian inspected the generated diff and verified that this remediation does not introduce breaking syntax, type inconsistencies, or security vulnerabilities.
                </div>
              </div>

              {/* Remediated Files */}
              {selectedFixed.appliedFixes && selectedFixed.appliedFixes.length > 0 && (
                <div className="rounded-xl border border-cw-purple/25 bg-cw-purple/5 p-3.5 mb-4">
                  <div className="text-[10px] font-bold text-cw-purple uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileCode size={13} /> Remediated Files ({selectedFixed.appliedFixes.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedFixed.appliedFixes.map((f, i) => (
                      <div key={i} className="bg-cw-bg2 p-2.5 rounded-lg border border-cw-bdr">
                        <div className="text-[12px] font-mono font-bold text-cw-txt">{f.filePath}</div>
                        <div className="text-[11px] text-cw-txt2 mt-1">{f.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={selectedFixed.prUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-cw-purple hover:brightness-110 text-white rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2 no-underline shadow-sm"
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
