import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '../../../lib/auth';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';


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
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target); // Kill the sensor once activated
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
      a: 'You get 10 PR scans every single month, forever. No credit card required. Once you hit the limit, you can upgrade to Pro or Team for unlimited autonomous code reviews.',
    },
    {
      q: 'Do I have to pay for inactive developers?',
      a: 'No. On the Team plan, you only pay for active seats that merge code or trigger scans during the billing cycle.',
    },
    {
      q: 'Is my codebase sent to external AI models?',
      a: 'Yes, we use Claude 3.5 Sonnet. However, we have a strict zero-retention policy. Your code is never used to train our models, and all ephemeral sandboxes are destroyed immediately after the scan.',
    },
    {
      q: 'Can I self-host Codeward on my own AWS infrastructure?',
      a: 'Yes, we offer Bring Your Own Cloud (BYOC) deployment options for Enterprise clients. Contact us to set up an isolated VPC deployment.',
    },
  ];

  return (
    <section className="bg-[#05060a] py-20 px-6 md:px-14 border-t border-white/10">
      <div className="mx-auto max-w-3xl">
        <FadeInSection>
          <h2 className="text-3xl md:text-4xl font-semibold text-white text-center mb-3">Frequently asked questions</h2>
          <p className="text-white/60 text-center mb-10 text-sm">Everything you need to know about Codeward pricing and billing.</p>
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
        <div className="relative border border-white/10 rounded-2xl bg-[#07080c] shadow-2xl overflow-x-auto max-w-[100vw]">
          <div className="min-w-[640px]">
          
          {/* 1. INDEPENDENT STATIC HEADER (Pricing Cards) */}
          {/* Stays fixed at top-0 of window while layout scrolls naturally underneath */}
          <div className="sticky top-0 z-40 bg-[#090b12] border-b border-white/10 shadow-xl backdrop-blur-xl">
            <div className="grid grid-cols-4 items-center py-6 px-6 text-center gap-x-4">
              
              {/* Column 1: Compare plans Title */}
              <div className="text-left font-bold text-xl md:text-2xl text-white">
                Compare plans
              </div>
              
              {/* Column 2: Free */}
              <div className="flex flex-col items-center px-2">
                <span className="text-xl font-bold text-white">Free</span>
                <span className="text-2xl font-extrabold text-white mt-1">$0<span className="text-sm font-normal text-white/50">/mo</span></span>
                <button
                  onClick={goStart}
                  className="mt-4 w-full max-w-[160px] bg-white/10 border border-white/15 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-full transition text-xs shadow-sm cursor-pointer"
                >
                  Start Now
                </button>
              </div>
              
              {/* Column 3: Pro */}
              <div className="flex flex-col items-center px-2 relative bg-[#160f33]/60 py-3 rounded-2xl border border-[#8B5CF6]/30">
                <span className="absolute -top-3 bg-[#8B5CF6] text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md">Solo Dev</span>
                <span className="text-xl font-bold text-[#a78bfa]">Pro</span>
                <span className="text-2xl font-extrabold text-white mt-1">$19<span className="text-sm font-normal text-white/50">/mo</span></span>
                <button
                  onClick={goProCheckout}
                  className="mt-4 w-full max-w-[160px] bg-[#8B5CF6] hover:bg-[#7c4ae0] text-white font-bold py-2.5 px-4 rounded-full transition text-xs shadow-md shadow-[#8B5CF6]/30 cursor-pointer"
                >
                  Start Free
                </button>
              </div>
              
              {/* Column 4: Team */}
              <div className="flex flex-col items-center px-2 relative bg-white/5 py-3 rounded-2xl border border-white/10">
                <span className="text-xl font-bold text-white">Team</span>
                <span className="text-2xl font-extrabold text-white mt-1">$39<span className="text-sm font-normal text-white/50">/seat</span></span>
                <button
                  onClick={goTeamCheckout}
                  className="mt-4 w-full max-w-[160px] bg-white hover:bg-white/90 text-black font-bold py-2.5 px-4 rounded-full transition text-xs shadow-sm cursor-pointer"
                >
                  Start Free
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
                    <div key={featIdx} className="grid grid-cols-4 px-6 py-4.5 text-sm items-center hover:bg-white/[0.02] transition-colors gap-x-4">
                      <div className="font-medium text-white/80">{feat.name}</div>
                      <div className="text-center">{renderCell(feat.free)}</div>
                      <div className="text-center bg-[#8B5CF6]/[0.02] py-1">{renderCell(feat.pro)}</div>
                      <div className="text-center">{renderCell(feat.team)}</div>
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
                  Start Free
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={goProCheckout}
                  className="w-full max-w-[160px] rounded-full bg-[#8B5CF6] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7c4ae0] transition-all shadow-md shadow-[#8B5CF6]/30 cursor-pointer"
                >
                  Start Free
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
      </div>
    </section>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const goStart = () => navigate(session?.user ? '/dashboard' : '/signup');

  // Intelligent Checkout Routing
  const goTeamCheckout = () => {
    if (session?.user) {
      // Se l'utente è già loggato, lo mandiamo direttamente a pagare su Polar
      // Passiamo l'ID utente nel link così Kelvin sa chi ha pagato (tramite webhook)
      window.location.href = `https://buy.polar.sh/polar_cl_G8nQdTjkiE3TT0f9HwQtEzZAA1FrGatie2AYr1PiFep?client_reference_id=${session.user.id}`;
    } else {
      // Se non è loggato, prima lo forziamo a registrarsi
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

  return (
    <div className="min-h-screen bg-[#05060a] font-sans text-white">
      <Helmet>
        <title>Pricing | Codeward</title>
        <meta name="description" content="Simple, agentic pricing for Codeward. Start for free — no credit card required." />
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
          Simple, agentic pricing
        </h1>
        <p className="mt-4 text-base md:text-lg text-white/60 max-w-2xl mx-auto">
          Start automating code reviews today with <span className="text-white font-semibold">10 Free PRs every month</span>. No credit card required.
        </p>
      </section>

      {/* Compare Matrix with Isolated Sticky Header & Clean CSS Grid Rows */}
      <ComparePlansTable navigate={navigate} session={session} />


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
            className="group flex items-center gap-3 px-8 py-4 bg-white hover:bg-white/90 text-black text-base font-bold rounded-full transition-all  shadow-xl cursor-pointer"
          >
            Connect your first repo <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </button>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
}
