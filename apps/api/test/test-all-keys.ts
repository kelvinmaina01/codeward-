import 'dotenv/config';
import { NativeOpenAIProvider } from '../src/providers/openai.provider.js';
import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import Redis from 'ioredis';
import { emailSender } from '../src/services/email-sender.js';

async function testAllKeys() {
  console.log('='.repeat(70));
  console.log('🚀 TESTING ENVIRONMENT & API KEYS');
  console.log('='.repeat(70));

  // 1. Database
  console.log('\n[1/4] Checking PostgreSQL Database...');
  try {
    const users = await db.select({ id: schema.user.id, email: schema.user.email }).from(schema.user).limit(1);
    console.log(`✅ DB Connected! Sample user check succeeded: ${users.length} user(s) found.`);
  } catch (err: any) {
    console.error(`❌ DB Connection failed:`, err.message);
  }

  // 2. Redis
  console.log('\n[2/4] Checking Redis...');
  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    retryStrategy: () => null,
  });
  try {
    const pong = await redis.ping();
    console.log(`✅ Redis Connected! Ping response: ${pong}`);
  } catch (err: any) {
    console.error(`❌ Redis Connection failed:`, err.message);
  } finally {
    redis.disconnect();
  }

  // 3. AI Providers
  console.log('\n[3/4] Checking AI Provider Candidates & API Keys...');
  const provider = new NativeOpenAIProvider();
  const candidates = provider.resolveCandidates({
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a test helper.',
    messages: [{ role: 'user', content: 'Say "OK"' }],
  });

  console.log(`Discovered ${candidates.length} candidate AI provider(s):`);
  for (const c of candidates) {
    const maskedKey = c.apiKey ? `${c.apiKey.slice(0, 7)}...${c.apiKey.slice(-4)}` : '(none)';
    console.log(`  • ${c.name} [model: ${c.model}] at ${c.baseUrl} (key: ${maskedKey})`);
  }

  if (candidates.length === 0) {
    console.error('❌ Zero AI candidates resolved! Check OPENAI_API_KEY, TOKENROUTER_API_KEY, etc.');
  } else {
    for (const c of candidates) {
      process.stdout.write(`  Testing ${c.name} (${c.model})... `);
      const start = Date.now();
      try {
        const payload: any = {
          model: c.model,
          messages: [{ role: 'user', content: 'respond with the word OK' }],
          max_tokens: 5,
        };
        const sanitized = c.sanitizePayload ? c.sanitizePayload(payload) : payload;
        const res = await fetch(`${c.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${c.apiKey}`,
            ...(c.headers || {}),
          },
          body: JSON.stringify(sanitized),
        });

        const elapsed = Date.now() - start;
        if (res.ok) {
          const data: any = await res.json();
          const reply = data.choices?.[0]?.message?.content?.trim() || '(no content)';
          console.log(`✅ SUCCESS (${elapsed}ms) -> "${reply}"`);
        } else {
          const text = await res.text();
          console.log(`⚠️ FAILED (${res.status} ${res.statusText}) in ${elapsed}ms -> ${text.slice(0, 150)}`);
        }
      } catch (err: any) {
        console.log(`❌ ERROR -> ${err.message}`);
      }
    }
  }

  // 4. Email Providers
  console.log('\n[4/4] Checking Email Providers (Resend / Eusend fallback)...');
  const resendKey = process.env.RESEND_API_KEY;
  const eusendKey = process.env.EUSEND_API_KEY;
  console.log(`  • Resend API Key: ${resendKey ? 'Configured (' + resendKey.slice(0, 7) + '...)' : 'MISSING'}`);
  console.log(`  • Eusend API Key: ${eusendKey ? 'Configured (' + eusendKey.slice(0, 7) + '...)' : 'MISSING'}`);

  console.log('\n' + '='.repeat(70));
  console.log('🏁 KEY VERIFICATION COMPLETE');
  console.log('='.repeat(70));
  process.exit(0);
}

testAllKeys().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
