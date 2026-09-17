import React, { Component, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.tsx';
import './styles/index.css';
import { initAnalytics, Sentry } from './lib/posthog';

// Initialize PostHog & Sentry analytics
initAnalytics();

// Vite chunk load error auto-recovery (handles stale deployment asset hashes)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = sessionStorage.getItem('codeward_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('codeward_chunk_reload', now.toString());
    window.location.reload();
  }
});

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null; isChunkError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    Sentry.captureException(error);

    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem('codeward_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('codeward_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('codeward_chunk_reload');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkError;

      return (
        <div className="min-h-screen bg-[#07090E] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-[#0D121F] border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl relative overflow-hidden">
            <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
              {isChunk ? '🔄' : '⚠️'}
            </div>

            <h2 className="text-xl font-bold text-slate-50 tracking-tight mb-2">
              {isChunk ? 'New Version Available' : 'Something went wrong'}
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              {isChunk
                ? 'Codeward was just updated in production. Please refresh to load the latest release.'
                : 'An unexpected application error occurred. Reloading usually resolves the issue.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                Refresh App
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard'; }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-medium text-sm rounded-xl border border-slate-700/60 transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>

            {!isChunk && process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-6 p-4 text-left text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-xl overflow-x-auto max-h-40 font-mono">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
