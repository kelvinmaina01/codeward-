import React, { useState, useEffect } from 'react';
import { InlineWidget } from 'react-calendly';

const testimonials = [
  {
    quote: "We used to waste hours tracking down memory leaks in production. We plugged Codeward into our pipeline, and its AI isolated a fatal deadlock in our cart service within minutes. Absolute lifesaver.",
    author: "Melisah Jenkins",
    role: "Principal Architect, PayPulse Systems",
    initials: "MJ"
  },
  {
    quote: "Codeward caught a hard-to-reproduce race condition right in the PR stage. It saved our frontend team from shipping a broken checkout UI to 50k active users on Black Friday.",
    author: "Peter F. Vance",
    role: "VP of Engineering, CartFlow Commerce",
    initials: "PV"
  },
  {
    quote: "Codeward has fundamentally transformed our CI/CD pipeline. The autonomous agent caught critical security flaws before they reached staging, saving us countless hours. Absolutely indispensable.",
    author: "Alex Dev",
    role: "Lead Engineer, Vercel",
    initials: "AD"
  }
];

const startupLogos = [
  { name: 'PostHog', url: 'https://cdn.simpleicons.org/posthog/white', className: 'h-6 w-auto object-contain' },
  { name: 'Raycast', url: 'https://cdn.simpleicons.org/raycast/white', className: 'h-5 w-auto object-contain' },
  { name: 'Resend', url: 'https://cdn.simpleicons.org/resend/white', className: 'h-5 w-auto object-contain' },
  { name: 'Cal.com', url: 'https://cdn.simpleicons.org/caldotcom/white', className: 'h-8 w-auto object-contain' },
  { name: 'Mintlify', url: 'https://cdn.simpleicons.org/mintlify/white', className: 'h-6 w-auto object-contain' },
  { name: 'Prisma', url: 'https://cdn.simpleicons.org/prisma/white', className: 'h-6 w-auto object-contain' },
];

export function BookDemo() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#05060a] text-white font-sans">
      {/* Left Column - Calendly */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 lg:p-12 xl:p-20 bg-white">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Pick a time with the Codeward team.</h1>
          <p className="text-gray-600">Select an available time to schedule your demo.</p>
        </div>
        
        <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative" style={{ minHeight: '700px' }}>
          <InlineWidget 
            url="https://calendly.com/codeward" 
            styles={{ height: '100%', minHeight: '700px' }}
            pageSettings={{
              backgroundColor: 'ffffff',
              hideEventTypeDetails: false,
              hideLandingPageDetails: false,
              hideGdprBanner: true,
              primaryColor: '2563eb', // matching standard blue
              textColor: '111827'
            }}
          />
        </div>
      </div>

      {/* Right Column - Brand/Inspiration */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-12 text-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-[#05060a]">
          <img 
            src="/codewarrrrd-section.png" 
            alt="Stars background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060a]/90 via-[#05060a]/20 to-transparent"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
          {/* Logo / Title */}
          <div className="flex items-center gap-1 mb-10">
            <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward Logo" className="h-10 w-auto object-contain drop-shadow-lg -mr-2" />
            <span className="text-2xl font-bold text-white tracking-tight">Codeward</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-16 leading-tight drop-shadow-xl text-balance">
            The automated principal engineer sitting on every pull request.
          </h2>

          <div className="mb-16 w-full max-w-full overflow-hidden relative">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-8 font-medium">Trusted by industry leaders and innovators</p>
            
            {/* Marquee Container */}
            <div className="flex w-max animate-marquee opacity-80 hover:opacity-100 transition-opacity">
              {/* First Set */}
              <div className="flex items-center gap-16 px-8">
                {startupLogos.map((logo) => (
                  <img key={`1-${logo.name}`} src={logo.url} alt={logo.name} className={logo.className} />
                ))}
              </div>
              {/* Second Set for seamless looping */}
              <div className="flex items-center gap-16 px-8">
                {startupLogos.map((logo) => (
                  <img key={`2-${logo.name}`} src={logo.url} alt={logo.name} className={logo.className} />
                ))}
              </div>
            </div>
          </div>

          {/* Testimonial Carousel */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-left relative overflow-hidden group hover:bg-white/[0.05] transition-colors w-full h-[220px]">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
            
            <div className="relative h-full flex flex-col justify-between">
              {testimonials.map((t, idx) => (
                <div 
                  key={idx}
                  className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-1000 ${currentTestimonial === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <p className="text-lg lg:text-[17px] font-medium text-white/90 mb-6 leading-relaxed">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg border border-white/20">
                      {t.initials}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{t.author}</h4>
                      <p className="text-white/50 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Dots */}
            <div className="absolute bottom-6 right-8 flex gap-2 z-20">
              {testimonials.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${currentTestimonial === idx ? 'bg-blue-500 w-4' : 'bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
