import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('No DATABASE_URL in .env');
  process.exit(1);
}
console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':****@'));

const sql = postgres(dbUrl, { ssl: 'require' });

async function run() {
  try {
    // 1. Check all tables in public schema and their RLS status
    const tables = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log('\n=== Public Schema Tables and RLS Status ===');
    for (const t of tables) {
      console.log(`Table: ${t.tablename.padEnd(25)} | RLS: ${t.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    }

    // 2. Check existing RLS policies
    const policies = await sql`
      SELECT tablename, policyname, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    console.log(`\n=== Existing Policies: ${policies.length} ===`);
    for (const p of policies) {
      console.log(` - ${p.tablename}: ${p.policyname} (${p.cmd}) for ${p.roles}`);
    }

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await sql.end();
  }
}

run();
