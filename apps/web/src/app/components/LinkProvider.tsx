import { useState } from 'react';
import { Shield, Github } from 'lucide-react';
import { authClient } from '../../lib/auth';
import { toast } from 'sonner';

export function LinkProvider() {
  const [loading, setLoading] = useState(false);

  const handleLinkGitHub = async () => {
    setLoading(true);
    try {
      // Better Auth supports linking accounts via signIn.social or linkSocial depending on version.
      // Usually signIn.social while an active session exists links the account automatically.
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: window.location.origin + '/connect',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect GitHub account');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-cw-bg text-cw-txt font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-cw-bg2 border border-cw-bdr rounded-2xl p-8 shadow-xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-cw-purple/10 rounded-2xl flex items-center justify-center mb-6 border border-cw-purple/20">
          <Shield size={32} className="text-cw-purple" />
        </div>
        
        <h1 className="text-2xl font-bold mb-3 tracking-tight">Connect your Repository</h1>
        <p className="text-[14px] text-cw-txt2 mb-8 leading-relaxed">
          Welcome to Codeward! To start analyzing your code and keeping your technical debt in check, we need access to your repositories.
        </p>

        <button
          onClick={handleLinkGitHub}
          disabled={loading}
          className="w-full h-12 bg-cw-bg border border-cw-bdr hover:border-cw-txt3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
        >
          {loading ? (
             <div className="animate-spin w-5 h-5 border-2 border-cw-txt border-t-transparent rounded-full" />
          ) : (
            <Github size={20} />
          )}
          <span>{loading ? 'Connecting...' : 'Connect GitHub Account'}</span>
        </button>

        <p className="text-[12px] text-cw-txt3 mt-6">
          Codeward only asks for the permissions necessary to perform code reviews and audits.
        </p>
      </div>
    </div>
  );
}
