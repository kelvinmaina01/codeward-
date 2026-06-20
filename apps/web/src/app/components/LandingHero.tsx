import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArchitectureFlow } from './ArchitectureFlow';

// ============================================================
// Codeward Hero Section — Self-contained single-file component
// Requires: React, Tailwind CSS
// ============================================================

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
  const highlightedText = "the technical debt.";
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

  return (
    <span className="whitespace-pre-wrap text-white">
      {normalPart}
      {highlightPart && <span className="text-purple-400">{highlightPart}</span>}
      <span className="inline-block h-[0.85em] w-[3px] translate-y-[0.1em] bg-purple-400 animate-pulse align-middle ml-1" />
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

export default function CodewardHero() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-screen overflow-y-auto">
      <section className="relative min-h-screen overflow-hidden bg-[#05060a] text-white shrink-0">
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
        <nav className="hidden gap-8 text-sm font-medium text-white/80 md:flex">
          <a href="#products" className="hover:text-white transition-colors">Products</a>
          <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
          <a href="#solution" className="hover:text-white transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#blog" className="hover:text-white transition-colors">Blog</a>
          <a href="#resources" className="hover:text-white transition-colors">Resources</a>
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
              className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90 shadow-lg shadow-white/10"
            >
              Start for free trial
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-full bg-white/10 px-8 py-4 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 flex items-center gap-2"
            >
              Connect GitHub repo →
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
      <section className="bg-[#05060a] py-24 px-8 md:px-14">
        <div className="mx-auto max-w-6xl">
          <div className="relative aspect-video w-full rounded-2xl bg-white shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden flex items-center justify-center">
            
            {/* Top right Play Button */}
            <button className="absolute top-6 right-6 flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:scale-105 shadow-md">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play intro
            </button>

            {/* Center Logo Placeholder */}
            <div className="flex items-center gap-4 opacity-40">
              <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="h-16 w-auto object-contain grayscale" />
              <span className="text-4xl font-bold tracking-tight text-black">
                Code<span className="text-purple-600">ward</span>
              </span>
            </div>

          </div>
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
      <section className="bg-[#05060a] py-32 px-8 md:px-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-4xl md:text-6xl font-semibold leading-[1.25] tracking-tight">
            <MissionTypingText />
          </p>
        </div>
      </section>


      {/* ── Specialized AI Agents Section ── */}
      <section className="bg-[#05060a] py-32 px-8 md:px-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl flex flex-col space-y-40">
          
          {/* Agent 1: Security Shield */}
          <div className="flex flex-col md:flex-row items-center gap-16 overflow-hidden">
            <FadeInSection direction="left" className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-500">Security Agent</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Ironclad protection before you deploy</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Shields your codebase from vulnerabilities and hardcoded secrets. It runs deep static analysis and provisions isolated ephemeral sandboxes to verify patches before any code reaches production.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                Secure your repo →
              </button>
            </FadeInSection>
            <FadeInSection direction="right" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-square w-full max-w-[400px] rounded-[2rem] bg-[#05060a] shadow-[0_0_40px_rgba(239,68,68,0.05)] overflow-hidden flex items-center justify-center border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.15)_0%,_transparent_60%)] mix-blend-screen opacity-50" />
                <span className="relative z-10 text-white/80 font-medium text-lg tracking-wide">Security Dashboard</span>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 2: Technical Debt */}
          <div className="flex flex-col md:flex-row items-center gap-16 overflow-hidden">
            <FadeInSection direction="left" className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-purple-500">Debt Agent</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Crush legacy technical debt</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Identifies, tracks, and autonomously eliminates technical debt. It highlights overly complex, legacy modules and writes modern, optimized refactors without breaking the underlying architecture.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                Eliminate tech debt →
              </button>
            </FadeInSection>
            <FadeInSection direction="right" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-square w-full max-w-[400px] rounded-[2rem] bg-[#05060a] shadow-[0_0_40px_rgba(168,85,247,0.05)] overflow-hidden flex items-center justify-center border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.15)_0%,_transparent_60%)] mix-blend-screen opacity-50" />
                <span className="relative z-10 text-white/80 font-medium text-lg tracking-wide">Debt Tracker</span>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 3: Sandbox Test */}
          <div className="flex flex-col md:flex-row items-center gap-16 overflow-hidden">
            <FadeInSection direction="left" className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-green-500">Test Agent</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Real tests in live sandboxes</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Never merge broken code again. For every PR, the Test Agent spins up an ephemeral environment, executes your entire test suite, and ensures the code handles real-world scenarios flawlessly.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                Explore testing sandboxes →
              </button>
            </FadeInSection>
            <FadeInSection direction="right" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-square w-full max-w-[400px] rounded-[2rem] bg-[#05060a] shadow-[0_0_40px_rgba(34,197,94,0.05)] overflow-hidden flex items-center justify-center border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15)_0%,_transparent_60%)] mix-blend-screen opacity-50" />
                <span className="relative z-10 text-white/80 font-medium text-lg tracking-wide">Live Sandbox</span>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 4: Refactor Agent */}
          <div className="flex flex-col md:flex-row items-center gap-16 overflow-hidden">
            <FadeInSection direction="left" className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-500">Refactor Agent</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Scale your architecture safely</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Restructures entire directories without losing business logic. The AI deeply understands your context, applies new design patterns, and checks its own work through sandboxed test runs.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                Start refactoring safely →
              </button>
            </FadeInSection>
            <FadeInSection direction="right" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-square w-full max-w-[400px] rounded-[2rem] bg-[#05060a] shadow-[0_0_40px_rgba(59,130,246,0.05)] overflow-hidden flex items-center justify-center border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15)_0%,_transparent_60%)] mix-blend-screen opacity-50" />
                <span className="relative z-10 text-white/80 font-medium text-lg tracking-wide">Refactor Diff</span>
              </div>
            </FadeInSection>
          </div>

          {/* Agent 5: Code Review Agent */}
          <div className="flex flex-col md:flex-row items-center gap-16 overflow-hidden">
            <FadeInSection direction="left" className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-orange-500">Review Agent</div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Automated, self-healing PR reviews</h2>
              <p className="text-white/60 text-[17px] md:text-[19px] leading-relaxed mb-8">
                Completes PR reviews in seconds instead of days. It leaves actionable, inline comments for developers and can automatically generate self-healing patches to resolve issues immediately.
              </p>
              <button onClick={() => navigate('/signup')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
                Automate code reviews →
              </button>
            </FadeInSection>
            <FadeInSection direction="right" className="flex-1 w-full flex justify-center">
              <div className="relative aspect-square w-full max-w-[400px] rounded-[2rem] bg-[#05060a] shadow-[0_0_40px_rgba(249,115,22,0.05)] overflow-hidden flex items-center justify-center border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.15)_0%,_transparent_60%)] mix-blend-screen opacity-50" />
                <span className="relative z-10 text-white/80 font-medium text-lg tracking-wide">PR Review Summary</span>
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
                Read all articles
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                {
                  category: "PRODUCT ENGINEERING",
                  title: "How to eliminate technical debt before it reaches production",
                  gradient: "from-blue-600 via-indigo-600 to-transparent",
                  overlayText: "TECHNICAL DEBT",
                  date: "May 24, 2026",
                  readTime: "5 min read",
                  author: "Codeward Team",
                },
                {
                  category: "AI",
                  title: "The role of specialized AI agents in automated code reviews",
                  gradient: "from-purple-600 via-pink-600 to-transparent",
                  overlayText: "AI AGENTS",
                  date: "May 18, 2026",
                  readTime: "6 min read",
                  author: "Alex TypeScript",
                },
                {
                  category: "SECURITY",
                  title: "Catching zero-day vulnerabilities directly in pull requests",
                  gradient: "from-red-600 via-orange-600 to-transparent",
                  overlayText: "SECURITY SHIELD",
                  date: "May 12, 2026",
                  readTime: "4 min read",
                  author: "Sam Hacker",
                },
                {
                  category: "PRODUCT",
                  title: "Introducing Codeward 2.0: The Autonomous AI Code Platform",
                  gradient: "from-emerald-600 via-teal-600 to-transparent",
                  overlayText: "CODEWARD 2.0",
                  date: "May 01, 2026",
                  readTime: "8 min read",
                  author: "Codeward Engineering",
                }
              ].map((post, idx) => (
                <div key={idx} className="group cursor-pointer flex flex-col">
                  {/* Custom Graphic Card */}
                  <div className="relative h-56 rounded-[1.25rem] overflow-hidden bg-[#0a0c14] border border-white/10 group-hover:border-white/20 transition-all duration-300">
                    {/* Background Glowing Gradients */}
                    <div className={`absolute -inset-10 bg-gradient-to-br ${post.gradient} blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500`} />
                    <div className="absolute inset-0 bg-[#05060a]/60 backdrop-blur-sm" />
                    
                    {/* Inner Content overlaying the gradient box */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-lg">
                          <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward" className="h-5 w-5 object-contain" />
                          <span className="text-sm font-bold tracking-tight text-white">Code<span className="text-purple-400">ward</span></span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase mb-2 block drop-shadow-md">
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

    </div>
  );
}


