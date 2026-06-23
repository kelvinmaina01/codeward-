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

const TYPED_TEXT = "Codeward is your autonomous\ncode quality platform, without\nthe technical debt!";

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
        {/* Left brand panel Ã¢â‚¬â€ centered, feature list above typing text */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-4 md:px-12 py-12 relative text-white font-['DM_Sans']">
          <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xl">

            {/* Typing text Ã¢â‚¬â€ above feature list, centered */}
            <p className="text-2xl md:text-3xl text-white/60 leading-[1.35] max-w-xl font-normal whitespace-pre-line mb-32">
              {typedText}<span className={`inline-block w-[2px] h-[1.1em] ml-[1px] bg-[#5b8cff] align-middle translate-y-[-1px] transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
            </p>

            {/* Feature list Ã¢â‚¬â€ centered, below typing text */}
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

            {/* Dev Community Card */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-purple-600 border border-white/20 rounded-full py-3 px-6 shadow-2xl hover:scale-105 transition-transform w-max">
              <div className="text-[15px] font-bold text-white">
                Join our developer community
              </div>
              <div className="flex items-center gap-3">
                <a href="#" className="text-white hover:text-[#25D366] transition-colors" aria-label="WhatsApp">
                  <svg className="w-6 h-6 opacity-90" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
                <a href="#" className="text-white hover:text-[#5865F2] transition-colors" aria-label="Discord">
                  <svg className="w-6 h-6 opacity-90" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right auth panel Ã¢â‚¬â€ tall, near-full height */}
        <div className="w-full md:w-1/2 bg-cw-bg border border-cw-bdr rounded-[2rem] flex flex-col items-center justify-center p-4 shadow-sm self-stretch">
          <div className="w-full max-w-[480px] flex flex-col items-center justify-center h-full">
            <img src="/logo.png" alt="Codeward Logo" className="w-40 h-40 mb-6 object-contain" />
            
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

