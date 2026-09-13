import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSession } from '../../../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

export function OnboardingPlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const [upgrading, setUpgrading] = useState(false);

  // Check if redirected back after Polar checkout / upgrade
  const isUpgraded = searchParams.get('upgraded') === 'true' || 
                     searchParams.get('success') === 'true' ||
                     session?.user?.plan === 'pro';

  // ─── Returning User Enforcement ───────────────────────────────────────────
  React.useEffect(() => {
    if (!isUpgraded && localStorage.getItem('cw_has_onboarded') === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [isUpgraded, navigate]);

  const handleBack = () => {
    navigate('/onboarding');
  };

  const handleSkip = () => {
    navigate('/connect');
  };

  /**
   * FREE TIER:
   * Directly proceeds straight to Connect Repo.
   * NEVER opens Polar, NEVER makes billing requests.
   */
  const handleStayFree = () => {
    navigate('/connect');
  };

  /**
   * PRO UPGRADE:
   * Connects to Polar CHECKOUT (not empty portal) with dynamic redirect back here.
   */
  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const returnUrl = `${window.location.origin}/onboarding/plan?upgraded=true`;
      const res = await fetch(`${API_URL}/api/billing/checkout?tier=pro&return_url=${encodeURIComponent(returnUrl)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data?.url) {
        // Redirect directly to Polar Checkout
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('[OnboardingPlan] Polar checkout connection error:', err);
    }
    setUpgrading(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F3F5F6] text-[#121316] flex items-center justify-center p-3 sm:p-5 md:p-7 font-sans select-none overflow-hidden">
      
      {/* ─── Fluid Responsive Card Container with Dynamic Tangent Grid Lines ─── */}
      <div className="relative w-[94%] sm:w-[88%] md:w-[82%] lg:w-[72%] max-w-3xl">
        
        {/* Dynamic Architectural Grid Lines (Tight minimal offset framing card) */}
        {/* Top horizontal line */}
        <div className="absolute -top-3 sm:-top-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        {/* Bottom horizontal line */}
        <div className="absolute -bottom-3 sm:-bottom-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        {/* Left vertical line */}
        <div className="absolute -left-3 sm:-left-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />
        {/* Right vertical line */}
        <div className="absolute -right-3 sm:-right-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />

        {/* ─── The Card ─── */}
        <div className="relative z-10 w-full bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-5 sm:p-7 md:p-8">
          
          {/* Top Bar: Back on Left | Title | Skip on Right */}
          <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-[#F3F4F6] mb-4 sm:mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4B5563] hover:text-[#121316] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F3F5F6]"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Back</span>
            </button>

            <div className="text-center px-2">
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-[#121316] tracking-tight">
                Choose your plan
              </h1>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="text-xs sm:text-sm font-medium text-[#6B7280] hover:text-[#121316] transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-[#F3F5F6]"
            >
              Skip
            </button>
          </div>

          {/* ─── CASE A: Redirected back after Polar Confirmation ─── */}
          {isUpgraded ? (
            <div className="py-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-4 border border-[#10B981]/20">
                <ShieldCheck size={32} strokeWidth={2.2} />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[#121316] tracking-tight">
                Pro Plan Activated!
              </h2>
              <p className="text-xs sm:text-sm text-[#4B5563] font-normal mt-1.5 max-w-md leading-relaxed">
                Your account now has unlimited PR protection and automated autonomous code cleaning. Let's connect your repository.
              </p>

              <button
                type="button"
                onClick={() => navigate('/connect')}
                className="mt-6 inline-flex items-center gap-2 bg-[#121316] hover:bg-black text-white text-sm font-semibold py-3 px-6 rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <span>Connect Your Repository</span>
                <ArrowRight size={16} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            /* ─── CASE B: Standard Plan Selection (Free vs Pro) ─── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 items-stretch">
              
              {/* 1. Free Plan Tile (NEVER calls Polar) */}
              <div className="bg-[#F9FAFB] rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] flex flex-col justify-between hover:border-[#D1D5DB] transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs sm:text-sm font-bold text-[#121316] uppercase tracking-wide">
                      Free Tier
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] text-[#4B5563]">
                      Default
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#121316]">$0</span>
                      <span className="text-xs text-[#6B7280] font-medium">/ mo</span>
                    </div>
                    <p className="text-xs font-semibold text-[#7C3AED] mt-0.5">
                      Limit: 10 PRs / month
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2.5 border-t border-[#E5E7EB] text-xs text-[#4B5563]">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-[#10B981] shrink-0" />
                      <span>Up to 10 PR audits / month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-[#10B981] shrink-0" />
                      <span>Basic tech debt cleanup</span>
                    </div>
                  </div>
                </div>

                {/* Free Action: Direct navigation to /connect with NO Polar interaction */}
                <button
                  type="button"
                  onClick={handleStayFree}
                  className="mt-4 sm:mt-5 w-full inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F3F4F6] text-[#121316] border border-[#D1D5DB] text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs group"
                >
                  <span>Stay on Free (10 PRs)</span>
                  <ArrowRight size={15} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* 2. Pro Plan Tile (Connects to Polar) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#121316] flex flex-col justify-between shadow-xs relative">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs sm:text-sm font-bold text-[#121316] uppercase tracking-wide">
                      Pro Tier
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                      Recommended
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#121316]">$19</span>
                      <span className="text-xs text-[#6B7280] font-medium">/ mo</span>
                    </div>
                    <p className="text-xs font-semibold text-[#10B981] mt-0.5">
                      Limit: Unlimited PRs
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2.5 border-t border-[#F3F4F6] text-xs text-[#4B5563]">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-[#10B981] shrink-0" />
                      <span className="font-medium text-[#111827]">Unlimited PRs (no caps)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-[#10B981] shrink-0" />
                      <span>Continuous autonomous cleanup</span>
                    </div>
                  </div>
                </div>

                {/* Pro Action: Connect to Polar */}
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="mt-4 sm:mt-5 w-full inline-flex items-center justify-center gap-1.5 bg-[#121316] hover:bg-black text-white text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer shadow-xs group"
                >
                  <span>{upgrading ? 'Connecting to Polar...' : 'Upgrade to Pro'}</span>
                  <ArrowUpRight size={15} strokeWidth={2.4} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default OnboardingPlanPage;
