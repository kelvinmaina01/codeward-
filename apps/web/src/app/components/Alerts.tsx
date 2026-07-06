import { useState, useEffect } from 'react';
import {
  ShieldAlert, GitPullRequest, AlertCircle, ExternalLink, ShieldCheck,
  ClipboardList, X, ChevronRight, Loader
} from 'lucide-react';
import { API_URL } from '../../lib/api';

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
  runId: number;
  repoId: number;
  createdAt: string;
}

interface AlertStats { total: number; critical: number; high: number; fixesOpened: number; }

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const kindIcon: Record<string, any> = { finding: ShieldAlert, escalation: AlertCircle, autofix: GitPullRequest };
const sevColor: Record<string, string> = {
  CRITICAL: 'bg-cw-red/15 text-cw-red',
  HIGH: 'bg-cw-amber/15 text-cw-amber',
  INFO: 'bg-cw-blue/15 text-cw-blue',
};

export function Alerts() {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total: 0, critical: 0, high: 0, fixesOpened: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'autofix'>('all');
  const [sourceTab, setSourceTab] = useState<string>('All');
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

  const filtered = alerts.filter((a) => {
    const matchesSeverity = filter === 'all' ? true : filter === 'autofix' ? a.kind === 'autofix' : a.severity === filter;
    const matchesSource = sourceTab === 'All' || a.source === sourceTab;
    return matchesSeverity && matchesSource;
  });
  const selected = alerts.find((a) => a.id === selectedId) || null;

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <div className="flex-1 overflow-y-auto w-full transition-all duration-300">
        <div className="p-8 max-w-[1000px] mx-auto pb-24">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[22px] font-bold text-cw-txt">Alerts</h1>
              <div className="text-[13px] text-cw-txt2 mt-1">Real notable events from your repos — high-severity findings, escalated GitHub issues, and auto-fix PRs.</div>
            </div>
          </div>

          {/* Real stat counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'all' as const, num: stats.total, label: 'Total alerts', color: 'text-cw-purple' },
              { id: 'CRITICAL' as const, num: stats.critical, label: 'Critical', color: 'text-cw-red' },
              { id: 'HIGH' as const, num: stats.high, label: 'High', color: 'text-cw-amber' },
              { id: 'autofix' as const, num: stats.fixesOpened, label: 'Auto-fix PRs', color: 'text-cw-blue' },
            ].map((stat) => (
              <div
                key={stat.id}
                onClick={() => setFilter(stat.id)}
                className={`bg-cw-bg2 rounded-xl p-4 cursor-pointer transition-all border ${filter === stat.id ? 'border-cw-purple shadow-sm' : 'border-transparent hover:border-cw-bdr'}`}
              >
                <div className={`text-[24px] font-bold mb-0.5 ${stat.color}`}>{stat.num}</div>
                <div className="text-[12px] text-cw-txt2">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Real category tabs — restored, driven by the agents actually present in the data */}
          {!loading && !error && alerts.length > 0 && (
            <div className="flex gap-1 mb-6 border-b border-cw-bdr overflow-x-auto">
              {sourceTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSourceTab(tab)}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${sourceTab === tab ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center"><Loader size={24} className="animate-spin text-cw-purple" /></div>
          ) : error ? (
            <div className="py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-cw-txt3">
              <ShieldCheck size={32} className="mx-auto mb-3 text-cw-green" />
              <div className="text-[14px] text-cw-txt2">No alerts{filter !== 'all' ? ' for this filter' : ''}.</div>
              <div className="text-[12px] text-cw-txt3 mt-1">High-severity findings, escalations, and auto-fix PRs will appear here as your agents run.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-12">
              {filtered.map((alert) => {
                const Icon = kindIcon[alert.kind] || ShieldAlert;
                const isSel = selectedId === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedId(isSel ? null : alert.id)}
                    className={`flex gap-4 items-center p-4 rounded-xl border cursor-pointer transition-colors ${isSel ? 'bg-cw-purple/5 border-cw-purple' : 'bg-cw-bg2 border-cw-bdr hover:bg-cw-bg3'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 self-start ${sevColor[alert.severity]}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0 mt-0.5 self-start">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <div className="text-[14px] font-semibold text-cw-txt truncate">{alert.title}</div>
                        <div className="text-[12px] text-cw-txt3 whitespace-nowrap shrink-0">{timeAgo(alert.createdAt)}</div>
                      </div>
                      <div className="text-[13px] text-cw-txt2 mb-2 line-clamp-2 pr-4">{alert.description}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${sevColor[alert.severity]}`}>{alert.severity}</span>
                        {alert.category && <><span className="text-[11px] text-cw-txt3">•</span><span className="text-[11px] text-cw-txt3 uppercase">{alert.category}</span></>}
                        <span className="text-[11px] text-cw-txt3">•</span>
                        <span className="text-[12px] text-cw-txt2 font-medium">{alert.source}</span>
                        <span className="text-[11px] text-cw-txt3">•</span>
                        <span className="text-[12px] text-cw-txt3">{alert.repo}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-cw-txt3 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <div className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'w-[450px] min-w-[320px] md:w-[380px] lg:w-[450px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}>
        {selected && (
          <>
            <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
              <h2 className="text-[16px] font-bold text-cw-txt truncate pr-4">Alert Details</h2>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-cw-bg">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sevColor[selected.severity]}`}>
                  {(() => { const Icon = kindIcon[selected.kind] || ShieldAlert; return <Icon size={24} />; })()}
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-cw-txt mb-1 leading-tight">{selected.title}</h3>
                  <div className="text-[12px] text-cw-txt3">{selected.source} · {selected.repo} · {timeAgo(selected.createdAt)}</div>
                </div>
              </div>
              <div className="text-[14px] text-cw-txt2 leading-relaxed mb-6">{selected.description}</div>
              {(selected.file || selected.evidence) && (
                <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3 mb-6 font-mono text-[11px] text-cw-txt2 leading-relaxed flex items-start gap-3">
                  <ClipboardList size={14} className="mt-0.5 shrink-0 text-cw-txt3" />
                  <span>{selected.file ? `${selected.file}${selected.line != null ? `:${selected.line}` : ''}` : ''}{selected.file && selected.evidence ? ' · ' : ''}{selected.evidence ?? ''}</span>
                </div>
              )}
              {selected.suggestedFix && (
                <div className="bg-cw-bg3/50 border border-cw-bdr rounded-lg p-3 mb-6 text-[12px] text-cw-txt2">
                  <div className="text-[10px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Suggested fix</div>
                  {selected.suggestedFix}
                </div>
              )}
              {selected.htmlUrl && (
                <a href={selected.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-cw-purple hover:brightness-110 text-white text-[12px] font-semibold rounded-lg no-underline">
                  <ExternalLink size={14} /> Open on GitHub
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
