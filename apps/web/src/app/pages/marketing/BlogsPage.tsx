import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { blogs } from '../../data/blogs';

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

export const BlogsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const featuredPost = blogs[0];
  const gridPosts = blogs.slice(1);

  return (
    <div className="min-h-screen bg-[#05060a] text-white font-['DM_Sans',sans-serif] selection:bg-purple-500/30">
      <Helmet>
        <title>Codeward Engineering Blog | AI Code Review, Automated Refactoring & Velocity</title>
        <meta name="description" content="Technical deep dives, architecture guides, and research from the Codeward team on eliminating technical debt, autonomous code review agents, and microVM test execution." />
        <link rel="canonical" href="https://codeward.cloud/blogs" />
        <meta property="og:title" content="Codeward Engineering Blog | AI Code Review & Autonomous Refactoring" />
        <meta property="og:description" content="Technical deep dives and architecture guides from the Codeward engineering team." />
        <meta property="og:image" content="https://codeward.cloud/og-preview.jpg" />
        <meta property="og:url" content="https://codeward.cloud/blogs" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://codeward.cloud/og-preview.jpg" />
      </Helmet>

      {/* ── TOP NAVIGATION ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-14 py-4 backdrop-blur-xl bg-[#05060a]/85 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/codeward-logo.png" alt="Codeward Logo" className="h-8 w-auto object-contain mr-1" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <nav className="hidden gap-8 text-sm font-medium text-white/80 md:flex items-center">
          <a href="/#features" className="hover:text-white transition-colors">Products</a>
          <a href="/#solutions" className="hover:text-white transition-colors">Solutions</a>
          <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/docs" className="hover:text-white transition-colors">Docs</a>
          <a href="/blogs" className="text-white font-bold border-b-2 border-purple-500 pb-0.5">Blogs</a>
        </nav>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-3 py-1.5">Log in</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-gray-200">Get Started</button>
        </div>
      </header>

      <main className="pb-28 pt-12 md:pt-16 px-6 md:px-14 max-w-[1440px] mx-auto">
        {/* Hero Section */}
        <FadeInSection>
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              Codeward Engineering Hub
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-[1.1]">
              Engineering Insights &amp; Research
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto font-normal leading-relaxed">
              In-depth technical perspectives on autonomous code review, refactoring legacy architecture, security sandboxing, and engineering velocity.
            </p>
          </div>
        </FadeInSection>

        {/* Featured Blog Post */}
        {featuredPost && (
          <FadeInSection direction="up">
            <div 
              onClick={() => navigate(`/blogs/${featuredPost.slug}`)}
              className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-center bg-[#0d0e14] hover:bg-[#10121a] p-6 lg:p-8 rounded-2xl border border-white/10 hover:border-purple-500/40 shadow-xl hover:shadow-[0_0_40px_rgba(139,92,246,0.15)] transition-all duration-300"
            >
              {/* Compact Thumbnail Image */}
              <div className="lg:col-span-6 relative h-[220px] sm:h-[260px] lg:h-[280px] w-full rounded-xl overflow-hidden border border-white/10 bg-[#08090d]">
                <img 
                  src={featuredPost.heroImage || '/og-preview.jpg'} 
                  alt={featuredPost.title} 
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md border border-white/10">
                  <img src="/codeward-logo.png" alt="Codeward" className="h-4 w-4 object-contain" />
                  <span className="text-xs font-bold tracking-tight text-white">Code<span className="text-purple-400">ward</span></span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-widest text-white/90 uppercase bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {featuredPost.overlayText || 'FEATURED'}
                  </span>
                  <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    5 min read
                  </span>
                </div>
              </div>

              {/* Text Meta Content */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider bg-purple-400/10 border border-purple-400/20 px-2.5 py-0.5 rounded-md">
                    {featuredPost.category}
                  </span>
                  <span className="text-xs text-white/40">{featuredPost.date}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white leading-snug mb-3 group-hover:text-purple-300 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-sm sm:text-base text-white/60 mb-6 leading-relaxed line-clamp-3">
                  {featuredPost.seoDescription}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="h-9 w-9 rounded-full bg-purple-500/15 border border-purple-500/30 p-1 flex items-center justify-center shrink-0">
                    <img src="/codeward-logo.png" alt="Codeward Team" className="h-5 w-5 object-contain" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Codeward Team</div>
                    <div className="text-xs text-purple-400/80 font-medium">Platform &amp; Autonomous AI Engineering</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        )}

        {/* Grid Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {gridPosts.map((post, idx) => (
            <FadeInSection key={idx} delay={idx * 60}>
              <div 
                onClick={() => navigate(`/blogs/${post.slug}`)} 
                className="group cursor-pointer flex flex-col h-full bg-[#0d0e14] hover:bg-[#10121a] p-4 rounded-2xl border border-white/10 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300"
              >
                {/* Compact Thumbnail Container */}
                <div className="relative h-[180px] sm:h-[190px] w-full rounded-xl overflow-hidden border border-white/5 mb-4 bg-[#08090d]">
                  <img 
                    src={post.heroImage || '/og-preview.jpg'} 
                    alt={post.title} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                    <img src="/codeward-logo.png" alt="Codeward" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[11px] font-bold tracking-tight text-white">Code<span className="text-purple-400">ward</span></span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                      {post.overlayText}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2.5 flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider bg-purple-400/10 border border-purple-400/20 px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                    <span className="text-xs font-medium text-white/40">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug group-hover:text-purple-300 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                    {post.seoDescription}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-purple-500/15 border border-purple-500/25 p-0.5 flex items-center justify-center">
                        <img src="/codeward-logo.png" alt="Codeward Team" className="h-3.5 w-3.5 object-contain" />
                      </div>
                      <span className="text-xs font-bold text-white/90">Codeward Team</span>
                    </div>
                    <span className="text-xs text-white/40">{post.readTime}</span>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </main>
    </div>
  );
};
