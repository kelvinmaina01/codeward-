import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/codeward';
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Disable prepare as it is not supported for "Transaction" pool mode in Supabase
// Enforce SSL for remote databases to prevent connection hangs
const client = postgres(connectionString, { 
  prepare: false,
  ssl: isLocal ? false : 'require'
});
export const db = drizzle(client, { schema });

console.log('Database connection initialized.');
