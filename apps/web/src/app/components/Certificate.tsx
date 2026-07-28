import { useState, useEffect } from 'react';
import {
  Download, Share2, Globe, Printer, ChevronRight, CheckCircle2,
  TrendingDown, Activity, ShieldAlert, Zap, LayoutTemplate, FileText,
  X, Bot, ArrowRight, Shield, Cpu, MessageSquare, GitPullRequest,
  AlertTriangle, Wrench, BarChart3, BookOpen, FlaskConical, Eye
} from 'lucide-react';
import { API_URL } from '../../lib/api';
import { RepoSelector } from './RepoSelector';

interface Agent {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tagline: string;
  status: 'active' | 'idle' | 'warning';
  stats: { label: string; value: string; color?: string }[];
  findings: { severity: 'critical' | 'high' | 'medium' | 'low' | 'pass'; title: string; detail: string }[];
  actions: string[];
  score: number;
}

const AGENTS: Agent[] = [
  {
    id: 'security', name: 'Security Agent', icon: Shield,
    color: 'text-cw-green', bgColor: 'bg-cw-green/10',
    tagline: 'Scanned all endpoints, secrets, deps, and OWASP top 10.',
    status: 'active', score: 100,
    stats: [
      { label: 'Secrets exposed', value: '0', color: 'text-cw-green' },
      { label: 'Vulnerable deps', value: '0', color: 'text-cw-green' },
      { label: 'OWASP issues', value: '0', color: 'text-cw-green' },
      { label: 'Auth gaps', value: '0', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'pass', title: 'No hardcoded secrets detected', detail: 'All 214 files scanned via Semgrep + custom AST rules.' },
      { severity: 'pass', title: 'Dependencies clean', detail: '0 known CVEs in 87 packages (npm audit + OSV).' },
      { severity: 'pass', title: 'OWASP Top 10 clear', detail: 'SQL injection, XSS, CSRF, SSRF patterns — all clear.' },
    ],
    actions: ['Ran secret detection across 214 files', 'Audited 87 npm packages for CVEs', 'Verified OWASP Top 10 patterns', 'Checked JWT expiry and rotation policy'],
  },
  {
    id: 'broken-code', name: 'Broken Code Agent', icon: Activity,
    color: 'text-cw-green', bgColor: 'bg-cw-green/10',
    tagline: 'Ran 142 tests, analyzed stack traces, and verified coverage.',
    status: 'active', score: 100,
    stats: [
      { label: 'Tests passed', value: '142/142', color: 'text-cw-green' },
      { label: 'Failing tests', value: '0', color: 'text-cw-green' },
      { label: 'Coverage', value: '94%', color: 'text-cw-green' },
      { label: 'Flaky tests', value: '0', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'pass', title: 'All 142 tests passing', detail: 'Unit, integration, and E2E tests ran on Node 20 + Jest.' },
      { severity: 'pass', title: 'No flaky tests detected', detail: 'Tests ran 3× — zero inconsistent results.' },
      { severity: 'low', title: 'Coverage gap: src/utils/format.ts', detail: 'Lines 44–67 are untested. Low risk — pure formatting.' },
    ],
    actions: ['Executed 142 unit + integration tests', 'Checked for flaky test patterns across 3 runs', 'Mapped uncovered lines to risk level', 'Cross-referenced production Sentry errors with diff'],
  },
  {
    id: 'ai-era', name: 'AI-Era Agent', icon: Zap,
    color: 'text-cw-teal', bgColor: 'bg-cw-teal/10',
    tagline: 'Assessed AI-generated code risk, hallucination patterns, and AI-readability.',
    status: 'active', score: 96,
    stats: [
      { label: 'AI-gen risk files', value: '1', color: 'text-cw-amber' },
      { label: 'Hallucination flags', value: '0', color: 'text-cw-green' },
      { label: 'Prompt injection risk', value: '0', color: 'text-cw-green' },
      { label: 'Context window waste', value: '−12%', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'low', title: 'AI-generated boilerplate in src/api/webhooks.ts', detail: 'Detected low-entropy, repetitive pattern consistent with LLM output. No security risk — flag for human review.' },
      { severity: 'pass', title: 'No prompt injection vectors', detail: 'All user-supplied inputs that touch AI prompts are sanitized.' },
      { severity: 'pass', title: 'No hallucinated API calls', detail: 'All external SDK calls match documented API surfaces.' },
    ],
    actions: ['Scanned 214 files for AI-generation signatures', 'Checked all LLM prompt boundaries for injection', 'Validated external API calls against live specs', 'Measured token efficiency of context sent to AI'],
  },
  {
    id: 'architecture', name: 'Architecture Agent', icon: LayoutTemplate,
    color: 'text-cw-amber', bgColor: 'bg-cw-amber/10',
    tagline: 'Analyzed data access patterns, coupling, and PRD compliance.',
    status: 'warning', score: 82,
    stats: [
      { label: 'N+1 queries', value: '1 open', color: 'text-cw-amber' },
      { label: 'Circular deps', value: '0', color: 'text-cw-green' },
      { label: 'PRD compliance', value: '98%', color: 'text-cw-green' },
      { label: 'Over-coupling', value: '0', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'medium', title: 'N+1 query in GET /api/users/:id/projects', detail: 'Each project record triggers a separate DB call for owner. Use eager loading via `include: { owner: true }`.' },
      { severity: 'pass', title: 'No circular dependencies', detail: 'Module dependency graph is clean across 42 modules.' },
      { severity: 'pass', title: '98% PRD compliance', detail: 'All 23 functional requirements from the spec are implemented.' },
    ],
    actions: ['Traced all DB query patterns via ORM analysis', 'Built module dependency graph (42 nodes)', 'Cross-referenced implementation against PRD in Google Docs', 'Checked ADR compliance for service boundaries'],
  },
  {
    id: 'bloat', name: 'Bloat Agent', icon: TrendingDown,
    color: 'text-cw-green', bgColor: 'bg-cw-green/10',
    tagline: 'Removed dead code, unused deps, and duplicate logic.',
    status: 'active', score: 91,
    stats: [
      { label: 'Lines removed', value: '−247', color: 'text-cw-green' },
      { label: 'Dead exports', value: '3', color: 'text-cw-amber' },
      { label: 'Unused packages', value: '2', color: 'text-cw-amber' },
      { label: 'Bundle delta', value: '−18KB', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'low', title: '3 unused exports in src/lib/validators.ts', detail: '`validatePhoneNumber`, `validatePostalCode`, `validateBIC` — exported but never imported.' },
      { severity: 'low', title: '2 unused npm packages', detail: '`lodash.throttle` and `date-fns` are listed in package.json but not imported anywhere.' },
      { severity: 'pass', title: 'No duplicate logic detected', detail: 'No copy-pasted function bodies found across 214 files.' },
    ],
    actions: ['Traced all export usage across the module graph', 'Ran dead-code elimination simulation', 'Audited package.json imports vs actual usage', 'Measured bundle size delta from dead code removal'],
  },
  {
    id: 'compliance', name: 'Compliance Agent', icon: FileText,
    color: 'text-cw-amber', bgColor: 'bg-cw-amber/10',
    tagline: 'Checked WCAG, GDPR, EU AI Act, and license compliance.',
    status: 'warning', score: 88,
    stats: [
      { label: 'WCAG warnings', value: '1', color: 'text-cw-amber' },
      { label: 'GDPR gaps', value: '0', color: 'text-cw-green' },
      { label: 'License issues', value: '0', color: 'text-cw-green' },
      { label: 'EU AI Act flags', value: '0', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'medium', title: 'WCAG 2.1 AA: missing aria-label on icon buttons', detail: '4 icon-only `<button>` elements in `src/components/Toolbar.tsx` lack accessible labels.' },
      { severity: 'pass', title: 'GDPR compliant', detail: 'PII data is encrypted at rest, consent flows are documented.' },
      { severity: 'pass', title: 'All licenses compatible', detail: '87 packages audited — zero GPL or proprietary license conflicts.' },
    ],
    actions: ['Scanned all JSX for accessibility attribute gaps', 'Verified GDPR consent mechanisms and data maps', 'Audited all 87 package licenses for conflicts', 'Checked EU AI Act high-risk system indicators'],
  },
  {
    id: 'performance', name: 'Performance Agent', icon: BarChart3,
    color: 'text-cw-blue', bgColor: 'bg-cw-blue/10',
    tagline: 'Profiled latency, memory, and bundle efficiency.',
    status: 'active', score: 94,
    stats: [
      { label: 'Avg response time', value: '42ms', color: 'text-cw-green' },
      { label: 'Memory leaks', value: '0', color: 'text-cw-green' },
      { label: 'P99 latency', value: '187ms', color: 'text-cw-green' },
      { label: 'Bundle size', value: '214KB', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'pass', title: 'No memory leaks detected', detail: 'Heap profiling over 10k requests — stable growth pattern.' },
      { severity: 'pass', title: 'P99 latency within SLO', detail: 'All endpoints under 200ms P99 threshold.' },
      { severity: 'low', title: 'Large image assets not lazy-loaded', detail: '3 hero images in dashboard are blocking LCP. Add `loading="lazy"`.' },
    ],
    actions: ['Profiled all endpoints for latency and CPU', 'Ran heap snapshots over 10k simulated requests', 'Measured bundle size per route via Webpack analysis', 'Cross-checked Datadog APM traces'],
  },
  {
    id: 'data-dx', name: 'Data & DX Agent', icon: FlaskConical,
    color: 'text-cw-purple', bgColor: 'bg-cw-purple/10',
    tagline: 'Analyzed developer experience metrics, docs coverage, and test quality.',
    status: 'active', score: 89,
    stats: [
      { label: 'Doc coverage', value: '76%', color: 'text-cw-amber' },
      { label: 'Type coverage', value: '94%', color: 'text-cw-green' },
      { label: 'Lint errors', value: '0', color: 'text-cw-green' },
      { label: 'PR cycle time', value: '4.2h', color: 'text-cw-green' },
    ],
    findings: [
      { severity: 'low', title: 'Docs missing for 24% of public functions', detail: '38 exported functions in src/api/ lack JSDoc comments.' },
      { severity: 'pass', title: '94% TypeScript type coverage', detail: 'Only 6 `any` types detected — all in legacy migration files.' },
      { severity: 'pass', title: 'Zero lint errors', detail: 'ESLint ran against 214 files — all clean.' },
    ],
    actions: ['Measured JSDoc coverage across all public exports', 'Counted `any` types and mapped to files', 'Ran ESLint across full codebase', 'Pulled PR cycle time from Linear integration'],
  },
  {
    id: 'documentation', name: 'Documentation Agent', icon: BookOpen,
    color: 'text-cw-teal', bgColor: 'bg-cw-teal/10',
    tagline: 'Generated and verified README, ADRs, and changelog.',
    status: 'active', score: 87,
    stats: [
      { label: 'README quality', value: 'A−', color: 'text-cw-green' },
      { label: 'ADRs documented', value: '7/9', color: 'text-cw-amber' },
      { label: 'Changelog up-to-date', value: 'Yes', color: 'text-cw-green' },
      { label: 'API docs coverage', value: '82%', color: 'text-cw-amber' },
    ],
    findings: [
      { severity: 'low', title: '2 ADRs not yet documented', detail: 'ADR-008 (auth strategy change) and ADR-009 (DB migration) are missing.' },
      { severity: 'pass', title: 'README is complete and clear', detail: 'Covers setup, env vars, architecture, and deployment.' },
      { severity: 'pass', title: 'Changelog is current', detail: 'Last updated 4 minutes ago with the current scan.' },
    ],
    actions: ['Scored README against a 20-point rubric', 'Verified all ADRs against known architectural decisions', 'Checked CHANGELOG.md freshness and format', 'Mapped OpenAPI coverage against actual endpoints'],
  },
];

