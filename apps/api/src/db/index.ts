import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/codeward';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Configure pool sizes to prevent starvation between HTTP server and background workers
export const DB_POOL_MAX = Number(process.env.DB_POOL_MAX || 25);
export const WORKER_DB_POOL_MAX = Number(process.env.WORKER_DB_POOL_MAX || 25);

// Client instance for HTTP API requests
export const client = postgres(connectionString, { 
  max: DB_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  ssl: isLocal ? false : 'require'
});
export const db = drizzle(client, { schema });

// Separate dedicated client instance for BullMQ workers / queue jobs
export const workerClient = postgres(connectionString, {
  max: WORKER_DB_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  ssl: isLocal ? false : 'require'
});
export const workerDb = drizzle(workerClient, { schema });

console.log(`Database connection initialized (HTTP Pool Max: ${DB_POOL_MAX}, Worker Pool Max: ${WORKER_DB_POOL_MAX}).`);

