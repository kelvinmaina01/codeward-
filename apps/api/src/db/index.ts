import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/codeward';
// Disable prepare as it is not supported for "Transaction" pool mode in Supabase
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

console.log('Database connection initialized.');
