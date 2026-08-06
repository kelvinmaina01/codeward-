import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useSession } from '../../lib/auth';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

// ============================================================
// Codeward Pricing Page — Unified Section with Icons & Animated GIF BG
// ============================================================

const CREDIT_PACKS = [
  { usd: 3, credits: 100, label: 'Starter' },
  { usd: 5, credits: 200, label: 'Casual' },
  { usd: 10, credits: 500, label: 'Solo' },
  { usd: 20, credits: 1200, label: 'Popular', popular: true },
  { usd: 50, credits: 3400, label: 'Team' },
  { usd: 100, credits: 7500, label: 'Scale' },
];

function OrangeCheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 shrink-0 text-orange-500 inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 shrink-0 ${className}`} viewBox="0 0 20 20" fill="currentColor">
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
          if (entry.isIntersecting) setVisible(true);
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

// ============================================================
// Unified Section: Buy Credit Packs + Security & Compliance (With Icons & Animated GIF BG)
// ============================================================
function CreditPacksAndSecuritySection() {
  const [selected, setSelected] = useState<number>(3);
  const navigate = useNavigate();
  const active = CREDIT_PACKS.find((p) => p.usd === selected) || CREDIT_PACKS[0];

  const badges = [
    {
      label: 'ISO 27001',
      sub: 'Certified',
      icon: (
        <svg className="h-6 w-6 text-emerald-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: 'GDPR',
      sub: 'Compliant',
      icon: (
        <svg className="h-6 w-6 text-blue-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V8.5a.5.5 0 01.5-.5h.435M12 21a9 9 0 100-18 9 9 0 000 18z" />
        </svg>
      ),
    },
    {
      label: 'CCPA',
      sub: 'Compliant',
      icon: (
        <svg className="h-6 w-6 text-purple-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11c0 2.473.345 4.866.99 7.132" />
        </svg>
      ),
    },
    {
      label: 'HIPAA',
      sub: 'Ready',
      icon: (
        <svg className="h-6 w-6 text-rose-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      label: '256-bit SSL',
      sub: 'Encrypted',
      icon: (
        <svg className="h-6 w-6 text-amber-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      label: '99.99%',
      sub: 'Uptime',
      icon: (
        <svg className="h-6 w-6 text-cyan-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#05060a] py-24 px-6 md:px-14 border-t border-white/10">
      {/* Streamable Cloud Video Background - ZERO BLACK BANDS */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <iframe
          src="https://streamable.com/e/la3def?autoplay=1&muted=1&nocontrols=1&loop=1"
          loading="lazy"
          allow="autoplay; fullscreen"
          className="absolute top-1/2 left-1/2 min-w-[300%] min-h-[300%] w-[350vw] h-[350vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0"
          style={{ border: 'none' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-20">
        {/* Part 1: Pay As You Go / Buy Credit Packs */}
        <div>
          <FadeInSection>
            <div className="text-center mb-10">
              <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
                Pay As You Go
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3">Buy credit packs</h2>
              <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto font-medium">
                Top up in one click. Credit packs start at $3 and are valid for 12 months.
              </p>
            </div>
          </FadeInSection>

          {/* Credit Pack Cards Grid */}
          <FadeInSection>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {CREDIT_PACKS.map((pack) => {
                const isSelected = selected === pack.usd;
                return (
                  <button
                    key={pack.usd}
                    onClick={() => setSelected(pack.usd)}
                    className={`relative flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/80 bg-emerald-500/15 shadow-[0_0_30px_rgba(16,185,129,0.25)] scale-[1.03]'
                        : 'border-white/10 bg-black/50 backdrop-blur-md hover:border-white/30 hover:bg-black/70'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black">
                        Best Value
                      </span>
                    )}
                    <span className="text-2xl font-extrabold text-white">${pack.usd}</span>
                    <span className="mt-1 text-xs font-semibold text-white/80">{pack.credits.toLocaleString()} credits</span>
                    <div className="mt-3 flex items-center justify-between w-full">
                      <span className="text-[10px] font-medium text-white/50">${(pack.usd / pack.credits).toFixed(3)}/ea</span>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-white/30 text-transparent'}`}>
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </FadeInSection>

          {/* Selected Top-Up Pack Action Card */}
          <FadeInSection>
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 md:p-8">
              <div>
                <div className="text-xs text-white/50 mb-1 font-medium">Selected Top-Up Pack</div>
                <div className="text-2xl font-bold text-white">
                  {active.credits.toLocaleString()} credits
                  <span className="ml-3 text-white/60 font-medium text-base">for ${active.usd}.00</span>
                </div>
                <div className="mt-1 text-xs text-white/40">
                  Instantly available · Valid for 12 months · No subscription required
                </div>
              </div>
              <button
                onClick={() => {
                  toast.success(`${active.credits.toLocaleString()} credits added to cart`);
                  navigate('/signup');
                }}
                className="w-full md:w-auto rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-bold text-black hover:bg-emerald-400 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Buy for ${active.usd}
              </button>
            </div>
          </FadeInSection>
        </div>

        {/* Part 2: Security & Compliance inside the SAME Section with Specific Icons */}
        <div className="pt-8 border-t border-white/10">
          <FadeInSection>
            <div className="text-center mb-10">
              <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
                Security & Compliance
              </span>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">Enterprise-grade security on every plan</h2>
              <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto">
                Codeward is built on a security-first foundation with the certifications and safeguards your security team expects.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4 transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/[0.08]"
                >
                  {b.icon}
                  <div className="text-sm font-bold text-white">{b.label}</div>
                  <div className="text-[11px] text-white/40">{b.sub}</div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-white/40 font-medium">
              SOC 2 Type II audit in progress · Data encrypted in transit and at rest · EU SaaS deployment available
            </p>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the 7-day free trial work?',
      a: 'Every plan starts with a full-featured 7-day free trial — no credit card required. You get the Pro Plus experience immediately, including 20,000 credits, agentic chat, and every integration.',
    },
    {
      q: 'How do credits work?',
      a: 'Credits are Codeward\'s unit of compute. Every action — PR reviews, security scans, sandboxed tests, autofix patches — consumes credits based on complexity. Your plan includes a monthly credit grant, and you can top up anytime.',
    },
    {
      q: 'What happens when I run out of credits?',
      a: 'Reviews pause gracefully — nothing breaks and your repositories stay connected. You can top up with a credit pack, upgrade your tier, or wait for your monthly refresh.',
    },
    {
      q: 'Can I buy credits without upgrading my plan?',
      a: 'Yes. One-time credit packs start at $3 and are valid for 12 months. You only pay for the usage you actually need.',
    },
    {
      q: 'Do credits expire?',
      a: 'Monthly plan credits roll over for up to 90 days. Purchased credit packs remain valid for 12 months from purchase.',
    },
    {
      q: 'Will I be charged for all developers in my team?',
      a: 'Codeward is priced per active seat plus credits. Credits are shared across your whole organization, so one balance powers every teammate.',
    },
  ];

  return (
    <section className="bg-[#05060a] py-20 px-6 md:px-14 border-t border-white/10">
      <div className="mx-auto max-w-3xl">
        <FadeInSection>
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-3">Frequently asked questions</h2>
          <p className="text-white/60 text-center mb-10 text-sm">Everything you need to know about Codeward pricing, credits, and trials.</p>
        </FadeInSection>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none group cursor-pointer"
              >
                <span className="text-sm font-medium text-white pr-6">{faq.q}</span>
                <span className={`text-white/50 text-lg font-light transition-transform duration-300 ${openIndex === i ? 'rotate-45 text-[#a78bfa]' : ''}`}>+</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out px-6 ${openIndex === i ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Production Pure Grid Matrix with Standalone Sticky Header
// ============================================================
function ComparePlansTable({ navigate, session }: { navigate: ReturnType<typeof useNavigate>; session: any }) {
  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');
  const goEnterprise = () => navigate('/book-demo');

  const categories = [
    {
      name: 'Code Analysis & Workflow',
      features: [
        { name: 'Public repositories', pro: 'Unlimited', proPlus: 'Unlimited', enterprise: 'Unlimited' },
        { name: 'Private repositories', pro: 'Unlimited', proPlus: 'Unlimited', enterprise: 'Unlimited' },
        { name: 'Monthly Credits Grant', pro: '5,000 /mo', proPlus: '20,000 /mo', enterprise: 'Custom' },
        { name: 'PR Summarization & Review', pro: true, proPlus: true, enterprise: true },
        { name: 'Agentic Chat (Gordon AI)', pro: true, proPlus: true, enterprise: true },
        { name: 'IDE & CLI Integration', pro: true, proPlus: true, enterprise: true },
        { name: 'Autofix', pro: true, proPlus: true, enterprise: true },
        { name: 'Docstring generation', pro: true, proPlus: true, enterprise: true },
        { name: 'UTG & Conflict Resolution', pro: false, proPlus: true, enterprise: true },
      ],
    },
    {
      name: 'Integrations & Tooling',
      features: [
        { name: 'Git Providers (GitHub, GitLab, Bitbucket)', pro: true, proPlus: true, enterprise: true },
        { name: 'Workflow Tools (Jira, Linear, Slack, Datadog)', pro: false, proPlus: true, enterprise: true },
        { name: 'MCP connections', pro: '5', proPlus: '15', enterprise: '20' },
        { name: 'Linked repository analyses', pro: '1', proPlus: '10', enterprise: '20' },
      ],
    },
    {
      name: 'Governance & Security',
      features: [
        { name: 'Pre-Merge Quality Checks', pro: true, proPlus: true, enterprise: true },
        { name: 'Customizable reports', pro: true, proPlus: true, enterprise: true },
        { name: 'Custom Quality Policy Rules', pro: false, proPlus: '20 Rules', enterprise: 'Unlimited' },
        { name: 'Custom RBAC, SSO & Audit Logging', pro: false, proPlus: false, enterprise: true },
        { name: 'Dedicated CSM & SLA Support', pro: false, proPlus: false, enterprise: true },
        { name: 'EU SaaS & Self-Hosting', pro: false, proPlus: false, enterprise: true },
      ],
    },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <OrangeCheckIcon />
      ) : (
        <span className="text-white/20 font-medium">—</span>
      );
    }
    return <span className="text-sm font-semibold text-white/80 font-mono">{value}</span>;
  };

  return (
    <section className="bg-[#05060a] py-8 px-4 md:px-14">
      <div className="w-full max-w-7xl mx-auto">
        <div className="relative border border-white/10 rounded-2xl bg-[#07080c] shadow-2xl overflow-hidden">
          
          {/* 1. INDEPENDENT STATIC HEADER (Pricing Cards) */}
          {/* Stays fixed at top-0 of window while layout scrolls naturally underneath */}
          <div className="sticky top-0 z-40 bg-[#090b12] border-b border-white/10 shadow-xl backdrop-blur-xl">
            <div className="grid grid-cols-4 items-center py-6 px-6 text-center">
              
              {/* Column 1: Compare plans Title */}
              <div className="text-left font-bold text-xl md:text-2xl text-white">
                Compare plans
              </div>
              
              {/* Column 2: Pro */}
              <div className="flex flex-col items-center px-2">
                <span className="text-xl font-bold text-white">Pro</span>
                <span className="text-2xl font-extrabold text-white mt-1">$12<span className="text-sm font-normal text-white/50">/mo</span></span>
                <button
                  onClick={goStart}
                  className="mt-4 w-full max-w-[160px] bg-white/10 border border-white/15 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-full transition text-xs shadow-sm cursor-pointer"
                >
                  Start Free Trial
                </button>
              </div>
              
              {/* Column 3: Pro Plus (Popular) */}
              <div className="flex flex-col items-center px-2 relative bg-[#160f33]/60 py-3 rounded-2xl border border-[#8B5CF6]/30">
                <span className="absolute -top-3 bg-[#8B5CF6] text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md">Popular</span>
                <span className="text-xl font-bold text-[#a78bfa]">Pro Plus</span>
                <span className="text-2xl font-extrabold text-white mt-1">$24<span className="text-sm font-normal text-white/50">/mo</span></span>
                <button
                  onClick={goStart}
                  className="mt-4 w-full max-w-[160px] bg-[#8B5CF6] hover:bg-[#7c4ae0] text-white font-bold py-2.5 px-4 rounded-full transition text-xs shadow-md shadow-[#8B5CF6]/30 cursor-pointer"
                >
                  Start Free Trial
                </button>
              </div>
              
              {/* Column 4: Enterprise */}
              <div className="flex flex-col items-center px-2">
                <span className="text-xl font-bold text-white">Enterprise</span>
                <span className="text-2xl font-extrabold text-white mt-1">Custom</span>
                <button
                  onClick={goEnterprise}
                  className="mt-4 w-full max-w-[160px] bg-white hover:bg-white/90 text-black font-bold py-2.5 px-4 rounded-full transition text-xs shadow-sm cursor-pointer"
                >
                  Talk to Us
                </button>
              </div>
              
            </div>
          </div>

          {/* 2. SCROLLING MATRIX DATA */}
          {/* Sits completely below the static cards and scrolls naturally as part of the page */}
          <div className="divide-y divide-white/10">
            {categories.map((cat, catIdx) => (
              <div key={catIdx}>
                <div className="bg-[#0d0e17] px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
                  {cat.name}
                </div>
                <div className="divide-y divide-white/10">
                  {cat.features.map((feat, featIdx) => (
                    <div key={featIdx} className="grid grid-cols-4 px-6 py-4.5 text-sm items-center hover:bg-white/[0.02] transition-colors">
                      <div className="font-medium text-white/80">{feat.name}</div>
                      <div className="text-center">{renderCell(feat.pro)}</div>
                      <div className="text-center bg-[#8B5CF6]/[0.02] py-1">{renderCell(feat.proPlus)}</div>
                      <div className="text-center">{renderCell(feat.enterprise)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bottom CTA Row (Get started) */}
            <div className="grid grid-cols-4 px-6 py-6 text-sm items-center bg-[#090b12] border-t-2 border-white/10">
              <div className="font-bold text-base text-white">Get started</div>
              <div className="flex justify-center">
                <button
                  onClick={goStart}
                  className="w-full max-w-[160px] rounded-full bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all cursor-pointer shadow-sm"
                >
                  Start Free Trial
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={goStart}
                  className="w-full max-w-[160px] rounded-full bg-[#8B5CF6] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7c4ae0] transition-all shadow-md shadow-[#8B5CF6]/30 cursor-pointer"
                >
                  Start Free Trial
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={goEnterprise}
                  className="w-full max-w-[160px] rounded-full bg-white text-black px-4 py-2.5 text-xs font-bold hover:bg-white/90 transition-all cursor-pointer shadow-sm"
                >
                  Talk to Us
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');

  return (
    <div className="min-h-screen bg-[#05060a] font-['DM_Sans'] text-white">
      <Helmet>
        <title>Pricing | Codeward</title>
        <meta name="description" content="Simple, credit-based pricing for Codeward. Start with a 7-day free trial — no credit card required." />
        <link rel="canonical" href="https://codeward.cloud/pricing" />
      </Helmet>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        `}
      </style>

      <LandingHeader />

      {/* Hero Header */}
      <section className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-6 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Simple, credit-based pricing
        </h1>
        <p className="mt-4 text-base md:text-lg text-white/60 max-w-2xl mx-auto">
          All plans include a <span className="text-white font-semibold">7-day free trial</span>. No credit card required to start.
        </p>
      </section>

      {/* Compare Matrix with Isolated Sticky Header & Clean CSS Grid Rows */}
      <ComparePlansTable navigate={navigate} session={session} />

      {/* Unified Section: Buy Credit Packs + Security & Compliance (With Custom Icons & Animated GIF BG) */}
      <CreditPacksAndSecuritySection />

      {/* FAQ */}
      <PricingFAQ />

      {/* Bottom CTA Banner */}
      <section className="bg-[#05060a] py-20 px-6 md:px-20 relative overflow-hidden flex flex-col items-center justify-center text-center border-t border-white/10">
        <FadeInSection className="relative z-10 flex flex-col items-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to automate your code reviews?</h2>
          <p className="text-white/60 text-base md:text-lg font-medium mb-10 leading-relaxed max-w-xl">
            Connect your repository in under 2 minutes and see what Codeward finds on your first pull request.
          </p>
          <button
            onClick={goStart}
            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-white/90 text-black text-base font-bold rounded-full transition-all hover:scale-105 shadow-xl cursor-pointer"
          >
            Connect your first repo &rarr;
          </button>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
}
