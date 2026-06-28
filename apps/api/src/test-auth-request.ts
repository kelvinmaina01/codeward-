import 'dotenv/config';
import { auth } from './auth/index.js';

async function test() {
  console.log("Testing auth handler with github sign-in mock request...");
  
  const mockReq = new Request('https://codeward-backend-production.up.railway.app/api/auth/sign-in/social', {
    method: 'POST',
    headers: {
      'Origin': 'https://codeward-frontend-production.up.railway.app',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      provider: 'github',
      callbackURL: 'https://codeward-frontend-production.up.railway.app'
    })
  });

  try {
    const res = await auth.handler(mockReq);
    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log("Response body:", body);
  } catch (err) {
    console.error("Auth handler threw an error:", err);
  }
  
  process.exit(0);
}

test();
