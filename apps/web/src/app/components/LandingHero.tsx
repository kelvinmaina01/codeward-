import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { FlashIcon, ArrowRight01Icon } from 'hugeicons-react';
import { blogs } from '../data/blogs';
import { useSession } from '../../lib/auth';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

// ============================================================
// Codeward Hero Section — Self-contained single-file component
// Requires: React, Tailwind CSS
// ============================================================

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-[#1c1c1c] rounded-2xl mb-4 transition-colors hover:bg-[#252525]">
      <button 
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base md:text-lg font-medium text-white group-hover:text-white transition-colors pr-8">{question}</span>
        <span className={`text-white/50 text-xl font-light transition-transform duration-300 ${isOpen ? 'rotate-45 text-white' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out px-6 ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-white/60 text-base leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FadeInSection({ children, delay = 0, direction = 'up', className = '' }: { children: React.ReactNode, delay?: number, direction?: 'up' | 'left' | 'right', className?: string }) {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    
    const current = domRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  const getTranslate = () => {
    if (isVisible) return 'translate-x-0 translate-y-0';
    if (direction === 'left') return '-translate-x-16 translate-y-0';
    if (direction === 'right') return 'translate-x-16 translate-y-0';
    return 'translate-y-12 translate-x-0';
  };

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${className} ${
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${getTranslate()}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function FAQSection() {
  const [showMore, setShowMore] = useState(false);

  const initialFaqs = [
    {
      question: "Is this just another CodeRabbit?",
      answer: "No. While tools like CodeRabbit focus heavily on PR summaries and superficial code review comments, Codeward is an active participant in your codebase. We don't just leave commentsÃ¢â‚¬â€our autonomous agents actively write the code, generate the fixes, and manage your technical debt directly."
    },
    {
      question: "How does Codeward integrate with my existing CI/CD?",
      answer: "Codeward connects directly to your GitHub, GitLab, or Bitbucket repositories. It listens for pull requests and branch updates, running its analysis and patching autonomously without disrupting your existing pipelines."
    },
    {
      question: "Is my source code secure?",
      answer: "Absolutely. We run all analysis in isolated, ephemeral sandboxes. Your code is never used to train public models, and our infrastructure is SOC2 compliant, ensuring military-grade security for your intellectual property."
    },
    {
      question: "Can Codeward automatically fix the issues it finds?",
      answer: "Yes! Our Self-healing Patches feature doesn't just point out errors; it generates ready-to-merge pull requests with verified fixes for vulnerabilities, test failures, and legacy technical debt."
    },
    {
      question: "What languages and frameworks are supported?",
      answer: "We support all major languages including TypeScript/JavaScript, Python, Go, Rust, Java, C++, and more. Our AI agents are context-aware and adapt to your specific framework and internal coding guidelines."
    },
    {
      question: "How is this different from static analysis tools like SonarQube?",
      answer: "Unlike static analysis tools that simply flag hundreds of issues and add to your backlog, Codeward actively refactors your codebase and writes the fixes for you. It's an active participant, not just a passive scanner."
    }
  ];

  const advancedFaqs = [
    {
      question: "How do the Codeward AI Agents work?",
      answer: "Codeward deploys specialized sub-agentsÃ¢â‚¬â€like an Architecture Agent, a Testing Agent, and a Security AgentÃ¢â‚¬â€that collaborate. They review the codebase simultaneously, discuss optimal solutions in the background, and then execute complex, multi-file refactors that a single model couldn't handle."
    },
    {
      question: "What happens during the first run on my repository?",
      answer: "During the first run, Codeward performs a deep 'Knowledge Indexing'. It maps out your entire architecture, learns your team's coding conventions, and creates an initial baseline report of your technical debt and testing gaps. It may take slightly longer, but it's essential for contextual awareness."
    },
    {
      question: "Are subsequent runs faster?",
      answer: "Yes, drastically. Once the initial index is built, subsequent runs only analyze the delta (the new commits or pull requests). The agents use the cached knowledge graph to instantly understand how new changes affect the broader system, allowing for lightning-fast PR reviews and fixes."
    },
    {
      question: "Do I need to write new tests for Codeward to work?",
      answer: "No. Codeward utilizes your existing test suite to verify its own changes. If coverage is lacking, our Test Agent can even write new unit and integration tests to ensure the fixes are robust."
    }
  ];

  return (
    <section className="bg-[#05060a] py-12 md:py-16 px-4 sm:px-8 md:px-20 border-t border-white/5">
      <FadeInSection>
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-16 text-center">Frequently Asked Questions</h2>
          <div className="flex flex-col">
            {initialFaqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.question} answer={faq.answer} />
            ))}
            
            <div className={`overflow-hidden transition-all duration-700 ease-in-out ${showMore ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {advancedFaqs.map((faq, idx) => (
                <FAQItem key={`adv-${idx}`} question={faq.question} answer={faq.answer} />
              ))}
            </div>
            
            <div className="mt-12 flex justify-center">
              <button 
                onClick={() => setShowMore(!showMore)}
                className="text-white/60 hover:text-[#8B5CF6] border-b border-white/30 hover:border-[#8B5CF6] transition-all text-lg font-medium pb-1 flex items-center gap-2"
              >
                {showMore ? "Show fewer questions" : "Learn more about Agents & Advanced features"}
                <span className={`transition-transform duration-300 ${showMore ? 'rotate-180' : ''}`}>↓</span>
              </button>
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="bg-[#05060a] pt-12 md:pt-16 pb-12 md:pb-16 px-4 sm:px-8 md:px-20 font-['DM_Sans'] relative overflow-hidden">
      <FadeInSection>
        <div className="mx-auto max-w-[1200px] relative z-10">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-3xl md:text-3xl md:text-4xl font-bold text-white tracking-tight">Enterprise-grade security and privacy</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 border-y border-white/10 relative">
            <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-black/10 relative bg-[#E0F7FA] z-10 transition-colors rounded-t-3xl md:rounded-tr-none md:rounded-l-3xl">
              <div className="h-10 mb-8 flex items-center opacity-70">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-black mb-3 flex items-center gap-2">
                SOC 2 Type II
                <svg className="w-5 h-5 text-black/50" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </h3>
              <p className="text-black/80 leading-relaxed text-[16px] pr-4">
                Your data is protected with enterprise-grade rigor. We never train models on your code.
              </p>
            </div>
            
            <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-black/10 relative bg-[#E8EAF6] z-10 transition-colors">
              <div className="h-10 mb-8 flex items-center opacity-70">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-black mb-3">
                Flexible Deployment
              </h3>
              <p className="text-black/80 leading-relaxed text-[16px] pr-4">
                Deploy Codeward on-prem, in your own VPC, or use our secure cloud infrastructure.
              </p>
            </div>
            
            <div className="p-8 md:p-10 relative bg-[#FCE4EC] z-10 transition-colors rounded-b-3xl md:rounded-bl-none md:rounded-r-3xl">
              <div className="h-10 mb-8 flex items-center opacity-70">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-black mb-3">
                RBAC
              </h3>
              <p className="text-black/80 leading-relaxed text-[16px] pr-4">
                Role-based access control to set granular user roles, permissions, and boundaries.
              </p>
            </div>
          </div>

          {/* Learn more button Ã¢â‚¬â€ right aligned */}
          <div className="mt-12 flex justify-end relative z-10">
            <button className="inline-flex w-fit items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black text-sm font-bold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-95">
              Learn more &rarr;
            </button>
          </div>
        </div>

        {/* Dot pattern Ã¢â‚¬â€ absolute to the section, completely independent of content flow */}
        <div className="absolute bottom-0 left-0 w-full h-20 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.35) 2px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      </FadeInSection>
    </section>
  );
}

function LiveCodewardCodeReviewWidget() {
  const [typedText, setTypedText] = useState("");
  const fullText = "git push origin main";
  const [isPatching, setIsPatching] = useState(true);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsPatching(false);
        }, 2200);
      }
    }, 110);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-3.5 sm:p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Terminal Top Command Bar */}
      <div className="rounded-2xl bg-[#0a0c10] px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-white font-mono text-xs sm:text-sm flex items-center justify-between shadow-xl border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-emerald-400 font-bold">$</span>
          <span className="text-gray-100 font-medium truncate">{typedText}</span>
          <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block ml-0.5 shrink-0" />
        </div>
        <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded shrink-0">bash</span>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-2.5 my-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-600 bg-[#f8f9fc]">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">codeward-code-review</span>
          <span className="rounded bg-gray-200/80 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold">bot</span>
          <span>reviewed</span>
          <span className="font-bold text-purple-700">PR #142</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm text-gray-900 space-y-3">
        {/* Comment Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
              alt="Codeward Bot"
              className="h-5 w-5 rounded-full border border-gray-200 shadow-sm shrink-0"
            />
            <span className="font-bold text-gray-900 truncate">Code Review by Codeward</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">🐞 3 Bugs</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-semibold">🛡️ 34 Rules</span>
          </div>
        </div>

        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div className="col-span-4 sm:col-span-3 truncate">REPOSITORY</div>
            <div className="col-span-4 sm:col-span-4 truncate">STATUS</div>
            <div className="col-span-4 sm:col-span-3 truncate">ACTION</div>
            <div className="hidden sm:block sm:col-span-2 text-right truncate">UPDATED</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="truncate">codeward-</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">34 rules passed</span>
              </div>
              <div className="col-span-4 sm:col-span-3 min-w-0">
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer truncate block text-[10px] sm:text-xs">Visit report ↗</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400">just now</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="truncate">compass</span>
              </div>
              <div className="col-span-4 sm:col-span-4 min-w-0 pr-1">
                {isPatching ? (
                  <div className="flex items-center gap-1 text-amber-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-spin shrink-0" />
                    <span className="truncate">Auto-patching...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">1 bug patched</span>
                  </div>
                )}
              </div>
              <div className="col-span-4 sm:col-span-3 min-w-0">
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer truncate block text-[10px] sm:text-xs">View diff ↗</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400">just now</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="truncate">inua360</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">0 vulnerabilities</span>
              </div>
              <div className="col-span-4 sm:col-span-3 min-w-0">
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer truncate block text-[10px] sm:text-xs">Visit report ↗</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400">1m ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSecurityShieldWidget() {
  const [isShielding, setIsShielding] = useState(false);
  const [isShielded, setIsShielded] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const runLoop = () => {
      setIsShielded(false);
      setIsShielding(false);

      timer = setTimeout(() => {
        setIsShielding(true);
        timer = setTimeout(() => {
          setIsShielding(false);
          setIsShielded(true);

          timer = setTimeout(() => {
            runLoop();
          }, 3500);
        }, 1800);
      }, 2500);
    };

    runLoop();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-3.5 sm:p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Command Bar (Live Run Feed / Agent Canvas Run #247) */}
      <div className="rounded-2xl bg-[#0a0c10] px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-white font-sans text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-xl border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-100 text-xs truncate">Live run feed</span>
          <span className="text-[10px] font-bold text-purple-300 bg-purple-900/60 border border-purple-500/30 px-2 py-0.5 rounded font-mono shrink-0">
            Agent Canvas Run #247
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <span className="text-emerald-400 font-bold">15/15 Active</span>
          <span className="text-gray-500">•</span>
          <span className={isShielded ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {isShielded ? "0 Critical" : "1 Critical"}
          </span>
        </div>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-2.5 my-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-600 bg-[#f8f9fc]">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">Security Agent</span>
          <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold">haiku-4-5</span>
          <span>ran 18 checks</span>
          <span className="font-bold text-rose-600">{isShielded ? "100/100" : "45/100"}</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm text-gray-900 space-y-3">
        {/* Banner Alert */}
        {!isShielded ? (
          <div className="rounded-xl bg-rose-600 text-white px-3 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold flex flex-wrap items-center justify-between gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-white animate-ping shrink-0" />
              <span className="truncate">SECURITY ALERT: Hardcoded Stripe Key Line 14</span>
            </div>
            <span className="text-[10px] opacity-90 font-mono shrink-0">1 Critical</span>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-600 text-white px-3 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold flex flex-wrap items-center justify-between gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-bold shrink-0">🛡️</span>
              <span className="truncate">SECRET SHIELDED: Key Removed & Re-encrypted</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-100 shrink-0">Score: 100/100</span>
          </div>
        )}

        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div className="col-span-4 sm:col-span-3 truncate">AGENT</div>
            <div className="col-span-4 sm:col-span-4 truncate">STATUS</div>
            <div className="col-span-4 sm:col-span-3 truncate">FINDINGS</div>
            <div className="hidden sm:block sm:col-span-2 text-right truncate">LATENCY</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="text-rose-500 shrink-0">🛡️</span>
                <span className="truncate">Security</span>
              </div>
              <div className="col-span-4 sm:col-span-4 min-w-0 pr-1">
                {isShielding ? (
                  <div className="flex items-center gap-1 text-amber-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-spin shrink-0" />
                    <span className="truncate">Shielding...</span>
                  </div>
                ) : isShielded ? (
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Key Secured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-rose-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">1 Critical key</span>
                  </div>
                )}
              </div>
              <div className="col-span-4 sm:col-span-3 text-gray-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">Line 14 API key</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">180ms</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="text-emerald-500 shrink-0">🗑️</span>
                <span className="truncate">Bloat</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Score: 88</span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-emerald-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">-38 dead lines</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">95ms</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="text-purple-500 shrink-0">⚡</span>
                <span className="truncate">Orchestrator</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ${isShielded ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className={`truncate ${isShielded ? "text-emerald-600" : "text-rose-600"}`}>
                  {isShielded ? "Gate: ALLOW" : "Gate: BLOCK"}
                </span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-gray-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">15 agents run</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">4m 18s</div>
            </div>
          </div>
        </div>

        {/* Action Status Footer */}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          {!isShielded ? (
            <div
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {isShielding ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                  <span>Shielding Secret...</span>
                </>
              ) : (
                <>
                  <span>Shield Secret & Re-scan</span>
                  <span className="shrink-0">🛡️</span>
                </>
              )}
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] sm:text-xs font-bold flex items-center gap-1">
              <span>✓ Secret Revoked & Shielded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  }

function LiveTechDebtWidget() {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const runLoop = () => {
      setIsFixed(false);
      setIsFixing(false);

      timer = setTimeout(() => {
        setIsFixing(true);
        timer = setTimeout(() => {
          setIsFixing(false);
          setIsFixed(true);

          timer = setTimeout(() => {
            runLoop();
          }, 3500);
        }, 1800);
      }, 2500);
    };

    runLoop();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-3.5 sm:p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. PR Command Header (Borrowed from Screenshot 1 & 2) */}
      <div className="rounded-2xl bg-[#0a0c10] px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-white font-sans text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-xl border border-white/10">
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs min-w-0">
          <span className="text-purple-400 font-bold shrink-0">feat(ai):</span>
          <span className="text-gray-200 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[280px]">integrate new streaming endpoints</span>
          <span className="text-gray-500 font-bold shrink-0">#241</span>
        </div>
        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-mono shrink-0">
          {isFixed ? "PASSED" : "BLOCKED"}
        </span>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-2.5 my-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-600 bg-[#f8f9fc]">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">Codeward App</span>
          <span className="rounded bg-gray-200/80 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold">bot</span>
          <span>analyzed</span>
          <span className="font-bold text-purple-700">PR #241</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm text-gray-900 space-y-3">
        {/* Banner Alert */}
        {!isFixed ? (
          <div className="rounded-xl bg-rose-600 text-white px-3 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold flex flex-wrap items-center justify-between gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-white animate-ping shrink-0" />
              <span className="truncate">MERGE BLOCKED: Critical Debt Threshold Exceeded</span>
            </div>
            <span className="text-[10px] opacity-90 font-mono shrink-0">-45 Points</span>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-600 text-white px-3 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold flex flex-wrap items-center justify-between gap-1 shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-bold shrink-0">✓</span>
              <span className="truncate">DEBT CLEARED: All Checks Passed & Auto-Refactored</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-100 shrink-0">+100 Points</span>
          </div>
        )}

        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div className="col-span-4 sm:col-span-3 truncate">CHECK</div>
            <div className="col-span-4 sm:col-span-4 truncate">SCORE</div>
            <div className="col-span-4 sm:col-span-3 truncate">ANALYSIS</div>
            <div className="hidden sm:block sm:col-span-2 text-right truncate">WEIGHT</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold truncate pr-1">Security</div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">100/100 (Pass)</span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-gray-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">0 findings</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">x2.0</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold truncate pr-1">Architecture</div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">92/100 (Pass)</span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-gray-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">Modular</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">x1.0</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold truncate pr-1">Broken Code</div>
              <div className="col-span-4 sm:col-span-4 min-w-0 pr-1">
                {isFixing ? (
                  <div className="flex items-center gap-1 text-amber-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-spin shrink-0" />
                    <span className="truncate">Auto-fixing...</span>
                  </div>
                ) : isFixed ? (
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">100/100 (Fixed)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-rose-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">0/100 (Fail)</span>
                  </div>
                )}
              </div>
              <div className="col-span-4 sm:col-span-3 text-purple-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">{isFixed ? "Auto-refactored" : "Race condition"}</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">x1.8</div>
            </div>
          </div>

          {/* Action Status Footer */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            {!isFixed ? (
              <div
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isFixing ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                    <span>Applying Auto-Fixes...</span>
                  </>
                ) : (
                  <>
                    <span>Apply Auto-Fixes & Re-run</span>
                    <span className="shrink-0">⚡</span>
                  </>
                )}
              </div>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] sm:text-xs font-bold flex items-center gap-1">
                <span>✓ Auto-Fixes Applied</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSandboxTestWidget() {
  const [connectState, setConnectState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const runLoop = () => {
      setConnectState('idle');
      setIsRunning(true);

      timer = setTimeout(() => {
        setConnectState('connecting');
        timer = setTimeout(() => {
          setConnectState('connected');
          timer = setTimeout(() => {
            setIsRunning(false);
            timer = setTimeout(() => {
              runLoop();
            }, 3500);
          }, 1800);
        }, 1500);
      }, 1500);
    };

    runLoop();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-3.5 sm:p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Repository Connection Top Bar (Borrowed from Screenshot) */}
      <div className="rounded-2xl bg-[#0a0c10] px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-white font-sans text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-xl border border-white/10">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span className="font-mono text-xs text-gray-300 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">kelvinmaina01 /</span>
          <span className="font-mono text-xs font-bold text-white shrink-0">CODEWARD-OS</span>
          <span className="text-[10px] text-gray-500 bg-white/10 px-1.5 py-0.5 rounded font-mono shrink-0">Private</span>
        </div>

        {/* Animated Connection Button */}
        {connectState === 'idle' && (
          <button className="px-2.5 sm:px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 shrink-0">
            <span>Connect</span>
            <span>→</span>
          </button>
        )}
        {connectState === 'connecting' && (
          <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse shrink-0">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}
        {connectState === 'connected' && (
          <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Connected</span>
          </div>
        )}
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-2.5 my-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-600 bg-[#f8f9fc]">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">codeward-test-agent</span>
          <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">isolated</span>
          <span>executing</span>
          <span className="font-bold text-purple-700">run #53</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm text-gray-900 space-y-3">
        {/* Comment Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-emerald-500 font-bold text-sm shrink-0">📦</span>
            <span className="font-bold text-gray-900 truncate">kelvinmaina01 / x-algorithm</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">⚡ Score: 100/100</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">🧹 Ephemeral</span>
          </div>
        </div>

        <div className="w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div className="col-span-4 sm:col-span-3 truncate">TEST TOOL</div>
            <div className="col-span-4 sm:col-span-4 truncate">STATUS</div>
            <div className="col-span-4 sm:col-span-3 truncate">RESULT</div>
            <div className="hidden sm:block sm:col-span-2 text-right truncate">LATENCY</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="shrink-0">📦</span>
                <span className="truncate">sandbox_init</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Isolated container</span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-gray-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">Cloned SHA</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">100ms</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="shrink-0">⚡</span>
                <span className="truncate">fallow_health</span>
              </div>
              <div className="col-span-4 sm:col-span-4 min-w-0 pr-1">
                {isRunning ? (
                  <div className="flex items-center gap-1 text-amber-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-spin shrink-0" />
                    <span className="truncate">Evaluating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px]">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Score 100/100</span>
                  </div>
                )}
              </div>
              <div className="col-span-4 sm:col-span-3 text-emerald-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">No dead code</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">451ms</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 py-2 items-center text-[11px] sm:text-xs">
              <div className="col-span-4 sm:col-span-3 font-mono text-gray-900 font-bold flex items-center gap-1 min-w-0 pr-1">
                <span className="shrink-0">⚡</span>
                <span className="truncate">bundle_size</span>
              </div>
              <div className="col-span-4 sm:col-span-4 flex items-center gap-1 text-emerald-600 font-semibold text-[10px] sm:text-[11px] min-w-0 pr-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Zero bloat</span>
              </div>
              <div className="col-span-4 sm:col-span-3 text-emerald-600 font-medium text-[10px] sm:text-xs min-w-0">
                <span className="truncate block">Passed</span>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-right text-gray-400 font-mono">60ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Particle = {
  baseX: number;
  baseY: number;
  baseZ: number;
  x: number;
  y: number;
  z: number;
  size: number;
};

function ParticleField({ centered = false }: { centered?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Build a sphere of particles using a Fibonacci lattice
    const COUNT = 700;
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      particles.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        x,
        y,
        z,
        size: 0.8 + Math.random() * 1.2,
      });
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);

    let raf = 0;
    let t = 0;
    const render = () => {
      t += 0.0025;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Sphere positioned based on 'centered' prop
      const cx = centered ? width * 0.5 : width * 0.68;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.55;

      const ry = t + mouse.x * 0.6;
      const rx = Math.sin(t * 0.7) * 0.15 + mouse.y * 0.3;

      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // rotate Y
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseX * sinY + p.baseZ * cosY;
        // rotate X
        const y2 = p.baseY * cosX - z1 * sinX;
        const z2 = p.baseY * sinX + z1 * cosX;

        const depth = (z2 + 1) / 2; // 0 back, 1 front
        const px = cx + x1 * radius;
        const py = cy + y2 * radius;
        const size = p.size * (0.4 + depth * 1.4);
        const alpha = 0.15 + depth * 0.75;

        ctx.beginPath();
        ctx.fillStyle = `rgba(120, 160, 255, ${alpha})`;
        ctx.shadowColor = "rgba(80, 130, 255, 0.9)";
        ctx.shadowBlur = 8 * depth;
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };

    // Delay start of loop to free main thread during initial load/hydration
    const startTimeout = setTimeout(() => {
      render();
    }, 400);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}

function TypingText() {
  const fullText = "Ship AI code\nwithout the technical\ndebt";
  const [text, setText] = useState("");
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let i = 0;
    let isDeleting = false;

    const tick = () => {
      if (!isDeleting) {
        setText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) {
          isDeleting = true;
          timeout = setTimeout(tick, 3500);
          return;
        }
        timeout = setTimeout(tick, 60);
      } else {
        setText(fullText.slice(0, i - 1));
        i--;
        if (i < 0) {
          isDeleting = false;
          i = 0;
          timeout = setTimeout(tick, 600);
          return;
        }
        timeout = setTimeout(tick, 30);
      }
    };

    tick();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <span className="whitespace-pre-wrap text-white">
      {text}
      <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-white animate-pulse align-middle" />
    </span>
  );
}

function MissionTypingText() {
  const normalText = "Codeward is your autonomous\ncode quality platform, without\n";
  const highlightedText = "the technical debt";
  const fullText = normalText + highlightedText;
  const [text, setText] = useState("");
  const totalLength = fullText.length;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let i = 0;
    let isDeleting = false;

    const tick = () => {
      if (!isDeleting) {
        setText(fullText.slice(0, i + 1));
        i++;
        if (i > totalLength) {
          isDeleting = true;
          timeout = setTimeout(tick, 4000);
          return;
        }
        timeout = setTimeout(tick, 55);
      } else {
        setText(fullText.slice(0, i - 1));
        i--;
        if (i < 0) {
          isDeleting = false;
          i = 0;
          timeout = setTimeout(tick, 800);
          return;
        }
        timeout = setTimeout(tick, 25);
      }
    };

    tick();
    return () => clearTimeout(timeout);
  }, []);

  const normalPart = text.slice(0, normalText.length);
  const highlightPart = text.slice(normalText.length);
  const isDoneTyping = text.length === totalLength;

  return (
    <span className="whitespace-pre-wrap text-white">
      {normalPart}
      {highlightPart && <span className="text-purple-400">{highlightPart}</span>}
      {isDoneTyping && (
        <span className="inline-block text-purple-500 font-black italic -rotate-12 origin-bottom scale-110 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] ml-2">!</span>
      )}
      {!isDoneTyping && (
        <span className="inline-block h-[0.85em] w-[3px] translate-y-[0.1em] bg-purple-400 animate-pulse align-middle ml-1" />
      )}
    </span>
  );
}

function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const testimonials = [
    {
      id: 1,
      company: "Medpace",
      category: "health tech · medpace",
      author: "Durgesh Sharma",
      role: "Technology Leader, Medpace",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "11.4x",
      metricLabel: "refactor velocity in 10 weeks",
      text: (
        <>
          Most AI tools just autocomplete mistakes faster. <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">Codeward</span> is the first platform we've used that actually understands our entire architecture, proactively finding and fixing deep logic flaws before they ever reach our main branch.
        </>
      ),
      rawQuote: "Most AI tools just autocomplete mistakes faster. Codeward is the first platform we've used that actually understands our entire architecture, proactively finding and fixing deep logic flaws before they ever reach our main branch."
    },
    {
      id: 2,
      company: "Baywoods",
      category: "full-stack · baywoods",
      author: "Brian Nyakundi",
      role: "Founder @ Baywoods | Full-Stack Developer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "5.7x",
      metricLabel: "legacy code upgrade speed",
      text: (
        <>
          It's not just another chatbot that you have to micromanage. Codeward acts like a true senior engineer—<span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">autonomously refactoring</span> legacy code and writing comprehensive test suites without needing constant supervision.
        </>
      ),
      rawQuote: "It's not just another chatbot that you have to micromanage. Codeward acts like a true senior engineer—autonomously refactoring legacy code and writing comprehensive test suites without needing constant supervision."
    },
    {
      id: 3,
      company: "Riara University",
      category: "cybersecurity · riara",
      author: "Renee (Wanjiru) Njuwa",
      role: "Web Security & Blue Team Specialist, Riara University",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "2.63M",
      metricLabel: "lines scanned & patched",
      text: (
        <>
          Our technical debt was becoming unmanageable. Within weeks of deploying <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">Codeward</span>, it systematically eliminated thousands of lines of legacy code and upgraded our core modules, all while passing our strictest CI/CD pipelines.
        </>
      ),
      rawQuote: "Our technical debt was becoming unmanageable. Within weeks of deploying Codeward, it systematically eliminated thousands of lines of legacy code and upgraded our core modules, all while passing our strictest CI/CD pipelines."
    },
    {
      id: 4,
      company: "Mistral AI",
      category: "infrastructure · mistral ai",
      author: "Cynthia Saraiva",
      role: "Senior Infrastructure Engineer @ Mistral AI",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "5.2x",
      metricLabel: "inbound test coverage",
      text: (
        <>
          Codeward has completely transformed how our engineering teams scale. It doesn't just leave vague PR comments—it <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">spins up sandboxes</span>, runs failing tests, and commits self-healing patches instantly.
        </>
      ),
      rawQuote: "Codeward has completely transformed how our engineering teams scale. It doesn't just leave vague PR comments—it spins up sandboxes, runs failing tests, and commits self-healing patches instantly."
    },
    {
      id: 5,
      company: "Zavu.dev",
      category: "systems architecture · zavu",
      author: "Anna Wellerdiek",
      role: "Staff Systems Architect @ Zavu.dev",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "31.7x",
      metricLabel: "architecture rule compliance",
      text: (
        <>
          Maintaining consistent code standards across fast-growing teams used to take weeks. <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">Codeward</span> enforces architectural rules automatically across all repositories so developers focus purely on building.
        </>
      ),
      rawQuote: "Maintaining consistent code standards across fast-growing teams used to take weeks. Codeward enforces architectural rules automatically across all repositories so developers focus purely on building."
    },
    {
      id: 6,
      company: "Flyrank",
      category: "ai platform · flyrank",
      author: "Vikram Patel",
      role: "Principal Architect @ Flyrank",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "2x",
      metricLabel: "deployment frequency growth",
      text: (
        <>
          Codeward autonomously eliminated friction in our deployment pipeline. What used to take days of manual code reviews is now resolved in minutes with <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">self-healing PRs</span>.
        </>
      ),
      rawQuote: "Codeward autonomously eliminated friction in our deployment pipeline. What used to take days of manual code reviews is now resolved in minutes with self-healing PRs."
    },
    {
      id: 7,
      company: "Instatus",
      category: "reliability · instatus",
      author: "Ali Farhadi",
      role: "Founder @ Instatus",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "2,300",
      metricLabel: "automated patches merged",
      text: (
        <>
          Instatus requires 99.99% reliability and clean architecture. Codeward monitors our repositories around the clock, automatically cleaning <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">technical debt</span> before it hits production.
        </>
      ),
      rawQuote: "Instatus requires 99.99% reliability and clean architecture. Codeward monitors our repositories around the clock, automatically cleaning technical debt before it hits production."
    },
    {
      id: 8,
      company: "Razorpay",
      category: "fintech · razorpay",
      author: "Aarav Mehta",
      role: "Engineering Director @ Razorpay",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&auto=format&fit=crop&q=70&fm=webp",
      bgImage: "/bg.png",
      metric: "21.9x",
      metricLabel: "debt backlog clearance",
      text: (
        <>
          Integrating Codeward cut our technical debt backlog by <span className="bg-yellow-400/90 text-black px-1.5 py-0.5 rounded font-semibold">80% in four weeks</span>. It works seamlessly alongside our core engineers without requiring hand-holding.
        </>
      ),
      rawQuote: "Integrating Codeward cut our technical debt backlog by 80% in four weeks. It works seamlessly alongside our core engineers without requiring hand-holding."
    }
  ];

  const currentActive = testimonials[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, testimonials.length]);

  return (
    <section 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-[#05060a] py-16 sm:py-20 px-4 sm:px-8 md:px-16 lg:px-20 relative overflow-hidden"
    >
      <div className="max-w-[1500px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              What developers are saying
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white/50 tracking-wider">
              <span className="text-purple-400">{String(activeIndex + 1).padStart(2, '0')}</span> / {String(testimonials.length).padStart(2, '0')}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handlePrev} 
                aria-label="Previous testimonial" 
                className="h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 hover:border-purple-400/60 active:scale-95 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={handleNext} 
                aria-label="Next testimonial" 
                className="h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 hover:border-purple-400/60 active:scale-95 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Featured Card + Right Small Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Large Featured Card (Left Column) */}
          <div className="lg:col-span-5 flex flex-col">
            <div 
              key={currentActive.id}
              className="relative w-full h-full min-h-[480px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-white/15 p-7 sm:p-9 flex flex-col justify-between shadow-2xl transition-all duration-500 group"
            >
              {/* Plain Background Image at 100% width */}
              <img 
                src={currentActive.bgImage} 
                alt={currentActive.company}
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

              {/* Top Section: Category & Lowered Metric */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                    {currentActive.category}
                  </span>
                  <span className="text-xs text-white/50 font-semibold uppercase tracking-widest">
                    Featured
                  </span>
                </div>

                {/* Lowered Metric Block */}
                <div className="pt-2 flex items-baseline gap-3">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {currentActive.metric}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-emerald-400">
                    {currentActive.metricLabel}
                  </div>
                </div>
              </div>

              {/* Middle Section: Centered Quote with Increased Height/Size */}
              <div className="relative z-10 my-auto py-4 flex flex-col justify-center">
                <p className="text-lg sm:text-xl lg:text-2xl text-white/95 font-medium leading-relaxed sm:leading-relaxed tracking-tight drop-shadow-md">
                  "{currentActive.text}"
                </p>
              </div>

              {/* Bottom Author Section */}
              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img 
                    src={currentActive.avatar} 
                    alt={currentActive.author} 
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full border-2 border-purple-400/80 object-cover shadow-lg shrink-0" 
                  />
                  <div>
                    <div className="text-white font-bold text-base sm:text-lg leading-snug">
                      {currentActive.author}
                    </div>
                    <div className="text-white/70 text-xs sm:text-sm font-medium">
                      {currentActive.role}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-3 py-1.5 rounded-full">
                  <span>Active</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Small Cards Grid (Right Column: 4 cols x 2 rows = 8 cards) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
            {testimonials.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative h-[242px] rounded-2xl overflow-hidden p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 group ${
                    isActive 
                      ? 'ring-2 ring-purple-500 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.35)] scale-[1.02]' 
                      : 'border border-white/15 hover:border-white/40 hover:scale-[1.03] hover:shadow-lg'
                  }`}
                >
                  {/* Background Image at 100% width */}
                  <img 
                    src={item.bgImage} 
                    alt={item.company}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  <div className={`absolute inset-0 transition-colors duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-t from-black/70 via-black/40 to-purple-950/20' 
                      : 'bg-gradient-to-t from-black/60 via-black/30 to-transparent'
                  }`} />

                  {/* Card Content */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-bold tracking-wider ${isActive ? 'text-purple-300' : 'text-white/90'}`}>
                      {item.company}
                    </span>
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    )}
                  </div>

                  <div className="relative z-10">
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                      {item.metric}
                    </div>
                    <div className="text-xs font-medium text-white/75 line-clamp-2 mt-1 leading-snug">
                      {item.metricLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Bottom Pagination Indicators */}
        <div className="flex items-center justify-center gap-2 mt-8 md:mt-10">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to testimonial ${idx + 1}`}
              className={`transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 h-2.5 bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                  : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/50 rounded-full'
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollStyles, setScrollStyles] = useState({ scale: 0.88, opacity: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateStyles = (rect: DOMRect | DOMRectReadOnly) => {
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      
      const startRevealPos = windowHeight; 
      const fullyRevealedPos = windowHeight * 0.6; 
      
      let progress = (startRevealPos - elementTop) / (startRevealPos - fullyRevealedPos);
      progress = Math.max(0, Math.min(progress, 1));
      
      setScrollStyles({
        scale: 0.88 + (progress * 0.12),
        opacity: progress
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        updateStyles(entries[0].boundingClientRect);
      },
      {
        threshold: Array.from({ length: 101 }, (_, i) => i / 100)
      }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
      updateStyles(containerRef.current.getBoundingClientRect());
    }
    
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={() => setIsPlaying(true)}
      style={{ 
        transform: `scale(${scrollStyles.scale})`,
        opacity: scrollStyles.opacity,
        transition: 'transform 0.1s ease-out, opacity 0.2s ease-out'
      }}
      className="relative aspect-video w-full rounded-2xl md:rounded-3xl bg-[#08090d] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden cursor-pointer group hover:border-white/20 transition-all duration-300"
    >
      {isPlaying ? (
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/pbCGq2uUkyk?autoplay=1"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full pointer-events-auto"
        ></iframe>
      ) : (
        <>
          {/* Background overlay with subtle dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#050609] via-[#090a10] to-[#0d0e17] pointer-events-none" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Left-Aligned Text & Logo Card Overlay (Image 1 positioning + Image 2 content & Codeward Theme) */}
          <div className="absolute left-6 sm:left-10 md:left-14 top-1/2 -translate-y-1/2 flex flex-col items-start text-left z-20 pointer-events-none max-w-[85%] sm:max-w-[55%]">
            {/* Logo & Brand Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1">
              <img 
                src="/codeward-logo.png" 
                alt="Codeward Logo" 
                className="h-7 sm:h-9 md:h-11 w-auto object-contain shrink-0" 
              />
              <span className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white font-['DM_Sans']">
                Code<span className="text-[#8B5CF6]">ward</span>
              </span>
            </div>

            {/* Subtext as in Image 2 */}
            <p className="text-[#a855f7] font-medium text-xs sm:text-sm md:text-base tracking-normal font-['DM_Sans'] pl-0.5">
              AI code review, runtime-tested
            </p>

            {/* Plain divider line (as in Image 1 reference) */}
            <div className="w-32 sm:w-48 md:w-56 h-[1px] bg-white/20 my-2.5 sm:my-3.5" />

            {/* Section label */}
            <p className="text-white/60 text-[10px] sm:text-xs md:text-sm font-medium tracking-wider uppercase font-['DM_Sans'] pl-0.5">
              Code Review Demonstration
            </p>
          </div>

          {/* Centered Play Button (Image 1 style) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-[#8B5CF6] group-hover:border-[#8B5CF6] transition-all duration-300">
              <svg className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CodewardHero() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#05060a]">
      <Helmet>
        <title>Codeward | Autonomous AI Code Quality & Refactoring Platform</title>
        <meta name="description" content="Catch bugs, security vulnerabilities, and code bloat before production. Codeward spins up secure Firecracker sandboxes, tests your code, and pushes fixes automatically." />
        <link rel="canonical" href="https://codeward.cloud/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Codeward",
            "url": "https://codeward.cloud",
            "logo": "https://codeward.cloud/codeward-logo.png",
            "sameAs": [
              "https://github.com/codeward-ai",
              "https://twitter.com/codeward_ai",
              "https://linkedin.com/company/codeward"
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Codeward",
            "operatingSystem": "All",
            "applicationCategory": "DeveloperApplication",
            "offers": {
              "@type": "Offer",
              "price": "29.00",
              "priceCurrency": "USD"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is this just another CodeRabbit?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No. While tools like CodeRabbit focus heavily on PR summaries and superficial code review comments, Codeward is an active participant in your codebase. We don't just leave comments—our autonomous agents actively write the code, generate the fixes, and manage your technical debt directly."
                }
              },
              {
                "@type": "Question",
                "name": "How does Codeward integrate with my existing CI/CD?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Codeward connects directly to your GitHub, GitLab, or Bitbucket repositories. It listens for pull requests and branch updates, running its analysis and patching autonomously without disrupting your existing pipelines."
                }
              },
              {
                "@type": "Question",
                "name": "Is my source code secure?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Absolutely. We run all analysis in isolated, ephemeral sandboxes. Your code is never used to train public models, and our infrastructure is SOC2 compliant, ensuring military-grade security for your intellectual property."
                }
              },
              {
                "@type": "Question",
                "name": "Can Codeward automatically fix the issues it finds?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Our Self-healing Patches feature doesn't just point out errors; it generates ready-to-merge pull requests with verified fixes for vulnerabilities, test failures, and legacy technical debt."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <section className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
        <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
          /* Additional styles can go here */
        `}
      </style>
      {/* Particle background */}
      <div className="absolute inset-0">
        <ParticleField />
        {/* subtle vignette to lift the headline */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(0,0,0,0.85)_0%,_rgba(0,0,0,0.4)_40%,_transparent_70%)]" />
      </div>

<LandingHeader />

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-96px)] items-center px-8 md:px-14">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            <TypingText />
          </h1>

          <p className="mt-6 max-w-xl text-base text-white/60 md:text-lg">
            Codeward is an autonomous AI code review platform for engineering teams that runs specialized review agents automatically on every pull request.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            {session?.user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-full bg-[#8B5CF6] px-10 py-4 text-sm font-semibold text-white transition-all hover:bg-green-500 shadow-lg hover:scale-105 active:scale-95 duration-300 flex items-center gap-2"
              >
                Back to app &rarr;
              </button>
            ) : (
              <button
                onClick={() => navigate('/signup')}
                className="rounded-full bg-white px-9 py-4 text-sm font-semibold text-black transition-all hover:bg-white/90 shadow-lg shadow-white/10 hover:scale-105 active:scale-95 duration-300 flex items-center gap-2.5 cursor-pointer"
              >
                <FlashIcon className="w-5 h-5 text-[#8B5CF6]" />
                <span>Start your 7 days trial</span>
                <ArrowRight01Icon className="w-4 h-4 text-black/70" />
              </button>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-8 text-sm font-medium text-white/80">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>No credit card</span>
            </div>
            <div className="flex items-center">
              <svg className="h-6 w-6 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free 50 runs/month</span>
            </div>
            <div className="flex items-center">
              <svg className="h-6 w-6 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Works with any stack.</span>
            </div>
          </div>
        </div>


      </section>
      </section>

      {/* Video Demo Section */}
      <section className="relative bg-[#05060a] py-16 md:py-24 px-4 sm:px-8 md:px-14 lg:px-16 overflow-hidden perspective-[1000px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.1)_0%,_transparent_60%)] mix-blend-screen pointer-events-none" />
        <div className="mx-auto max-w-4xl lg:max-w-5xl relative z-10">
          <VideoPlayer />
        </div>
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Social Proof / Trusted By Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="bg-[#05060a] pt-12 pb-24 px-8 md:px-14">
        <div className="mx-auto max-w-[95%] xl:max-w-[1500px]">
          <h2 className="text-center text-2xl md:text-3xl font-bold text-white mb-16 leading-tight">
            Loved and endorsed by developers & teams from
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            
            {/* AI */}
            <fieldset className="border border-white/10 rounded-xl px-4 pb-5 pt-3 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-2 mx-auto">
                <span className="relative inline-block px-2 py-0.5">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-12 rounded-sm rotate-1" />
                  <span className="relative text-[10px] font-bold text-black uppercase tracking-widest drop-shadow-md">AI</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-3">
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=openai.com&sz=128" alt="OpenAI" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">OpenAI</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=anthropic.com&sz=128" alt="Anthropic" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Anthropic</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=huggingface.co&sz=128" alt="HuggingFace" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">HuggingFace</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=128" alt="Mistral AI" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Mistral AI</span>
                </div>
              </div>
            </fieldset>

            {/* Enterprise */}
            <fieldset className="border border-white/10 rounded-xl px-4 pb-5 pt-3 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-2 mx-auto">
                <span className="relative inline-block px-2 py-0.5">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-12 rounded-sm -rotate-1" />
                  <span className="relative text-[10px] font-bold text-black uppercase tracking-widest drop-shadow-md">Enterprise</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-3">
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=microsoft.com&sz=128" alt="Microsoft" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Microsoft</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=google.com&sz=128" alt="Google" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Google</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=paypal.com&sz=128" alt="PayPal" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">PayPal</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=vercel.com&sz=128" alt="Vercel" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Vercel</span>
                </div>
              </div>
            </fieldset>

            {/* IoT/Infrastructure */}
            <fieldset className="border border-white/10 rounded-xl px-4 pb-5 pt-3 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-2 mx-auto">
                <span className="relative inline-block px-2 py-0.5">
                  <span className="absolute inset-0 bg-[#00F700] transform skew-x-12 rounded-sm rotate-2" />
                  <span className="relative text-[10px] font-bold text-black uppercase tracking-widest drop-shadow-md">IoT/Infrastructure</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-3">
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=128" alt="AWS" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">AWS</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=cloudflare.com&sz=128" alt="Cloudflare" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Cloudflare</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=safaricom.co.ke&sz=128" alt="Safaricom" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Safaricom</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=docker.com&sz=128" alt="Docker" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Docker</span>
                </div>
              </div>
            </fieldset>

            {/* Finance */}
            <fieldset className="border border-white/10 rounded-xl px-4 pb-5 pt-3 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-2 mx-auto">
                <span className="relative inline-block px-2 py-0.5">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-6 rounded-sm -rotate-2" />
                  <span className="relative text-[10px] font-bold text-black uppercase tracking-widest drop-shadow-md">Finance</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-3">
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=stripe.com&sz=128" alt="Stripe" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=plaid.com&sz=128" alt="Plaid" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Plaid</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=flutterwave.com&sz=128" alt="Flutterwave" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Flutterwave</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src="https://www.google.com/s2/favicons?domain=paystack.com&sz=128" alt="Paystack" className="h-5 w-5 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-sm font-semibold tracking-wide truncate">Paystack</span>
                </div>
              </div>
            </fieldset>

          </div>
        </div>
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Mission Statement Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section 
        className="relative py-20 md:py-24 px-8 md:px-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://i.ibb.co/WvSNQbHd/enterprise-bg.avif')" }}
      >
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
        <div className="mx-auto max-w-6xl relative z-10 flex flex-col items-start">
          <p className="text-3xl md:text-5xl font-semibold leading-[1.25] tracking-tight text-white drop-shadow-lg mb-10">
            <MissionTypingText />
          </p>
          <FadeInSection delay={800} direction="up">
            <button 
              onClick={() => navigate('/signup')} 
              className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-gray-100 hover:scale-105 active:scale-95 duration-300 cursor-pointer"
            >
              <span>See it in action</span>
              <span className="text-base font-black transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">↖</span>
              <div className="flex items-center -space-x-2 opacity-0 max-w-0 scale-95 overflow-hidden group-hover:opacity-100 group-hover:max-w-[70px] group-hover:scale-100 transition-all duration-300 ease-out ml-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black ring-2 ring-white">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-white shadow-sm">
                  <svg className="h-4 w-4 text-[#FC6D26]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.137-.423-.733-.423-.868 0L1.387 9.452.045 13.587c-.173.535.034 1.127.487 1.458l11.468 8.337 11.468-8.337c.453-.331.66-.923.487-1.458z" />
                  </svg>
                </div>
              </div>
            </button>
          </FadeInSection>
        </div>
      </section>


      {/* ── Specialized AI Agents Section ── */}
      <section className="relative overflow-hidden bg-[#05060a] py-16 md:py-20 px-3.5 sm:px-8 md:px-20 border-t border-white/5">
        {/* Dark Cyber Aesthetic Image Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src="https://i.pinimg.com/736x/c5/f3/31/c5f331770f86cd888bd2277d78fc0d90.jpg"
            alt="Agents Section Background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05060a] via-transparent to-[#05060a]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl flex flex-col space-y-24 md:space-y-32">
          
          {/* Agent 1: Security Shield */}
          <div className="flex flex-col md:flex-row items-center gap-12 sm:gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-6 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                Ironclad protection before you deploy
              </h2>
              <p className="text-white font-medium text-base md:text-lg leading-relaxed mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                Shields your codebase from vulnerabilities and hardcoded secrets. It runs deep static analysis and provisions isolated ephemeral sandboxes to verify patches before any code reaches production.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-bold shadow-lg transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95 cursor-pointer">
                Secure your repo →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-end">
              <LiveSecurityShieldWidget />
            </FadeInSection>
          </div>

          {/* Agent 2: Technical Debt */}
          <div className="flex flex-col md:flex-row items-center gap-12 sm:gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-6 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                Crush legacy technical debt
              </h2>
              <p className="text-white font-medium text-base md:text-lg leading-relaxed mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                Identifies, tracks, and autonomously eliminates technical debt. It highlights overly complex, legacy modules and writes modern, optimized refactors without breaking the underlying architecture.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-bold shadow-lg transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95 cursor-pointer">
                Eliminate tech debt →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-end">
              <LiveTechDebtWidget />
            </FadeInSection>
          </div>

          {/* Agent 3: Sandbox Test */}
          <div className="flex flex-col md:flex-row items-center gap-12 sm:gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-6 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                Real tests in live sandboxes
              </h2>
              <p className="text-white font-medium text-base md:text-lg leading-relaxed mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                Never merge broken code again. For every PR, the Test Agent spins up an ephemeral environment, executes your entire test suite, and ensures the code handles real-world scenarios flawlessly.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-bold shadow-lg transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95 cursor-pointer">
                Explore testing sandboxes →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-end">
              <LiveSandboxTestWidget />
            </FadeInSection>
          </div>

          {/* Agent 4: Refactor Agent */}
          <div className="flex flex-col md:flex-row items-center gap-12 sm:gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-6 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                Scale your architecture safely
              </h2>
              <p className="text-white font-medium text-base md:text-lg leading-relaxed mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                Restructures entire directories without losing business logic. The AI deeply understands your context, applies new design patterns, and checks its own work through sandboxed test runs.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-bold shadow-lg transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95 cursor-pointer">
                Start refactoring safely →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-end">
              <LiveCodewardCodeReviewWidget />
            </FadeInSection>
          </div>

        </div>
      </section>

      {/* ── Flow / Architecture Section ── */}



      {/* ── Testimonials Section ── */}
      <TestimonialsSection />

      {/* ── Latest Insights / Blogs Section ── */}
      <InteractiveParticleGrid className="bg-[#05060a] py-20 md:py-24 px-4 sm:px-8 md:px-20 border-t border-white/5">
        <FadeInSection>
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6 md:gap-0">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Latest Insights</h2>
              <button onClick={() => navigate('/blogs')} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer">
                Read all articles &rarr;
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {blogs.slice(0, 3).map((post, idx) => (
                <div onClick={() => navigate(`/blogs/${post.slug}`)} key={idx} className="group cursor-pointer flex flex-col">
                  {/* Custom Graphic Card */}
                  <div className={`relative h-[220px] rounded-[1.25rem] overflow-hidden bg-gradient-to-br ${post.gradient} border border-white/10 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300`}>
                    {/* Background Glowing Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-black/10" />
                    
                    {/* Inner Content overlaying the gradient box */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2">
                          <img src="/codeward-logo.png" alt="Codeward" className="h-4 w-4 object-contain drop-shadow-md" />
                          <span className="text-sm font-bold tracking-tight text-white drop-shadow-md">Code<span className="text-purple-400">ward</span></span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase mb-2 block drop-shadow-md">
                          {post.overlayText}
                        </span>
                        <h4 className="text-lg font-bold text-white leading-tight drop-shadow-md">
                          {post.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                  
                  {/* Article Meta text below the card */}
                  <div className="mt-5 flex flex-col gap-2 justify-between flex-1">
                    <div>
                      <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                        {post.category}
                      </span>
                      <h3 className="text-lg font-bold text-white/90 leading-snug group-hover:text-purple-400 transition-colors line-clamp-2 mt-1">
                        {post.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="h-6 w-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.authorAvatar}`} alt={post.author} className="h-full w-full object-cover" />
                      </div>
                      <span className="text-sm font-medium text-white/60">{post.author}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-sm text-white/40">{post.readTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </InteractiveParticleGrid>

      {/* ── FAQ Section ── */}
      <SecuritySection />
      <FAQSection />

      {/* ── CTA Section ── */}
      <section className="bg-[#05060a] py-16 md:py-24 px-4 sm:px-8 md:px-20 relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] max-w-[100vw] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.12)_0%,_transparent_60%)] pointer-events-none" />
        
        <FadeInSection className="relative z-10 flex flex-col items-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-6 md:mb-8 drop-shadow-lg">
            Still Curious?
          </h2>
          <p className="text-white/60 text-base md:text-lg font-medium mb-8 sm:mb-12 leading-relaxed max-w-xl">
            The fastest way to understand Codeward is to watch it audit your own codebase. Connect it and see what it finds.
          </p>
          <button 
            className="flex items-center gap-2.5 sm:gap-3 px-6 sm:px-10 py-3.5 sm:py-4 bg-white hover:bg-white/90 text-black text-base sm:text-lg font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] max-w-full"
          >
            <svg height="22" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="22" data-view-component="true" className="fill-current shrink-0">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            <span className="truncate">Connect your first repo &rarr;</span>
          </button>
        </FadeInSection>
      </section>

      {/* ─── Footer Section ─── */}
<LandingFooter />
    </div>
  );
}

function InteractiveParticleGrid({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePosRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const spacing = 26;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cols = Math.floor(canvas.width / spacing) + 1;
      const rows = Math.floor(canvas.height / spacing) + 1;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dist = Math.hypot(x - mousePosRef.current.x, y - mousePosRef.current.y);
          
          const maxDist = 400; 
          let alpha = 0.05; 
          let radius = 1.2;
          
          if (dist < maxDist) {
            const intensity = 1 - dist / maxDist;
            alpha += intensity * 0.45;
            radius += intensity * 1.5;
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }
      animationFrameId = requestAnimationFrame(drawGrid);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawGrid();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { x: -1000, y: -1000 };
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#8B5CF6]/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </section>
  );
}

