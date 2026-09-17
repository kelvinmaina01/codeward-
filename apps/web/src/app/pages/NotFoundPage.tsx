import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Home01Icon,
  ArrowLeft01Icon,
  Mail01Icon,
  GitForkIcon,
  Shield01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  HelpCircleIcon,
  Radio01Icon,
  SparklesIcon,
} from 'hugeicons-react';
import { useSession } from '../../lib/auth';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const copySupportEmail = () => {
    navigator.clipboard.writeText('support@codeward.cloud');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>404: Dead Code Removed · Codeward</title>
        <meta
          name="description"
          content="The page you are looking for has been pruned or never existed. Return to the Codeward dashboard or contact support."
        />
      </Helmet>

      <div className="min-h-screen bg-cw-bg text-cw-txt flex flex-col justify-between selection:bg-cw-purple/30 selection:text-white relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cw-purple/10 via-indigo-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[250px] bg-cw-amber/5 blur-3xl pointer-events-none rounded-full" />

        {/* Minimal Header */}
        <header className="px-6 py-4 border-b border-cw-bdr/60 flex items-center justify-between z-10 backdrop-blur-md bg-cw-bg/80">
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cw-purple to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              C
            </div>
            <span className="font-bold tracking-tight text-[15px] text-cw-txt group-hover:text-cw-purple transition-colors">
              Codeward
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="mailto:support@codeward.cloud?subject=Broken%20Link%20Report"
              className="text-[12px] text-cw-txt2 hover:text-cw-txt transition-colors flex items-center gap-1.5 no-underline font-medium"
            >
              <Mail01Icon size={14} className="text-cw-txt3" />
              <span>support@codeward.cloud</span>
            </a>
          </div>
        </header>

        {/* Hero 404 Section */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 z-10">
          <div className="max-w-2xl w-full text-center flex flex-col items-center">
            {/* Bespoke Code-Debt SVG Illustration */}
            <div className="relative mb-6 group select-none">
              <svg
                width="280"
                height="160"
                viewBox="0 0 280 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto filter drop-shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              >
                {/* Terminal Background */}
                <rect
                  x="10"
                  y="10"
                  width="260"
                  height="140"
                  rx="12"
                  className="fill-cw-bg2 stroke-cw-bdr"
                  strokeWidth="1.5"
                />
                
                {/* Terminal Header Dots */}
                <circle cx="30" cy="26" r="4" fill="#EF4444" opacity="0.8" />
                <circle cx="44" cy="26" r="4" fill="#F59E0B" opacity="0.8" />
                <circle cx="58" cy="26" r="4" fill="#10B981" opacity="0.8" />

                <path
                  d="M10 40H270"
                  className="stroke-cw-bdr"
                  strokeWidth="1"
                />

                {/* Branch Fork & Pruned Node Diagram */}
                <path
                  d="M50 115V80C50 65 65 58 85 58H140"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
                <path
                  d="M50 115V70C50 55 70 55 90 55H190"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Active & Pruned Git Commits */}
                <circle cx="50" cy="115" r="6" fill="#6366F1" />
                <circle cx="50" cy="85" r="5" fill="#3B82F6" />
                <circle cx="120" cy="55" r="5" fill="#10B981" />
                <circle cx="190" cy="55" r="6" fill="#10B981" />

                {/* Missing 404 Pruned Leaf */}
                <circle cx="155" cy="58" r="8" fill="#EF4444" fillOpacity="0.2" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="151" y1="54" x2="159" y2="62" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="159" y1="54" x2="151" y2="62" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />

                {/* Big Floating 404 Text */}
                <text
                  x="200"
                  y="118"
                  fill="currentColor"
                  className="text-cw-txt font-mono font-black text-[34px] tracking-tight opacity-90"
                >
                  404
                </text>

                {/* Guardian Scanner Sweep Line */}
                <rect x="25" y="42" width="230" height="2" fill="url(#laser-gradient)" opacity="0.4" />
                
                <defs>
                  <linearGradient id="laser-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cw-red/10 border border-cw-red/30 text-cw-red font-mono text-[11px] font-bold mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cw-red animate-ping" />
                ERR_DEAD_CODE_PRUNED
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cw-txt mb-2">
              Refactor Gone Too Far
            </h1>

            {/* Subtitle with Code Debt flavor */}
            <p className="text-[14px] sm:text-[15px] text-cw-txt2 max-w-lg mb-6 leading-relaxed">
              Looks like this route accrued too much technical debt and was garbage-collected, or our Autonomous Guardian agent pruned it during a deep branch refactor.
            </p>

            {/* Interactive Terminal Mockup */}
            <div className="w-full max-w-md bg-cw-bg3 border border-cw-bdr rounded-lg p-3 text-left font-mono text-[12px] mb-8 shadow-inner overflow-x-auto">
              <div className="flex items-center justify-between text-cw-txt3 text-[10px] mb-2 pb-1.5 border-b border-cw-bdr/60">
                <span>HEAD: branch/remediation-pipeline</span>
                <span>exit code 404</span>
              </div>
              <div className="text-cw-txt3">$ git checkout {currentPath || '/unknown-route'}</div>
              <div className="text-cw-red mt-1">fatal: pathspec '{currentPath || '/route'}' did not match any files</div>
              <div className="text-cw-green mt-1">✓ suggested: git checkout main (dashboard)</div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate(session?.user ? '/dashboard' : '/')}
                className="h-10 px-5 rounded-lg bg-cw-purple hover:brightness-110 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer w-full sm:w-auto"
              >
                <Home01Icon size={16} />
                {session?.user ? 'Return to Dashboard' : 'Back to Home'}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-10 px-4 rounded-lg bg-cw-bg2 hover:bg-cw-bg3 border border-cw-bdr text-cw-txt font-medium text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <ArrowLeft01Icon size={15} />
                Previous Page
              </button>

              <a
                href="mailto:support@codeward.cloud?subject=404%20Page%20Report&body=I%20hit%20a%20404%20at%20URL:%20"
                className="h-10 px-4 rounded-lg bg-cw-bg2 hover:bg-cw-bg3 border border-cw-bdr text-cw-txt font-medium text-[13px] flex items-center justify-center gap-1.5 transition-colors no-underline cursor-pointer w-full sm:w-auto"
              >
                <Mail01Icon size={15} className="text-cw-txt2" />
                Contact Support
              </a>
            </div>

            {/* Quick Directory Links */}
            <div className="mt-10 pt-6 border-t border-cw-bdr/50 w-full flex flex-wrap items-center justify-center gap-4 text-[12px] text-cw-txt3">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-cw-txt3">
                Quick routes:
              </span>
              <Link to="/dashboard/debt" className="hover:text-cw-txt transition-colors no-underline flex items-center gap-1">
                <Shield01Icon size={13} className="text-cw-purple" /> Debt Report
              </Link>
              <Link to="/dashboard/livefeed" className="hover:text-cw-txt transition-colors no-underline flex items-center gap-1">
                <Radio01Icon size={13} className="text-cw-green" /> Live Feed
              </Link>
              <Link to="/dashboard/repos" className="hover:text-cw-txt transition-colors no-underline flex items-center gap-1">
                <GitForkIcon size={13} className="text-cw-blue" /> Repositories
              </Link>
              <Link to="/dashboard/agent" className="hover:text-cw-txt transition-colors no-underline flex items-center gap-1">
                <SparklesIcon size={13} className="text-cw-amber" /> Gordon Agent
              </Link>
            </div>
          </div>
        </main>

        {/* Footer with support email copy trigger */}
        <footer className="px-6 py-4 border-t border-cw-bdr/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-cw-txt3 z-10">
          <div>
            Codeward Autonomous Code Health · Refactoring technical debt before production breaks.
          </div>
          <div className="flex items-center gap-2">
            <span>Need immediate engineer assistance?</span>
            <button
              type="button"
              onClick={copySupportEmail}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cw-bg2 border border-cw-bdr hover:border-cw-txt3 text-cw-txt transition-colors cursor-pointer text-[11px]"
              title="Click to copy support email"
            >
              {copied ? (
                <>
                  <CheckmarkCircle01Icon size={12} className="text-cw-green" /> Copied!
                </>
              ) : (
                <>
                  <Copy01Icon size={12} /> support@codeward.cloud
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
