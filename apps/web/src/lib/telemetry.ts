import { posthog } from './posthog';

export type ConsentLevel = 'necessary' | 'custom' | 'all';

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CONSENT_STORAGE_KEY = 'codeward_cookie_consent';
const CONSENT_PREFS_KEY = 'codeward_cookie_preferences';
const VISITOR_ID_KEY = 'codeward_visitor_id';
const SESSION_ID_KEY = 'codeward_session_id';

// Helper to get or set persistent cookie
function getCookie(name: string): string | null {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  } catch {}
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${d.toUTCString()}`;
    document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax; Secure`;
  } catch {}
}

// Generate persistent Visitor ID & Session ID
export function getVisitorId(): string {
  let vid = getCookie(VISITOR_ID_KEY) || localStorage.getItem(VISITOR_ID_KEY);
  if (!vid) {
    vid = 'vid_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    setCookie(VISITOR_ID_KEY, vid, 365);
    try { localStorage.setItem(VISITOR_ID_KEY, vid); } catch {}
  }
  return vid;
}

export function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sid) {
    sid = 'sid_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    try { sessionStorage.setItem(SESSION_ID_KEY, sid); } catch {}
  }
  return sid;
}

// Parse UTM Parameters
export function getUTMParams(): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'gclid'];
    utmKeys.forEach(key => {
      const val = urlParams.get(key);
      if (val) params[key] = val;
    });
  } catch {}
  return params;
}

// Check Cookie Consent
export function getConsentPreferences(): ConsentPreferences {
  try {
    const level = localStorage.getItem(CONSENT_STORAGE_KEY) as ConsentLevel | null;
    const rawPrefs = localStorage.getItem(CONSENT_PREFS_KEY);
    
    if (level === 'all') {
      return { necessary: true, analytics: true, marketing: true };
    }
    if (level === 'necessary') {
      return { necessary: true, analytics: false, marketing: false };
    }
    if (rawPrefs) {
      return JSON.parse(rawPrefs);
    }
  } catch {}
  return { necessary: true, analytics: false, marketing: false };
}

export function updateConsentPreferences(level: ConsentLevel, prefs?: Partial<ConsentPreferences>) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, level);
    const updated: ConsentPreferences = {
      necessary: true,
      analytics: level === 'all' || prefs?.analytics === true,
      marketing: level === 'all' || prefs?.marketing === true,
    };
    localStorage.setItem(CONSENT_PREFS_KEY, JSON.stringify(updated));

    // Track consent change
    trackEvent('cookie_consent_updated', {
      consent_level: level,
      analytics_enabled: updated.analytics,
      marketing_enabled: updated.marketing,
    });
  } catch {}
}

// Global Core Event Tracker
export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  try {
    const prefs = getConsentPreferences();
    // Respect consent: Non-essential events skip tracking if analytics is disabled, except for cookie consent updates & essential navigation
    if (!prefs.analytics && !['cookie_consent_updated', 'page_view', 'session_start'].includes(eventName)) {
      return;
    }

    const payload = {
      event: eventName,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || 'direct',
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...getUTMParams(),
      ...properties,
    };

    // Console debugging in dev
    if (import.meta.env.DEV) {
      console.log(`[Telemetry 📊] Event captured: ${eventName}`, payload);
    }

    // Forward to PostHog analytics engine safely
    posthog.capture(eventName, payload);
  } catch (err) {
    console.warn('[Telemetry] Capture failed:', err);
  }
}
