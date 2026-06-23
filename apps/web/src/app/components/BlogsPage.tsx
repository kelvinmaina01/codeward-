import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { blogs } from '../data/blogs';

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
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#05060a] font-['DM_Sans']">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ HEADER Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 md:px-14">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Codeward Logo" className="h-16 w-auto object-contain" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <nav className="hidden gap-8 text-sm font-medium text-white/80 md:flex items-center">
          <a href="#" className="hover:text-white transition-colors">Products</a>
          <a href="#" className="hover:text-white transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Resources</a>
          <a href="#" className="hover:text-white transition-colors">Developers</a>
          <a href="#docs" className="hover:text-white transition-colors">Docs</a>
          <a href="/blogs" className="text-white font-bold border-b-2 border-purple-500 pb-1">Blogs</a>
        </nav>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-white hover:text-gray-300 transition-colors">Log in</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-gray-200">Get Started</button>
        </div>
      </header>

      <main className="pb-32 pt-20 px-8 md:px-14 max-w-[1500px] mx-auto">
        <FadeInSection>
          <div className="mb-16 text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">Engineering Insights</h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto font-medium">Stories, updates, and deep dives into autonomous code generation and technical debt management.</p>
          </div>
        </FadeInSection>

        {/* Featured Post */}
        <FadeInSection direction="up">
          <div 
            onClick={() => navigate(`/blogs/${featuredPost.slug}`)}
            className="group cursor-pointer grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-24 items-center bg-[#111218] p-6 lg:p-12 rounded-[2rem] border border-white/10 shadow-2xl hover:border-white/20 transition-all"
          >
            <div className={`relative h-[300px] lg:h-[450px] w-full rounded-2xl overflow-hidden bg-gradient-to-br ${featuredPost.gradient}`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                 <span className="text-sm font-bold tracking-widest text-white/70 uppercase drop-shadow-md">
                   {featuredPost.overlayText}
                 </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[12px] font-bold text-purple-400 uppercase tracking-widest bg-purple-400/10 px-3 py-1 rounded-full">{featuredPost.category}</span>
                <span className="text-sm font-medium text-white/40">{featuredPost.date}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 group-hover:text-purple-300 transition-colors">
                {featuredPost.title}
              </h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed line-clamp-3">
                {featuredPost.seoDescription}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${featuredPost.authorAvatar}`} alt={featuredPost.author} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white/90">{featuredPost.author}</div>
                  <div className="text-xs text-white/40">{featuredPost.readTime}</div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Grid Posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {gridPosts.map((post, idx) => (
            <FadeInSection key={idx} delay={idx * 100}>
              <div onClick={() => navigate(`/blogs/${post.slug}`)} className="group cursor-pointer flex flex-col h-full">
                <div className={`relative h-[400px] rounded-[1.25rem] overflow-hidden bg-gradient-to-br ${post.gradient} border border-white/10 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300`}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Codeward" className="h-5 w-5 object-contain drop-shadow-md" />
                        <span className="text-sm font-bold tracking-tight text-white drop-shadow-md">Code<span className="text-purple-400">ward</span></span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase block drop-shadow-md">
                        {post.overlayText}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col gap-3 flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest bg-purple-400/10 px-2 py-1 rounded-sm">
                      {post.category}
                    </span>
                    <span className="text-xs font-medium text-white/40">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-snug group-hover:text-purple-300 transition-colors">
                    {post.title}
                  </h3>
                  <div className="mt-auto pt-4 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-white/10 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorAvatar}`} alt={post.author} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-white/60">{post.author}</span>
                    <span className="text-white/30">Ã¢â‚¬Â¢</span>
                    <span className="text-sm text-white/40">{post.readTime}</span>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </main>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Footer Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="px-4 md:px-8 pb-4 md:pb-8 bg-[#05060a] mt-10">
        <footer className="relative bg-[#C3DBFF] rounded-[16px] pt-32 pb-8 px-8 md:px-14 overflow-hidden shadow-2xl">
          {/* Fabric Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-black/5 mix-blend-overlay pointer-events-none" />
          
          <div className="mx-auto max-w-[1500px] relative z-10">
            {/* Huge Logo/Text Graphic */}
            <div className="w-full flex justify-center mb-32 select-none pointer-events-none overflow-hidden">
              <h2 className="text-[14vw] md:text-[12vw] font-black tracking-tighter leading-none opacity-90 drop-shadow-xl lowercase flex items-center justify-center">
                <FadeInSection direction="left" delay={200}>
                  <span className="text-black inline-block">code</span>
                </FadeInSection>
                <FadeInSection direction="right" delay={200}>
                  <span className="text-[#49007D] inline-block">ward</span>
                </FadeInSection>
              </h2>
            </div>

            {/* Mission & Contact */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-20">
              <p className="text-black/80 text-lg md:text-xl font-medium max-w-sm leading-relaxed">
                Codeward builds, tests, and optimizes your codebase.<br />
                Automatically.
              </p>
              <a href="mailto:hello@codeward.ai" className="text-black hover:text-[#8B5CF6] transition-colors text-lg md:text-xl font-bold flex items-center gap-2 group">
                <span className="group-hover:translate-x-1 transition-transform">Ã¢â€ â€™</span> hello@codeward.ai
              </a>
            </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Product</h4>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">AI Code Builder</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Automated Code Reviews</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Technical Debt Management</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Security Sandboxes</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Architecture Refactoring</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Tech Debt Calculator</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Playbooks</a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Solutions</h4>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">For Startups</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">For Enterprise</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">For Open Source</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Y Combinator</a>
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
              <button onClick={() => navigate('/compare/fallow')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left">Codeward vs Fallow</button>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-black font-bold mb-2">Company</h4>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Get a demo</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Blog</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Documentation</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">FAQ</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">The Codeward Effect</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Careers</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Contact</a>
            </div>
          </div>

          {/* Integrations Block */}
          <div className="mb-16">
            <h4 className="text-black font-bold mb-6">Integrations</h4>
            <div className="text-black/70 text-sm font-semibold leading-loose flex flex-wrap gap-x-3">
              {["GitHub", "GitLab", "Bitbucket", "Jira", "Linear", "Slack", "Discord", "VS Code", "JetBrains", "Vercel", "AWS", "Google Cloud", "Azure", "Supabase", "Stripe", "Docker", "Kubernetes", "Datadog", "Sentry"].map((integration, i, arr) => (
                <span key={integration} className="whitespace-nowrap">
                  <a href="#" className="hover:text-black transition-colors">{integration}</a>
                  {i < arr.length - 1 && <span className="ml-3">Ã‚Â·</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Newsletter Block */}
          <div className="mb-16 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/50 backdrop-blur-sm p-8 md:p-10 rounded-3xl border border-black/10 shadow-sm">
            <div className="max-w-lg">
              <h4 className="text-black text-2xl font-black mb-3 tracking-tight">Subscribe to our newsletter</h4>
              <p className="text-black/60 text-base font-medium">Get the latest updates on autonomous engineering, product releases, and technical debt management delivered to your inbox.</p>
            </div>
            <div className="flex items-center bg-white rounded-full p-1.5 pl-5 shadow-sm w-full lg:w-[450px] border border-black/10 shrink-0">
              <input type="email" placeholder="Enter your email address" className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/40 font-medium" />
              <button className="bg-black text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-black/80 transition-colors shrink-0 shadow-md">Start for free &rarr;</button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-black/10 text-black/50 text-sm font-semibold">
            <div className="flex flex-wrap items-center gap-6">
              <span>Ã‚Â©2026, Codeward</span>
              <a href="#" className="hover:text-black transition-colors">Privacy</a>
              <a href="#" className="hover:text-black transition-colors">Terms</a>
              <a href="#" className="hover:text-black transition-colors">Trust</a>
              <a href="#" className="hover:text-black transition-colors">Status</a>
              <div className="flex items-center gap-4 ml-2">
                <a href="#" className="hover:text-black transition-colors" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a href="#" className="hover:text-black transition-colors" aria-label="YouTube">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.1c0-1.7 1.4-3.1 3.1-3.1h12.8c1.7 0 3.1 1.4 3.1 3.1v9.8c0 1.7-1.4 3.1-3.1 3.1H5.6C3.9 20 2.5 18.6 2.5 16.9V7.1Z"/><path d="m9.5 10 6.5 3-6.5 3v-6Z"/></svg>
                </a>
                <a href="#" className="hover:text-black transition-colors" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
                <a href="#" className="hover:text-black transition-colors" aria-label="X (Twitter)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                </a>
                <a href="#" className="hover:text-black transition-colors" aria-label="Website">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              Made on Codeward by <span className="text-black font-black text-lg leading-none">Ã¢Å“Â¦</span>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};
