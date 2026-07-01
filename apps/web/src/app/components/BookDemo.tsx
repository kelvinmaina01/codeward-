import React, { useState, useEffect } from 'react';
import { InlineWidget } from 'react-calendly';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const gitProviders = [
  { id: 'github', name: 'GitHub', icon: 'https://cdn.simpleicons.org/github/white' },
  { id: 'gitlab', name: 'GitLab', icon: 'https://cdn.simpleicons.org/gitlab/white' },
  { id: 'bitbucket', name: 'Bitbucket', icon: 'https://cdn.simpleicons.org/bitbucket/white' },
  { id: 'other', name: 'Other', icon: 'https://cdn.simpleicons.org/git/white' }
];

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
  
  // Form State
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    teamSize: '',
    gitProvider: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Valid email is required";
    if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!formData.teamSize) newErrors.teamSize = "Please select a team size";
    if (!formData.gitProvider) newErrors.gitProvider = "Please select a git provider";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Try to focus the first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.getElementsByName(firstErrorKey)[0];
      if (el) el.focus();
      return;
    }

    setStatus('submitting');

    try {
      // Relative path works if frontend and API are hosted under same domain, or we use full URL.
      // Assuming frontend calls an API route or we use the backend directly.
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save lead');
      
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#05060a] text-white font-sans overflow-hidden">
      {/* Left Column - Form & Calendly */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 lg:p-12 xl:p-20 bg-[#0a0c10] border-r border-gray-800/50 overflow-y-auto">
        
        {status !== 'success' ? (
          <div className="w-full max-w-md mx-auto my-auto text-white pb-12">
            <h1 className="text-3xl font-bold mb-2">Book a demo</h1>
            <p className="text-gray-400 mb-8">Tell us a bit about your engineering team so we can tailor the demo to your needs.</p>
            
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Something went wrong saving your details. You can still book a time, or reach out to support.</p>
                </div>
                <div className="flex items-center gap-3 ml-7">
                  <a href="mailto:support@codeward.io" className="text-sm font-medium text-red-400 hover:underline">Contact Support</a>
                  <button onClick={() => setStatus('success')} className="text-sm font-medium bg-[#05060a] px-3 py-1.5 rounded border border-red-500/20 hover:bg-red-500/10">Book Anyway</button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-[#05060a] border rounded-lg focus:outline-none transition-all placeholder-gray-600 ${errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'}`}
                  placeholder="Jane Doe"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Work email (Recommended)</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-[#05060a] border rounded-lg focus:outline-none transition-all placeholder-gray-600 ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'}`}
                  placeholder="jane@company.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name</label>
                <input 
                  type="text" 
                  name="companyName" 
                  value={formData.companyName} 
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-[#05060a] border rounded-lg focus:outline-none transition-all placeholder-gray-600 ${errors.companyName ? 'border-red-500/50 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'}`}
                  placeholder="Acme Corp"
                />
                {errors.companyName && <p className="text-red-400 text-xs mt-1.5">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Engineering Team Size</label>
                <select 
                  name="teamSize" 
                  value={formData.teamSize} 
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 bg-[#05060a] border rounded-lg focus:outline-none transition-all text-white ${errors.teamSize ? 'border-red-500/50 focus:border-red-500' : 'border-gray-800 focus:border-blue-500'}`}
                >
                  <option value="" disabled className="text-gray-600">Select size</option>
                  <option value="1-10">1 - 10 engineers</option>
                  <option value="11-50">11 - 50 engineers</option>
                  <option value="51-200">51 - 200 engineers</option>
                  <option value="200+">200+ engineers</option>
                </select>
                {errors.teamSize && <p className="text-red-400 text-xs mt-1.5">{errors.teamSize}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Primary Git Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {gitProviders.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, gitProvider: p.id }));
                        if (errors.gitProvider) setErrors(prev => ({ ...prev, gitProvider: '' }));
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        formData.gitProvider === p.id 
                          ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                          : 'border-gray-800 bg-[#05060a] hover:border-gray-700 hover:bg-[#0a0c10]'
                      }`}
                    >
                      <img src={p.icon} alt={p.name} className={`h-6 w-6 mb-2 transition-opacity ${formData.gitProvider === p.id ? 'opacity-100' : 'opacity-60'}`} />
                      <span className={`text-xs font-medium ${formData.gitProvider === p.id ? 'text-blue-400' : 'text-gray-400'}`}>{p.name}</span>
                    </button>
                  ))}
                </div>
                {errors.gitProvider && <p className="text-red-400 text-xs mt-2">{errors.gitProvider}</p>}
              </div>

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full bg-white hover:bg-gray-100 text-black font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-8 disabled:opacity-70 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Calendar</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-500 flex-1 w-full bg-[#05060a] rounded-xl overflow-hidden relative" style={{ minHeight: '700px' }}>
            <InlineWidget 
              url="https://calendly.com/codeward" 
              styles={{ height: '100%', minHeight: '700px' }}
              prefill={{
                name: formData.name,
                email: formData.email,
              }}
              pageSettings={{
                backgroundColor: '05060a',
                hideEventTypeDetails: false,
                hideLandingPageDetails: false,
                hideGdprBanner: true,
                primaryColor: 'ffffff',
                textColor: 'ffffff'
              }}
            />
          </div>
        )}
      </div>

      {/* Right Column - Brand/Inspiration */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center items-center p-12 text-center overflow-y-auto">
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
