import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useSession } from '../../../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading } = useSession();
  const [checkingExistingUser, setCheckingExistingUser] = React.useState(true);

  // ─── Returning User Enforcement ───────────────────────────────────────────
  // Users who have already completed onboarding or have existing repositories
  // should NEVER see the onboarding flow when their session expires and they log back in.
  React.useEffect(() => {
    // 1. Instant client-side fast path
    if (localStorage.getItem('cw_has_onboarded') === 'true') {
      navigate('/dashboard', { replace: true });
      return;
    }

    // 2. Real database check: verify if the user already has connected repos
    fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { repos: [] }))
      .then((data) => {
        if (data?.repos && Array.isArray(data.repos) && data.repos.length > 0) {
          localStorage.setItem('cw_has_onboarded', 'true');
          navigate('/dashboard', { replace: true });
        } else {
          setCheckingExistingUser(false);
        }
      })
      .catch(() => {
        setCheckingExistingUser(false);
      });
  }, [navigate]);

  const userName = session?.user?.name || 'Developer';
  const userImage = session?.user?.image;
  const userInitial = userName.charAt(0).toUpperCase();

  // Endless typewriter animation for "Let's get you started..."
  const fullText = "Let's get you started...";
  const [displayedText, setDisplayedText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isDeleting && displayedText === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === '') {
      timer = setTimeout(() => setIsDeleting(false), 400);
    } else {
      const speed = isDeleting ? 35 : 75;
      timer = setTimeout(() => {
        setDisplayedText((prev) =>
          isDeleting ? prev.slice(0, -1) : fullText.slice(0, prev.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting]);

  const handleStart = () => {
    navigate('/onboarding/plan');
  };

  if (checkingExistingUser || sessionLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F3F5F6] flex items-center justify-center font-sans">
        <div className="w-8 h-8 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#121316] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#F3F5F6] text-[#121316] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans select-none overflow-hidden">
      
      {/* ─── Fluid Responsive Card Container with Dynamic Tangent Grid Lines ─── */}
      <div className="relative w-[92%] sm:w-[86%] md:w-[80%] lg:w-[72%] max-w-4xl">
        
        {/* Dynamic Architectural Grid Lines (Tight, minimal floating frame around card) */}
        {/* Top horizontal line (tight minimal offset) */}
        <div className="absolute -top-3 sm:-top-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        {/* Bottom horizontal line (tight minimal offset) */}
        <div className="absolute -bottom-3 sm:-bottom-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        {/* Left vertical line (tight minimal offset) */}
        <div className="absolute -left-3 sm:-left-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />
        {/* Right vertical line (tight minimal offset) */}
        <div className="absolute -right-3 sm:-right-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />

        {/* ─── The Card (Fluid percentages, zero hardcoded dimensions) ─── */}
        <div className="relative z-10 w-full bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
            
            {/* Left Column: Avatar + Welcome + Typing Subtitle with Emoji */}
            <div className="w-full md:w-[45%] flex-shrink-0">
              <div className="mb-4">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-12 h-12 rounded-full object-cover border border-[#E5E7EB]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] font-bold text-lg flex items-center justify-center border border-[#7C3AED]/20">
                    {userInitial}
                  </div>
                )}
              </div>

              {/* Title without emoji wrapping */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#121316] tracking-tight leading-tight">
                Welcome, <span className="text-[#7C3AED] text-cw-purple">{userName}</span>!
              </h1>

              {/* Emoji and Typing text on the EXACT SAME line */}
              <div className="flex items-center gap-2 mt-2 h-6">
                <span className="text-base sm:text-lg select-none shrink-0">👋</span>
                <span className="text-xs sm:text-sm font-medium text-[#4B5563] inline-flex items-center">
                  <span>{displayedText}</span>
                  <span className="inline-block w-0.5 h-3.5 bg-[#7C3AED] ml-1 animate-pulse" />
                </span>
              </div>
            </div>

            {/* Responsive Divider (Horizontal on mobile, Vertical on desktop) */}
            <div className="block md:hidden h-px w-full bg-[#F3F4F6]" />
            <div className="hidden md:block w-px self-stretch bg-[#F3F4F6]" />

            {/* Right Column: Value statement (High visibility) + Let's Start action */}
            <div className="w-full md:w-[50%] flex flex-col justify-between">
              {/* More visible, high-contrast, crisp typography */}
              <p className="text-sm sm:text-base md:text-lg text-[#111827] font-medium leading-relaxed">
                You can now enjoy coding while Codeward checks, fixes bugs, and cleans the technical debt your coding agent adds.
              </p>

              <div className="mt-5 pt-1">
                <button
                  type="button"
                  onClick={handleStart}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#121316] hover:bg-black text-white text-xs sm:text-sm md:text-base font-semibold py-3 px-6 rounded-xl transition-all cursor-pointer shadow-xs group"
                >
                  <span>Let's Start</span>
                  <ArrowUpRight size={18} strokeWidth={2.4} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

export default OnboardingPage;
