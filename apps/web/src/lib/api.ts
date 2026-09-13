import { hc } from 'hono/client';
import type { AppType } from '../../../../api/src/index';

export const API_URL = import.meta.env.VITE_API_URL || 'https://codewardapi-production.up.railway.app';
export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://codewardapi-production.up.railway.app/ws/feed';


const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
};

export const api = hc<AppType>(API_URL, { fetch: customFetch });
