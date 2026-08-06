import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
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
    <section className="bg-[#05060a] py-12 md:py-16 px-8 md:px-20 border-t border-white/5">
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
    <section className="bg-[#05060a] pt-12 md:pt-16 pb-12 md:pb-16 px-8 md:px-20 font-['DM_Sans'] relative overflow-hidden">
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
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Terminal Top Command Bar */}
      <div className="rounded-2xl bg-[#0a0c10] px-5 py-3.5 text-white font-mono text-sm flex items-center justify-between shadow-xl border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">$</span>
          <span className="text-gray-100 font-medium">{typedText}</span>
          <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block ml-0.5" />
        </div>
        <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/5 px-2.5 py-0.5 rounded">bash</span>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-3 my-0.5 flex items-center gap-3">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-gray-600 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-6 w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">codeward-code-review</span>
          <span className="rounded bg-gray-200/80 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold">bot</span>
          <span>reviewed</span>
          <span className="font-bold text-purple-700">PR #142</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-gray-900 space-y-3">
        {/* Comment Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <img
              src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
              alt="Codeward Bot"
              className="h-5 w-5 rounded-full border border-gray-200 shadow-sm shrink-0"
            />
            <span className="font-bold text-gray-900">Code Review by Codeward</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-semibold">🐞 3 Bugs</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-semibold">🛡️ 34 Rules</span>
          </div>
        </div>

        <div>
          {/* Table Header */}
          <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div>REPOSITORY</div>
            <div>STATUS</div>
            <div>ACTION</div>
            <div className="text-right">UPDATED</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>codeward-</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>34 rules passed</span>
              </div>
              <div>
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer">Visit report ↗</span>
              </div>
              <div className="text-right text-gray-400">just now</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>compass</span>
              </div>
              {isPatching ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" />
                  <span>Auto-patching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>1 bug patched</span>
                </div>
              )}
              <div>
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer">View diff ↗</span>
              </div>
              <div className="text-right text-gray-400">just now</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>inua360</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>0 vulnerabilities</span>
              </div>
              <div>
                <span className="text-purple-600 underline font-medium hover:text-purple-800 cursor-pointer">Visit report ↗</span>
              </div>
              <div className="text-right text-gray-400">1m ago</div>
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

  const handleShieldSecret = () => {
    setIsShielding(true);
    setTimeout(() => {
      setIsShielding(false);
      setIsShielded(true);
    }, 2000);
  };

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Command Bar (Live Run Feed / Agent Canvas Run #247) */}
      <div className="rounded-2xl bg-[#0a0c10] px-5 py-3.5 text-white font-sans text-sm flex items-center justify-between shadow-xl border border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-gray-100 text-xs">Live run feed</span>
          <span className="text-[10px] font-bold text-purple-300 bg-purple-900/60 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
            Agent Canvas Run #247
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400 font-bold">15/15 Active</span>
          <span className="text-gray-500">•</span>
          <span className={isShielded ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
            {isShielded ? "0 Critical" : "1 Critical"}
          </span>
        </div>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-3 my-0.5 flex items-center gap-3">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-gray-600 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-6 w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">Security Agent</span>
          <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold">haiku-4-5</span>
          <span>ran 18 checks</span>
          <span className="font-bold text-rose-600">{isShielded ? "100/100" : "45/100"}</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-gray-900 space-y-3">
        {/* Banner Alert */}
        {!isShielded ? (
          <div className="rounded-xl bg-rose-600 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>SECURITY ALERT: Hardcoded Stripe Key Line 14</span>
            </div>
            <span className="text-[10px] opacity-90 font-mono">1 Critical</span>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">🛡️</span>
              <span>SECRET SHIELDED: Hardcoded Key Removed & Re-encrypted</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-100">Score: 100/100</span>
          </div>
        )}

        <div>
          {/* Table Header */}
          <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div>AGENT</div>
            <div>STATUS</div>
            <div>FINDINGS</div>
            <div className="text-right">LATENCY</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span className="text-rose-500">🛡️</span>
                <span>Security</span>
              </div>
              {isShielding ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" />
                  <span>Shielding secret...</span>
                </div>
              ) : isShielded ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Key Secured</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>1 Critical key</span>
                </div>
              )}
              <div className="text-gray-600 font-medium">Line 14 API key</div>
              <div className="text-right text-gray-400 font-mono">180ms</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span className="text-emerald-500">🗑️</span>
                <span>Bloat</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Score: 88</span>
              </div>
              <div className="text-emerald-600 font-medium">-38 dead lines</div>
              <div className="text-right text-gray-400 font-mono">95ms</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span className="text-purple-500">⚡</span>
                <span>Orchestrator</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <span className={`h-2 w-2 rounded-full ${isShielded ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className={isShielded ? "text-emerald-600" : "text-rose-600"}>
                  {isShielded ? "Gate: ALLOW" : "Gate: BLOCK"}
                </span>
              </div>
              <div className="text-gray-600 font-medium">15 agents run</div>
              <div className="text-right text-gray-400 font-mono">4m 18s</div>
            </div>
          </div>

          {/* Action Button Footer */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            {!isShielded ? (
              <button
                onClick={handleShieldSecret}
                disabled={isShielding}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isShielding ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Shielding & Revoking Key...</span>
                  </>
                ) : (
                  <>
                    <span>Shield Secret & Re-scan</span>
                    <span>🛡️</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <span>✓ Secret Revoked & Repository Shielded</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveTechDebtWidget() {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const handleApplyFixes = () => {
    setIsFixing(true);
    setTimeout(() => {
      setIsFixing(false);
      setIsFixed(true);
    }, 2000);
  };

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. PR Command Header (Borrowed from Screenshot 1 & 2) */}
      <div className="rounded-2xl bg-[#0a0c10] px-5 py-3.5 text-white font-sans text-sm flex items-center justify-between shadow-xl border border-white/10">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-purple-400 font-bold">feat(ai):</span>
          <span className="text-gray-200 truncate max-w-[280px]">integrate new streaming endpoints</span>
          <span className="text-gray-500 font-bold">#241</span>
        </div>
        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-mono">
          {isFixed ? "PASSED" : "BLOCKED"}
        </span>
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-3 my-0.5 flex items-center gap-3">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-gray-600 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-6 w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">Codeward App</span>
          <span className="rounded bg-gray-200/80 text-gray-700 px-1.5 py-0.5 text-[10px] font-semibold">bot</span>
          <span>analyzed</span>
          <span className="font-bold text-purple-700">PR #241</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-gray-900 space-y-3">
        {/* Banner Alert */}
        {!isFixed ? (
          <div className="rounded-xl bg-rose-600 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>MERGE BLOCKED: Critical Debt Threshold Exceeded</span>
            </div>
            <span className="text-[10px] opacity-90 font-mono">-45 Points</span>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">✓</span>
              <span>DEBT CLEARED: All Checks Passed & Auto-Refactored</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-100">+100 Points</span>
          </div>
        )}

        <div>
          {/* Table Header */}
          <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div>CHECK</div>
            <div>SCORE</div>
            <div>ANALYSIS</div>
            <div className="text-right">WEIGHT</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold">Security</div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>100/100 (Pass)</span>
              </div>
              <div className="text-gray-600 font-medium">0 findings</div>
              <div className="text-right text-gray-400 font-mono">x2.0</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold">Architecture</div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>92/100 (Pass)</span>
              </div>
              <div className="text-gray-600 font-medium">Modular</div>
              <div className="text-right text-gray-400 font-mono">x1.0</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold">Broken Code</div>
              {isFixing ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" />
                  <span>Auto-fixing...</span>
                </div>
              ) : isFixed ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>100/100 (Fixed)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>0/100 (Fail)</span>
                </div>
              )}
              <div className="text-purple-600 font-medium cursor-pointer" onClick={handleApplyFixes}>
                {isFixed ? "Auto-refactored" : "Race condition"}
              </div>
              <div className="text-right text-gray-400 font-mono">x1.8</div>
            </div>
          </div>

          {/* Action Button Footer */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            {!isFixed ? (
              <button
                onClick={handleApplyFixes}
                disabled={isFixing}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isFixing ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Applying Auto-Fixes...</span>
                  </>
                ) : (
                  <>
                    <span>Apply Auto-Fixes & Re-run</span>
                    <span>⚡</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <span>✓ Auto-Fixes Applied Successfully</span>
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
    const timer1 = setTimeout(() => {
      setConnectState('connecting');
    }, 1000);

    const timer2 = setTimeout(() => {
      setConnectState('connected');
    }, 2800);

    const timer3 = setTimeout(() => {
      setIsRunning(false);
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-white/15 bg-[#f8f9fc] p-5 font-['DM_Sans'] text-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.01]">
      {/* 1. Repository Connection Top Bar (Borrowed from Screenshot) */}
      <div className="rounded-2xl bg-[#0a0c10] px-5 py-3.5 text-white font-sans text-sm flex items-center justify-between shadow-xl border border-white/10">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span className="font-mono text-xs text-gray-300">kelvinmaina01 /</span>
          <span className="font-mono text-xs font-bold text-white">CODEWARD-OS</span>
          <span className="text-[10px] text-gray-500 bg-white/10 px-1.5 py-0.5 rounded font-mono">Private</span>
        </div>

        {/* Animated Connection Button */}
        {connectState === 'idle' && (
          <button className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1">
            <span>Connect</span>
            <span>→</span>
          </button>
        )}
        {connectState === 'connecting' && (
          <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-spin" />
            <span>Connecting...</span>
          </div>
        )}
        {connectState === 'connected' && (
          <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Connected</span>
          </div>
        )}
      </div>

      {/* 2. Connecting Thread Line & Bot Status */}
      <div className="relative pl-6 py-3 my-0.5 flex items-center gap-3">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-gray-600 bg-[#f8f9fc] px-1">
          <img
            src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4"
            alt="Codeward Bot"
            className="h-6 w-6 rounded-full border border-gray-200 shadow-sm shrink-0"
          />
          <span className="font-bold text-gray-900">codeward-test-agent</span>
          <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">isolated</span>
          <span>executing</span>
          <span className="font-bold text-purple-700">run #53</span>
          <span className="text-gray-400">just now</span>
        </div>
      </div>

      {/* 3. Compact Review Status Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-gray-900 space-y-3">
        {/* Comment Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-sm">📦</span>
            <span className="font-bold text-gray-900">kelvinmaina01 / x-algorithm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">⚡ Score: 100/100</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">🧹 Ephemeral</span>
          </div>
        </div>

        <div>
          {/* Table Header */}
          <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
            <div>TEST TOOL</div>
            <div>STATUS</div>
            <div>RESULT</div>
            <div className="text-right">LATENCY</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 text-xs font-medium pt-1">
            {/* Row 1 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span>📦</span>
                <span>sandbox_init</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Isolated container</span>
              </div>
              <div className="text-gray-600 font-medium">Cloned SHA</div>
              <div className="text-right text-gray-400 font-mono">100ms</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span>⚡</span>
                <span>fallow_health</span>
              </div>
              {isRunning ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-spin" />
                  <span>Evaluating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Score 100/100</span>
                </div>
              )}
              <div className="text-emerald-600 font-medium">No dead code</div>
              <div className="text-right text-gray-400 font-mono">451ms</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 py-2 items-center">
              <div className="font-mono text-gray-900 font-bold flex items-center gap-1.5">
                <span>⚡</span>
                <span>bundle_size</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Zero bloat</span>
              </div>
              <div className="text-emerald-600 font-medium">Passed</div>
              <div className="text-right text-gray-400 font-mono">60ms</div>
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
  const [text, setText] = useState(fullText); // Start with fullText to match server-side render
  
  useEffect(() => {
    setText("");
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
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
  const [text, setText] = useState(fullText); // Match server-side render
  const totalLength = fullText.length;

  useEffect(() => {
    setText("");
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setText(fullText.slice(0, i));
        if (i >= totalLength) clearInterval(interval);
      }, 55);
      return () => clearInterval(interval);
    }, 400);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      id: 1,
      bgColor: "bg-[#e0f7fa]", // Light cyan
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Warning.png",
      text: (
        <>
          Most AI tools just autocomplete mistakes faster. <span className="bg-yellow-300 text-black px-1 rounded-sm">Codeward</span> is the first platform we've used that actually understands our entire architecture, proactively finding and fixing deep logic flaws before they ever reach our main branch.
        </>
      ),
      author: "Durgesh Sharma",
      role: "Technology Leader, Medpace",
      avatar: "https://media.licdn.com/dms/image/v2/D4D35AQEUzFOssgYIdw/profile-framedphoto-shrink_800_800/B4DZ..ehuLIwAY-/0/1785607101828?e=1786640400&v=beta&t=pkS8EQYj6CMRo9mvnf-q-GB2t9jyMkKHIOhD9vF6T98"
    },
    {
      id: 2,
      bgColor: "bg-[#fce4ec]", // Light pink
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Check%20Mark%20Button.png",
      text: (
        <>
          It's not just another chatbot that you have to micromanage. Codeward acts like a true senior engineer—<span className="bg-yellow-300 text-black px-1 rounded-sm">autonomously refactoring</span> legacy code and writing comprehensive test suites without needing constant supervision.
        </>
      ),
      author: "Brian Nyakundi",
      role: "Founder @ Baywoods | Full-Stack Developer",
      avatar: "https://media.licdn.com/dms/image/v2/D5635AQF1mFVZpCHP3w/profile-framedphoto-shrink_800_800/profile-framedphoto-shrink_800_800/0/1738869935517?e=1786640400&v=beta&t=qxB5EDlmp4MFHQbyZCRDjKwnUzz53ydSSvjFNOvLvM4"
    },
    {
      id: 3,
      bgColor: "bg-[#e8eaf6]", // Light blue
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png",
      text: (
        <>
          Our technical debt was becoming unmanageable. Within weeks of deploying <span className="bg-yellow-300 text-black px-1 rounded-sm">Codeward</span>, it systematically eliminated thousands of lines of legacy code and upgraded our core modules, all while passing our strictest CI/CD pipelines.
        </>
      ),
      author: "Renee (Wanjiru) Njuwa",
      role: "Web Security & Blue Team Specialist, Riara University",
      avatar: "https://media.licdn.com/dms/image/v2/D4E03AQGsAiWh07j-sw/profile-displayphoto-crop_800_800/B4EZxwGisdIsAI-/0/1771407317853?e=1787788800&v=beta&t=KI0yPtkcQXAc4bi5Yfs54WAewdVnpM-nOkvihK4pg-Y"
    },
    {
      id: 4,
      bgColor: "bg-[#a9b0b7]", // Grey
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png",
      text: (
        <>
          Codeward has completely transformed how our engineering teams scale. It doesn't just leave vague PR comments—it <span className="bg-yellow-300 text-black px-1 rounded-sm">spins up sandboxes</span>, runs failing tests, and commits self-healing patches instantly.
        </>
      ),
      author: "Cynthia Saraiva",
      role: "Senior Infrastructure Engineer @ Mistral AI",
      avatar: "https://media.licdn.com/dms/image/v2/D4D35AQGAqffvt9ifig/profile-framedphoto-shrink_800_800/B4DZ8420RJI4AY-/0/1783365322734?e=1786640400&v=beta&t=gQxjhRqbzMZ9Mn9cWFnJMKFQPs1W196UfIUoQI4fsS4"
    },
    {
      id: 5,
      bgColor: "bg-[#f1f8e9]", // Light green
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Cross%20Mark.png",
      text: (
        <>
          Maintaining consistent code standards across fast-growing teams used to take weeks. <span className="bg-yellow-300 text-black px-1 rounded-sm">Codeward</span> enforces architectural rules automatically across all repositories so developers focus purely on building.
        </>
      ),
      author: "Anna Wellerdiek",
      role: "Staff Systems Architect @ Zavu.dev",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
    }
  ];

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -650, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 650, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    let direction = 1;
    let isHovered = false;
    let animationFrameId: number;

    const handleMouseEnter = () => { isHovered = true; };
    const handleMouseLeave = () => { isHovered = false; };
     const step = () => {
      if (!isHovered) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (direction === 1 && el.scrollLeft >= maxScroll - 5) {
          direction = -1;
        } else if (direction === -1 && el.scrollLeft <= 5) {
          direction = 1;
        }
        el.scrollLeft += 2.2 * direction;
      }
      animationFrameId = requestAnimationFrame(step);
    };
    
    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section className="bg-[#05060a] py-16 pl-8 md:pl-20 border-t border-white/5 overflow-hidden">
      <div className="w-full">
        <div className="max-w-[1500px] mr-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 gap-6 md:gap-0 pr-8 md:pr-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">What developers are saying</h2>
            <div className="flex gap-4">
              <button onClick={scrollLeft} aria-label="Scroll left" className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={scrollRight} aria-label="Scroll right" className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto pb-12 pr-[20vw] hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
          >
            {testimonials.map((t) => (
              <div 
                key={t.id} 
                className={`${t.bgColor} shrink-0 w-[85vw] md:w-[480px] h-[380px] rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl transition-transform hover:scale-[1.02]`}
              >
                <div>
                  <p className="text-xl md:text-2xl text-black font-medium leading-[1.3] mb-8 tracking-tight">
                    {t.text}
                  </p>
                  <div className="flex items-center gap-4">
                    <img src={t.avatar} alt={t.author} className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-md" />
                    <div>
                      <div className="text-black font-bold text-lg">{t.author}</div>
                      <div className="text-black/60 text-sm font-medium">{t.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollStyles, setScrollStyles] = useState({ scale: 0.85, opacity: 0 });
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
        scale: 0.85 + (progress * 0.20),
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
      className="relative aspect-video w-full rounded-2xl bg-[#0a0a0f] border-2 border-white/80 shadow-[0_0_120px_rgba(139,92,246,0.3)] ring-4 ring-white/10 overflow-hidden cursor-none group hover:shadow-[0_0_160px_rgba(139,92,246,0.5)] hover:border-white"
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
          <div className="absolute inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center pointer-events-none">
             <div className="flex items-center opacity-40">
               <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward Logo" className="h-10 w-auto object-contain -mr-3 grayscale" />
               <span className="text-4xl font-bold tracking-tight text-white">
                 Code<span className="text-purple-600">ward</span>
               </span>
             </div>
             <p className="text-white/40 mt-4 text-sm font-medium tracking-wider uppercase">Code Review Demonstration</p>
          </div>
          <div 
            className="absolute z-50 flex items-center gap-2 rounded-full bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white shadow-md pointer-events-none transition-transform duration-75 ease-out opacity-0 group-hover:opacity-100"
            style={{ 
              left: mousePos.x, 
              top: mousePos.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play intro
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
            "logo": "https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png",
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
              <>
                <button
                  onClick={() => navigate('/signup')}
                  className="rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-all hover:bg-white/90 shadow-lg shadow-white/10 hover:scale-105 active:scale-95 duration-300 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start your 14 days trial &rarr;
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="group rounded-full bg-[#8B5CF6] px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-green-500 hover:scale-105 active:scale-95 duration-300 flex items-center gap-4"
                >
                  <div className="flex -space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-[#8B5CF6] group-hover:ring-green-500 transition-colors">
                      <svg className="h-5 w-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-[#8B5CF6] group-hover:ring-green-500 transition-colors">
                      <svg className="h-5 w-5 text-[#FC6D26]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.137-.423-.733-.423-.868 0L1.387 9.452.045 13.587c-.173.535.034 1.127.487 1.458l11.468 8.337 11.468-8.337c.453-.331.66-.923.487-1.458z" />
                      </svg>
                    </div>
                  </div>
                  Login
                </button>
              </>
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
      <section className="relative bg-[#05060a] py-20 md:py-24 px-8 md:px-14 overflow-hidden perspective-[1000px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.15)_0%,_transparent_50%)] mix-blend-screen pointer-events-none" />
        <div className="mx-auto max-w-[700px] relative z-10">
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
              className="group inline-flex items-center gap-4 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-gray-100 hover:scale-105 active:scale-95 duration-300"
            >
              <span>See it in action &rarr;</span>
              <div className="flex -space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black ring-2 ring-white">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 ring-white">
                  <svg className="h-5 w-5 text-[#FC6D26]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.137-.423-.733-.423-.868 0L1.387 9.452.045 13.587c-.173.535.034 1.127.487 1.458l11.468 8.337 11.468-8.337c.453-.331.66-.923.487-1.458z" />
                  </svg>
                </div>
              </div>
            </button>
          </FadeInSection>
        </div>
      </section>


      {/* ── Specialized AI Agents Section ── */}
      <section className="relative overflow-hidden bg-[#05060a] py-16 md:py-20 px-8 md:px-20 border-t border-white/5">
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
          <div className="flex flex-col md:flex-row items-center gap-16">
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
          <div className="flex flex-col md:flex-row items-center gap-16">
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
          <div className="flex flex-col md:flex-row items-center gap-16">
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
          <div className="flex flex-col md:flex-row items-center gap-16">
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Flow / Architecture Section Ã¢â€â‚¬Ã¢â€â‚¬ */}



      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Testimonials Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <TestimonialsSection />

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Latest Insights / Blogs Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <InteractiveParticleGrid className="bg-[#05060a] py-20 md:py-24 px-8 md:px-20 border-t border-white/5">
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
                          <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" className="h-4 w-4 object-contain drop-shadow-md" />
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ FAQ Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <SecuritySection />
      <FAQSection />

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ CTA Section Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="bg-[#05060a] py-20 md:py-24 px-8 md:px-20 relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] max-w-[100vw] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.12)_0%,_transparent_60%)] pointer-events-none" />
        
        <FadeInSection className="relative z-10 flex flex-col items-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-8 drop-shadow-lg">
            Still Curious?
          </h2>
          <p className="text-white/60 text-base md:text-lg font-medium mb-12 leading-relaxed max-w-xl">
            The fastest way to understand Codeward is to watch it audit your own codebase. Connect it and see what it finds.
          </p>
          <button 
            className="flex items-center gap-3 px-10 py-4 bg-white hover:bg-white/90 text-black text-lg font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <svg height="24" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="24" data-view-component="true" className="fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Connect your first repo &rarr;
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

