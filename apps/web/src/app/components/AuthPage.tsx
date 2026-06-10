import { useState } from 'react';
import { Github, ArrowLeft, Eye, EyeOff, Loader } from 'lucide-react';

export interface MockUser {
  name: string;
  login: string;
  avatar: string;
  orgs: string[];
}

const MOCK_USERS: Record<string, MockUser> = {
  github: { name: 'James Kimani', login: 'jkimani', avatar: 'JK', orgs: ['acme-corp', 'personal'] },
  gitlab: { name: 'James Kimani', login: 'jkimani-gl', avatar: 'JK', orgs: ['acme-corp'] },
};

interface Props {
  mode: 'signin' | 'signup';
  onAuth: (user: MockUser) => void;
  onBack: () => void;
}

export function AuthPage({ mode, onAuth, onBack }: Props) {
  const [tab, setTab] = useState<'signin' | 'signup'>(mode);
  const [loading, setLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleOAuth = (provider: 'github' | 'gitlab') => {
    setLoading(provider);
    setTimeout(() => {
      setLoading(null);
      onAuth(MOCK_USERS[provider]);
    }, 1800);
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setTimeout(() => {
      setLoading(null);
      onAuth({ name: email.split('@')[0] || 'Developer', login: email.split('@')[0] || 'dev', avatar: (email[0] || 'D').toUpperCase(), orgs: ['personal'] });
    }, 1200);
  };

  const btnClass = (variant: 'primary' | 'ghost') => {
    const base = "w-full py-[11px] px-4 rounded-lg text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2.5 transition-all duration-200 text-[#e8e8e6] disabled:opacity-70 disabled:cursor-not-allowed";
    if (variant === 'primary') return `${base} border-none bg-cw-green hover:opacity-90`;
    return `${base} border border-[#2a3040] bg-[#161b27] hover:bg-[#1e2535]`;
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] flex font-sans">
      {/* Left brand panel */}
      <div className="flex-1 bg-gradient-to-br from-[#0f1117] to-[#130d20] flex flex-col justify-center px-16 py-15 relative overflow-hidden">
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(109,40,217,0.18)_0%,transparent_70%)] pointer-events-none" />

        <button onClick={onBack} className="absolute top-6 left-6 bg-transparent border-none cursor-pointer text-[#555] flex items-center gap-1.5 text-xs hover:text-[#e8e8e6] transition-colors">
          <ArrowLeft size={14} /> Back to home
        </button>

        <div className="relative z-10">
          <div className="text-[20px] font-bold tracking-tight text-[#e8e8e6] mb-10">
            Code<span className="text-[#8B5CF6]">ward</span>
          </div>

          <h2 className="text-[34px] font-bold tracking-tight text-[#e8e8e6] leading-[1.15] mb-4">
            Your autonomous<br />code guardian<br />awaits.
          </h2>
          <p className="text-sm text-[#555] leading-[1.7] max-w-[340px] mb-12">
            Connect in 30 seconds. No infra changes. The first scan is free — and it will find something you didn't expect.
          </p>

          {/* Mini feature list */}
          {[
            '100+ debt checks on every push',
            '8 specialised Claude AI agents',
            'Auto-refactor, not rewrite',
            'Instant rollback on failure',
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 mb-3">
              <div className="w-[18px] h-[18px] rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-cw-green" />
              </div>
              <span className="text-[13px] text-[#666]">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="w-[460px] bg-[#0a0c10] flex flex-col justify-center px-12 py-15 border-l border-[#1e2535]">

        {/* Tab switcher */}
        <div className="flex mb-8 bg-[#0f1117] border border-[#1e2535] rounded-[10px] p-1">
          {(['signin', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-[7px] text-[13px] font-medium cursor-pointer border-none transition-all duration-150 ${tab === t ? 'bg-[#161b27] text-[#e8e8e6]' : 'bg-transparent text-[#555] hover:text-[#e8e8e6]'}`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <h2 className="text-[22px] font-bold text-[#e8e8e6] mb-1.5 tracking-tight">
          {tab === 'signin' ? 'Welcome back' : 'Start for free'}
        </h2>
        <p className="text-[13px] text-[#555] mb-7">
          {tab === 'signin' ? 'Sign in to your Codeward account' : 'Create your account — Observer tier is always free'}
        </p>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            className={btnClass('ghost')}
            onClick={() => handleOAuth('github')}
            disabled={!!loading}
          >
            {loading === 'github' ? <Loader size={15} className="animate-spin" /> : <Github size={16} />}
            {loading === 'github' ? 'Connecting to GitHub...' : `${tab === 'signin' ? 'Continue' : 'Sign up'} with GitHub`}
          </button>

          <button
            className={btnClass('ghost')}
            onClick={() => handleOAuth('gitlab')}
            disabled={!!loading}
          >
            {loading === 'gitlab' ? <Loader size={15} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E2432A"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/></svg>
            )}
            {loading === 'gitlab' ? 'Connecting to GitLab...' : `${tab === 'signin' ? 'Continue' : 'Sign up'} with GitLab`}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#1e2535]" />
          <span className="text-[11px] text-[#374151]">or continue with email</span>
          <div className="flex-1 h-px bg-[#1e2535]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth}>
          <div className="mb-3">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full py-[11px] px-3.5 bg-[#0f1117] border border-[#2a3040] rounded-lg text-[13px] text-[#e8e8e6] outline-none transition-colors focus:border-[#6D28D9]"
            />
          </div>
          <div className="mb-5 relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full py-[11px] pl-3.5 pr-10 bg-[#0f1117] border border-[#2a3040] rounded-lg text-[13px] text-[#e8e8e6] outline-none transition-colors focus:border-[#6D28D9]"
            />
            <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[#555] hover:text-[#e8e8e6] transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button type="submit" className={btnClass('primary')} disabled={!!loading}>
            {loading === 'email' ? <Loader size={15} className="animate-spin" /> : null}
            {loading === 'email' ? 'Creating account...' : (tab === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        {tab === 'signin' && (
          <div className="text-center mt-4 text-xs text-[#555]">
            <span className="text-[#6D28D9] cursor-pointer hover:underline">Forgot password?</span>
          </div>
        )}

        <div className="text-center mt-6 text-xs text-[#374151]">
          {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span className="text-[#8B5CF6] cursor-pointer hover:underline" onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}>
            {tab === 'signin' ? 'Sign up free' : 'Sign in'}
          </span>
        </div>

        <div className="text-center mt-8 text-[11px] text-[#374151] leading-[1.7]">
          By continuing you agree to Codeward's<br />
          <span className="text-[#555] cursor-pointer hover:underline">Terms of Service</span> and <span className="text-[#555] cursor-pointer hover:underline">Privacy Policy</span>
        </div>
      </div>
    </div>
  );
}
