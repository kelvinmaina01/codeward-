import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArchitectureFlow } from './ArchitectureFlow';

// ============================================================
// Codeward Hero Section — Self-contained single-file component
// Requires: React, Tailwind CSS
// ============================================================

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button 
        className="w-full py-6 flex items-center justify-between text-left focus:outline-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-lg md:text-xl font-bold text-white group-hover:text-[#8B5CF6] transition-colors pr-8">{question}</span>
        <span className={`text-white/50 text-2xl transition-transform duration-300 ${isOpen ? 'rotate-45 text-white' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-white/60 text-base md:text-lg leading-relaxed">{answer}</p>
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
          observer.unobserve(entry.target);
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
      answer: "No. While tools like CodeRabbit focus heavily on PR summaries and superficial code review comments, Codeward is an active participant in your codebase. We don't just leave comments—our autonomous agents actively write the code, generate the fixes, and manage your technical debt directly."
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
      answer: "Codeward deploys specialized sub-agents—like an Architecture Agent, a Testing Agent, and a Security Agent—that collaborate. They review the codebase simultaneously, discuss optimal solutions in the background, and then execute complex, multi-file refactors that a single model couldn't handle."
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
    <section className="bg-[#05060a] py-32 px-8 md:px-20 border-t border-white/5">
      <FadeInSection>
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-16 text-center">Frequently Asked Questions</h2>
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
    render();

    return () => {
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
  const [text, setText] = useState("");
  const fullText = "Ship AI code\nwithout the technical\ndebt";
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 120);
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
  const [text, setText] = useState("");
  const normalText = "Codeward is your autonomous\ncode quality platform, without\n";
  const highlightedText = "the technical debt";
  const totalLength = normalText.length + highlightedText.length;

  useEffect(() => {
    let i = 0;
    // Start after a short delay so it triggers when user scrolls down
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setText((normalText + highlightedText).slice(0, i));
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
      author: "Jane Doe",
      role: "Senior Engineer, TechCorp",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      id: 2,
      bgColor: "bg-[#fce4ec]", // Light pink
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Check%20Mark%20Button.png",
      text: (
        <>
          It's not just another chatbot that you have to micromanage. Codeward acts like a true senior engineer—<span className="bg-yellow-300 text-black px-1 rounded-sm">autonomously refactoring</span> legacy code and writing comprehensive test suites without needing my constant supervision.
        </>
      ),
      author: "John Smith",
      role: "CTO, StartupInc",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
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
      author: "Alice Johnson",
      role: "Lead Developer, MegaCorp",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg"
    },
    {
      id: 4,
      bgColor: "bg-[#a9b0b7]", // Grey from the image
      icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png",
      text: (
        <>
          The Review Agent is a total game-changer. It doesn't just leave vague comments on PRs—it <span className="bg-yellow-300 text-black px-1 rounded-sm">spins up sandboxes</span>, runs the failing tests, and commits self-healing patches instantly. Our velocity has literally doubled.
        </>
      ),
      author: "David Lee",
      role: "Engineering Manager, Innovate LLC",
      avatar: "https://randomuser.me/api/portraits/men/46.jpg"
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
    
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    const step = () => {
      if (!isHovered) {
        if (direction === 1 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
          direction = -1;
        } else if (direction === -1 && el.scrollLeft <= 2) {
          direction = 1;
        }
        el.scrollLeft += 1.5 * direction;
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
    <section className="bg-[#05060a] py-24 pl-8 md:pl-20 border-t border-white/5">
      <div className="w-full">
        <div className="max-w-[1500px] mr-auto">
          <div className="flex items-center justify-between mb-12 pr-8 md:pr-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">What developers are saying</h2>
            <div className="flex gap-4">
              <button onClick={scrollLeft} className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={scrollRight} className="h-14 w-14 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto snap-x snap-mandatory pb-12 pr-[20vw] hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((t) => (
              <div 
                key={t.id} 
                className={`${t.bgColor} shrink-0 w-[85vw] md:w-[650px] h-[550px] rounded-2xl p-12 flex flex-col justify-end relative shadow-2xl snap-start`}
              >
                <div>
                  <p className="text-3xl md:text-4xl text-black font-medium leading-[1.3] mb-12 tracking-tight">
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
             <div className="flex items-center gap-4 opacity-40">
               <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-16 w-auto object-contain grayscale" />
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
  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#05060a]">
      <section className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
        <style>
        {`
          /* Additional styles can go here */
        `}
      </style>
      {/* Particle background */}
      <div className="absolute inset-0">
        <ParticleField />
        {/* subtle vignette to lift the headline */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(0,0,0,0.85)_0%,_rgba(0,0,0,0.4)_40%,_transparent_70%)]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 md:px-14">
        <div className="flex items-center gap-3">
          <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-16 w-auto object-contain" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-purple-500">ward</span>
          </span>
        </div>
        <nav className="hidden gap-8 text-sm font-medium text-white/80 md:flex items-center">
          {/* Products Mega Menu */}
          <div className="group">
            <button className="hover:text-white transition-colors flex items-center gap-1 py-4">
              Products 
              <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
              <div className="bg-[#f6f5f3] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Platform</h4>
                  <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">AI Code Builder</div>
                      <div className="text-sm text-gray-500 font-medium">Zero-shot application generation.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Automated Reviews</div>
                      <div className="text-sm text-gray-500 font-medium">Self-healing PRs and inline feedback.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Security Sandboxes</div>
                      <div className="text-sm text-gray-500 font-medium">Isolated environments for safe execution.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Tech Debt Manager</div>
                      <div className="text-sm text-gray-500 font-medium">Identify and refactor legacy code.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Architecture Refactoring</div>
                      <div className="text-sm text-gray-500 font-medium">Safely restructure entire directories.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Testing Agent</div>
                      <div className="text-sm text-gray-500 font-medium">Autonomous test suite generation.</div>
                    </a>
                  </div>
                </div>
                <div className="w-[320px]">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Changelog</h4>
                  <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#E2E8F0] to-[#FFFFFF] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02] border border-black/5">
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="w-[110%] h-[120%] bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col p-4 opacity-90 group-hover/card:scale-[1.03] transition-transform duration-500">
                         <div className="h-3 w-16 bg-gray-200 rounded mb-4"></div>
                         <div className="h-2 w-full bg-gray-100 rounded mb-2"></div>
                         <div className="h-2 w-3/4 bg-gray-100 rounded mb-6"></div>
                         <div className="flex gap-3">
                           <div className="w-10 h-10 rounded bg-purple-100"></div>
                           <div className="flex-1 space-y-2">
                             <div className="h-2 w-full bg-gray-50 rounded"></div>
                             <div className="h-2 w-1/2 bg-gray-50 rounded"></div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </a>
                  <div className="mt-4 font-bold text-[15px] text-black">Redesigned sandbox and testing experience</div>
                </div>
              </div>
            </div>
          </div>

          {/* Solutions Mega Menu */}
          <div className="group">
            <button className="hover:text-white transition-colors flex items-center gap-1 py-4">
              Solutions 
              <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
              <div className="bg-[#f6f5f3] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Use Cases</h4>
                  <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">For Startups</div>
                      <div className="text-sm text-gray-500 font-medium">Move fast without breaking things.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">For Enterprise</div>
                      <div className="text-sm text-gray-500 font-medium">Scale your architecture securely.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Open Source</div>
                      <div className="text-sm text-gray-500 font-medium">Automate maintainer workflows.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Agencies</div>
                      <div className="text-sm text-gray-500 font-medium">Deliver client work at lightspeed.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Code Modernization</div>
                      <div className="text-sm text-gray-500 font-medium">Upgrade frameworks seamlessly.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Cloud Migration</div>
                      <div className="text-sm text-gray-500 font-medium">Automated infrastructure-as-code.</div>
                    </a>
                  </div>
                </div>
                <div className="w-[320px]">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Playbook</h4>
                  <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#7C3AED] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02]">
                     <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                     <div className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-white/70 uppercase">Engineering</div>
                     <div className="absolute bottom-6 left-6 text-[22px] font-bold leading-snug text-white z-10 w-[80%]">
                       The Ultimate Guide to AI Migration
                     </div>
                  </a>
                  <div className="mt-4 font-bold text-[15px] text-black">How Acme Corp reduced tech debt by 80%</div>
                </div>
              </div>
            </div>
          </div>

          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>

          {/* Resources Mega Menu */}
          <div className="group">
            <button className="hover:text-white transition-colors flex items-center gap-1 py-4">
              Resources 
              <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
              <div className="bg-[#f6f5f3] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Resources</h4>
                  <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">About us</div>
                      <div className="text-sm text-gray-500 font-medium">Learn more about Codeward.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Knowledge base</div>
                      <div className="text-sm text-gray-500 font-medium">Guides and answers to questions.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Hiring</div>
                      <div className="text-sm text-gray-500 font-medium">Join our engineering team.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Security</div>
                      <div className="text-sm text-gray-500 font-medium">Enterprise-grade protection.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Blog</div>
                      <div className="text-sm text-gray-500 font-medium">Latest news and insights.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Community</div>
                      <div className="text-sm text-gray-500 font-medium">Join our global developer network.</div>
                    </a>
                  </div>
                </div>
                <div className="w-[320px]">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">To read</h4>
                  <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#303833] via-[#434b41] to-[#252c23] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02]">
                     <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                     <div className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-white/70 uppercase">Engineering</div>
                     <div className="absolute bottom-6 left-6 text-[22px] font-bold leading-snug text-white z-10 w-[90%]">
                       Manual reviews are a nightmare
                     </div>
                  </a>
                  <div className="mt-4 font-bold text-[15px] text-black">Why manual code reviews are a bottleneck for teams</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Developers Mega Menu */}
          <div className="group">
            <button className="hover:text-white transition-colors flex items-center gap-1 py-4">
              Developers 
              <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
              <div className="bg-[#f6f5f3] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Developers</h4>
                  <div className="grid grid-cols-4 gap-x-8 gap-y-12">
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">API Reference</div>
                      <div className="text-sm text-gray-500 font-medium">Complete API documentation and reference.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Documentation</div>
                      <div className="text-sm text-gray-500 font-medium">Comprehensive guides and tutorials.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Changelog</div>
                      <div className="text-sm text-gray-500 font-medium">Latest updates and version changes.</div>
                    </a>
                    <a href="#" className="block group/link">
                      <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">GitHub</div>
                      <div className="text-sm text-gray-500 font-medium">Contribute to our open source project.</div>
                    </a>
                  </div>
                </div>
                <div className="w-[320px]">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Community</h4>
                  <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#4A3D36] via-[#3E453A] to-[#344033] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-3 relative z-10 text-white">
                       {/* WhatsApp logo */}
                       <svg className="w-8 h-8 opacity-90" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                       {/* Discord logo */}
                       <svg className="w-8 h-8 opacity-90" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                    </div>
                    <div className="absolute bottom-6 left-6 text-[22px] font-bold leading-snug text-white z-10 w-[70%]">
                      Join our<br/>developer community
                    </div>
                    {/* Decorative noise/texture overlay */}
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 blur-2xl rounded-full" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <a href="#docs" className="hover:text-white transition-colors">Docs</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-96px)] items-center px-8 md:px-14">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            <TypingText />
          </h1>

          <p className="mt-6 max-w-xl text-base text-white/60 md:text-lg">
            Codeward sits between your developers and production. Every push is
            sandboxed, stress-tested, refactored against your existing codebase,
            and rolled back instantly if anything breaks.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
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
              <span className="mr-2">Connect repo →</span>
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-8 text-sm font-medium text-white/80">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free 50 runs/month</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Works with any stack.</span>
            </div>
          </div>
        </div>

        {/* Product Hunt Badges */}
        <div className="absolute bottom-8 right-8 md:bottom-12 md:right-14 flex flex-col gap-4 sm:flex-row sm:gap-6 opacity-90 hover:opacity-100 transition-opacity">

          <a href="#" target="_blank" rel="noopener noreferrer" className="transition-transform hover:scale-105">
            <img 
              src="https://i.ibb.co/jPgJJdTs/developer-tools-badge.png" 
              alt="Product Hunt - Developer Tools" 
              className="h-[50px] w-auto drop-shadow-xl" 
            />
          </a>
        </div>
      </section>
      </section>

      {/* Video Demo Section */}
      <section className="relative bg-[#05060a] py-32 px-8 md:px-14 overflow-hidden perspective-[1000px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.15)_0%,_transparent_50%)] mix-blend-screen pointer-events-none" />
        <div className="mx-auto max-w-[1300px] relative z-10">
          <VideoPlayer />
        </div>
      </section>

      {/* ── Social Proof / Trusted By Section ── */}
      <section className="bg-[#05060a] pt-12 pb-24 px-8 md:px-14">
        <div className="mx-auto max-w-[95%] xl:max-w-[1500px]">
          <h2 className="text-center text-4xl md:text-5xl font-bold text-white mb-16 leading-tight">
            Loved and endorsed by developers & teams from
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            
            {/* AI */}
            <fieldset className="border border-white/10 rounded-2xl px-8 pb-10 pt-6 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-3 mx-auto">
                <span className="relative inline-block px-3 py-1">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-12 rounded-sm rotate-1" />
                  <span className="relative text-xs font-bold text-black uppercase tracking-widest drop-shadow-md">AI</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-6">
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=openai.com&sz=128" alt="OpenAI" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">OpenAI</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=anthropic.com&sz=128" alt="Anthropic" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Anthropic</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=huggingface.co&sz=128" alt="HuggingFace" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">HuggingFace</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=128" alt="Mistral AI" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Mistral AI</span>
                </div>
              </div>
            </fieldset>

            {/* Enterprise */}
            <fieldset className="border border-white/10 rounded-2xl px-8 pb-10 pt-6 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-3 mx-auto">
                <span className="relative inline-block px-3 py-1">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-12 rounded-sm -rotate-1" />
                  <span className="relative text-xs font-bold text-black uppercase tracking-widest drop-shadow-md">Enterprise</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-6">
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=microsoft.com&sz=128" alt="Microsoft" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Microsoft</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=google.com&sz=128" alt="Google" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Google</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=paypal.com&sz=128" alt="PayPal" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">PayPal</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=vercel.com&sz=128" alt="Vercel" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Vercel</span>
                </div>
              </div>
            </fieldset>

            {/* IoT/Infrastructure */}
            <fieldset className="border border-white/10 rounded-2xl px-8 pb-10 pt-6 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-3 mx-auto">
                <span className="relative inline-block px-3 py-1">
                  <span className="absolute inset-0 bg-[#00F700] transform skew-x-12 rounded-sm rotate-2" />
                  <span className="relative text-xs font-bold text-black uppercase tracking-widest drop-shadow-md">IoT/Infrastructure</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-6">
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=128" alt="AWS" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">AWS</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=cloudflare.com&sz=128" alt="Cloudflare" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Cloudflare</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=safaricom.co.ke&sz=128" alt="Safaricom" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Safaricom</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=docker.com&sz=128" alt="Docker" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Docker</span>
                </div>
              </div>
            </fieldset>

            {/* Finance */}
            <fieldset className="border border-white/10 rounded-2xl px-8 pb-10 pt-6 bg-white/5 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <legend className="px-3 mx-auto">
                <span className="relative inline-block px-3 py-1">
                  <span className="absolute inset-0 bg-[#00F700] transform -skew-x-6 rounded-sm -rotate-2" />
                  <span className="relative text-xs font-bold text-black uppercase tracking-widest drop-shadow-md">Finance</span>
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-6">
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=stripe.com&sz=128" alt="Stripe" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Stripe</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=plaid.com&sz=128" alt="Plaid" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Plaid</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=flutterwave.com&sz=128" alt="Flutterwave" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Flutterwave</span>
                </div>
                <div className="flex items-center gap-4">
                  <img src="https://www.google.com/s2/favicons?domain=paystack.com&sz=128" alt="Paystack" className="h-8 w-8 shrink-0 object-contain drop-shadow-md" />
                  <span className="text-white/90 text-base font-semibold tracking-wide truncate">Paystack</span>
                </div>
              </div>
            </fieldset>

          </div>
        </div>
      </section>

      {/* ── Mission Statement Section ── */}
      <section 
        className="relative py-32 px-8 md:px-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://i.ibb.co/WvSNQbHd/enterprise-bg.avif')" }}
      >
        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
        <div className="mx-auto max-w-6xl relative z-10 flex flex-col items-start">
          <p className="text-4xl md:text-6xl font-semibold leading-[1.25] tracking-tight text-white drop-shadow-lg mb-10">
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
      <section className="bg-[#05060a] py-32 px-8 md:px-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl flex flex-col space-y-40">
          
          {/* Agent 1: Security Shield */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Ironclad protection before you deploy</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Shields your codebase from vulnerabilities and hardcoded secrets. It runs deep static analysis and provisions isolated ephemeral sandboxes to verify patches before any code reaches production.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95">
                Secure your repo →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[380px] rounded-[2rem] bg-[#F0EFF0] overflow-hidden flex flex-col justify-end shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-8 text-center">
                   <span className="text-black/20 font-bold text-2xl tracking-widest uppercase">Security<br/>Dashboard</span>
                </div>
                {/* Cloud cut-out at the bottom matching the section background */}
                <svg className="w-full block relative z-10 text-[#05060a] translate-y-[1px]" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,35 L100,35 L100,25 Q85,5 70,25 Q50,-5 30,25 Q15,5 0,25 Z" />
                </svg>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 2: Technical Debt */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Crush legacy technical debt</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Identifies, tracks, and autonomously eliminates technical debt. It highlights overly complex, legacy modules and writes modern, optimized refactors without breaking the underlying architecture.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95">
                Eliminate tech debt →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[380px] rounded-[2rem] bg-[#F0EFF0] overflow-hidden flex flex-col justify-end shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-8 text-center">
                   <span className="text-black/20 font-bold text-2xl tracking-widest uppercase">Debt<br/>Tracker</span>
                </div>
                <svg className="w-full block relative z-10 text-[#05060a] translate-y-[1px]" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,35 L100,35 L100,25 Q85,5 70,25 Q50,-5 30,25 Q15,5 0,25 Z" />
                </svg>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 3: Sandbox Test */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Real tests in live sandboxes</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Never merge broken code again. For every PR, the Test Agent spins up an ephemeral environment, executes your entire test suite, and ensures the code handles real-world scenarios flawlessly.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95">
                Explore testing sandboxes →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[380px] rounded-[2rem] bg-[#F0EFF0] overflow-hidden flex flex-col justify-end shadow-[0_0_50px_rgba(34,197,94,0.15)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-8 text-center">
                   <span className="text-black/20 font-bold text-2xl tracking-widest uppercase">Live<br/>Sandbox</span>
                </div>
                <svg className="w-full block relative z-10 text-[#05060a] translate-y-[1px]" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,35 L100,35 L100,25 Q85,5 70,25 Q50,-5 30,25 Q15,5 0,25 Z" />
                </svg>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 4: Refactor Agent */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Scale your architecture safely</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Restructures entire directories without losing business logic. The AI deeply understands your context, applies new design patterns, and checks its own work through sandboxed test runs.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95">
                Start refactoring safely →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[380px] rounded-[2rem] bg-[#F0EFF0] overflow-hidden flex flex-col justify-end shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-8 text-center">
                   <span className="text-black/20 font-bold text-2xl tracking-widest uppercase">Refactor<br/>Diff</span>
                </div>
                <svg className="w-full block relative z-10 text-[#05060a] translate-y-[1px]" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,35 L100,35 L100,25 Q85,5 70,25 Q50,-5 30,25 Q15,5 0,25 Z" />
                </svg>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 5: Code Review Agent */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <FadeInSection direction="up" className="flex-1 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Automated, self-healing PR reviews</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Completes PR reviews in seconds instead of days. It leaves actionable, inline comments for developers and can automatically generate self-healing patches to resolve issues immediately.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:bg-green-500 active:text-white active:scale-95">
                Automate code reviews →
              </button>
            </FadeInSection>
            <FadeInSection direction="up" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-[3/4] w-full max-w-[380px] rounded-[2rem] bg-[#F0EFF0] overflow-hidden flex flex-col justify-end shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 p-8 text-center">
                   <span className="text-black/20 font-bold text-2xl tracking-widest uppercase">PR Review<br/>Summary</span>
                </div>
                <svg className="w-full block relative z-10 text-[#05060a] translate-y-[1px]" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <path fill="currentColor" d="M0,35 L100,35 L100,25 Q85,5 70,25 Q50,-5 30,25 Q15,5 0,25 Z" />
                </svg>
              </div>
            </FadeInSection>
          </div>

        </div>
      </section>

      {/* ── Flow / Architecture Section ── */}
      <section className="w-full bg-[#000000] relative py-12 px-6 md:px-12 select-none">
        <div className="max-w-[1500px] mx-auto rounded-[15px] overflow-hidden shadow-2xl">
          <ArchitectureFlow />
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <TestimonialsSection />

      {/* ── Latest Insights / Blogs Section ── */}
      <section className="bg-[#05060a] py-32 px-8 md:px-20 border-t border-white/5">
        <FadeInSection>
          <div className="mx-auto max-w-[1500px]">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Latest Insights</h2>
              <button className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                Read all articles &rarr;
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[
                {
                  category: "PRODUCT ENGINEERING",
                  title: "How to eliminate technical debt before it reaches production",
                  gradient: "from-[#00b4db] to-[#0083b0]",
                  overlayText: "TECHNICAL DEBT",
                  date: "May 24, 2026",
                  readTime: "5 min read",
                  author: "Codeward Team",
                },
                {
                  category: "AI",
                  title: "The role of specialized AI agents in automated code reviews",
                  gradient: "from-[#00b4db] to-[#0083b0]",
                  overlayText: "AI AGENTS",
                  date: "May 18, 2026",
                  readTime: "6 min read",
                  author: "Alex TypeScript",
                },
                {
                  category: "SECURITY",
                  title: "Catching zero-day vulnerabilities directly in pull requests",
                  gradient: "from-[#00b4db] to-[#0083b0]",
                  overlayText: "SECURITY SHIELD",
                  date: "May 12, 2026",
                  readTime: "4 min read",
                  author: "Sam Hacker",
                }
              ].map((post, idx) => (
                <div key={idx} className="group cursor-pointer flex flex-col">
                  {/* Custom Graphic Card */}
                  <div className={`relative h-72 rounded-[1.25rem] overflow-hidden bg-gradient-to-br ${post.gradient} border border-white/10 group-hover:shadow-[0_0_30px_rgba(0,180,219,0.3)] transition-all duration-300`}>
                    {/* Background Glowing Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-black/10" />
                    
                    {/* Inner Content overlaying the gradient box */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward" className="h-5 w-5 object-contain drop-shadow-md" />
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
                  <div className="mt-5 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                      {post.category}
                    </span>
                    <h3 className="text-lg font-bold text-white/90 leading-snug group-hover:text-white transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-6 w-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.author.replace(' ', '+')}`} alt={post.author} className="h-full w-full object-cover" />
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
      </section>

      {/* ── FAQ Section ── */}
      <FAQSection />

      {/* ── CTA Section ── */}
      <section className="bg-[#05060a] py-32 px-8 md:px-20 relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.12)_0%,_transparent_60%)] pointer-events-none" />
        
        <FadeInSection className="relative z-10 flex flex-col items-center max-w-3xl">
          <h2 className="text-6xl md:text-8xl font-semibold text-white mb-8 drop-shadow-lg">
            Still Curious?
          </h2>
          <p className="text-white/60 text-lg md:text-xl font-medium mb-12 leading-relaxed max-w-xl">
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

      {/* ── Footer Section ── */}
      <div className="px-4 md:px-8 pb-4 md:pb-8 bg-[#05060a]">
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
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Codeward vs Copilot</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Codeward vs Cursor</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Codeward vs SonarQube</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Codeward vs Snyk</a>
              <a href="#" className="text-black/70 hover:text-black transition-colors text-sm font-semibold">Alternatives</a>
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
                  {i < arr.length - 1 && <span className="ml-3">·</span>}
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

            <div className="flex items-center gap-2">
              Made on Codeward by <span className="text-black font-black text-lg leading-none">✦</span>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
