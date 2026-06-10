import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Use Upstash URL or fallback to local redis
const connection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const commitQueue = new Queue('process-commit', { connection: connection as any });

console.log('BullMQ Queue initialized.');
