import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '../../../lib/auth';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

/* ── Subtle check icon — no orange ── */
function CheckMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[#a78bfa] inline-block ${className}`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FadeInSection({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setVisible] = useState(false);
  const domRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
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
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── FAQ ── */
function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    // Billing & Plans
    {
      q: 'How does the Free plan work?',
      a: 'You get 10 PR scans every single month, forever. No credit card required. Once you hit the limit, your scans queue until the next billing cycle, or you can upgrade to Pro or Team for unlimited reviews.',
    },
    {
      q: 'Do I have to pay for inactive developers?',
      a: 'No. On the Team plan, you only pay for active seats — developers who merge code or trigger scans during the billing cycle. Inactive members never count toward your bill.',
    },
    {
      q: 'Can I switch between plans at any time?',
      a: 'Yes. You can upgrade instantly and the new quota takes effect immediately. Downgrades take effect at the end of your current billing period, so you keep access until then.',
    },
    {
      q: 'Is there an annual discount?',
      a: 'Yes — paying annually saves you roughly 2 months compared to monthly billing. Both Pro and Team plans are eligible. You can switch to annual billing from your account settings at any time.',
    },
    {
      q: 'What happens if I go over my PR scan limit?',
      a: 'On the Free plan, scans above your monthly limit are queued and resume at the start of the next cycle. On Pro and Team plans there is no limit — scans always run immediately.',
    },
    {
      q: 'Do you offer refunds?',
      a: 'Yes. If you are not satisfied within the first 14 days of a paid plan, contact us and we will issue a full refund — no questions asked.',
    },
    // Security & Privacy
    {
      q: 'Is my codebase sent to external AI models?',
      a: 'We use Anthropic\'s Claude 3.5 Sonnet. Anthropic does not train on API traffic, and we enforce a strict zero-retention policy on our end. Code is processed in ephemeral sandboxes and destroyed immediately after each scan.',
    },
    {
      q: 'Does Codeward store my source code?',
      a: 'No. Codeward fetches a diff or file snapshot from GitHub at scan time, analyzes it in a short-lived sandbox, and discards it when the run completes. We never persist raw source code to disk.',
    },
    {
      q: 'Is the connection to GitHub secure?',
      a: 'Yes. We connect via GitHub App (OAuth 2.0 with fine-grained permissions) over HTTPS. You control exactly which repositories Codeward can access, and you can revoke access at any time from your GitHub settings.',
    },
    {
      q: 'Are you SOC 2 compliant?',
      a: 'We are currently pursuing SOC 2 Type II certification. Enterprise customers on the Team plan get access to our security questionnaire and trust documentation on request. BYOC deployments can run entirely within your own compliance boundary.',
    },
    // Agents & Capabilities
    {
      q: 'What agents run on each pull request?',
      a: 'By default, Codeward runs six agents: Architecture, Security, Bloat & Refactor, Broken Code, AI-Era patterns, and Guardian (PR summarization). On the Team plan you also get the Compliance Agent for SOC 2 / GDPR checks. You can toggle individual agents in your repository settings.',
    },
    {
      q: 'Can Codeward open auto-fix pull requests?',
      a: 'Yes. When an agent finds a fixable issue, it can open a companion PR with the suggested patch directly to your repository. You review and merge — Codeward never force-merges anything.',
    },
    {
      q: 'Which languages and frameworks are supported?',
      a: 'Codeward supports TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, and more. Static analysis rules via Semgrep cover 20+ languages. Framework-specific checks (Next.js, Django, Spring, etc.) are applied when detected.',
    },
    {
      q: 'Can I write custom rules?',
      a: 'Yes — on the Team plan you can define custom Semgrep rules in an aegis.config.json file committed to your repository. These are applied on every scan alongside the default rule set.',
    },
    // Integrations & Setup
    {
      q: 'How long does setup take?',
      a: 'Under two minutes. Install the Codeward GitHub App, select your repositories, and the first scan triggers automatically on the next pull request. No YAML, no CI changes required.',
    },
    {
      q: 'Does Codeward work with GitLab or Bitbucket?',
      a: 'GitHub is fully supported today. GitLab and Bitbucket support are on the roadmap. Sign up and join the waitlist to be notified when your platform is available.',
    },
    {
      q: 'Can I self-host Codeward on my own infrastructure?',
      a: 'Yes. Enterprise Team customers can opt for a Bring Your Own Cloud (BYOC) deployment on AWS, GCP, or Azure. Your code never leaves your VPC, and you get a dedicated instance with SLA guarantees. Contact us to get started.',
    },
  ];

  return (
    <section className="bg-[#05060a] py-14 px-6 md:px-14 border-t border-white/[0.07]">
      <div className="mx-auto max-w-2xl">
        <FadeInSection>
          <h2 className="text-xl md:text-2xl font-semibold text-white text-center mb-2">
            Frequently asked questions
          </h2>
          <p className="text-white/40 text-center mb-8 text-sm">
            Everything you need to know about Codeward pricing and billing.
          </p>
        </FadeInSection>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden transition-colors hover:border-white/[0.12]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
              >
                <span className="text-[13px] font-medium text-white/80 pr-6">{faq.q}</span>
                <span
                  className={`text-white/30 text-base font-light transition-transform duration-200 ${
                    openIndex === i ? 'rotate-45 text-[#a78bfa]' : ''
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out px-5 ${
                  openIndex === i ? 'max-h-60 opacity-100 pb-4' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-white/45 text-[13px] leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Compare matrix ── */
function ComparePlansTable({
  navigate,
  session,
}: {
  navigate: ReturnType<typeof useNavigate>;
  session: any;
}) {
  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');
  const goEnterprise = () => navigate('/book-demo');

  const categories = [
    {
      name: 'Usage & Capacity',
      features: [
        { name: 'Pull Request Scans', free: '10 / mo', pro: 'Unlimited', team: 'Unlimited' },
        { name: 'Execution Priority', free: 'Standard', pro: 'High (Fast Queue)', team: 'Highest (Dedicated)' },
        { name: 'Repositories', free: 'Unlimited', pro: 'Unlimited', team: 'Unlimited' },
      ],
    },
    {
      name: 'Agentic Code Review (Claude 3.5)',
      features: [
        { name: 'Architecture Agent', free: true, pro: true, team: true },
        { name: 'Security Agent', free: true, pro: true, team: true },
        { name: 'Bloat & Refactor Agent', free: true, pro: true, team: true },
        { name: 'Broken Code Agent', free: true, pro: true, team: true },
        { name: 'Compliance Agent (SOC2/GDPR)', free: false, pro: false, team: true },
        { name: 'Guardian (PR Summarization)', free: true, pro: true, team: true },
      ],
    },
    {
      name: 'Static Analysis & Security',
      features: [
        { name: 'Semgrep Engine', free: true, pro: true, team: true },
        { name: 'Gitleaks (Secret Detection)', free: true, pro: true, team: true },
        { name: 'Fly.io Sandboxed Execution', free: true, pro: true, team: true },
      ],
    },
    {
      name: 'Governance & Team',
      features: [
        { name: 'Manager Escalation Emails', free: false, pro: false, team: true },
        { name: 'Custom Rules (aegis.config.json)', free: false, pro: false, team: true },
        { name: 'Team Dashboard & Analytics', free: false, pro: false, team: true },
        { name: 'Bring Your Own Cloud (BYOC)', free: false, pro: false, team: 'Contact Us' },
      ],
    },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckMark />
      ) : (
        <span className="text-white/15 text-sm">—</span>
      );
    }
    return <span className="text-[12px] font-medium text-white/60 font-mono">{value}</span>;
  };

  return (
    <section className="bg-[#05060a] py-4 px-4 md:px-14">
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative border border-white/[0.07] rounded-2xl bg-[#07080c] shadow-xl overflow-x-auto">
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
                    onClick={goStart}
                    className="mt-2 w-full max-w-[130px] bg-[#8B5CF6] hover:bg-[#7c4ae0] text-white font-medium py-1.5 px-3 rounded-full transition text-[11px] shadow-sm shadow-[#8B5CF6]/20 cursor-pointer"
                  >
                    Start free
                  </button>
                </div>

                {/* Col 4: Team */}
                <div className="flex flex-col items-center gap-1 bg-white/[0.03] py-2.5 px-2 rounded-xl border border-white/[0.08]">
                  <span className="text-sm font-semibold text-white/70">Team</span>
                  <span className="text-lg font-semibold text-white">
                    $39<span className="text-xs font-normal text-white/35"> /seat</span>
                  </span>
                  <button
                    onClick={goEnterprise}
                    className="mt-2 w-full max-w-[130px] bg-white hover:bg-white/90 text-black font-medium py-1.5 px-3 rounded-full transition text-[11px] cursor-pointer"
                  >
                    Talk to us
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
                    onClick={goStart}
                    className="w-full max-w-[130px] rounded-full bg-[#8B5CF6] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#7c4ae0] transition-all cursor-pointer"
                  >
                    Start free
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
        <title>Pricing | Codeward</title>
        <meta name="description" content="Simple, agentic pricing for Codeward. Start for free — no credit card required." />
        <link rel="canonical" href="https://codeward.cloud/pricing" />
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
            className="px-7 py-3 bg-white hover:bg-white/90 text-black text-sm font-semibold rounded-full transition-all hover:scale-105 shadow-lg cursor-pointer"
          >
            Connect your first repo →
          </button>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
}
