import dotenv from 'dotenv';
import { createRedisConnection } from '../lib/redis.js';

dotenv.config();

const connection = createRedisConnection();

export * from './webhook.queue.js';
