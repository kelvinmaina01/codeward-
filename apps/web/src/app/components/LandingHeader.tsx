import { useNavigate } from 'react-router-dom';
import { blogs } from '../data/blogs';

export function LandingHeader() {
  const navigate = useNavigate();

  return (
    <header className="relative z-50 flex items-center justify-between px-8 py-6 md:px-14">
      <div className="flex items-center">
        <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward Logo" className="h-8 w-auto object-contain -mr-2" />
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
            <div className="bg-[#F5F5EF] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Platform</h4>
                <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Orchestrator Agent</div>
                    <div className="text-sm text-gray-500 font-medium">Coordinates analysis & gate decisions.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Security Agent</div>
                    <div className="text-sm text-gray-500 font-medium">18 checks, OWASP, Trivy, Secrets.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Bloat Agent</div>
                    <div className="text-sm text-gray-500 font-medium">AST duplication & dead code removal.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Broken Code Agent</div>
                    <div className="text-sm text-gray-500 font-medium">Sandbox test runs & flaky detection.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Architecture Agent</div>
                    <div className="text-sm text-gray-500 font-medium">Load testing, k6, N+1 queries.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">AI-Era Agent</div>
                    <div className="text-sm text-gray-500 font-medium">Prompt injection & RAG drift.</div>
                  </a>
                </div>
              </div>
              <div className="w-[320px]">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Infrastructure</h4>
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
                <div className="mt-4 font-bold text-[15px] text-black">Firecracker microVM sandboxes in {"<125ms"}</div>
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
            <div className="bg-[#F5F5EF] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Use Cases</h4>
                <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">CI/CD Pipeline Shield</div>
                    <div className="text-sm text-gray-500 font-medium">Block bad code automatically before merge.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Tech Debt Elimination</div>
                    <div className="text-sm text-gray-500 font-medium">AST-based automatic code refactoring.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Continuous Compliance</div>
                    <div className="text-sm text-gray-500 font-medium">Scheduled GDPR, EU AI Act, WCAG checks.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Security & Secrets</div>
                    <div className="text-sm text-gray-500 font-medium">Scan for vulnerabilities and exposed keys.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Flaky Test Resolution</div>
                    <div className="text-sm text-gray-500 font-medium">10x re-runs to isolate non-determinism.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Enterprise Architecture</div>
                    <div className="text-sm text-gray-500 font-medium">Scale safely with deep load testing.</div>
                  </a>
                </div>
              </div>
              <div className="w-[320px]">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Playbook</h4>
                <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#7C3AED] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02]">
                   <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                   <div className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-white/70 uppercase">Architecture</div>
                   <div className="absolute bottom-6 left-6 text-[22px] font-bold leading-snug text-white z-10 w-[80%]">
                     The 100+ Check Validation Flow
                   </div>
                </a>
                <div className="mt-4 font-bold text-[15px] text-black">How 8 agents run in parallel to secure your PRs</div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors cursor-pointer">Pricing</button>

        {/* Resources Mega Menu */}
        <div className="group">
          <button className="hover:text-white transition-colors flex items-center gap-1 py-4">
            Resources 
            <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
          <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
            <div className="bg-[#F5F5EF] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Resources</h4>
                <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Dashboard</div>
                    <div className="text-sm text-gray-500 font-medium">View live run feeds and health scores.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Documentation</div>
                    <div className="text-sm text-gray-500 font-medium">Setup guides and integrations.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">GitHub App</div>
                    <div className="text-sm text-gray-500 font-medium">Install Codeward on your repositories.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Pricing</div>
                    <div className="text-sm text-gray-500 font-medium">Free, Pro, and Enterprise tiers.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Sandbox Infrastructure</div>
                    <div className="text-sm text-gray-500 font-medium">Learn how our Firecracker VMs work.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">API Reference</div>
                    <div className="text-sm text-gray-500 font-medium">Automate runs programmatically.</div>
                  </a>
                </div>
              </div>
              <div className="w-[320px]">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">To read</h4>
                <a href="#" className="block h-[180px] rounded-[1.25rem] bg-gradient-to-br from-[#303833] via-[#434b41] to-[#252c23] p-6 relative overflow-hidden group/card shadow-inner transition-transform hover:scale-[1.02]">
                   <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                   <div className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-white/70 uppercase">Engineering</div>
                   <div className="absolute bottom-6 left-6 text-[22px] font-bold leading-snug text-white z-10 w-[90%]">
                     The Automated Principal Engineer
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
            <div className="bg-[#F5F5EF] rounded-3xl shadow-2xl overflow-hidden text-black flex p-8 md:p-12 gap-10 border border-black/5 relative w-full">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">Developers</h4>
                <div className="grid grid-cols-4 gap-x-8 gap-y-12">
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">API Reference</div>
                    <div className="text-sm text-gray-500 font-medium">Complete API documentation and reference.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">GitHub Repository</div>
                    <div className="text-sm text-gray-500 font-medium">Contribute to the core project.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Architecture Specs</div>
                    <div className="text-sm text-gray-500 font-medium">BullMQ, Supabase, and Firecracker.</div>
                  </a>
                  <a href="#" className="block group/link">
                    <div className="font-bold text-[17px] mb-1.5 text-black group-hover/link:text-[#8B5CF6] transition-colors">Custom Rules</div>
                    <div className="text-sm text-gray-500 font-medium">Write your own AST checks.</div>
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
        {/* Blogs Mega Menu */}
        <div className="group">
          <button onClick={() => navigate('/blogs')} className="hover:text-white transition-colors flex items-center gap-1 py-4 cursor-pointer">
            Blogs 
            <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
          <div className="absolute top-full left-0 w-full px-8 md:px-14 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
            <div className="bg-[#F5F5EF] rounded-3xl shadow-2xl overflow-hidden text-black flex flex-col md:flex-row p-8 md:p-12 gap-10 border border-black/5 relative w-full">
              
              {/* Left side: Advantage and Learn More */}
              <div className="w-full md:w-[350px] flex flex-col justify-between shrink-0">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Our Blog</h4>
                  <h3 className="text-[26px] font-black text-black leading-tight mb-4 tracking-tight">Stay ahead of technical debt.</h3>
                  <p className="text-gray-600 font-medium text-[15px] leading-relaxed mb-8">
                    Discover actionable insights on autonomous engineering, code quality, and scaling your development velocity with AI. Read expert perspectives on how the smartest teams build software today.
                  </p>
                </div>
                <button onClick={() => navigate('/blogs')} className="flex items-center justify-center gap-2 text-white bg-black hover:bg-black/80 px-6 py-3.5 rounded-full font-bold w-full md:w-fit transition-colors shadow-md">
                  Explore all blogs &rarr;
                </button>
              </div>

              {/* Right side: Featured Blogs */}
              <div className="flex-1 md:border-l border-black/10 md:pl-10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Featured Reads</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {blogs.slice(0, 3).map((post, idx) => (
                    <div onClick={() => navigate(`/blogs/${post.slug}`)} key={idx} className="group/blog cursor-pointer flex flex-col h-full">
                      <div className={`aspect-[16/10] overflow-hidden rounded-[1rem] mb-4 relative shadow-sm shrink-0 border border-black/5 bg-gradient-to-br ${post.gradient || 'from-purple-900 to-indigo-900'}`}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/20 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
                          <div className="flex justify-start">
                            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-sm text-[9px] font-bold text-black uppercase tracking-wider shadow-sm">
                              {post.category}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase block drop-shadow-md">
                              {post.overlayText || 'ENGINEERING'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <h5 className="font-bold text-[16px] leading-snug text-black mb-2 group-hover/blog:text-[#8B5CF6] transition-colors line-clamp-3">
                        {post.title}
                      </h5>
                      <div className="mt-auto pt-2 text-[13px] font-bold text-gray-500 flex items-center gap-2">
                        <span>{post.readTime}</span>
                        <span>·</span>
                        <span>{post.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
