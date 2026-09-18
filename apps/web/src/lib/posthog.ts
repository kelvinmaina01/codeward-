let posthogClient: any = null;
let sentryClient: any = null;

// Project-identifying telemetry credentials are env-only — never baked into a public repo.
// Both are already guarded by `if (SENTRY_DSN)` / `if (POSTHOG_KEY)` below, so a build without
// them simply skips that SDK and every exported helper stays a safe no-op.
// POSTHOG_HOST keeps its default: it is PostHog's public SaaS ingest endpoint, not a credential,
// and dropping it would break api_host for self-hosted-agnostic builds.
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

let initialized = false;

const safeImport = (moduleName: string) => {
  try {
    return new Function('m', 'return import(m)')(moduleName);
  } catch (e) {
    return Promise.reject(e);
  }
};

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  setTimeout(async () => {
    try {
      if (SENTRY_DSN) {
        try {
          const Sentry = await safeImport('@sentry/browser');
          sentryClient = Sentry;
          Sentry?.init?.({
            dsn: SENTRY_DSN,
            tracesSampleRate: 0.1,
          });
        } catch (e) {
          // Sentry optional fallback
        }
      }

      if (POSTHOG_KEY) {
        try {
          const posthogModule = await safeImport('posthog-js');
          const ph = posthogModule?.default || posthogModule;
          posthogClient = ph;
          ph?.init?.(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: true,
            capture_pageleave: true,
            autocapture: false,
            loaded: (instance: any) => {
              try {
                const sessionId = instance?.get_session_id?.();
                if (sessionId && sentryClient?.getCurrentScope) {
                  sentryClient.getCurrentScope().setTag('posthog_session_id', sessionId);
                }
              } catch (e) {
                // Ignore scope tag error
              }
            },
          });
        } catch (e) {
          // PostHog optional fallback
        }
      }
    } catch (err) {
      console.warn('[Analytics] Deferred initialization skipped:', err);
    }
  }, 1000);
}

export const posthog = {
  capture: (event: string, properties?: Record<string, any>) => {
    try { posthogClient?.capture?.(event, properties); } catch (e) { console.error('[PostHog] Capture error:', e); }
  }
};

export const Sentry = {
  captureException: (error: any, context?: any) => {
    try { sentryClient?.captureException?.(error, context); } catch (e) { console.error('[Sentry] Capture error:', e); }
  }
};
