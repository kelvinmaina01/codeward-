import { hc } from 'hono/client';
import type { AppType } from '../../../../api/src/index';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL = API_URL.replace('http', 'ws');

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
};

export const api = hc<AppType>(API_URL, { fetch: customFetch });
