import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useSession } from '../../lib/auth';
import { API_URL } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // We no longer wait for authentication. The token itself is the auth!
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invitation link.');
      return;
    }

    const acceptInvite = async () => {
      try {
        const response = await fetch(`${API_URL}/api/workspaces/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to accept invitation.');
          return;
        }

        setStatus('success');
        toast.success(data.message || 'Successfully joined the workspace!');
        
        // Wait 2 seconds, then redirect to dashboard. The API response included a session cookie,
        // so the user is now fully authenticated!
        setTimeout(() => {
          // Force a full window location reload to ensure Better-Auth picks up the new cookie session
          window.location.href = '/dashboard';
        }, 2000);
      } catch (err) {
        setStatus('error');
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    };

    // Prevent double-fetching in React Strict Mode if already processed
    if (status === 'loading') {
      acceptInvite();
    }
  }, [token]);

  // We no longer block rendering based on session state since this is a passwordless flow


  return (
    <div className="min-h-screen bg-cw-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-cw-bg2 border border-cw-bdr rounded-2xl p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-cw-txt mb-6">Workspace Invitation</h1>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-10 h-10 text-cw-purple animate-spin" />
            <p className="text-cw-txt2 text-sm">Verifying your invitation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-cw-txt text-lg font-medium">Invitation Accepted!</p>
            <p className="text-cw-txt3 text-sm">Redirecting you to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-cw-txt text-lg font-medium">Invalid Invitation</p>
            <p className="text-cw-txt2 text-sm">{errorMsg}</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2 bg-cw-bg3 hover:bg-cw-bdr border border-cw-bdr text-cw-txt rounded-xl transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
