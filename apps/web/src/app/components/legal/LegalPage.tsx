import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileText, ArrowUp } from 'lucide-react';
import { Theme } from '../types';
import { termsContent } from './TermsContent';
import { privacyContent } from './PrivacyContent';
import { FooterTrustBadges } from '../FooterTrustBadges';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
  theme: Theme;
  onCycleTheme: () => void;
  themeIcon: React.ReactNode;
}

export function LegalPage({ type, onBack, theme, onCycleTheme, themeIcon }: LegalPageProps) {
  const isTerms = type === 'terms';
  const content = isTerms ? termsContent : privacyContent;
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const lastUpdated = 'Last Updated: August 11, 2026';
  const locationInfo = 'Codeward Technologies · Nairobi, Westlands, Kenya · codeward.cloud';

  const [activeSection, setActiveSection] = useState(content[0].id);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Simple scroll spy & scroll-top threshold logic
  useEffect(() => {
    const handleScroll = () => {
      const container = document.getElementById('scroll-container');
      if (container) {
        setShowScrollTop(container.scrollTop > 250);
      }

      const sections = content.map(c => document.getElementById(c.id));
      let currentActive = content[0].id;
      
      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 150) {
            currentActive = section.id;
          }
        }
      }
      setActiveSection(currentActive);
    };

    const container = document.getElementById('scroll-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [content]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById('scroll-container');
    if (el && container) {
      const topPos = el.offsetTop - 100;
      container.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    const container = document.getElementById('scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={`theme-${theme} w-full h-screen flex flex-col bg-cw-bg transition-colors duration-300 font-sans text-cw-txt relative`}>
      {/* Top Navigation */}
      <div className="h-[80px] border-b border-cw-bdr px-8 flex items-center justify-between shrink-0 bg-cw-bg z-10 relative">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-cw-txt2 hover:text-cw-txt transition-colors font-medium text-[13px] cursor-pointer"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button 
          onClick={onCycleTheme} 
          className="w-9 h-9 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg3 transition-colors cursor-pointer"
        >
          {themeIcon}
        </button>
      </div>

      {/* Main Scrollable Container */}
      <div id="scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative flex flex-col justify-between">
        <div className="max-w-[1000px] mx-auto px-8 py-16 flex flex-col md:flex-row gap-16 w-full">
          
          {/* Left Sidebar (Table of Contents) */}
          <div className="w-[280px] shrink-0 hidden md:block relative">
            <div className="sticky top-[40px] border border-cw-bdr bg-cw-bg2 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-cw-txt text-[15px]">Table of Contents</h3>
                <button
                  onClick={scrollToTop}
                  className="text-xs text-cw-blue hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowUp size={12} /> Top
                </button>
              </div>
              <ul className="space-y-4">
                {content.map((section, idx) => (
                  <li key={section.id}>
                    <button 
                      onClick={() => scrollTo(section.id)}
                      className={`text-left w-full flex items-center gap-3 text-[13px] font-medium transition-colors cursor-pointer ${
                        activeSection === section.id ? 'text-cw-blue font-semibold' : 'text-cw-txt2 hover:text-cw-txt'
                      }`}
                    >
                      <span className="w-5 font-semibold opacity-50 text-right">{idx + 1}</span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 max-w-[650px]">
            <div className="mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cw-red/10 text-cw-red font-semibold text-[11px] uppercase tracking-wider mb-6">
                <FileText size={14} />
                {title}
              </div>
              <h1 className="text-[40px] leading-[1.1] font-bold text-cw-txt tracking-tight mb-6">{title}</h1>
              <p className="text-cw-txt2 text-[15px] leading-relaxed mb-3">
                <strong className="text-cw-txt font-semibold">{lastUpdated}</strong> · {isTerms ? 'These Terms form a binding legal agreement between you and Codeward. Please read them carefully before using the platform.' : 'This Privacy Policy explains how we collect, use, and handle your source code and data.'}
              </p>
              <p className="text-cw-txt2/80 text-[13px]">
                {locationInfo}
              </p>
            </div>

            <div className="space-y-12 pb-16">
              {content.map((section, idx) => (
                <section key={section.id} id={section.id} className="relative pt-6">
                  {/* Divider */}
                  {idx > 0 && <div className="absolute top-0 left-0 right-0 h-px bg-cw-bdr" />}
                  
                  <div className="flex gap-6 mt-8">
                    {/* Number Badge */}
                    <div className="w-8 h-8 rounded-full bg-cw-red/10 text-cw-red flex items-center justify-center shrink-0 font-bold text-sm shadow-sm border border-cw-red/20 mt-0.5">
                      {idx + 1}
                    </div>
                    
                    {/* Section Body */}
                    <div className="flex-1">
                      <h2 className="text-[20px] font-bold text-cw-txt mb-4">{section.title}</h2>
                      <div className="text-cw-txt2 text-[14px] leading-[1.8]">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {/* In-content Scroll to Top action */}
            <div className="pt-8 border-t border-cw-bdr flex justify-between items-center text-xs text-cw-txt2">
              <span>© {new Date().getFullYear()} Codeward Technologies. Nairobi, Westlands, Kenya.</span>
              <button
                onClick={scrollToTop}
                className="px-3.5 py-2 rounded-lg bg-cw-bg2 border border-cw-bdr text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 font-medium cursor-pointer"
              >
                <ArrowUp size={14} /> Back to top
              </button>
            </div>
          </div>
          
        </div>

        {/* Screenshot Footer Banner */}
        <div className="w-full bg-[#c6dcfd] text-slate-900 border-t border-blue-200/80 py-8 px-6 md:px-12 mt-12 shrink-0">
          <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
            {/* Left Text */}
            <div className="max-w-xs font-semibold text-[15px] leading-snug text-slate-900">
              Codeward builds, tests, and optimizes your codebase. Automatically.
            </div>

            {/* Middle Trust Badges */}
            <div className="flex-1 my-2 lg:my-0">
              <FooterTrustBadges dark={false} className="text-slate-800" />
            </div>

            {/* Right Contact Info */}
            <div className="flex flex-col items-center lg:items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                say hi <span className="text-sm">🙈</span>
              </div>
              <a 
                href="mailto:hello@codeward.cloud" 
                className="text-lg md:text-xl font-bold text-slate-950 hover:text-blue-700 transition-colors flex items-center gap-2"
              >
                <span className="text-base">&rarr;</span> hello@codeward.cloud
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-cw-blue text-white shadow-xl hover:bg-cw-blue/90 hover:scale-105 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer border border-white/20"
          aria-label="Scroll to top"
        >
          <ArrowUp size={16} />
          <span className="hidden sm:inline">Scroll to top</span>
        </button>
      )}
    </div>
  );
}
