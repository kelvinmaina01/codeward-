import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BotIcon, TaskDone01Icon, GitPullRequestIcon, CircleArrowReload01Icon, StarsIcon, Sun01Icon, Moon01Icon, CircleIcon } from 'hugeicons-react';
import { signIn } from '../../lib/auth';
import { Theme } from './types';
import { ParticleBackground } from './ParticleBackground';

interface Props {
  onBack?: () => void;
  theme?: Theme;
  onCycleTheme?: () => void;
  onNavigate?: (page: 'terms' | 'privacy') => void;
}

const themeIcons: Record<Theme, React.ReactNode> = {
  cream: <CircleIcon size={14} fill="#c5a882" color="#c5a882" />,
  dark: <Moon01Icon size={14} />,
  white: <Sun01Icon size={14} />,
};

const TYPED_TEXT = "Connect in 30 seconds. No infra changes.\nThe first scan is free — and it will find something you didn't expect.";

export function AuthPage({ onBack, theme: _theme, onCycleTheme, onNavigate: _onNavigate }: Props) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('dark');
  const themeOrder: Theme[] = ['dark', 'cream', 'white'];
  const cycleTheme = () => setTheme(t => themeOrder[(themeOrder.indexOf(t) + 1) % themeOrder.length]);
  const [loading, setLoading] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < TYPED_TEXT.length) {
          setTypedText(TYPED_TEXT.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 28);
      return () => clearInterval(interval);
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(blink);
  }, []);

  const handleOAuth = async (provider: 'github' | 'gitlab') => {
    if (provider === 'gitlab') return;
    setLoading(provider);
    try {
      await signIn.social({
        provider,
        callbackURL: window.location.origin + '/connect',
      });
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  const btnClass = "w-full py-2 px-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-3 transition-all duration-200 text-cw-txt border border-cw-bdr bg-cw-bg hover:bg-cw-bg3";

  return (
    <div className={`theme-${theme} min-h-screen bg-black flex items-stretch justify-center font-sans transition-colors duration-250 px-4 py-2 md:px-8 md:py-3 relative overflow-hidden`}>
      <ParticleBackground />

      {/* Theme Toggle (absolute positioned) */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={cycleTheme}
          className="w-10 h-10 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg transition-colors shadow-sm"
          title="Toggle Theme"
        >
          {themeIcons[theme]}
        </button>
      </div>

      <div className="w-full h-full max-w-[1600px] flex gap-6 md:gap-8 flex-col md:flex-row items-stretch justify-center relative z-10" style={{ minHeight: 'calc(100vh - 24px)' }}>
        {/* Left brand panel — centered, feature list above typing text */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-4 md:px-12 py-12 relative text-white font-['Google_Sans_Flex']">
          <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xl">

            {/* Typing text — above feature list, centered */}
            <p className="text-2xl md:text-3xl text-white/60 leading-[1.35] max-w-xl font-normal whitespace-pre-line mb-32">
              {typedText}<span className={`inline-block w-[2px] h-[1.1em] ml-[1px] bg-[#5b8cff] align-middle translate-y-[-1px] transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
            </p>

            {/* Feature list — centered, below typing text */}
            <div className="flex flex-col gap-4 w-full items-center">
              {[
              { text: '100+ debt checks on every push', Icon: TaskDone01Icon, color: 'text-red-500' },
              { text: '8 specialised Claude AI agents', Icon: BotIcon, color: 'text-blue-500' },
              { text: 'Auto-refactor, not rewrite', Icon: GitPullRequestIcon, color: 'text-green-500' },
              { text: 'Instant rollback on failure', Icon: CircleArrowReload01Icon, color: 'text-purple-500' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <f.Icon size={26} className={`${f.color} shrink-0`} strokeWidth={2} />
                <span className="text-[18px] font-medium text-white">{f.text}</span>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Right auth panel — tall, near-full height */}
        <div className="w-full md:w-1/2 bg-cw-bg border border-cw-bdr rounded-[2rem] flex flex-col items-center justify-center p-4 shadow-sm self-stretch">
          <div className="w-full max-w-[480px] flex flex-col items-center justify-center h-full">
            <img src="https://i.ibb.co/3yZPcH69/codeward-logo.png" alt="Codeward Logo" className="w-40 h-40 mb-6 object-contain" />
            
            <h2 className="text-[28px] font-bold tracking-tight text-cw-txt mb-3 text-center">
              Welcome to Codeward
            </h2>
            <p className="text-[15px] text-cw-txt2 mb-6 text-center font-medium">
              Sign in or create your account below.
            </p>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[13px] font-bold mb-6">
              <StarsIcon size={14} />
              Observer tier is always free
            </div>

            {/* OAuth buttons */}
            <div className="w-full flex flex-col gap-4">
              <button
                className={btnClass + " cursor-pointer"}
                onClick={() => handleOAuth('github')}
                disabled={!!loading}
              >
                {loading === 'github' ? <div className="animate-spin w-5 h-5 border-2 border-cw-txt border-t-transparent rounded-full" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" className="w-5 h-5" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }} alt="GitHub" />}
                <span className="text-[15px]">{loading === 'github' ? 'Connecting...' : 'Continue with GitHub'}</span>
              </button>

              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-[1px] bg-cw-bdr"></div>
                <span className="text-[12px] text-cw-txt3 font-bold uppercase tracking-wider">or</span>
                <div className="flex-1 h-[1px] bg-cw-bdr"></div>
              </div>

              <button
                className={btnClass + " opacity-60 cursor-not-allowed"}
                disabled={true}
              >
                <img src="https://i.ibb.co/SDsmVD5S/GITLABLOGO-removebg-preview.png" className="w-5 h-5 object-contain" alt="GitLab" />
                <span className="text-[15px]">Continue with GitLab</span>
              </button>
            </div>

            <div className="text-center mt-6 text-[13px] text-cw-txt3 leading-[1.6]">
              By continuing you agree to Codeward's<br />
              <span onClick={() => navigate('/terms')} className="text-cw-txt2 cursor-pointer hover:underline font-semibold hover:text-cw-txt transition-colors">Terms of Service</span> and <span onClick={() => navigate('/privacy')} className="text-cw-txt2 cursor-pointer hover:underline font-semibold hover:text-cw-txt transition-colors">Privacy Policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

