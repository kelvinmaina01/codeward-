import { useState } from 'react';
import { Loader, Sparkles, Sun, Moon, Circle, CheckCheck, Bot, GitPullRequest, History } from 'lucide-react';
import { signIn } from '../../lib/auth';
import { Theme } from './types';

interface Props {
  onBack: () => void;
  theme: Theme;
  onCycleTheme: () => void;
}

const themeIcons: Record<Theme, React.ReactNode> = {
  cream: <Circle size={14} fill="#c5a882" color="#c5a882" />,
  dark: <Moon size={14} />,
  white: <Sun size={14} />,
};

export function AuthPage({ onBack, theme, onCycleTheme }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleOAuth = async (provider: 'github' | 'gitlab') => {
    if (provider === 'gitlab') return; // disabled
    setLoading(provider);
    try {
      await signIn.social({
        provider,
        callbackURL: 'http://localhost:5173/', // MUST be absolute to redirect to frontend, not API
      });
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  const btnClass = "w-full py-3 px-4 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-3 transition-all duration-200 text-cw-txt border border-cw-bdr bg-cw-bg hover:bg-cw-bg3";

  return (
    <div className={`theme-${theme} min-h-screen bg-cw-bg3 flex items-center justify-center font-sans transition-colors duration-250 p-6 md:p-12`}>
      {/* Theme Toggle (absolute positioned) */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={onCycleTheme} 
          className="w-10 h-10 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg transition-colors shadow-sm"
          title="Toggle Theme"
        >
          {themeIcons[theme]}
        </button>
      </div>

      <div className="w-full h-full max-w-[1600px] flex gap-8 md:gap-12 flex-col md:flex-row items-stretch justify-center" style={{ minHeight: '85vh' }}>
        {/* Left brand panel */}
        <div className="w-full md:w-1/2 bg-cw-bg2 border border-cw-bdr rounded-[2rem] flex flex-col justify-center px-12 md:px-20 py-16 relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-16">
                <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="w-12 h-12 object-contain" />
                <span className="text-xl font-bold tracking-tight text-cw-txt">
                  Codeward
                </span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cw-purple/10 text-cw-purple text-[12px] font-bold tracking-wide mb-8">
                <Sparkles size={14} />
                Multi-agent code intelligence
              </div>

              <h2 className="text-[48px] md:text-[56px] font-bold tracking-tight text-cw-txt leading-[1.1] mb-8">
                Autonomous<br />code security<br /><span className="text-cw-purple">awaits.</span>
              </h2>
              <p className="text-[16px] text-cw-txt2 leading-[1.6] max-w-[420px] mb-12 font-medium">
                Connect in 30 seconds. No infra changes.<br/>
                The first scan is free — and it will find something you didn't expect.
              </p>
            </div>

            {/* Mini feature list */}
            <div className="flex flex-col gap-4 mt-auto">
              {[
              { text: '100+ debt checks on every push', Icon: CheckCheck },
              { text: '8 specialised Claude AI agents', Icon: Bot },
              { text: 'Auto-refactor, not rewrite', Icon: GitPullRequest },
              { text: 'Instant rollback on failure', Icon: History },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <f.Icon size={18} className="text-cw-purple shrink-0" strokeWidth={2.5} />
                <span className="text-[15px] font-medium text-cw-txt">{f.text}</span>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="w-full md:w-1/2 bg-cw-bg border border-cw-bdr rounded-[2rem] flex flex-col items-center justify-center py-16 px-12 shadow-sm">
          <div className="w-full max-w-[480px] flex flex-col items-center justify-center h-full">
            <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="w-20 h-20 mb-8 object-contain" />
            
            <h2 className="text-[28px] font-bold tracking-tight text-cw-txt mb-3 text-center">
              Welcome to Codeward
            </h2>
            <p className="text-[15px] text-cw-txt2 mb-6 text-center font-medium">
              Sign in or create your account below.
            </p>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[13px] font-bold mb-12">
              <Sparkles size={14} />
              Observer tier is always free
            </div>

            {/* OAuth buttons */}
            <div className="w-full flex flex-col gap-4">
              <button
                className={btnClass + " cursor-pointer"}
                onClick={() => handleOAuth('github')}
                disabled={!!loading}
              >
                {loading === 'github' ? <Loader size={20} className="animate-spin" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" className="w-5 h-5" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }} alt="GitHub" />}
                <span className="text-[15px]">{loading === 'github' ? 'Connecting...' : 'Continue with GitHub'}</span>
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-[1px] bg-cw-bdr"></div>
                <span className="text-[12px] text-cw-txt3 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-[1px] bg-cw-bdr"></div>
              </div>

              <button
                className={btnClass + " opacity-60 cursor-not-allowed relative"}
                disabled={true}
              >
                <img src="https://i.ibb.co/SDsmVD5S/GITLABLOGO-removebg-preview.png" className="w-5 h-5 object-contain" alt="GitLab" />
                <span className="text-[15px]">Continue with GitLab</span>
                <div className="absolute right-4 px-2 py-0.5 rounded bg-cw-bg2 border border-cw-bdr text-[10px] font-bold uppercase tracking-wider text-cw-txt3">
                  Coming soon
                </div>
              </button>
            </div>

            <div className="text-center mt-12 text-[13px] text-cw-txt3 leading-[1.6]">
              By continuing you agree to Codeward's<br />
              <span className="text-cw-txt2 cursor-pointer hover:underline font-semibold">Terms of Service</span> and <span className="text-cw-txt2 cursor-pointer hover:underline font-semibold">Privacy Policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
