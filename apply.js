const postgres = require('postgres');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: 'apps/api/.env' });

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });

async function run() {
  const sqlContent = fs.readFileSync('apps/api/drizzle/0002_funny_mephistopheles.sql', 'utf8');
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const stmt of statements) {
    try {
      await client.unsafe(stmt);
      console.log('Executed:', stmt.substring(0, 50) + '...');
    } catch (e) {
      console.error('Failed to execute:', stmt);
      console.error(e);
      // Ignore errors for existing columns
    }
  }
  
  console.log('Migration applied.');
  process.exit(0);
}

run();
