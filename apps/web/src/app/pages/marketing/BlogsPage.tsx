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
  const [showPopup, setShowPopup] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      if (!isDismissed) {
        setShowPopup(window.scrollY > 400);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All Category');

  const todayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % blogs.length;
  const featuredPost = blogs[todayIndex];
  
  const uniqueCategories = ['All Category', ...Array.from(new Set(blogs.map(b => b.category)))];

  const gridPosts = blogs.filter((post, idx) => {
    if (idx === todayIndex) return false;
    const matchesCategory = selectedCategory === 'All Category' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.seoDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
          <div className="mb-14 text-right flex flex-col items-end">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-[1.1]">
              Engineering Insights &amp; Research
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-2xl font-normal leading-relaxed">
              In-depth technical perspectives on autonomous code review, refactoring legacy architecture, security sandboxing, and engineering velocity.
            </p>
          </div>
        </FadeInSection>
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          
          {/* Left Sidebar (25%) */}
          <aside className="w-full lg:w-1/4 shrink-0 flex flex-col gap-6 lg:sticky lg:top-24">
            
            <div className="flex flex-col gap-6">
              {/* Search Placeholder */}
              <div>
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Label</div>
                <div className="flex items-center gap-2 bg-[#0d0e14] border border-white/10 rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input 
                    type="text" 
                    placeholder="Search article..." 
                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-white/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>


            </div>

            {/* Categories */}
            <div>
              <div className="text-sm font-bold text-purple-400 mb-4">Browse By Categories</div>
              <ul className="flex flex-col gap-4 text-sm font-medium border-l border-white/10 ml-1">
                {uniqueCategories.map(cat => (
                  <li 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`pl-4 cursor-pointer transition-colors ${
                      selectedCategory === cat 
                        ? 'border-l-2 border-purple-500 text-white -ml-[1px]' 
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Socials */}
            <div className="mt-2 pt-6 border-t border-white/10 flex items-center gap-5">
              <a href="https://x.com" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </aside>

          {/* Right Content Area (75%) */}
          <div className="w-full lg:w-3/4 flex flex-col">
            {/* Featured Blog Post */}
            {featuredPost && (
          <FadeInSection direction="up">
            <div 
              onClick={() => navigate(`/blogs/${featuredPost.slug}`)}
              className="group cursor-pointer flex flex-col mb-16 bg-[#0d0e14] hover:bg-[#10121a] rounded-2xl overflow-hidden border border-white/10 hover:border-[#d8b4fe]/60 shadow-xl hover:shadow-[0_0_40px_rgba(216,180,254,0.2)] transition-all duration-300"
            >
              {/* Text Meta Content */}
              <div className="flex flex-col justify-center p-6 lg:p-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-[#d8b4fe] uppercase tracking-wider bg-[#d8b4fe]/10 border border-[#d8b4fe]/20 px-2.5 py-0.5 rounded-md">
                      {featuredPost.category}
                    </span>
                    <span className="text-[11px] font-bold tracking-widest text-white/90 uppercase bg-white/10 px-2.5 py-0.5 rounded-md border border-white/10">
                      {featuredPost.overlayText || 'FEATURED'}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">{featuredPost.date}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white leading-snug mb-3 group-hover:text-[#e9d5ff] transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-sm sm:text-base text-white/60 mb-6 leading-relaxed line-clamp-3">
                  {featuredPost.seoDescription}
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <img src="/codeward-logo.png" alt="Codeward Team" className="h-8 w-auto object-contain shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">Codeward Team</div>
                    <div className="text-xs text-purple-300/80 font-medium">Platform &amp; Autonomous AI Engineering</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        )}

        {/* Grid Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {gridPosts.map((post, idx) => (
            <FadeInSection key={idx} delay={idx * 60}>
              <div 
                onClick={() => navigate(`/blogs/${post.slug}`)} 
                className="group cursor-pointer flex flex-col h-full bg-[#0d0e14] hover:bg-[#10121a] rounded-2xl overflow-hidden border border-white/10 hover:border-[#f3e8ff]/80 hover:shadow-[0_0_30px_rgba(243,232,255,0.2)] transition-all duration-300"
              >
                {/* 100% Full-Bleed Thumbnail - no inset margin or edges */}
                <div className="relative h-[190px] sm:h-[200px] w-full overflow-hidden bg-[#08090d]">
                  <img 
                    src={post.heroImage || '/blog-card-cover.jpg'} 
                    alt={post.title} 
                    className="w-full h-full object-cover object-center" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded border border-white/10">
                      {post.overlayText}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-2.5 flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#d8b4fe] uppercase tracking-wider bg-[#d8b4fe]/10 border border-[#d8b4fe]/20 px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                    <span className="text-xs font-medium text-white/40">{post.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug group-hover:text-[#e9d5ff] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                    {post.seoDescription}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <img src="/codeward-logo.png" alt="Codeward Team" className="h-5 w-auto object-contain shrink-0" />
                      <span className="text-xs font-bold text-white/90">Codeward Team</span>
                    </div>
                    <span className="text-xs text-white/40">{post.readTime}</span>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
          </div>
        </div>
        </div>
      </main>

      {/* Floating Scroll Popup */}
      <div 
        className={`fixed bottom-6 right-6 max-w-sm p-6 rounded-2xl bg-[#0d0e14] border border-white/10 shadow-2xl z-50 transition-all duration-500 transform ${showPopup && !isDismissed ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
      >
        <div className="relative">
          <button onClick={() => { setIsDismissed(true); setShowPopup(false); }} className="absolute -top-2 -right-2 text-white/40 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <h3 className="text-lg font-bold text-white mb-2 tracking-tight pr-6">Ship faster with zero technical debt</h3>
          <p className="text-xs text-white/70 mb-4 leading-relaxed">
            Codeward's AI review agents analyze pull requests in seconds, running deterministic tests in Firecracker microVMs and pushing verified fixes.
          </p>
          <button 
            onClick={() => navigate('/signup')} 
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-all hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105"
          >
            Try Codeward for free
          </button>
        </div>
      </div>
    </div>
  );
};
