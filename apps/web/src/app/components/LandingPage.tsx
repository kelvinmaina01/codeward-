import { useState } from 'react';
import {
  ShieldCheck, Zap, GitBranch, RefreshCw, BarChart3, Award,
  ChevronDown, ChevronRight, Check, ArrowRight, Star, Bot, Lock,
  Code2, Globe, Server, Database,
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const HERO_TERMINAL = [
  { t: 0,    c: 'info', s: '14:23:01', txt: 'Webhook received · commit 3fa2c1 · 14 files changed' },
  { t: 400,  c: 'info', s: '14:23:03', txt: 'Provisioning Firecracker microVM · isolated environment' },
  { t: 800,  c: 'ok',   s: '14:23:38', txt: 'Sandbox ready · zero external network ✓' },
  { t: 1200, c: 'warn', s: '14:24:01', txt: 'BLOAT · validateEmail() duplicates utils/validators.js:42' },
  { t: 1600, c: 'ok',   s: '14:24:01', txt: '  → refactored · import rewritten to use existing helper ✓' },
  { t: 2000, c: 'err',  s: '14:24:14', txt: 'SEC · Hardcoded Stripe key in config/api.js line 3' },
  { t: 2400, c: 'ok',   s: '14:24:15', txt: '  → moved to process.env.STRIPE_SECRET_KEY ✓' },
  { t: 2800, c: 'ok',   s: '14:25:12', txt: '142/142 tests passed · 0 failures ✓' },
  { t: 3200, c: 'ok',   s: '14:25:52', txt: 'Debt score: 91/100 · promoting to staging ✓' },
];

const logColor: Record<string, string> = { ok: '#22C55E', err: '#EF4444', warn: '#F59E0B', info: '#60A5FA' };

const agents = [
  { icon: '🔴', name: 'Security Agent', model: 'Haiku 4.5', desc: '18 checks · OWASP · CVE · RLS · supply chain · prompt injection', color: '#EF4444' },
  { icon: '🟡', name: 'Bloat Agent', model: 'Haiku 4.5', desc: '18 checks · AST duplicates · dead code · god files · YAGNI', color: '#F59E0B' },
  { icon: '🔴', name: 'Broken Code Agent', model: 'Haiku 4.5', desc: '18 checks · test loop · flaky detector · zombie workers · type gaps', color: '#EF4444' },
  { icon: '🔵', name: 'Architecture Agent', model: 'Haiku 4.5', desc: '18 checks · N+1 · missing indexes · distributed monolith · load', color: '#3B82F6' },
  { icon: '🟢', name: 'AI-Era Agent', model: 'Sonnet 4.5', desc: '18 checks · RAG drift · PII pipelines · hallucination trust · bias', color: '#22C55E' },
  { icon: '⚖️', name: 'Compliance Agent', model: 'Sonnet 4.5', desc: 'EU AI Act · GDPR · WCAG 2.2 · consent versioning · audit trails', color: '#8B5CF6' },
  { icon: '📊', name: 'Data & DX Agent', model: 'Haiku 4.5', desc: 'Pipeline entanglement · data contracts · alert fatigue · DX debt', color: '#14B8A6' },
  { icon: '💬', name: 'Codeward Chat Agent', model: 'Sonnet 4.5', desc: 'Full codebase access · spawns any agent · takes real action · always on', color: '#EC4899' },
];

const features = [
  { icon: <ShieldCheck size={22} />, color: '#EF4444', title: 'Zero-trust security scanning', desc: 'OWASP Top 10, secrets detection via truffleHog, CVE audits via Trivy, RLS verification, prompt injection tests — all running inside a hermetically sealed Firecracker microVM.' },
  { icon: <RefreshCw size={22} />, color: '#22C55E', title: 'Auto-refactor, not rewrite', desc: 'The Bloat Agent scans your AST with tree-sitter, finds duplicates semantically (not just literally), rewrites imports, extracts helpers — and shows you every diff before committing.' },
  { icon: <Zap size={22} />, color: '#F59E0B', title: 'The Karpathy loop', desc: 'Broken Code Agent runs your full test suite 3 times on failure, isolating the root cause. Flaky tests detected across 10 runs. No false passes shipped.' },
  { icon: <Bot size={22} />, color: '#8B5CF6', title: 'Multi-agent orchestration', desc: '8 specialised Claude agents run in parallel inside each sandbox — Security, Bloat, Broken Code, Architecture, AI-Era, Compliance, Data/DX, and your always-on Chat agent.' },
  { icon: <Globe size={22} />, color: '#14B8A6', title: 'Ephemeral staging per commit', desc: 'Every passing run gets its own live preview URL (staging-3fa2c1.codeward.app). Destroy after 48h or merge. Stakeholders review real code, not screenshots.' },
  { icon: <Award size={22} />, color: '#3B82F6', title: 'Shareable health certificate', desc: 'A live-updating score card you can embed in your README, investor deck, or landing page. Every click from a potential customer is a warm lead for Codeward.' },
];

const steps = [
  { n: '01', title: 'Connect your repo', desc: 'Install the GitHub or GitLab app in 30 seconds. One OAuth flow, no SSH keys, no infra changes. We never write to production directly.' },
  { n: '02', title: 'Push a commit', desc: "Your webhook fires. We receive it, verify the HMAC signature, and spin up an isolated Firecracker microVM in under 2 seconds. Your team doesn't change how they work." },
  { n: '03', title: 'We scan, fix, test, guard', desc: '8 specialised AI agents run in parallel inside the sandbox. Security, bloat, broken code, architecture, AI-era debt — all checked. Fixes proposed as diffs, or auto-applied if you trust us.' },
];

const pricing = [
  {
    name: 'Observer', price: 'Free', period: '', highlight: false,
    desc: 'See everything. Touch nothing. Build trust.',
    features: ['5 runs/day · up to 2 repos', 'Full debt report on every push', 'Security panel with severity ranking', 'Health certificate (public)', 'Codeward AI (read-only)'],
    cta: 'Start free',
  },
  {
    name: 'Pro', price: '$49', period: '/month', highlight: true,
    desc: 'Automatic fixes. Real autonomy. Real speed.',
    features: ['Unlimited runs · up to 10 repos', 'Auto-refactor low-risk files', 'Auto-deploy to staging', 'Full diff viewer + accept/reject', 'Codeward AI with action mode', 'Slack & email notifications', 'Deploy history + rollback'],
    cta: 'Start Pro trial',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', highlight: false,
    desc: 'Full autonomy for your entire engineering org.',
    features: ['Unlimited repos + runs', 'Auto-merge to production', 'Self-hosted runner (private infra)', 'Compliance agent (EU AI Act, GDPR)', 'Data & DX weekly team report', 'SSO + RBAC + audit log export', 'Dedicated Slack support channel'],
    cta: 'Talk to us',
  },
];

const faqs = [
  { q: 'Does Codeward touch my production database or servers directly?', a: 'Never. Codeward merges to production exclusively through the GitHub or GitLab Merges API. We clone your code into an isolated sandbox, test there, and if approved, trigger a merge via the git API. We have no server credentials, no SSH access, no direct database connection.' },
  { q: 'What happens if tests fail in the sandbox?', a: 'The commit is blocked. A detailed report is posted as a GitHub check run (the red dot on your PR) and to your Slack. The Broken Code Agent includes a root cause analysis and, where possible, a suggested fix. You can retry after addressing the issue.' },
  { q: 'Which languages and stacks are supported?', a: 'JavaScript, TypeScript, Python, Go, Ruby, Rust, and Java — via the tree-sitter AST engine. Framework detection is automatic from package.json / requirements.txt / Gemfile. Database support: Postgres, MySQL, MongoDB, Supabase, PlanetScale.' },
  { q: 'How is this different from GitHub Actions or SonarQube?', a: 'GitHub Actions runs scripts you write — it does nothing automatically. SonarQube flags issues but fixes nothing. Codeward runs, refactors, tests, and deploys autonomously. The analogy: SonarQube is a linter. Codeward is a principal engineer who actually fixes the code.' },
  { q: 'What does "trust mode" mean exactly?', a: 'Trust is a dial you control. Observer tier: suggest only — no changes without your explicit click. Pro tier: auto-refactor utilities and helpers, auto-deploy to staging after all gates pass. Enterprise tier: full automation including production merge, with instant rollback on anomaly.' },
  { q: 'How much does a single run cost in API fees?', a: 'The average cost to analyse one commit across all 8 agents is $0.04–$0.12 in Anthropic API fees (using Haiku for most agents, Sonnet for reasoning-heavy tasks). This is factored into our pricing. You pay a flat monthly fee — we absorb the token cost.' },
];

const stats = [
  { n: '100+', label: 'Debt checks per run' },
  { n: '8', label: 'Specialised AI agents' },
  { n: '4–6 min', label: 'Average full scan' },
  { n: '$0.04', label: 'Average cost per commit' },
];

export function LandingPage({ onGetStarted, onSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div style={{ background: '#0a0c10', color: '#e8e8e6', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .fade-up { animation: fadeUp .7s ease forwards; }
        .hero-glow { position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:500px;background:radial-gradient(ellipse at center, rgba(109,40,217,0.25) 0%, transparent 70%);pointer-events:none; }
        .cta-green { background:#16A34A;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s; }
        .cta-green:hover { background:#15803D; }
        .cta-ghost { background:transparent;color:#e8e8e6;border:1px solid #3a4255;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s; }
        .cta-ghost:hover { border-color:#8B5CF6;color:#C4B5FD; }
        .section-divider { width:100%;height:0.5px;background:linear-gradient(90deg, transparent, #2a3040 50%, transparent); }
        .pricing-card { background:#161b27;border:0.5px solid #2a3040;border-radius:14px;padding:28px 24px;transition:border-color .2s,transform .2s; }
        .pricing-card:hover { border-color:#8B5CF6;transform:translateY(-2px); }
        .pricing-highlight { background:linear-gradient(135deg,#1a1033,#161b27);border:1.5px solid #6D28D9; }
        .feature-card { background:#0f1117;border:0.5px solid #1e2535;border-radius:12px;padding:20px;transition:border-color .2s,transform .2s; }
        .feature-card:hover { border-color:#8B5CF6;transform:translateY(-2px); }
        .agent-card-lp { background:#0f1117;border:0.5px solid #1e2535;border-radius:10px;padding:14px;transition:border-color .2s; }
        .agent-card-lp:hover { border-color:#8B5CF6; }
        .faq-item { border-bottom:0.5px solid #1e2535; }
        .nav-link { font-size:13px;color:#aaa;cursor:pointer;padding:6px 10px;border-radius:6px;transition:color .15s; }
        .nav-link:hover { color:#e8e8e6; }
        a { color:inherit;text-decoration:none; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,12,16,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid #1e2535' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 32 }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.03em', cursor: 'pointer' }}>
            Code<span style={{ color: '#6D28D9' }}>ward</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {['Features', 'Agents', 'Pricing', 'Docs'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 13, color: '#aaa', padding: '6px 10px', borderRadius: 6, transition: 'color .15s' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#e8e8e6'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = '#aaa'; }}
              >{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onSignIn} style={{ fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 6 }}>Sign in</button>
            <button onClick={onGetStarted} style={{ fontSize: 13, background: '#16A34A', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Get started free</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', paddingTop: 120, paddingBottom: 80, textAlign: 'center', overflow: 'hidden' }}>
        <div className="hero-glow" />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(109,40,217,0.12)', border: '0.5px solid rgba(109,40,217,0.4)', borderRadius: 20, padding: '5px 14px', fontSize: 11, color: '#C4B5FD', fontWeight: 500, marginBottom: 24, letterSpacing: '.04em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'glow 2s infinite', display: 'inline-block' }} />
          8 specialised AI agents · 100+ debt checks per run
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 20, maxWidth: 860, margin: '0 auto 20px' }}>
          Every commit, cleaned, tested<br />
          <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #14B8A6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>and safe</span> — before it touches production
        </h1>

        <p style={{ fontSize: 18, color: '#aaa', maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Codeward is the autonomous code guardian that intercepts every push, scans for 100+ debt patterns across 8 AI agents, refactors, tests, and only promotes to production when it's genuinely safe.
        </p>

        {/* CTA row */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 0, background: '#161b27', border: '0.5px solid #2a3040', borderRadius: 10, overflow: 'hidden', height: 48 }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{ padding: '0 16px', fontSize: 14, background: 'transparent', border: 'none', color: '#e8e8e6', outline: 'none', width: 230 }}
            />
            <button className="cta-green" style={{ borderRadius: 0, height: '100%', whiteSpace: 'nowrap' }} onClick={onGetStarted}>
              Start for free →
            </button>
          </div>
          <button className="cta-ghost" onClick={() => {}}>Book a demo</button>
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 56 }}>No credit card · Free Observer tier · 5 runs/day</div>

        {/* Terminal mockup */}
        <div style={{ maxWidth: 780, margin: '0 auto', background: '#0f1117', border: '0.5px solid #2a3040', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 80px rgba(109,40,217,0.15), 0 40px 80px rgba(0,0,0,0.5)', textAlign: 'left' }}>
          {/* Window bar */}
          <div style={{ background: '#161b27', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid #2a3040' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>codeward — live agent feed · my-api</span>
            <div style={{ marginLeft: 'auto', fontSize: 9, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'blink .8s infinite' }} />LIVE
            </div>
          </div>
          <div style={{ padding: '16px 20px', fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.9, minHeight: 240 }}>
            {HERO_TERMINAL.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 14 }}>
                <span style={{ color: '#374151', flexShrink: 0, minWidth: 60 }}>{l.s}</span>
                <span style={{ color: logColor[l.c] }}>{l.txt}</span>
              </div>
            ))}
            <span style={{ display: 'inline-block', width: 7, height: 13, background: '#e8e8e6', animation: 'blink .8s infinite', verticalAlign: 'middle', borderRadius: 1, marginTop: 4 }} />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ── STATS ── */}
      <section style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}>
        {stats.map(s => (
          <div key={s.n}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#e8e8e6', letterSpacing: '-0.03em', marginBottom: 4 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: '#555' }}>{s.label}</div>
          </div>
        ))}
      </section>

      <div className="section-divider" />

      {/* ── HOW IT WORKS ── */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>Three steps. Everything else is automatic.</h2>
          <p style={{ color: '#555', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>Your team keeps pushing code the same way. Codeward handles everything between the push and the merge.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ background: '#0f1117', border: '0.5px solid #1e2535', borderRadius: 14, padding: '28px 24px', position: 'relative' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', letterSpacing: '.1em', marginBottom: 16 }}>{step.n}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#e8e8e6', marginBottom: 10 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>{step.desc}</div>
              {i < steps.length - 1 && (
                <ArrowRight size={16} style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', color: '#2a3040', background: '#0a0c10', padding: 2, zIndex: 2 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── AGENTS ── */}
      <section id="agents" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Multi-agent architecture</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>Not one AI. Eight specialised agents.</h2>
          <p style={{ color: '#555', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>A coordinator orchestrates 8 specialised Claude agents, each with their own tools, model, and focused role. This is how you get both speed and accuracy.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {agents.map((a, i) => (
            <div key={i} className="agent-card-lp" style={{ borderColor: `${a.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: a.color }}>{a.name}</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', marginBottom: 6, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 3, display: 'inline-block' }}>{a.model}</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Platform features</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>The full lifecycle, automated.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 16 }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8e6', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── TRUST MODES ── */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Built on trust</div>
        <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>You choose how much it does.</h2>
        <p style={{ color: '#555', fontSize: 15, marginBottom: 48, maxWidth: 520, margin: '0 auto 48px' }}>No engineering team will hand over production access on day one. We know. The trust dial moves at your pace.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
          {[
            { label: 'Observe', desc: 'Read-only. Flags issues. Shows diffs. Zero changes without your click.', color: '#3B82F6' },
            { label: 'Auto-refactor', desc: 'Automatically fixes utilities, helpers, and test files. Shows you everything it did.', color: '#8B5CF6' },
            { label: 'Full auto', desc: 'Refactors, tests, deploys to staging, and merges to production — with instant rollback.', color: '#22C55E' },
          ].map((tm, i) => (
            <div key={i} style={{ background: '#0f1117', border: `0.5px solid ${tm.color}33`, borderRadius: i === 0 ? '10px 0 0 10px' : i === 2 ? '0 10px 10px 0' : 0, padding: '20px 18px', borderLeft: i > 0 ? 'none' : undefined }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: tm.color, marginBottom: 8 }}>{tm.label}</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{tm.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>Start free. Trust us, then pay.</h2>
          <p style={{ color: '#555', fontSize: 15 }}>Every tier includes the Observer run by default. You upgrade when you're ready for automation.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {pricing.map((p, i) => (
            <div key={i} className={`pricing-card ${p.highlight ? 'pricing-highlight' : ''}`} style={{ position: 'relative' }}>
              {p.highlight && (
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#6D28D9', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '.05em' }}>MOST POPULAR</div>
              )}
              <div style={{ marginBottom: 16, paddingTop: p.highlight ? 10 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#e8e8e6', letterSpacing: '-0.03em' }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: '#555' }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555' }}>{p.desc}</div>
              </div>
              <button
                onClick={onGetStarted}
                style={{ width: '100%', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20, background: p.highlight ? '#6D28D9' : 'transparent', color: p.highlight ? '#fff' : '#aaa', border: p.highlight ? 'none' : '0.5px solid #2a3040' }}>
                {p.cta}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Check size={13} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: '#666', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>Teams shipping with confidence.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            { q: "We had a hardcoded Stripe key living in git history for 47 commits. Codeward found it on the first run, moved it to .env, and showed us exactly how to clean the history. That alone was worth it.", name: 'Sarah K.', role: 'CTO, FinStack' },
            { q: "Our vibe-coding team ships 10× faster now. The bloat that used to accumulate over months just doesn't exist anymore. The N+1 fix across three repos at once was genuinely impressive.", name: 'Marcus D.', role: 'Engineering Lead, Novu' },
            { q: "We showed the health certificate to an investor mid-due-diligence. They said it was the first time they'd seen a startup proactively prove their code quality. We closed the round.", name: 'Amara O.', role: 'Founder, BuildFast' },
          ].map((t, i) => (
            <div key={i} style={{ background: '#0f1117', border: '0.5px solid #1e2535', borderRadius: 14, padding: '24px' }}>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>"{t.q}"</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e6' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ── FAQ ── */}
      <section id="docs" style={{ padding: '80px 24px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>FAQ</div>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>Everything you wanted to ask.</h2>
        </div>
        {faqs.map((faq, i) => (
          <div key={i} className="faq-item" style={{ padding: '18px 0' }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, textAlign: 'left' }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#e8e8e6' }}>{faq.q}</span>
              <ChevronDown size={16} color="#555" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
            </button>
            {openFaq === i && (
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginTop: 12, paddingRight: 32 }}>{faq.a}</div>
            )}
          </div>
        ))}
      </section>

      <div className="section-divider" />

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(109,40,217,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>Start today</div>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 16, lineHeight: 1.1 }}>
          Your codebase,<br /><span style={{ background: 'linear-gradient(135deg, #8B5CF6, #14B8A6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>guarded forward.</span>
        </h2>
        <p style={{ fontSize: 16, color: '#555', marginBottom: 40, maxWidth: 440, margin: '0 auto 40px' }}>
          Connect your first repo in 30 seconds. No credit card. No infra changes. No promises you can't verify.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="cta-green" style={{ fontSize: 15, padding: '14px 32px', borderRadius: 10 }} onClick={onGetStarted}>Get started free</button>
          <button className="cta-ghost" style={{ fontSize: 15, padding: '14px 32px', borderRadius: 10 }}>Read the docs →</button>
        </div>
        <div style={{ fontSize: 11, color: '#374151', marginTop: 16 }}>Observer tier · 5 runs/day · No credit card</div>
      </section>

      <div className="section-divider" />

      {/* ── FOOTER ── */}
      <footer style={{ padding: '48px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>Code<span style={{ color: '#6D28D9' }}>ward</span></div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, maxWidth: 240 }}>The autonomous code guardian that intercepts every push and only promotes safe code to production.</div>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Agents', 'Pricing', 'Changelog'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Security'] },
            { title: 'Resources', links: ['Docs', 'API Reference', 'Status', 'Contact'] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>{col.title}</div>
              {col.links.map(l => (
                <div key={l} style={{ fontSize: 12, color: '#374151', marginBottom: 8, cursor: 'pointer', transition: 'color .15s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = '#aaa'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = '#374151'; }}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '0.5px solid #1e2535', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#374151' }}>© 2026 Codeward. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Cookie policy'].map(l => (
              <span key={l} style={{ fontSize: 11, color: '#374151', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
      </footer>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
