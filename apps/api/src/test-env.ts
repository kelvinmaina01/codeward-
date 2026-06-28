import 'dotenv/config';
import { db } from './db/index.js';
import { auth } from './auth/index.js';
import * as schema from './db/schema.js';

async function test() {
  console.log("Testing ENVs...");
  try {
    const users = await db.select().from(schema.user).limit(1);
    console.log("DB connection successful, users:", users);
  } catch (err) {
    console.error("DB connection failed:", err);
  }

  try {
    console.log("Auth object initialized:", !!auth);
  } catch (err) {
    console.error("Auth initialization failed:", err);
  }
  process.exit(0);
}

test();
