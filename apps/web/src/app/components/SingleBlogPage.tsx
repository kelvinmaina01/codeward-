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
      <div className="min-h-screen bg-[#05060a] text-white flex flex-col items-center justify-center font-['Google_Sans_Flex']">
        <h1 className="text-4xl font-bold mb-4">Blog not found</h1>
        <button onClick={() => navigate('/blogs')} className="text-purple-500 hover:text-white">Back to blogs</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-white font-['Google_Sans_Flex'] selection:bg-purple-500/30">
      {/* ── HEADER ── */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6 md:px-14 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-10 w-auto object-contain" />
          <span className="text-xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/blogs')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">← All Blogs</button>
          <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-gray-200">Start Free</button>
        </div>
      </header>

      <main className="pb-32">
        {/* ── ARTICLE HEADER ── */}
        <article className="max-w-[700px] mx-auto px-6 pt-16 md:pt-24">
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
            {/* Social Share/Follow Icons */}
            <div className="flex items-center gap-4 text-white/40">
              <a href="#" className="hover:text-white transition-colors" aria-label="X (Twitter)">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
              </a>
              <a href="#" className="hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* ── MEDIUM-STYLE CONTENT ── */}
          {/* We use global styling to format the inner HTML beautifully */}
          <div className="prose prose-invert prose-lg md:prose-xl max-w-none prose-p:text-white/80 prose-p:leading-[1.8] prose-p:mb-8 prose-h2:text-3xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-16 prose-h2:mb-6 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-6 prose-blockquote:text-white/60 prose-blockquote:font-medium prose-blockquote:italic prose-li:text-white/80 prose-li:leading-[1.8] marker:text-purple-500"
               dangerouslySetInnerHTML={{ __html: post.content }} />

          {/* ── IN-ARTICLE PRODUCT CTA ── */}
          <div className="my-16 p-8 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ship faster with zero technical debt</h3>
            <p className="text-lg text-white/70 mb-6">Codeward's AI agents review your PRs in seconds, catching bugs and vulnerabilities before they merge.</p>
            <button onClick={() => navigate('/signup')} className="rounded-full bg-white px-6 py-3 text-[15px] font-bold text-black transition-transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Try Codeward for free
            </button>
          </div>

          {/* ── BOTTOM COMMUNITY CTA (Matching AuthPage design exactly) ── */}
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
      </main>

      {/* ── SIMPLE FOOTER FOR READING PAGE ── */}
      <footer className="py-12 border-t border-white/5 text-center mt-20">
        <p className="text-white/40 font-semibold mb-6">Codeward © 2026</p>
        <div className="flex justify-center gap-8">
          <a href="#" className="text-white/60 hover:text-white transition-colors">Privacy</a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">Terms</a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
};
