import { useState } from 'react';
import { Shield, Lock, ArrowRight, CheckCircle2, ArrowLeftRight } from 'lucide-react';
import { authClient } from '../../lib/auth';
import { toast } from 'sonner';
import { FooterTrustBadges } from './FooterTrustBadges';

// Official Crisp GitHub SVG Icon
function OfficialGithubIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

// Official Crisp GitLab SVG Icon
function OfficialGitlabIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 5.5 2a.43.43 0 0 1 .4.27l2.45 7.52h7.3l2.45-7.52a.43.43 0 0 1 .4-.27.42.42 0 0 1 .39.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.94z" />
    </svg>
  );
}

export function LinkProvider() {
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLinkAccount = async () => {
    setLoading(true);
    try {
      if (provider === 'github') {
        await authClient.signIn.social({
          provider: 'github',
          callbackURL: window.location.origin + '/connect',
        });
      } else {
        await authClient.signIn.social({
          provider: 'gitlab',
          callbackURL: window.location.origin + '/connect',
        });
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to connect ${provider === 'github' ? 'GitHub' : 'GitLab'} account`);
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-cw-txt font-sans flex flex-col items-center justify-start pt-2 pb-24 relative">
      {/* Main Wide Card */}
      <div className="w-full max-w-[880px] relative">
        <div className="w-full bg-cw-bg2 border border-cw-bdr rounded-3xl py-5 px-6 sm:px-10 md:px-12 flex flex-col items-center text-center">
          
          {/* Provider Selection Tabs */}
          <div className="flex items-center gap-2 p-1 bg-cw-bg3 border border-cw-bdr rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => setProvider('github')}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                provider === 'github'
                  ? 'bg-cw-bg2 text-white border border-cw-bdr shadow-sm'
                  : 'text-cw-txt3 hover:text-cw-txt'
              }`}
            >
              <OfficialGithubIcon size={16} />
              GitHub
            </button>
            <button
              type="button"
              onClick={() => setProvider('gitlab')}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                provider === 'gitlab'
                  ? 'bg-cw-bg2 text-white border border-cw-bdr shadow-sm'
                  : 'text-cw-txt3 hover:text-cw-txt'
              }`}
            >
              <OfficialGitlabIcon size={16} className="text-[#FC6D26]" />
              GitLab
            </button>
          </div>

          {/* Connection Graphic */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-4 w-full max-w-[460px]">
            {/* Codeward Logo Node */}
            <div className="flex flex-col items-center">
              <div className="w-13 h-13 sm:w-15 sm:h-15 bg-cw-purple/10 border border-cw-purple/30 rounded-2xl flex items-center justify-center p-2.5 shrink-0">
                {!imgError ? (
                  <img
                    src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png"
                    alt="Codeward Logo"
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Shield size={26} className="text-cw-purple" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-cw-txt3 mt-1 tracking-wider uppercase">Codeward</span>
            </div>

            {/* Clean Centered Bridge */}
            <div className="flex-1 flex items-center justify-center px-1">
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 h-[1px] bg-cw-bdr" />
                <div className="w-7 h-7 rounded-full bg-cw-bg3 border border-cw-bdr flex items-center justify-center text-cw-purple shrink-0">
                  <ArrowLeftRight size={14} className="text-cw-purple" />
                </div>
                <div className="flex-1 h-[1px] bg-cw-bdr" />
              </div>
            </div>

            {/* Provider Logo Node */}
            <div className="flex flex-col items-center">
              <div className="w-13 h-13 sm:w-15 sm:h-15 bg-white/5 border border-white/15 rounded-2xl flex items-center justify-center p-2.5 text-white shrink-0">
                {provider === 'github' ? (
                  <OfficialGithubIcon size={30} className="text-white" />
                ) : (
                  <OfficialGitlabIcon size={30} className="text-[#FC6D26]" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-cw-txt3 mt-1 tracking-wider uppercase">
                {provider === 'github' ? 'GitHub' : 'GitLab'}
              </span>
            </div>
          </div>

          {/* Heading & Description */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-cw-txt">
            Connect your Repository
          </h1>
          <p className="text-[13px] sm:text-[14px] text-cw-txt2 mb-5 leading-relaxed max-w-[620px]">
            Welcome to Codeward! To start analyzing your codebase, tracking security vulnerabilities, and keeping technical debt in check, connect your {provider === 'github' ? 'GitHub' : 'GitLab'} account.
          </p>

          {/* Connection Button */}
          <button
            onClick={handleLinkAccount}
            disabled={loading}
            className={`w-full max-w-[440px] h-12 ${
              provider === 'github'
                ? 'bg-cw-purple hover:bg-purple-600'
                : 'bg-[#FC6D26] hover:bg-[#e25c1d]'
            } text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-colors duration-200 active:scale-[0.99] disabled:opacity-50 text-[14px] cursor-pointer mb-4`}
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : provider === 'github' ? (
              <OfficialGithubIcon size={20} className="text-white" />
            ) : (
              <OfficialGitlabIcon size={20} className="text-white" />
            )}
            <span>
              {loading
                ? `Connecting ${provider === 'github' ? 'GitHub' : 'GitLab'}...`
                : `Connect ${provider === 'github' ? 'GitHub' : 'GitLab'} Account`}
            </span>
            {!loading && <ArrowRight size={16} className="text-white/80" />}
          </button>

          {/* Security Footnote */}
          <div className="w-full pt-3.5 border-t border-cw-bdr flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] text-cw-txt3">
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-cw-purple" />
              Encrypted OAuth Handshake
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cw-green" />
              Granular Repo Permissions
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={13} className="text-cw-purple" />
              SOC2 Ready Security
            </span>
          </div>

        </div>
      </div>

      {/* FIXED STICKY FOOTER STRIP */}
      <div className="fixed bottom-0 inset-x-0 bg-cw-bg2/95 border-t border-cw-bdr backdrop-blur-md px-6 py-3 md:py-3.5 flex flex-col xl:flex-row items-center justify-between gap-4 z-30 shadow-2xl">
        {/* Left Tagline */}
        <div className="text-center xl:text-left shrink-0">
          <p className="text-[12px] sm:text-[13px] font-semibold text-cw-txt leading-snug">
            Codeward builds, tests, and optimizes your codebase.{' '}
            <span className="text-cw-purple font-medium inline-block">Automatically.</span>
          </p>
        </div>

        {/* Center Trust Badges */}
        <FooterTrustBadges dark={true} className="py-0" />

        {/* Right Contact Link */}
        <a
          href="mailto:hello@codeward.ai"
          className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold text-cw-txt hover:text-cw-purple transition-colors no-underline group shrink-0"
        >
          <span>hello@codeward.ai</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-cw-purple" />
        </a>
      </div>
    </div>
  );
}
