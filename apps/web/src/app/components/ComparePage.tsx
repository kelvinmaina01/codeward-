import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { comparisons } from '../data/comparisons';

// Reusing the fade in component logic for smooth scrolling
const FadeInSection: React.FC<{ children: React.ReactNode; direction?: 'up' | 'left' | 'right'; className?: string; delay?: number }> = ({ children, direction = 'up', className = '', delay = 0 }) => {
  const [isVisible, setVisible] = React.useState(false);
  const domRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setVisible(true);
      });
    }, { threshold: 0.1 });
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  let transformClass = 'translate-y-10';
  if (direction === 'left') transformClass = '-translate-x-10';
  if (direction === 'right') transformClass = 'translate-x-10';

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${transformClass}`} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export const ComparePage: React.FC = () => {
  const { competitorId } = useParams<{ competitorId: string }>();
  const navigate = useNavigate();

  const data = competitorId ? comparisons[competitorId] : null;

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [competitorId]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Competitor not found</h1>
        <button onClick={() => navigate('/')} className="text-purple-500 hover:text-white">Return home</button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#05060a]">
      {/* ── HEADER (Reused from LandingHero) ── */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 md:px-14">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer">
          <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-16 w-auto object-contain" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </button>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/login')} className="text-sm font-bold text-white hover:text-gray-300 transition-colors">Log in</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-gray-200">Get Started</button>
        </div>
      </header>

      <main className="pb-32">
        {/* ── HERO SECTION ── */}
        <section className="relative pt-24 pb-20 px-8 md:px-14 flex flex-col items-center text-center">
          <FadeInSection>
            <div className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white/70 mb-8 uppercase tracking-widest">
              Codeward vs {data.name}
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight max-w-4xl mx-auto leading-[1.1]">
              Both {data.tagline.split(',')[0]}, but one <span className="text-purple-500">{data.heroCompetitor}</span> and the other <span className="text-green-500">{data.heroCodeward}</span>.
            </h1>
            <p className="text-xl text-white/60 font-medium max-w-2xl mx-auto mb-12">
              {data.tagline.split(',')[1]?.trim() || data.tagline}
            </p>
            <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Start engineering, it's free
            </button>
            <div className="mt-6 text-sm font-bold text-white/40 cursor-pointer hover:text-white transition-colors" onClick={() => document.getElementById('table')?.scrollIntoView({ behavior: 'smooth' })}>
              Jump to the table ↓
            </div>
          </FadeInSection>
        </section>

        {/* ── THE SHORT VERSION ── */}
        <section className="py-20 px-8 md:px-14 max-w-5xl mx-auto">
          <FadeInSection direction="up">
            <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40 mb-6">The Short Version</h2>
            <div className="bg-[#111218] border border-white/10 rounded-3xl p-10 md:p-14 text-xl md:text-2xl leading-relaxed text-white font-medium shadow-2xl">
              {data.shortVersion}
            </div>
          </FadeInSection>
        </section>

        {/* ── NUMBERS VS MOVES (Feature Blocks) ── */}
        <section className="py-24 px-8 md:px-14">
          <div className="max-w-6xl mx-auto">
            <FadeInSection>
              <div className="text-center mb-16">
                <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40 mb-4">{data.numbersVsMoves.heading}</h2>
                <h3 className="text-4xl md:text-5xl font-black text-white">{data.numbersVsMoves.subheading}</h3>
              </div>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <FadeInSection direction="left" className="h-full">
                <div className="bg-[#F5F5EF] rounded-3xl p-10 md:p-14 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-3xl font-black text-black mb-6">{data.name}</h4>
                    <p className="text-xl text-black/70 font-medium leading-relaxed">
                      {data.numbersVsMoves.competitorFocus}
                    </p>
                  </div>
                  <div className="mt-12 text-black/20 font-black text-7xl opacity-50">01</div>
                </div>
              </FadeInSection>

              <FadeInSection direction="right" className="h-full">
                <div className="bg-[#111218] border border-white/10 rounded-3xl p-10 md:p-14 h-full flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-8 w-auto" />
                      <h4 className="text-3xl font-black text-white">Codeward</h4>
                    </div>
                    <p className="text-xl text-white/70 font-medium leading-relaxed">
                      {data.numbersVsMoves.codewardFocus}
                    </p>
                  </div>
                  <div className="mt-12 text-white/10 font-black text-7xl relative z-10">02</div>
                </div>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* ── SIDE BY SIDE TABLE ── */}
        <section id="table" className="py-24 px-8 md:px-14">
          <div className="max-w-5xl mx-auto">
            <FadeInSection>
              <div className="text-center mb-16">
                <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40 mb-4">Side by Side</h2>
                <h3 className="text-4xl md:text-5xl font-black text-white">At a glance.</h3>
                <p className="text-lg text-white/60 font-medium mt-6">Nobody wins every row, they're not trying to do the same thing.</p>
              </div>

              <div className="bg-[#111218] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {data.table.map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 p-6 md:p-8 ${i !== data.table.length - 1 ? 'border-b border-white/5' : ''} ${i === 0 ? 'bg-white/5 font-bold text-white' : 'text-white/80 font-medium'}`}>
                    <div className="col-span-1 text-sm md:text-base pr-4">{row.feature}</div>
                    <div className={`col-span-1 text-sm md:text-base text-center ${row.codeward === '✔' ? 'text-green-400' : 'text-white'}`}>{row.codeward}</div>
                    <div className={`col-span-1 text-sm md:text-base text-center ${row.competitor === '✔' ? 'text-purple-400' : 'text-white/40'}`}>{row.competitor}</div>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ── THE HONEST VERDICT ── */}
        <section className="py-24 px-8 md:px-14 bg-gradient-to-b from-transparent to-[#111218]">
          <div className="max-w-4xl mx-auto">
            <FadeInSection>
              <h3 className="text-4xl font-black text-white mb-10">{data.verdict.heading}</h3>
              <div className="space-y-8 text-xl text-white/70 font-medium leading-relaxed">
                <p>{data.verdict.p1}</p>
                <p>{data.verdict.p2}</p>
                <p className="text-white font-bold">{data.verdict.p3}</p>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ── QUICK QUESTIONS (FAQ) ── */}
        <section className="py-24 px-8 md:px-14">
          <div className="max-w-4xl mx-auto">
            <FadeInSection>
              <h3 className="text-3xl font-black text-white mb-12">Quick questions</h3>
              <div className="space-y-12">
                {data.faqs.map((faq, i) => (
                  <div key={i} className="group">
                    <h4 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">{faq.q}</h4>
                    <p className="text-lg text-white/60 font-medium leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="py-24 px-8 md:px-14 text-center">
          <FadeInSection>
            <h3 className="text-5xl font-black text-white mb-8 tracking-tight">See what your rivals are missing.</h3>
            <p className="text-xl text-white/60 font-medium mb-12 max-w-2xl mx-auto">
              Add your first repo in under a minute. We'll track the debt and write the patches for you.
            </p>
            <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-10 py-5 text-lg font-bold text-black transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              Start tracking, it's free
            </button>
          </FadeInSection>
        </section>
      </main>

      {/* ── FOOTER (Reused from LandingHero) ── */}
      <footer className="bg-white rounded-t-[40px] pt-24 pb-12 px-8 md:px-14 mt-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.05)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.05)_0%,_transparent_70%)] pointer-events-none" />
        
        <div className="mx-auto max-w-[1500px] relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-20">
            <p className="text-black/80 text-lg md:text-xl font-medium max-w-sm leading-relaxed">
              Codeward builds, tests, and optimizes your codebase.<br />
              Automatically.
            </p>
            <a href="mailto:hello@codeward.ai" className="text-black hover:text-[#8B5CF6] transition-colors text-lg md:text-xl font-bold flex items-center gap-2 group">
              <span className="group-hover:translate-x-1 transition-transform">→</span> hello@codeward.ai
            </a>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Product</h4>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">AI Code Builder</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Automated Code Reviews</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Technical Debt Management</a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Compare</h4>
              <button onClick={() => navigate('/compare/coderabbit')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs CodeRabbit</button>
              <button onClick={() => navigate('/compare/greptile')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Greptile</button>
              <button onClick={() => navigate('/compare/copilot')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Copilot</button>
              <button onClick={() => navigate('/compare/cursor')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Cursor</button>
              <button onClick={() => navigate('/compare/sonarqube')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs SonarQube</button>
              <button onClick={() => navigate('/compare/snyk')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Snyk</button>
              <button onClick={() => navigate('/compare/deepsource')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs DeepSource</button>
              <button onClick={() => navigate('/compare/codeclimate')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Code Climate</button>
              <button onClick={() => navigate('/compare/codacy')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Codacy</button>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Company</h4>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Get a demo</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Blog</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Contact</a>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-black/10 text-black/50 text-sm font-semibold">
            <div className="flex flex-wrap items-center gap-6">
              <span>©2026, Codeward</span>
              <a href="#" className="hover:text-black transition-colors">Privacy</a>
              <a href="#" className="hover:text-black transition-colors">Terms</a>
            </div>
            <div className="flex items-center gap-2">
              Made on Codeward by <span className="text-black font-black text-lg leading-none">✦</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
