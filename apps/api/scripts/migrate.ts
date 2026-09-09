import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

// Disable prepare for the Supabase transaction pooler.
const migrationClient = postgres(connectionString, { max: 1, prepare: false });

async function runMigrate() {
  const db = drizzle(migrationClient);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations complete!');
  process.exit(0);
}

runMigrate().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
});
