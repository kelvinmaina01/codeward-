import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FooterTrustBadges } from './FooterTrustBadges';
import { NewsletterForm } from './NewsletterForm';

export function LandingFooter() {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="px-4 md:px-8 pb-4 md:pb-8 bg-[#05060a]">
      <footer className="relative bg-[#C3DBFF] rounded-[16px] pt-20 md:pt-24 pb-8 px-8 md:px-14 overflow-hidden shadow-2xl">
        {/* Fabric Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-black/5 mix-blend-overlay pointer-events-none" />
        
        <div className="mx-auto max-w-[1500px] relative z-10">

          {/* Mission, Trust Badges & Contact */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-16 pb-10 border-b border-black/10">
            <p className="text-black/80 text-base md:text-lg font-medium max-w-xs leading-relaxed shrink-0">
              Codeward builds, tests, and optimizes your codebase.<br />
              Automatically.
            </p>
            
            {/* Trust & Security Badges (ISO 27001, GDPR, CCPA, HIPAA) */}
            <div className="my-2 xl:my-0">
              <FooterTrustBadges />
            </div>

            {/* Email Contact with Slanted Gmail & Outlook Logos + say hi badge */}
            <div className="flex flex-col items-start gap-2 shrink-0">
              <div className="flex items-center gap-2 text-black/80">
                {/* Gmail Vector SVG */}
                <svg className="h-5 w-5 shrink-0 rotate-[-12deg] transition-transform hover:rotate-0 drop-shadow-sm" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335"/>
                  <path d="M22 6L12 13L2 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 6V18C2 19.1 2.9 20 4 20H7V10L2 6Z" fill="#4285F4"/>
                  <path d="M22 6V18C22 19.1 21.1 20 20 20H17V10L22 6Z" fill="#34A853"/>
                  <path d="M7 20H17V13L12 9.5L7 13V20Z" fill="#FBBC04"/>
                </svg>

                <span className="text-xs font-bold text-black/75 tracking-tight px-1">
                  say hi 🙈
                </span>

                {/* Outlook Vector SVG */}
                <svg className="h-5 w-5 shrink-0 rotate-[12deg] transition-transform hover:rotate-0 drop-shadow-sm" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M28 6L44 11V37L28 42V6Z" fill="#0078D4"/>
                  <path d="M28 6L44 11V24L28 21V6Z" fill="#28A8EA"/>
                  <path d="M28 21L44 24V37L28 42V21Z" fill="#005A9E"/>
                  <path d="M4 11.5L28 6V42L4 36.5V11.5Z" fill="#0078D4"/>
                  <circle cx="16" cy="24" r="8" fill="#106EBE"/>
                  <path d="M16 19C13.2386 19 11 21.2386 11 24C11 26.7614 13.2386 29 16 29C18.7614 29 21 26.7614 21 24C21 21.2386 18.7614 19 16 19ZM16 26.5C14.6193 26.5 13.5 25.3807 13.5 24C13.5 22.6193 14.6193 21.5 16 21.5C17.3807 21.5 18.5 22.6193 18.5 24C18.5 25.3807 17.3807 26.5 16 26.5Z" fill="white"/>
                </svg>
              </div>

              <a href="mailto:hello@codeward.cloud" className="text-black hover:text-[#8B5CF6] transition-colors text-base md:text-lg font-bold flex items-center gap-2 group">
                <span className="group-hover:translate-x-1 transition-transform">→</span> hello@codeward.cloud
              </a>
            </div>
          </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16 md:mb-20">
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
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-black font-bold mb-2">Compare</h4>
            <button onClick={() => navigate('/compare/coderabbit')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs CodeRabbit</button>
            <button onClick={() => navigate('/compare/greptile')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Greptile</button>
            <button onClick={() => navigate('/compare/copilot')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Copilot</button>
            <button onClick={() => navigate('/compare/cursor')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Cursor</button>
            <button onClick={() => navigate('/compare/sonarqube')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs SonarQube</button>
            <button onClick={() => navigate('/compare/snyk')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Snyk</button>
            <button onClick={() => navigate('/compare/deepsource')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs DeepSource</button>
            <button onClick={() => navigate('/compare/codeclimate')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Code Climate</button>
            <button onClick={() => navigate('/compare/codacy')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Codacy</button>
            <button onClick={() => navigate('/compare/fallow')} className="text-black/70 hover:text-black transition-colors text-sm font-semibold text-left cursor-pointer">Codeward vs Fallow</button>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="text-black font-bold mb-2">Company</h4>
            <a href="/book-demo" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Get a demo</a>
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
                {i < arr.length - 1 && <span className="ml-3">·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Newsletter Block */}
        <NewsletterForm />

        {/* Bottom Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 pt-8 border-t border-black/10 text-black/50 text-sm font-semibold">
          <div className="flex flex-wrap items-center gap-6">
            <span>©2026, Codeward</span>
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

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-black font-bold text-sm">
              <span>Codeward meets</span>
              <span className="text-black font-black text-lg leading-none">✦</span>
            </div>

            {/* SSL & Accuracy Badges next to Codeward meets ✦ */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/5 border border-black/10 text-black/90 text-xs font-bold">
                <svg className="w-3.5 h-3.5 text-black shrink-0" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="7" y="17" width="22" height="17" rx="3.5" stroke="currentColor" strokeWidth="2.2" fill="none"/>
                  <path d="M12 17V12C12 8.7 14.7 6 18 6C21.3 6 24 8.7 24 12V17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                </svg>
                <span>256-bit SSL Encrypted</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/5 border border-black/10 text-black/90 text-xs font-bold">
                <svg className="w-3.5 h-3.5 text-black shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M13 20L18 25L27 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>99% Accuracy Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>

    {/* Floating Scroll To Top Single Angle Arrow Button (Appears on Page Scroll) */}
    {showScrollTop && (
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5CF6] text-white shadow-2xl transition-all duration-300 hover:bg-purple-600 hover:scale-110 active:scale-95 border border-white/20 cursor-pointer"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    )}
    </div>
  );
}
