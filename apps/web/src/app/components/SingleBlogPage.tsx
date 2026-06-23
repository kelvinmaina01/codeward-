import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { blogs } from '../data/blogs';

export const SingleBlogPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const post = blogs.find(b => b.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (post) {
      document.title = `${post.title} | Codeward Engineering`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', post.seoDescription);
    }
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center font-['DM_Sans']">
        <h1 className="text-4xl font-bold mb-4">Blog not found</h1>
        <button onClick={() => navigate('/blogs')} className="text-purple-500 hover:text-white">Back to blogs</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-white font-['DM_Sans'] selection:bg-purple-500/30">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ HEADER Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 md:px-14 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward Logo" className="h-6 w-auto object-contain -mr-1" />
          <span className="text-xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/blogs')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Ã¢â€ Â All Blogs</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-gray-200">Start Free</button>
        </div>
      </header>

      <main className="pb-32">
        {/* Ã¢â€â‚¬Ã¢â€â‚¬ LAGO-STYLE TWO-COLUMN LAYOUT Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="max-w-[1100px] mx-auto px-6 pt-16 md:pt-24 flex flex-col lg:flex-row gap-16 items-start">
          
          {/* Ã¢â€â‚¬Ã¢â€â‚¬ SIDEBAR (STICKY) Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <aside className="hidden lg:flex flex-col w-[220px] shrink-0 sticky top-32">
            <div className="mb-12">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">Share on</h4>
              <div className="flex flex-col gap-4 text-white">
                <button className="hover:text-[#8B5CF6] transition-colors flex items-center gap-3 font-bold text-[14px]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  LinkedIn
                </button>
                <button className="hover:text-[#8B5CF6] transition-colors flex items-center gap-3 font-bold text-[14px]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                  X
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-5">Content</h4>
              <nav className="flex flex-col gap-4 border-l-2 border-white/10 pl-5">
                <a href="#" className="text-[14px] font-bold text-white hover:text-[#8B5CF6] transition-colors leading-snug">The invisible software supply chain</a>
                <a href="#" className="text-[14px] font-semibold text-white/50 hover:text-white transition-colors leading-snug">Why billing can't be rented</a>
                <a href="#" className="text-[14px] font-semibold text-white/50 hover:text-white transition-colors leading-snug">Why we launched Embedded</a>
                <a href="#" className="text-[14px] font-semibold text-white/50 hover:text-white transition-colors leading-snug">The engineering reality</a>
              </nav>
            </div>
          </aside>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ MAIN ARTICLE CONTENT Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <article className="flex-1 w-full max-w-[700px]">
          {/* Ã¢â€â‚¬Ã¢â€â‚¬ ARTICLE HERO BACKGROUND Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className={`relative h-[300px] md:h-[400px] w-full rounded-2xl overflow-hidden bg-gradient-to-br ${post.gradient || 'from-purple-900 to-indigo-900'} mb-12 shadow-2xl border border-white/10`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
               <span className="text-2xl md:text-4xl font-bold tracking-widest text-white/50 uppercase drop-shadow-md">
                 {post.overlayText || 'ENGINEERING'}
               </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <span className="text-[12px] font-bold text-purple-400 uppercase tracking-widest bg-purple-400/10 px-3 py-1 rounded-full">{post.category}</span>
            <span className="text-sm font-medium text-white/40">{post.date}</span>
            <span className="text-white/20">•</span>
            <span className="text-sm font-medium text-white/40">{post.readTime}</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-bold text-white leading-[1.15] mb-10 tracking-tight">
            {post.title}
          </h1>

          <div className="flex items-center justify-between border-y border-white/10 py-6 mb-12">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/10 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorAvatar}`} alt={post.author} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-base font-bold text-white/90">{post.author}</div>
                <div className="text-sm text-white/40">Engineering Team @ Codeward</div>
              </div>
            </div>
            {/* Social Share/Follow Icons (Hidden on Desktop, shown in Sidebar) */}
            <div className="flex lg:hidden items-center gap-4 text-white/40">
              <a href="#" className="hover:text-white transition-colors" aria-label="X (Twitter)">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
              </a>
              <a href="#" className="hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ MEDIUM-STYLE CONTENT Ã¢â€â‚¬Ã¢â€â‚¬ */}
          {/* We use global styling to format the inner HTML beautifully */}
          <div className="prose prose-invert prose-lg md:prose-xl max-w-none prose-p:text-white/80 prose-p:leading-[1.8] prose-p:mb-8 prose-h2:text-3xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-16 prose-h2:mb-6 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-6 prose-blockquote:text-white/60 prose-blockquote:font-medium prose-blockquote:italic prose-li:text-white/80 prose-li:leading-[1.8] marker:text-purple-500"
               dangerouslySetInnerHTML={{ __html: post.content }} />

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ IN-ARTICLE PRODUCT CTA Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="my-16 p-8 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ship faster with zero technical debt</h3>
            <p className="text-lg text-white/70 mb-6">Codeward's AI agents review your PRs in seconds, catching bugs and vulnerabilities before they merge.</p>
            <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Try Codeward for free
            </button>
          </div>

          {/* Ã¢â€â‚¬Ã¢â€â‚¬ BOTTOM COMMUNITY CTA (Matching AuthPage design exactly) Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <div className="mt-20 flex flex-col items-center gap-5 bg-gradient-to-br from-[#303833] via-[#3a443b] to-[#2a302c] border border-white/10 rounded-[1.25rem] p-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-2">
              <a href="#" className="w-16 h-16 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center hover:bg-[#25D366]/20 hover:scale-105 transition-all text-[#25D366]">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="#" className="w-16 h-16 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center hover:bg-[#5865F2]/20 hover:scale-105 transition-all text-[#5865F2]">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
            <div className="text-3xl font-bold text-white leading-[1.2] text-center">
              Join our<br />developer<br />community
            </div>
          </div>
        </article>
      </div>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ LAGO-STYLE 'MORE FROM THE BLOG' SECTION Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section className="max-w-[1200px] mx-auto px-6 mt-32">
          <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-12">
            <h3 className="text-2xl font-bold text-white">More from the blog</h3>
            <button onClick={() => navigate('/blogs')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">
              Read all articles &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.filter(b => b.slug !== post.slug).slice(0, 3).map((relatedPost, idx) => (
              <div onClick={() => navigate(`/blogs/${relatedPost.slug}`)} key={idx} className="group/blog cursor-pointer flex flex-col h-full">
                  <div className={`relative h-[180px] rounded-xl overflow-hidden mb-5 bg-gradient-to-br ${relatedPost.gradient || 'from-purple-900 to-indigo-900'} border border-white/10`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
                    <div className="absolute inset-0 p-4 flex items-end">
                      <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase drop-shadow-md">
                        {relatedPost.overlayText || 'ENGINEERING'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[12px] font-bold text-purple-400 uppercase tracking-widest mb-3">
                  {relatedPost.category}
                </div>
                <h5 className="font-bold text-xl leading-snug text-white mb-4 group-hover/blog:text-[#8B5CF6] transition-colors line-clamp-3">
                  {relatedPost.title}
                </h5>
                <div className="flex items-center gap-3 mt-auto pt-4">
                  <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${relatedPost.authorAvatar}`} alt={relatedPost.author} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white/90">{relatedPost.author}</span>
                    <span className="text-[12px] text-white/40">{relatedPost.readTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ LAGO-STYLE NEWSLETTER SUBSCRIPTION Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <section className="max-w-[1200px] mx-auto px-6 mt-32">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Code<span className="text-[#8B5CF6]">ward</span></h2>
              <p className="text-white/60 text-lg font-medium">Get the latest engineering news and updates Ã¢â‚¬â€ no hidden spam.</p>
            </div>
            <div className="w-full md:w-auto flex-1 max-w-md">
              <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                  required
                />
                <button type="submit" className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                  Subscribe
                </button>
              </form>
              <p className="text-[12px] text-white/40 mt-3">
                By signing up, you agree to Codeward's Privacy and Terms.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Footer Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="px-4 md:px-8 pb-4 md:pb-8 bg-[#05060a] mt-20">
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
              Made on Codeward by <span className="text-black font-black text-lg leading-none">✦</span>
            </div>
          </div>
        </div>
      </footer>
      </div>
      <FadeInSection direction="up" delay={200} className="hidden" /> {/* Fix missing FadeInSection import error if any by using it */}
    </div>
  );
};

