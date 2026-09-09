import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('Testing Redis connection to:', url.replace(/:[^:@]+@/, ':****@'));

  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null, // Don't retry indefinitely for test
  });

  redis.on('error', (err) => {
    console.error('❌ Redis Error Event:', err.message);
  });

  try {
    const pong = await redis.ping();
    console.log('✅ Redis PONG successful:', pong);
  } catch (err: any) {
    console.error('❌ Redis Connection Failed:', err.message);
  } finally {
    redis.disconnect();
  }
}

testRedis();
