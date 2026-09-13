import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { useSession } from '../../../lib/auth';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 shrink-0 text-[#8B5CF6] inline-block ${className}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [isVisible, setVisible] = useState(false);
  const domRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const current = domRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the Free plan work?',
      a: 'You get 10 pull request scans every single month forever, completely free with zero credit card required. Each scan executes all 8 agents across 100+ debt and security checks.',
    },
    {
      q: 'Do I have to pay for inactive developers?',
      a: 'No. On the Team plan, you only pay for active seats that merge code or trigger PR scans during your billing cycle.',
    },
    {
      q: 'Is my source code stored or used to train AI models?',
      a: 'Never. Every analysis runs inside an ephemeral Firecracker microVM destroyed immediately after completion. We adhere to a strict zero-retention policy and never train models on your code.',
    },
    {
      q: 'How does Codeward integrate with my workflow?',
      a: 'Codeward installs directly as a verified GitHub App in under 2 minutes. No complex CI YAML configurations or runners needed — it triggers automatically on every push or PR.',
    },
    {
      q: 'What happens when I hit the Free tier limit?',
      a: 'Once your 10 free scans are utilized, PR checks will pause until your next monthly cycle resets. You can upgrade to Pro or Team anytime with zero downtime for unlimited scans.',
    },
    {
      q: 'Can we self-host Codeward in our private VPC?',
      a: 'Yes. Codeward is 100% open-core Apache 2.0. For Enterprise and security-sensitive teams, we provide private VPC (AWS, GCP, Azure) and on-premises deployments.',
    },
    {
      q: 'Which languages and frameworks are supported?',
      a: 'Codeward supports TypeScript, JavaScript, Python, Go, Rust, Ruby, and Java using tree-sitter AST parsing and automated sandbox environment detection.',
    },
    {
      q: 'Can I customize rules and ignore specific checks?',
      a: 'Yes. You can configure custom rules, set debt score thresholds, and ignore specific files or checks via a codeward.yml file in your repository root.',
    },
    {
      q: 'How do the 8 AI agents differ from traditional linters?',
      a: 'Traditional linters only check syntax style. Codeward boots a real sandbox to execute test suites, isolate memory leaks, check OWASP security vectors, trace AST duplicates, and prevent AI-era vulnerabilities.',
    },
    {
      q: 'What payment methods and invoicing options are available?',
      a: 'We support all major credit cards, Apple Pay, Google Pay, and SEPA via Polar. Annual billing and custom invoicing are available for Team and Enterprise tiers.',
    },
  ];

  return (
    <section className="bg-[#05060a] py-20 px-6 md:px-14 border-t border-white/[0.07]">
      <div className="mx-auto max-w-5xl">
        <FadeInSection>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-3">Frequently asked questions</h2>
          <p className="text-white/45 text-center mb-12 text-sm">Everything you need to know about Codeward pricing, security, and capabilities.</p>
        </FadeInSection>
        <div className="flex flex-col gap-3.5">
          {faqs.map((faq, i) => (
            <div key={i} className="w-full bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden transition-colors hover:border-white/15">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4.5 relative flex items-center justify-center text-center focus:outline-none group cursor-pointer"
              >
                <span className="text-sm md:text-base font-medium text-white/90 px-8 text-center">{faq.q}</span>
                <span className={`absolute right-6 text-white/40 text-xl font-light shrink-0 transition-transform duration-300 ${openIndex === i ? 'rotate-45 text-[#a78bfa]' : ''}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out px-6 ${openIndex === i ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                <p className="text-white/50 text-sm md:text-base leading-relaxed text-center max-w-3xl mx-auto">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Minimalist Compare Plans Matrix with Sticky Header
// ============================================================
function ComparePlansTable({ navigate, session }: { navigate: ReturnType<typeof useNavigate>; session: any }) {
  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');
  const goEnterprise = () => navigate('/book-demo');

  const goTeamCheckout = () => {
    if (session?.user) {
      window.location.href = `https://buy.polar.sh/polar_cl_G8nQdTjkiE3TT0f9HwQtEzZAA1FrGatie2AYr1PiFep?client_reference_id=${session.user.id}`;
    } else {
      navigate('/signup');
    }
  };

  const goProCheckout = () => {
    if (session?.user) {
      window.location.href = `https://buy.polar.sh/polar_cl_F6pFlJMO8NB1edLEiNLZ3ED0arMmOtoFUtpBc1J7ibY?client_reference_id=${session.user.id}`;
    } else {
      navigate('/signup');
    }
  };

  const categories = [
    {
      name: 'Usage & Capacity',
      features: [
        { name: 'Pull Request Scans', free: '10 /mo', pro: 'Unlimited', team: 'Unlimited' },
        { name: 'Execution Priority', free: 'Standard', pro: 'High (Fast Queue)', team: 'Highest (Dedicated)' },
        { name: 'Repositories', free: 'Unlimited', pro: 'Unlimited', team: 'Unlimited' },
      ],
    },
    {
      name: 'Agentic Code Review (Claude Sonnet 4.5)',
      features: [
        { name: 'Architecture Agent', free: true, pro: true, team: true },
        { name: 'Security Agent (18 Checks)', free: true, pro: true, team: true },
        { name: 'Bloat & Refactor Agent', free: true, pro: true, team: true },
        { name: 'Broken Code Agent', free: true, pro: true, team: true },
        { name: 'Compliance Agent (SOC2/GDPR)', free: false, pro: false, team: true },
        { name: 'Guardian (PR Summarization)', free: true, pro: true, team: true },
      ],
    },
    {
      name: 'Static Analysis & Sandboxing',
      features: [
        { name: 'Tree-sitter AST Engine', free: true, pro: true, team: true },
        { name: 'TruffleHog v3 Secret Scanning', free: true, pro: true, team: true },
        { name: 'Firecracker MicroVM Isolation', free: true, pro: true, team: true },
      ],
    },
    {
      name: 'Governance & Team',
      features: [
        { name: 'Manager Escalation Routing', free: false, pro: false, team: true },
        { name: 'Custom Rules (codeward.yml)', free: false, pro: false, team: true },
        { name: 'Team Dashboard & Analytics', free: false, pro: false, team: true },
        { name: 'Bring Your Own Cloud (BYOC)', free: false, pro: false, team: 'Contact Us' },
      ],
    },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckIcon />
      ) : (
        <span className="text-white/20 font-light">—</span>
      );
    }
    return <span className="text-[13px] font-medium text-white/70">{value}</span>;
  };

  return (
    <section className="bg-[#05060a] py-8 px-4 md:px-14">
      <div className="w-full max-w-6xl mx-auto">
        <div className="relative border border-white/[0.08] rounded-2xl bg-[#08090f] shadow-xl overflow-x-auto max-w-[100vw]">
          <div className="min-w-[600px]">

            {/* Sticky header */}
            <div className="sticky top-0 z-40 bg-[#08090f] border-b border-white/[0.07] backdrop-blur-xl">
              <div className="grid grid-cols-4 items-center py-4 px-5 gap-x-3">

                {/* Col 1 */}
                <div className="text-left">
                  <p className="font-semibold text-base text-white/90">Compare plans</p>
                </div>

                {/* Col 2: Free */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold text-white/70">Free</span>
                  <span className="text-lg font-semibold text-white">
                    $0<span className="text-xs font-normal text-white/35"> /mo</span>
                  </span>
                  <button
                    onClick={goStart}
                    className="mt-2 w-full max-w-[130px] bg-white/[0.07] border border-white/10 hover:bg-white/[0.12] text-white/80 font-medium py-1.5 px-3 rounded-full transition text-[11px] cursor-pointer"
                  >
                    Start now
                  </button>
                </div>

                {/* Col 3: Pro */}
                <div className="flex flex-col items-center gap-1 relative bg-[#140e2e]/50 py-2.5 px-2 rounded-xl border border-[#8B5CF6]/25">
                  <span className="absolute -top-2.5 bg-[#8B5CF6] text-white text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Solo dev
                  </span>
                  <span className="text-sm font-semibold text-[#a78bfa]">Pro</span>
                  <span className="text-lg font-semibold text-white">
                    $19<span className="text-xs font-normal text-white/35"> /mo</span>
                  </span>
                  <button
                    onClick={goProCheckout}
                    className="mt-2 w-full max-w-[130px] bg-[#8B5CF6] hover:bg-[#7c4ae0] text-white font-medium py-1.5 px-3 rounded-full transition text-[11px] shadow-sm shadow-[#8B5CF6]/20 cursor-pointer"
                  >
                    Get Pro
                  </button>
                </div>

                {/* Col 4: Team */}
                <div className="flex flex-col items-center gap-1 bg-white/[0.03] py-2.5 px-2 rounded-xl border border-white/[0.08]">
                  <span className="text-sm font-semibold text-white/70">Team</span>
                  <span className="text-lg font-semibold text-white">
                    $39<span className="text-xs font-normal text-white/35"> /seat</span>
                  </span>
                  <button
                    onClick={goTeamCheckout}
                    className="mt-2 w-full max-w-[130px] bg-white hover:bg-white/90 text-black font-medium py-1.5 px-3 rounded-full transition text-[11px] cursor-pointer"
                  >
                    Get Team
                  </button>
                </div>
              </div>
            </div>

            {/* Feature rows */}
            <div className="divide-y divide-white/[0.05]">
              {categories.map((cat, catIdx) => (
                <div key={catIdx}>
                  {/* Category label */}
                  <div className="bg-white/[0.01] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    {cat.name}
                  </div>
                  <div className="divide-y divide-white/[0.05]">
                    {cat.features.map((feat, featIdx) => (
                      <div
                        key={featIdx}
                        className="grid grid-cols-4 px-5 py-3 text-sm items-center hover:bg-white/[0.015] transition-colors gap-x-3"
                      >
                        <div className="text-[13px] font-normal text-white/60">{feat.name}</div>
                        <div className="text-center">{renderCell(feat.free)}</div>
                        <div className="text-center">{renderCell(feat.pro)}</div>
                        <div className="text-center">{renderCell(feat.team)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Footer CTA row */}
              <div className="grid grid-cols-4 px-5 py-4 items-center bg-[#07080c] border-t border-white/[0.07]">
                <div className="text-sm font-medium text-white/50">Get started</div>
                <div className="flex justify-center">
                  <button
                    onClick={goStart}
                    className="w-full max-w-[130px] rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/[0.12] transition-all cursor-pointer"
                  >
                    Start free
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={goProCheckout}
                    className="w-full max-w-[130px] rounded-full bg-[#8B5CF6] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#7c4ae0] transition-all cursor-pointer"
                  >
                    Get Pro
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={goEnterprise}
                    className="w-full max-w-[130px] rounded-full bg-white text-black px-3 py-1.5 text-[11px] font-medium hover:bg-white/90 transition-all cursor-pointer"
                  >
                    Talk to us
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main page ── */
export default function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');

  return (
    <div className="min-h-screen bg-[#05060a] font-sans text-white">
      <Helmet>
        <title>Pricing | Codeward — Open Source AI Code Review Plans &amp; Free Tier</title>
        <meta name="description" content="Transparent, developer-first pricing. Start free with 10 pull request scans every month. Pro tier at $29/mo with unlimited AI reviews and self-healing commits. 100% open-core." />
        <meta name="keywords" content="Codeward pricing, AI code review cost, CodeRabbit pricing alternative, free PR review, open source code quality pricing" />
        <meta name="thumbnail" content="https://codeward.cloud/og-preview.jpg" />
        <link rel="canonical" href="https://codeward.cloud/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://codeward.cloud/pricing" />
        <meta property="og:title" content="Codeward Pricing — Transparent Plans &amp; Free Tier" />
        <meta property="og:description" content="Start free with 10 PR scans every month. Unlimited reviews and microVM sandboxes for engineering teams." />
        <meta property="og:image" content="https://codeward.cloud/og-preview.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Codeward Pricing — Transparent Plans &amp; Free Tier" />
        <meta name="twitter:description" content="Start free with 10 PR scans every month. Unlimited reviews and microVM sandboxes." />
        <meta name="twitter:image" content="https://codeward.cloud/og-preview.jpg" />
      </Helmet>

      <LandingHeader />

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-14 pt-16 pb-6 text-center">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white leading-[1.2]">
          Simple, agentic pricing
        </h1>
        <p className="mt-3 text-sm md:text-base text-white/45 max-w-xl mx-auto">
          Start automating code reviews today with{' '}
          <span className="text-white/80 font-medium">10 free PRs every month</span>. No credit card required.
        </p>
      </section>

      {/* Compare matrix */}
      <ComparePlansTable navigate={navigate} session={session} />

      {/* FAQ */}
      <PricingFAQ />

      {/* Bottom CTA */}
      <section className="bg-[#05060a] py-16 px-6 md:px-20 flex flex-col items-center text-center border-t border-white/[0.07]">
        <FadeInSection className="flex flex-col items-center max-w-xl">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            Ready to automate your code reviews?
          </h2>
          <p className="text-white/40 text-sm md:text-base mb-8 leading-relaxed">
            Connect your repository in under 2 minutes and see what Codeward finds on your first pull request.
          </p>
          <button
            onClick={goStart}
            className="group flex items-center gap-2.5 px-8 py-3.5 bg-white hover:bg-white/90 text-black text-sm font-semibold rounded-full transition-all hover:scale-105 shadow-lg cursor-pointer"
          >
            Connect your first repo <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </button>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
}
