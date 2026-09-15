export const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://codeward.cloud',
  'https://www.codeward.cloud',
  'https://app.codeward.cloud',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;
  const trimmed = origin.trim().replace(/\/+$/, '');
  if (allowedOrigins.some(o => o.replace(/\/+$/, '') === trimmed)) {
    return true;
  }
  if (/^https:\/\/([a-zA-Z0-9-]+\.)?codeward\.cloud$/.test(trimmed)) {
    return true;
  }
  return false;
}

export const corsConfig = {
  origin: (origin: string | undefined) => {
    // Only return explicitly allowed origins to prevent credentials hijacking
    if (origin && isAllowedOrigin(origin)) {
      return origin;
    }
    return '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Chat-Session-Id'],
  credentials: true,
  maxAge: 600,
};
