import React, { useState, useEffect } from 'react';
import { ChevronLeft, Shield, Lock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Theme } from './types';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
  theme: Theme;
  onCycleTheme: () => void;
  themeIcon: React.ReactNode;
}

import { termsContent } from './TermsContent';

import { privacyContent } from './PrivacyContent';

export function LegalPage({ type, onBack, theme, onCycleTheme, themeIcon }: LegalPageProps) {
  const isTerms = type === 'terms';
  const content = isTerms ? termsContent : privacyContent;
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const date = 'Effective Date: October 2026';

  const [activeSection, setActiveSection] = useState(content[0].id);

  // Simple scroll spy logic
  useEffect(() => {
    const handleScroll = () => {
      const sections = content.map(c => document.getElementById(c.id));
      let currentActive = content[0].id;
      
      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          // Adjust offset to trigger active state nicely
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

  return (
    <div className={`theme-${theme} w-full h-screen flex flex-col bg-cw-bg transition-colors duration-300 font-sans text-cw-txt`}>
      {/* Top Navigation */}
      <div className="h-[80px] border-b border-cw-bdr px-8 flex items-center justify-between shrink-0 bg-cw-bg z-10 relative">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-cw-txt2 hover:text-cw-txt transition-colors font-medium text-[13px]"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button 
          onClick={onCycleTheme} 
          className="w-9 h-9 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg3 transition-colors"
        >
          {themeIcon}
        </button>
      </div>

      {/* Main Container */}
      <div id="scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative">
        <div className="max-w-[1000px] mx-auto px-8 py-16 flex flex-col md:flex-row gap-16">
          
          {/* Left Sidebar (Table of Contents) */}
          <div className="w-[280px] shrink-0 hidden md:block relative">
            <div className="sticky top-[40px] border border-cw-bdr bg-cw-bg2 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-cw-txt mb-6 text-[15px]">Table of Contents</h3>
              <ul className="space-y-4">
                {content.map((section, idx) => (
                  <li key={section.id}>
                    <button 
                      onClick={() => scrollTo(section.id)}
                      className={`text-left w-full flex items-center gap-3 text-[13px] font-medium transition-colors ${
                        activeSection === section.id ? 'text-cw-blue' : 'text-cw-txt2 hover:text-cw-txt'
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
              <p className="text-cw-txt2 text-[15px] leading-relaxed">
                {date} · {isTerms ? 'These Terms form a binding legal agreement between you and Codeward. Please read them carefully before using the platform.' : 'This Privacy Policy explains how we collect, use, and handle your source code and data.'}
              </p>
            </div>

            <div className="space-y-12 pb-32">
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
          </div>
          
        </div>
      </div>
    </div>
  );
}
