import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Use Upstash URL or fallback to local redis
const connection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export * from './audit.queue.js';
export * from './webhook.queue.js';
