import { hc } from 'hono/client';
import type { AppType } from '../../../../api/src/index';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_URL = (rawApiUrl && !rawApiUrl.includes('your-railway-api'))
  ? rawApiUrl.replace(/\/+$/, '')
  : (isLocalhost ? 'http://localhost:3000' : 'https://codewardapi-production.up.railway.app');

const rawWsUrl = (import.meta.env.VITE_WS_URL || '').trim();
export const WS_URL = (rawWsUrl && !rawWsUrl.includes('your-railway-api'))
  ? rawWsUrl.replace(/\/+$/, '').replace(/\/ws\/feed\/?$/, '')
  : API_URL.replace(/^http/, 'ws').replace(/\/+$/, '').replace(/\/ws\/feed\/?$/, '');



const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
};

export const api = hc<AppType>(API_URL, { fetch: customFetch });