const severityConfig = {
  critical: { color: 'text-cw-red', bg: 'bg-cw-red/10 border-cw-red/20', label: 'Critical' },
  high:     { color: 'text-cw-red', bg: 'bg-cw-red/5 border-cw-red/10', label: 'High' },
  medium:   { color: 'text-cw-amber', bg: 'bg-cw-amber/10 border-cw-amber/20', label: 'Medium' },
  low:      { color: 'text-cw-txt2', bg: 'bg-cw-bg2 border-cw-bdr', label: 'Low' },
  pass:     { color: 'text-cw-green', bg: 'bg-cw-green/5 border-cw-green/20', label: 'Pass' },
};

export function Certificate() {

  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { repos: [] })
      .then((d) => setRepoList(d.repos ?? []))
      .catch(() => {});
  }, []);

  const [sidePanel, setSidePanel] = useState<'history' | 'share' | 'feed' | null>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  const drawerOpen = !!(sidePanel || activeAgent);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
        {/* Floating Top Bar (Repo Selector + Action Buttons) */}
        <div className="p-6 w-full max-w-[920px] mx-auto pb-0 flex justify-between items-end relative z-20 -mb-4">
          <div className="w-[280px]">
             <RepoSelector
                options={repoList}
                value={repoFilter}
                onChange={(val, name) => setRepoFilter(val === 'All' ? 'All' : name)}
                showAllOption={true}
                allOptionLabel="All connected repositories"
             />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setActiveAgent(null); setSidePanel('share'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-bg2 rounded-md border border-cw-bdr text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors shadow-sm">
              <Printer size={14} /> Print / Export
            </button>
            <button onClick={() => { setActiveAgent(null); setSidePanel('share'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-blue hover:brightness-110 rounded-md text-[12px] font-medium text-white transition-colors shadow-sm">
              <Share2 size={14} /> Share link
            </button>
          </div>
        </div>

        <div className="p-6 w-full max-w-[920px] mx-auto pt-4">
          {/* Main Hero Banner */}
          <div className="relative w-full h-[220px] rounded-2xl overflow-hidden mb-8 border border-cw-bdr/50 shadow-lg group cursor-pointer">
            {/* Background Image */}
            <img 
              src="/certificate_banner.png" 
              alt="Health Certificate" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight max-w-md">
                Prove your <br />
                code health <span className="text-cw-green inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </h2>
              <p className="text-[14px] text-gray-300 max-w-sm mt-1 font-medium">
                Share your Codeward verified certificate to build trust with investors, partners, and customers.
              </p>
            </div>
          </div>

          {/* Hero Score */}
          <div
            onClick={() => { setActiveAgent(null); setSidePanel('history'); }}
            className="relative overflow-hidden rounded-2xl border border-cw-green/30 bg-gradient-to-br from-cw-green/10 via-cw-teal/5 to-transparent p-8 text-center mb-6 cursor-pointer hover:border-cw-green/50 transition-colors group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.15),transparent_70%)] pointer-events-none" />
            <div className="absolute top-4 right-4 text-[10px] text-cw-green font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              View History <ChevronRight size={12} />
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle cx="70" cy="70" r="58" className="stroke-cw-bg4 stroke-[10] fill-none" />
                <circle cx="70" cy="70" r="58" className="stroke-cw-green stroke-[10] fill-none stroke-round" style={{ strokeDasharray: 364.4, strokeDashoffset: 36.4 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-cw-green leading-none">91</div>
                <div className="text-[12px] text-cw-txt3 mt-1">/100</div>
              </div>
            </div>
            <div className="text-[14px] font-medium text-cw-txt mb-3 relative z-10">Codeward health score · acme-corp / my-api</div>
            <div className="inline-flex items-center gap-2 bg-cw-green/10 border border-cw-green/30 rounded-full px-4 py-1.5 text-[12px] font-medium text-cw-green mb-4 relative z-10">
              <CheckCircle2 size={14} /> Passed Codeward security &amp; quality review
            </div>
            <div className="text-[11px] text-cw-txt3 relative z-10">
              Last scan: 4 minutes ago · 0 critical · 0 high · 1 medium · 142/142 tests passing
            </div>
          </div>

          {/* Grade Bands */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { grade: 'F', range: '0–49', label: 'Critical debt', color: 'text-cw-red', active: false },
              { grade: 'D', range: '50–64', label: 'Poor', color: 'text-cw-amber', active: false },
              { grade: 'C', range: '65–74', label: 'Moderate', color: 'text-cw-amber', active: false },
              { grade: 'B', range: '75–89', label: 'Good', color: 'text-cw-blue', active: false },
              { grade: 'A', range: '90–100', label: 'Excellent ✓', color: 'text-cw-green', active: true },
            ].map(b => (
              <div key={b.grade} className={`rounded-xl p-3 text-center border ${b.active ? 'bg-cw-green/5 border-cw-green/40' : 'bg-cw-bg2 border-cw-bdr'}`}>
                <div className={`text-2xl font-bold mb-1 ${b.color}`}>{b.grade}</div>
                <div className="text-[10px] text-cw-txt3 mb-1">{b.range}</div>
                <div className="text-[11px] font-medium text-cw-txt2">{b.label}</div>
              </div>
            ))}
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: ShieldAlert, cat: 'Security', score: '100', pct: '100%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '0 issues · ×2.0 weight' },
              { icon: Activity, cat: 'Broken code', score: '100', pct: '100%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '142/142 tests · ×1.8 weight' },
              { icon: Zap, cat: 'AI-era', score: '96', pct: '96%', color: 'text-cw-green', bg: 'bg-cw-teal', stat: '1 low risk · ×1.5 weight' },
              { icon: LayoutTemplate, cat: 'Architecture', score: '82', pct: '82%', color: 'text-cw-amber', bg: 'bg-cw-amber', stat: '1 N+1 open · ×1.2 weight' },
              { icon: TrendingDown, cat: 'Bloat', score: '91', pct: '91%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '−247 lines removed · ×1.0' },
              { icon: FileText, cat: 'Compliance', score: '88', pct: '88%', color: 'text-cw-amber', bg: 'bg-cw-amber', stat: '1 WCAG warning · ×1.6' },
            ].map(s => (
              <div key={s.cat} className="bg-cw-bg2 border border-cw-bdr rounded-xl p-3 cursor-pointer hover:bg-cw-bg3 transition-colors">
                <div className="flex items-center gap-2 text-[11px] font-medium text-cw-txt2 mb-2">
                  <s.icon size={14} className={s.color} /> {s.cat}
                </div>
                <div className={`text-2xl font-bold mb-2 ${s.color}`}>{s.score}</div>
                <div className="h-1 bg-cw-bg4 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${s.bg} rounded-full`} style={{ width: s.pct }} />
                </div>
                <div className="text-[10px] text-cw-txt3">{s.stat}</div>
              </div>
            ))}
          </div>

          {/* Comparisons */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-2xl p-8 mb-8 shadow-sm">
            <div className="text-[13px] font-bold text-cw-txt3 uppercase tracking-wider mb-28">How you compare</div>
            <div className="relative w-[calc(100%-100px)] mx-auto h-3 mb-28 mt-4">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2.5 bg-cw-bg4 rounded-full" />
              {[
                { label: 'Lovable avg', val: 58, img: 'https://www.google.com/s2/favicons?domain=lovable.dev&sz=128', pos: 'bottom', ring: 'ring-cw-amber/30' },
                { label: 'Codeward (median)', val: 67, img: '/logo.png', pos: 'top', ring: 'ring-cw-txt3/30' },
                { label: 'Cursor avg', val: 71, img: 'https://www.google.com/s2/favicons?domain=cursor.com&sz=128', pos: 'bottom', ring: 'ring-cw-blue/30' },
                { label: 'Your score (Top 8%)', val: 91, img: 'https://github.com/vercel.png?size=128', pos: 'top', ring: 'ring-cw-green/50' },
              ].map(m => (
                <div key={m.label} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${m.val}%` }}>
                  {m.pos === 'top' && (
                    <div className="absolute bottom-full mb-3 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <span className="text-[12px] font-medium text-cw-txt2 mb-1">{m.label}</span>
                      <span className="text-[20px] font-bold text-cw-txt">{m.val}</span>
                      <div className="w-[2px] h-4 bg-cw-bdr mt-2" />
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-full ${m.ring} ring-[4px] bg-white z-10 shadow-lg overflow-hidden flex items-center justify-center p-[2px]`}>
                    <img src={m.img} alt={m.label} className="w-full h-full object-contain rounded-full" />
                  </div>
                  {m.pos === 'bottom' && (
                    <div className="absolute top-full mt-3 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <div className="w-[2px] h-4 bg-cw-bdr mb-2" />
                      <span className="text-[20px] font-bold text-cw-txt mb-1">{m.val}</span>
                      <span className="text-[12px] font-medium text-cw-txt2">{m.label}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="absolute left-0 top-full mt-4 text-[12px] text-cw-txt3 font-semibold -ml-1">0</div>
              <div className="absolute right-0 top-full mt-4 text-[12px] text-cw-txt3 font-semibold -mr-3">100</div>
            </div>
          </div>

          {/* ── Agents Section ── */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={14} className="text-cw-txt3" />
              <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">Agents that ran this scan</div>
            </div>
            <div className="flex flex-col gap-2">
              {AGENTS.map(agent => {
                const Icon = agent.icon;
                const isActive = activeAgent?.id === agent.id;
                const statusDot = agent.status === 'active' ? 'bg-cw-green' : agent.status === 'warning' ? 'bg-cw-amber' : 'bg-cw-bdr';
                return (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 ${isActive ? 'border-cw-purple/40 bg-cw-bg ring-1 ring-cw-purple/10' : 'border-cw-bdr bg-cw-bg2 hover:bg-cw-bg hover:border-cw-bdr'}`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${agent.bgColor}`}>
                      <Icon size={16} className={agent.color} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-cw-txt">{agent.name}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                      </div>
                      <p className="text-[12px] text-cw-txt2 truncate">{agent.tagline}</p>
                    </div>

                    {/* Score */}
                    <div className={`text-[16px] font-bold tabular-nums shrink-0 ${agent.score >= 90 ? 'text-cw-green' : agent.score >= 75 ? 'text-cw-amber' : 'text-cw-red'}`}>
                      {agent.score}
                    </div>

                    {/* Arrow button */}
                    <button
                      onClick={() => { setSidePanel(null); setActiveAgent(isActive ? null : agent); }}
                      className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-150 ${
                        isActive
                          ? 'bg-cw-purple border-cw-purple text-white shadow-sm'
                          : 'border-cw-bdr bg-cw-bg text-cw-txt3 hover:border-cw-purple/40 hover:text-cw-purple hover:bg-cw-bg3'
                      }`}
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Side-pull Drawer ── */}
      <div className={`shrink-0 h-full border-l border-cw-bdr bg-cw-bg flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${drawerOpen ? 'w-[440px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        {drawerOpen && (

          /* ── AGENT DETAIL ── */
          activeAgent ? (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between shrink-0 bg-cw-bg">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${activeAgent.bgColor}`}>
                    {(() => { const Icon = activeAgent.icon; return <Icon size={16} className={activeAgent.color} />; })()}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-cw-txt leading-none">{activeAgent.name}</p>
                    <p className="text-[11px] text-cw-txt3 mt-0.5">Scan report · acme-corp / my-api</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-[15px] font-bold ${activeAgent.score >= 90 ? 'text-cw-green' : activeAgent.score >= 75 ? 'text-cw-amber' : 'text-cw-red'}`}>
                    {activeAgent.score}<span className="text-[11px] text-cw-txt3 font-normal">/100</span>
                  </div>
                  <button onClick={() => setActiveAgent(null)} className="w-7 h-7 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors ml-2">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* Stats grid */}
                <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg">
                  <p className="text-[10px] font-bold text-cw-txt3 uppercase tracking-widest mb-3">Metrics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeAgent.stats.map((s, i) => (
                      <div key={i} className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3">
                        <div className={`text-[16px] font-bold mb-0.5 ${s.color || 'text-cw-txt'}`}>{s.value}</div>
                        <div className="text-[11px] text-cw-txt3">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Findings */}
                <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg">
                  <p className="text-[10px] font-bold text-cw-txt3 uppercase tracking-widest mb-3">Findings</p>
                  <div className="flex flex-col gap-2">
                    {activeAgent.findings.map((f, i) => {
                      const cfg = severityConfig[f.severity];
                      return (
                        <div key={i} className={`p-3 rounded-lg border ${cfg.bg}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                            {f.severity === 'pass' && <CheckCircle2 size={11} className="text-cw-green" />}
                            {(f.severity === 'medium' || f.severity === 'high' || f.severity === 'critical') && <AlertTriangle size={11} className="text-cw-amber" />}
                          </div>
                          <p className="text-[13px] font-medium text-cw-txt mb-1">{f.title}</p>
                          <p className="text-[12px] text-cw-txt2 leading-relaxed">{f.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions taken */}
                <div className="px-5 py-4 bg-cw-bg">
                  <p className="text-[10px] font-bold text-cw-txt3 uppercase tracking-widest mb-3">Actions taken</p>
                  <div className="flex flex-col gap-0">
                    {activeAgent.actions.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5 border-b border-cw-bdr/50 last:border-0">
                        <CheckCircle2 size={13} className="text-cw-green shrink-0 mt-0.5" />
                        <p className="text-[13px] text-cw-txt2">{a}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>

          ) : (
            /* ── HISTORY / SHARE / FEED ── */
            <>
              <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
                <h2 className="text-[15px] font-bold text-cw-txt">
                  {sidePanel === 'history' && 'Score History'}
                  {sidePanel === 'share' && 'Export / Print'}
                  {sidePanel === 'feed' && 'Global Feed'}
                </h2>
                <button onClick={() => setSidePanel(null)} className="w-7 h-7 rounded-lg hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 bg-cw-bg">
                {sidePanel === 'history' && (
                  <div className="space-y-6">
                    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5">
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-[13px] font-medium text-cw-txt">Health score over time</div>
                        <div className="flex gap-1">
                          {['30d', '90d', '1y'].map(d => (
                            <button key={d} className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${d === '30d' ? 'bg-cw-bg3 text-cw-txt' : 'text-cw-txt3 hover:text-cw-txt'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <div className="h-48 border-b border-cw-bdr mb-3 relative flex items-end pb-4">
                        <div className="absolute inset-0 bg-gradient-to-t from-cw-green/5 to-transparent pointer-events-none" />
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <path d="M0,90 L20,85 L40,70 L60,65 L80,30 L100,10" fill="none" stroke="var(--color-cw-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M0,90 L20,85 L40,70 L60,65 L80,30 L100,10 L100,100 L0,100 Z" fill="url(#grad)" opacity="0.2" />
                          <defs>
                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-cw-green)" />
                              <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                          </defs>
                          <circle cx="100" cy="10" r="3" fill="#fff" stroke="var(--color-cw-green)" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[10px] text-cw-txt3">
                        <span>May 18</span><span>Jun 1</span><span>Today</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                        <div className="text-[11px] text-cw-txt2 mb-1">Starting score</div>
                        <div className="text-2xl font-bold text-cw-red mb-1">52</div>
                        <div className="text-[10px] text-cw-txt3">May 18</div>
                      </div>
                      <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                        <div className="text-[11px] text-cw-txt2 mb-1">Peak improvement</div>
                        <div className="text-2xl font-bold text-cw-green mb-1">+39 pts</div>
                        <div className="text-[10px] text-cw-txt3">over 30 days</div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-4">Key milestones</h3>
                      <div className="relative border-l-2 border-cw-bdr ml-2 space-y-5 pb-4">
                        <div className="relative pl-5">
                          <div className="absolute w-3 h-3 bg-cw-green rounded-full -left-[7px] top-1 ring-4 ring-cw-bg" />
                          <div className="text-[12px] font-medium text-cw-txt">Removed 50k lines of dead code</div>
                          <div className="text-[11px] text-cw-txt2 mt-0.5"><span className="text-cw-green font-semibold">+8 pts</span> · Jun 12</div>
                        </div>
                        <div className="relative pl-5">
                          <div className="absolute w-3 h-3 bg-cw-green rounded-full -left-[7px] top-1 ring-4 ring-cw-bg" />
                          <div className="text-[12px] font-medium text-cw-txt">Fixed 3 critical OWASP vulnerabilities</div>
                          <div className="text-[11px] text-cw-txt2 mt-0.5"><span className="text-cw-green font-semibold">+15 pts</span> · May 28</div>
                        </div>
                        <div className="relative pl-5">
                          <div className="absolute w-3 h-3 bg-cw-green rounded-full -left-[7px] top-1 ring-4 ring-cw-bg" />
                          <div className="text-[12px] font-medium text-cw-txt">Resolved 14 failing E2E tests</div>
                          <div className="text-[11px] text-cw-txt2 mt-0.5"><span className="text-cw-green font-semibold">+12 pts</span> · May 20</div>
                        </div>
                        <div className="relative pl-5">
                          <div className="absolute w-3 h-3 bg-cw-bg3 border border-cw-bdr rounded-full -left-[7px] top-1 ring-4 ring-cw-bg" />
                          <div className="text-[12px] font-medium text-cw-txt">Initial codebase scan</div>
                          <div className="text-[11px] text-cw-txt2 mt-0.5">Score: 52 · May 18</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {sidePanel === 'share' && (
                  <div className="space-y-6">
                    <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-2">Certificate / Report format</div>
                    <div className="space-y-3 mb-6">
                      {[
                        { title: 'Health certificate PDF', desc: 'shareable, investor-ready, signed by Codeward', active: true },
                        { title: 'Full debt audit PDF', desc: 'all findings, evidence, fix recommendations', active: false },
                        { title: 'Executive summary', desc: '1-page brief for CTOs and boards', active: false },
                        { title: 'Compliance report', desc: 'EU AI Act / GDPR format, includes audit trail', active: false },
                        { title: 'CSV export', desc: 'all findings for spreadsheet / Jira import', active: false },
                      ].map((opt, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${opt.active ? 'border-cw-blue' : 'border-cw-txt3'}`}>
                            {opt.active && <div className="w-2 h-2 rounded-full bg-cw-blue" />}
                          </div>
                          <div className="text-[12px]">
                            <span className="font-semibold text-cw-txt">{opt.title}</span>
                            <span className="text-cw-txt3 mx-1">—</span>
                            <span className="text-cw-txt2">{opt.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-2.5 bg-cw-blue hover:brightness-110 rounded-lg text-[13px] text-white font-medium transition-colors flex items-center justify-center gap-2">
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                )}

                {sidePanel === 'feed' && (
                  <div className="text-center py-12 text-cw-txt3 text-[12px]">
                    Global feed content appears here.
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
