import { useEffect, useState } from 'react';
import { Loader, AlertCircle, ShieldAlert, Activity, LayoutTemplate, TrendingDown, Bot, Scale, ExternalLink, CheckCircle2 } from 'lucide-react';
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
  htmlUrl?: string | null;
}

// Real Codeward agent sources -> debt categories.
const CATEGORY_META: { key: string; label: string; icon: any; color: string }[] = [
  { key: 'Security Agent', label: 'Security debt', icon: ShieldAlert, color: 'text-cw-red' },
  { key: 'Broken Code Agent', label: 'Broken code', icon: Activity, color: 'text-cw-amber' },
  { key: 'Architecture Agent', label: 'Architecture', icon: LayoutTemplate, color: 'text-cw-blue' },
  { key: 'Bloat Agent', label: 'Bloat', icon: TrendingDown, color: 'text-cw-green' },
  { key: 'Compliance Agent', label: 'Compliance', icon: Scale, color: 'text-cw-purple' },
  { key: 'AI-Era Agent', label: 'AI-Era', icon: Bot, color: 'text-cw-purple' },
];

const sevChip: Record<string, string> = {
  CRITICAL: 'bg-cw-red/10 text-cw-red',
  HIGH: 'bg-cw-amber/10 text-cw-amber',
  INFO: 'bg-cw-blue/10 text-cw-blue',
};

export function DebtReport() {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [fixesOpened, setFixesOpened] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  const findings = alerts.filter((a) => a.kind === 'finding');
  const byCategory = (source: string) => findings.filter((f) => f.source === source);
  const visible = activeCategory ? findings.filter((f) => f.source === activeCategory) : findings;

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={24} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
      <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[14px] font-medium text-cw-txt">Debt report</div>
          <div className="text-[11px] text-cw-txt3">Real open high-priority debt across your repos · {fixesOpened} auto-fix PR(s) opened</div>
        </div>
      </div>

      <div className="p-6">
        {/* Real category cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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
                <div className="text-[12px] font-semibold text-cw-txt">{cat.label}</div>
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
              <div key={f.id} className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-cw-txt">{f.title} <span className="text-cw-txt3 font-normal">· {f.repo}</span></div>
                    <div className="text-[12px] text-cw-txt2 mt-1">{f.description}</div>
                    {f.file && <div className="text-[10px] text-cw-txt3 font-mono mt-1">{f.file}{f.line != null ? `:${f.line}` : ''}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${sevChip[f.severity]}`}>{f.severity}</span>
                    <span className="text-[10px] text-cw-txt3">{f.source.replace(' Agent', '')}</span>
                  </div>
                </div>
                {f.htmlUrl && (
                  <a href={f.htmlUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-cw-blue no-underline hover:underline">
                    <ExternalLink size={11} /> View on GitHub
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
