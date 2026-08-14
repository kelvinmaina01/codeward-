let posthogClient: any = null;
let sentryClient: any = null;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_mGYo7kQ8SjppUerjFEawikA4DjnKsitzhad5oxrzS4r7';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || 'https://698b121fce17c5fa06d9c78985380861@o4511559899348992.ingest.us.sentry.io/4511559899611136';

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
    try { posthogClient?.capture?.(event, properties); } catch (e) {}
  }
};

export const Sentry = {
  captureException: (error: any, context?: any) => {
    try { sentryClient?.captureException?.(error, context); } catch (e) {}
  }
};
