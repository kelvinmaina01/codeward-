import { useEffect, useState } from 'react';
import { Loader, AlertCircle, ShieldAlert, Activity, LayoutTemplate, TrendingDown, Bot, Scale, Database, MessageSquare, CheckCircle2, Download, X as XIcon, ClipboardList, Wrench } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { GithubIcon, GithubLink, githubFileUrl, extractFilePaths } from './GithubLink';

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

// Real Codeward agent sources -> debt categories (all 8 dispatchable agents).
const CATEGORY_META: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'Security Agent', label: 'Security debt', icon: ShieldAlert, color: 'text-cw-red' },
  { key: 'Broken Code Agent', label: 'Broken code', icon: Activity, color: 'text-cw-amber' },
  { key: 'Architecture Agent', label: 'Architecture', icon: LayoutTemplate, color: 'text-cw-blue' },
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

/** Generates and downloads a real Markdown debt report with a Codeward badge header. */
function downloadReport(findings: RealAlert[], fixesOpened: number) {
  const now = new Date().toISOString().slice(0, 10);
  const bySev = (s: string) => findings.filter((f) => f.severity === s).length;
  const lines: string[] = [
    `![Codeward](https://img.shields.io/badge/Codeward-verified-7c3aed?style=for-the-badge) ![Debt](https://img.shields.io/badge/open%20debt-${findings.length}-f59e0b?style=for-the-badge)`,
    '',
    `# Codeward Technical Debt Report`,
    `_Generated ${now} · ${findings.length} open high-priority items · ${fixesOpened} auto-fix PR(s) opened_`,
    '',
    `| Severity | Count |`,
    `|---|---|`,
    `| CRITICAL | ${bySev('CRITICAL')} |`,
    `| HIGH | ${bySev('HIGH')} |`,
    '',
  ];
  for (const cat of CATEGORY_META) {
    const items = findings.filter((f) => f.source === cat.key);
    if (items.length === 0) continue;
    lines.push(`## ${cat.label} (${items.length})`, '');
    for (const f of items) {
      lines.push(`- **[${f.severity}] ${f.title}** — ${f.repo}${f.file ? ` \`${f.file}${f.line != null ? `:${f.line}` : ''}\`` : ''}`);
      lines.push(`  - ${f.description}`);
      if (f.suggestedFix) lines.push(`  - _Suggested fix:_ ${f.suggestedFix}`);
      if (f.htmlUrl) lines.push(`  - ${f.htmlUrl}`);
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `codeward-debt-report-${now}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DebtReport() {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [fixesOpened, setFixesOpened] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [repoFilter, setRepoFilter] = useState<string>('All');

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setAlerts(data.alerts || []);
        setFixesOpened(data.stats?.fixesOpened ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allFindings = alerts.filter((a) => a.kind === 'finding');
  const repoOptions = ['All', ...Array.from(new Set(allFindings.map((a) => a.repo)))];
  const orgOptions = Array.from(new Set(allFindings.map((a) => a.repo.split('/')[0])));
  const findings = allFindings.filter(
    (f) => repoFilter === 'All' || f.repo === repoFilter || (orgOptions.includes(repoFilter) && f.repo.split('/')[0] === repoFilter)
  );
  const byCategory = (source: string) => findings.filter((f) => f.source === source);
  const visible = activeCategory ? findings.filter((f) => f.source === activeCategory) : findings;
  const selected = findings.find((f) => f.id === selectedId) || null;
  const selectedCat = selected ? CATEGORY_META.find((c) => c.key === selected.source) : null;

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={24} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[14px] font-medium text-cw-txt">Debt report</div>
            <div className="text-[11px] text-cw-txt3">Real open high-priority debt across your repos · {fixesOpened} auto-fix PR(s) opened</div>
          </div>
          <div className="flex items-center gap-2.5">
            {allFindings.length > 0 && (
              <select
                value={repoFilter}
                onChange={(e) => setRepoFilter(e.target.value)}
                className="bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] text-cw-txt py-2 px-3 outline-none focus:border-cw-purple max-w-[220px]"
              >
                <option value="All">All repos & orgs</option>
                {orgOptions.length > 1 && <optgroup label="Organizations">{orgOptions.map((o) => <option key={`org-${o}`} value={o}>{o} (org)</option>)}</optgroup>}
                <optgroup label="Repositories">{repoOptions.filter((r) => r !== 'All').map((r) => <option key={r} value={r}>{r}</option>)}</optgroup>
              </select>
            )}
            <button
              onClick={() => downloadReport(findings, fixesOpened)}
              disabled={findings.length === 0}
              className="flex items-center gap-2 bg-cw-purple hover:brightness-110 text-white px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40 shrink-0"
            >
              <Download size={14} /> Download report
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* KPI strip — real counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Open items', val: findings.length, color: 'text-cw-purple' },
              { label: 'Critical', val: findings.filter((f) => f.severity === 'CRITICAL').length, color: 'text-cw-red' },
              { label: 'High', val: findings.filter((f) => f.severity === 'HIGH').length, color: 'text-cw-amber' },
              { label: 'Auto-fix PRs', val: fixesOpened, color: 'text-cw-green' },
            ].map((k) => (
              <div key={k.label} className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                <div className={`text-[24px] font-bold ${k.color}`}>{k.val}</div>
                <div className="text-[12px] text-cw-txt2 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Real category cards — all 8 agents */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {CATEGORY_META.map((cat) => {
              const count = byCategory(cat.key).length;
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(active ? null : cat.key)}
                  className={`bg-cw-bg2 rounded-xl p-3 text-left border transition-all ${active ? 'border-cw-purple' : 'border-cw-bdr hover:border-cw-txt3'}`}
                >
                  <cat.icon size={16} className={`${cat.color} mb-2`} />
                  <div className="text-[12px] font-semibold text-cw-txt leading-tight">{cat.label}</div>
                  <div className="text-[11px] text-cw-txt3 mt-0.5">{count} open</div>
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
                  className={`text-left bg-cw-bg2 border rounded-lg p-3.5 transition-colors ${selectedId === f.id ? 'border-cw-purple' : 'border-cw-bdr hover:bg-cw-bg3'}`}
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
        </div>
      </div>

      {/* Detail drawer — styled brand sections, KPIs, supporting evidence */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'w-[460px] min-w-[340px] md:w-[400px] lg:w-[460px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
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
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt"><XIcon size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="text-[16px] font-bold text-cw-txt leading-tight mb-2">{selected.title}</h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[selected.severity]}`}>{selected.severity}</span>
                <span className="text-[11px] text-cw-txt3">{selected.repo}</span>
                {selected.file && <span className="text-[11px] text-cw-txt3 font-mono">{selected.file}{selected.line != null ? `:${selected.line}` : ''}</span>}
              </div>

              {/* What & why (purple) */}
              <div className="rounded-xl border border-cw-purple/25 bg-cw-purple/5 p-3 mb-3">
                <div className="text-[10px] font-bold text-cw-purple uppercase tracking-wide mb-1.5">What Codeward found</div>
                <div className="text-[13px] text-cw-txt2 leading-relaxed">{selected.description}</div>
              </div>

              {/* Where it was found — exact file:line CTA (blue) */}
              {selected.file && selected.file.includes('.') && (
                <div className="rounded-xl border border-cw-blue/25 bg-cw-blue/5 p-3 mb-3">
                  <div className="text-[10px] font-bold text-cw-blue uppercase tracking-wide mb-1.5">Where it was found</div>
                  <a href={githubFileUrl(selected.repo, selected.file, selected.line)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-cw-txt font-mono no-underline hover:underline">
                    <GithubIcon size={13} /> {selected.file}{selected.line != null ? `:${selected.line}` : ''}
                  </a>
                </div>
              )}

              {/* Evidence (red) — with per-file deep links to the exact spots */}
              {selected.evidence && (() => {
                const paths = extractFilePaths(selected.evidence).filter((p) => p !== selected.file);
                return (
                  <div className="rounded-xl border border-cw-red/25 bg-cw-red/5 p-3 mb-3">
                    <div className="text-[10px] font-bold text-cw-red uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><ClipboardList size={12} /> Tool evidence</div>
                    <div className="text-[11px] text-cw-txt2 font-mono leading-relaxed break-words">{selected.evidence}</div>
                    {paths.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 border-t border-cw-red/15 pt-2">
                        <div className="text-[10px] text-cw-txt3 mb-0.5">{paths.length} file{paths.length === 1 ? '' : 's'} — open the exact location:</div>
                        {paths.map((p) => (
                          <a key={p} href={githubFileUrl(selected.repo, p)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-cw-blue font-mono no-underline hover:underline truncate">
                            <GithubIcon size={11} className="shrink-0" /> {p}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Suggested fix (green) */}
              {selected.suggestedFix && (
                <div className="rounded-xl border border-cw-green/25 bg-cw-green/5 p-3 mb-3">
                  <div className="text-[10px] font-bold text-cw-green uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Wrench size={12} /> Suggested fix</div>
                  <div className="text-[13px] text-cw-txt2 leading-relaxed">{selected.suggestedFix}</div>
                </div>
              )}

              {selected.htmlUrl && (
                <GithubLink href={selected.htmlUrl} label="Open on GitHub" className="px-4 py-2 bg-cw-purple hover:brightness-110 text-white text-[12px] font-semibold rounded-lg mt-1" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
