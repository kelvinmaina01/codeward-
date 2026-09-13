import { hc } from 'hono/client';
import type { AppType } from '../../../../api/src/index';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_URL = (rawApiUrl && !rawApiUrl.includes('your-railway-api'))
  ? rawApiUrl.replace(/\/+$/, '')
  : 'https://codewardapi-production.up.railway.app';

const rawWsUrl = (import.meta.env.VITE_WS_URL || '').trim();
export const WS_URL = (rawWsUrl && !rawWsUrl.includes('your-railway-api'))
  ? rawWsUrl.replace(/\/+$/, '')
  : `${API_URL.replace(/^http/, 'ws')}/ws/feed`;



const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
};

export const api = hc<AppType>(API_URL, { fetch: customFetch });
