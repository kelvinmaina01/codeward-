import { useState } from 'react';
import { Github, Loader, ShieldAlert } from 'lucide-react';
import { signIn } from '../../lib/auth';

interface Props {
  onBack: () => void; // Keeping prop for type compatibility but not using it
}

export function AuthPage({ onBack }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuth = async () => {
    setLoading('github');
    try {
      await signIn.social({
        provider: 'github',
        callbackURL: 'http://localhost:5173/', // MUST be absolute to redirect to frontend, not API
      });
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  const btnClass = "w-full py-[11px] px-4 rounded-lg text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 text-cw-txt border border-cw-bdr bg-cw-bg2 hover:border-cw-txt3 disabled:opacity-70 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-cw-bg flex font-sans">
      {/* Left brand panel - 50% split */}
      <div className="w-1/2 bg-cw-bg2 border-r border-cw-bdr flex flex-col justify-center px-16 py-15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-base font-semibold tracking-[-0.03em] whitespace-nowrap mb-10">
            Admin<span className="text-cw-blue">Panel</span>
          </div>

          <h2 className="text-[34px] font-bold tracking-tight text-cw-txt leading-[1.15] mb-4">
            Autonomous<br />code security<br />awaits.
          </h2>
          <p className="text-[13px] text-cw-txt2 leading-[1.7] max-w-[340px] mb-12">
            Connect in 30 seconds. No infra changes. The first scan is free — and it will find something you didn't expect.
          </p>

          {/* Mini feature list */}
          <div className="flex flex-col gap-3">
            {[
              '100+ debt checks on every push',
              '8 specialised Claude AI agents',
              'Auto-refactor, not rewrite',
              'Instant rollback on failure',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cw-green shrink-0" />
                <span className="text-[13px] font-medium text-cw-txt">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel - 50% split with centered content */}
      <div className="w-1/2 bg-cw-bg flex flex-col items-center justify-center">
        
        <div className="w-full max-w-[420px] flex flex-col justify-center px-12 py-15">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-cw-bg2 border border-cw-bdr flex items-center justify-center">
              <ShieldAlert size={24} className="text-cw-blue" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold tracking-tight text-cw-txt mb-2 text-center">
            Welcome to Codeward
          </h2>
          <p className="text-[13px] text-cw-txt2 mb-8 text-center leading-relaxed">
            Sign in or create your account below.<br/>Observer tier is always free.
          </p>

          {/* OAuth button */}
          <div className="flex flex-col gap-3 mb-5">
            <button
              className={btnClass}
              onClick={handleOAuth}
              disabled={!!loading}
            >
              {loading === 'github' ? <Loader size={16} className="animate-spin text-cw-txt2" /> : <Github size={16} className="text-cw-txt2" />}
              {loading === 'github' ? 'Authenticating with GitHub...' : 'Continue with GitHub'}
            </button>
          </div>

          <div className="text-center mt-6 text-[11px] text-cw-txt3 leading-[1.7]">
            By continuing you agree to Codeward's<br />
            <span className="text-cw-txt2 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-cw-txt2 cursor-pointer hover:underline">Privacy Policy</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
