import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_URL } from '../../lib/api';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    if (!acceptedTerms) {
      setStatus('error');
      setMessage('Please accept the Terms of Service and Privacy Policy before joining.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, acceptedTerms }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || "🎉 Success! You're subscribed to Codeward updates.");
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      console.error('Newsletter submission error:', err);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="mb-16 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/50 backdrop-blur-sm p-8 md:p-10 rounded-3xl border border-black/10 shadow-sm">
      <div className="max-w-lg">
        <h4 className="text-black text-2xl font-black mb-3 tracking-tight">Subscribe to our newsletter</h4>
        <p className="text-black/60 text-base font-medium">
          Get the latest updates on autonomous engineering, product releases, and technical debt management delivered to your inbox.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full lg:w-[480px] shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-full p-1.5 pl-5 shadow-sm w-full border border-black/10">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
            placeholder="Enter your email address"
            className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/40 font-medium"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-black text-white px-7 py-3 rounded-full text-sm font-bold hover:bg-black/80 transition-colors shrink-0 shadow-md flex items-center gap-2 disabled:opacity-70"
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Subscribing…
              </>
            ) : (
              <>Start for free &rarr;</>
            )}
          </button>
        </form>

        {/* Terms & Privacy checkbox requirement */}
        <div className="flex items-center gap-2 px-2">
          <input
            type="checkbox"
            id="footer-newsletter-terms"
            checked={acceptedTerms}
            onChange={(e) => { setAcceptedTerms(e.target.checked); setStatus('idle'); }}
            className="w-4 h-4 rounded border-black/20 text-black focus:ring-black accent-black cursor-pointer"
          />
          <label htmlFor="footer-newsletter-terms" className="text-xs text-black/70 font-medium cursor-pointer select-none">
            I agree to the{' '}
            <a href="/terms" className="underline font-semibold hover:text-black">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="underline font-semibold hover:text-black">Privacy Policy</a> before joining.
          </label>
        </div>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-800 text-xs font-semibold rounded-xl animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
