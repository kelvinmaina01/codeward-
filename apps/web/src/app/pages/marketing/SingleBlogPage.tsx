import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { blogs } from '../../data/blogs';

export const SingleBlogPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const post = blogs.find(b => b.slug === slug) || 
    (slug === 'eliminate-technical-debt-production' ? blogs.find(b => b.slug === 'eliminate-technical-debt-before-production') : undefined) ||
    (slug === 'specialized-ai-agents-code-reviews' ? blogs.find(b => b.slug === 'specialized-ai-agents-automated-code-reviews') : undefined) ||
    (slug === 'catching-zero-day-vulnerabilities' ? blogs.find(b => b.slug === 'catching-zero-day-vulnerabilities-in-prs') : undefined) ||
    (slug === 'orchestrator-agent-gatekeeper' ? blogs.find(b => b.slug === 'orchestrator-agent-ultimate-gatekeeper') : undefined) ||
    (slug === 'firecracker-microvms-for-secure-testing' ? blogs.find(b => b.slug === 'running-untrusted-code-firecracker-microvms') : undefined) ||
    (slug === 'measuring-engineering-velocity' ? blogs.find(b => b.slug === 'metrics-that-matter-engineering-velocity') : undefined) ||
    (slug === 'refactoring-legacy-monoliths' ? blogs.find(b => b.slug === 'strategies-safely-refactoring-legacy-monoliths') : undefined) ||
    (slug === 'the-future-of-compliance-as-code' ? blogs.find(b => b.slug === 'future-of-compliance-checklists-to-code') : undefined);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center font-['DM_Sans',sans-serif]">
        <h1 className="text-4xl font-bold mb-4">Blog not found</h1>
        <button onClick={() => navigate('/blogs')} className="text-purple-400 hover:text-white transition-colors">
          &larr; Back to all blogs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-white font-['DM_Sans',sans-serif] selection:bg-purple-500/30">
      <Helmet>
        <title>{`${post.title} | Codeward Engineering`}</title>
        <meta name="description" content={post.seoDescription} />
        <link rel="canonical" href={`https://codeward.cloud/blogs/${slug}`} />
        <meta property="og:title" content={`${post.title} | Codeward Engineering`} />
        <meta property="og:description" content={post.seoDescription} />
        <meta property="og:image" content={post.heroImage ? `https://codeward.cloud${post.heroImage}` : 'https://codeward.cloud/og-preview.jpg'} />
        <meta property="og:url" content={`https://codeward.cloud/blogs/${slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={post.heroImage ? `https://codeward.cloud${post.heroImage}` : 'https://codeward.cloud/og-preview.jpg'} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "datePublished": post.date,
            "author": {
              "@type": "Organization",
              "name": "Codeward Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Codeward",
              "logo": {
                "@type": "ImageObject",
                "url": "https://codeward.cloud/codeward-logo.png"
              }
            },
            "description": post.seoDescription
          })}
        </script>
      </Helmet>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-14 py-4 backdrop-blur-xl bg-[#05060a]/85 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/codeward-logo.png" alt="Codeward Logo" className="h-8 w-auto object-contain mr-1" />
          <span className="text-xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/blogs')} className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
            &larr; All Articles
          </button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-gray-200">
            Start Free
          </button>
        </div>
      </header>

      <main className="pb-28">
        {/* TWO-COLUMN LAYOUT */}
        <div className="max-w-[1100px] mx-auto px-6 pt-12 md:pt-16 flex flex-col lg:flex-row gap-16 items-start">
          
          {/* SIDEBAR (STICKY) */}
          <aside className="hidden lg:flex flex-col w-[200px] shrink-0 sticky top-28">
            <div className="mb-10">
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Share Article</h4>
              <div className="flex flex-col gap-3 text-white">
                <button 
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')} 
                  className="hover:text-purple-400 transition-colors flex items-center gap-2.5 font-medium text-sm text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  LinkedIn
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, '_blank')} 
                  className="hover:text-purple-400 transition-colors flex items-center gap-2.5 font-medium text-sm text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                  X (Twitter)
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Topic</h4>
              <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full inline-block">
                {post.category}
              </span>
            </div>
          </aside>

          {/* MAIN ARTICLE CONTENT */}
          <article className="flex-1 w-full max-w-[760px]">
            {/* ARTICLE HERO PREVIEW IMAGE */}
            <div className="relative h-[220px] sm:h-[280px] md:h-[340px] w-full rounded-2xl overflow-hidden mb-10 shadow-2xl border border-white/10 bg-[#08090d]">
              <img 
                src={post.heroImage || '/blog-card-cover.jpg'} 
                alt={post.title} 
                className="w-full h-full object-cover object-center" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05060a] via-black/35 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-white/90 uppercase bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                  {post.overlayText || 'CODEWARD ENGINEERING'}
                </span>
                <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30">
                  {post.readTime}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider bg-purple-400/10 border border-purple-400/20 px-2.5 py-0.5 rounded">
                {post.category}
              </span>
              <span className="text-xs text-white/40">{post.date}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[46px] font-bold text-white leading-[1.2] mb-8 tracking-tight">
              {post.title}
            </h1>

            {/* AUTHOR BLOCK */}
              <div className="flex items-center justify-between border-y border-white/10 py-5 mb-10">
                <div className="flex items-center gap-3.5">
                  <img src="/codeward-logo.png" alt="Codeward Team" className="h-9 w-auto object-contain shrink-0" />
                  <div>
                    <div className="text-base font-bold text-white">Codeward Team</div>
                    <div className="text-xs text-purple-300/80 font-medium">Autonomous Engineering &amp; AI Research</div>
                  </div>
                </div>
              <div className="text-xs text-white/40 font-medium">
                {post.readTime}
              </div>
            </div>

            {/* BODY CONTENT */}
            <div 
              className="prose prose-invert prose-lg max-w-none prose-p:text-white/80 prose-p:leading-[1.8] prose-p:mb-6 prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-12 prose-h2:mb-4 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-5 prose-blockquote:text-white/70 prose-blockquote:font-medium prose-blockquote:italic prose-li:text-white/80 prose-li:leading-[1.8] marker:text-purple-400"
              dangerouslySetInnerHTML={{ __html: post.content }} 
            />

            {/* IN-ARTICLE PRODUCT CTA */}
            <div className="my-14 p-8 rounded-2xl bg-[#0d0e14] border border-white/10 text-center shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Ship faster with zero technical debt</h3>
              <p className="text-sm sm:text-base text-white/70 mb-6 max-w-lg mx-auto leading-relaxed">
                Codeward's AI review agents analyze pull requests in seconds, running deterministic tests in Firecracker microVMs and pushing verified fixes.
              </p>
              <button 
                onClick={() => navigate('/signup')} 
                className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-gray-200 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                Try Codeward for free
              </button>
            </div>
          </article>
        </div>

        {/* MORE FROM THE BLOG SECTION */}
        <section className="max-w-[1100px] mx-auto px-6 mt-20 pt-16 border-t border-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white tracking-tight">More from the blog</h3>
            <button 
              onClick={() => navigate('/blogs')} 
              className="text-sm font-semibold text-purple-400 hover:text-white transition-colors"
            >
              View all articles &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.filter(b => b.slug !== post.slug).slice(0, 3).map((relatedPost, idx) => (
              <div 
                onClick={() => navigate(`/blogs/${relatedPost.slug}`)} 
                key={idx} 
                className="group/blog cursor-pointer flex flex-col h-full bg-[#0d0e14] hover:bg-[#10121a] rounded-xl overflow-hidden border border-white/10 hover:border-[#f3e8ff]/80 hover:shadow-[0_0_30px_rgba(243,232,255,0.2)] transition-all duration-300"
              >
                <div className="relative h-[160px] w-full overflow-hidden bg-[#08090d]">
                  <img 
                    src={relatedPost.heroImage || '/blog-card-cover.jpg'} 
                    alt={relatedPost.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3">
                    <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                      {relatedPost.overlayText || 'ENGINEERING'}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <div className="text-[10px] font-bold text-[#d8b4fe] uppercase tracking-wider mb-2">
                    {relatedPost.category}
                  </div>
                  <h5 className="font-bold text-base leading-snug text-white mb-2 group-hover/blog:text-[#e9d5ff] transition-colors line-clamp-2">
                    {relatedPost.title}
                  </h5>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-white/5">
                    <img src="/codeward-logo.png" alt="Codeward Team" className="h-4 w-auto object-contain shrink-0" />
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white/80">Codeward Team</span>
                      <span className="text-[11px] text-white/40">{relatedPost.readTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
