import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';

async function run() {
  const accounts = await db.select().from(schema.account).limit(1);
  if (!accounts.length) {
    console.log('No accounts');
    process.exit(0);
  }
  const token = accounts[0].accessToken;
  const ghRes = await fetch('https://api.github.com/user/installations', {
    headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Codeward-App' }
  });
  console.log('Scopes:', ghRes.headers.get('x-oauth-scopes'));
  const data = await ghRes.json();
  console.log('Installations Data:', JSON.stringify(data, null, 2));
  process.exit(0);
}

run().catch(console.error);
