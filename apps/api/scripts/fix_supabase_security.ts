import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function fixSecurity() {
  console.log('🔒 Starting Supabase Security Hardening...\n');

  try {
    // 1. Ensure RLS is explicitly enabled on every table in public schema
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `;

    console.log(`1. Ensuring RLS is enabled on all ${tables.length} tables in public schema...`);
    for (const t of tables) {
      await sql`ALTER TABLE ${sql(t.tablename)} ENABLE ROW LEVEL SECURITY;`;
    }
    console.log('   ✅ RLS enabled on all tables in public schema.\n');

    // 2. Revoke all permissions from anon and authenticated on public tables
    console.log('2. Revoking public PostgREST permissions from anon and authenticated roles...');
    await sql`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`;
    await sql`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;`;
    await sql`REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;`;
    console.log('   ✅ Revoked all current table, sequence, and routine privileges.\n');

    // 3. Alter default privileges so future tables created by migrations don\'t expose to anon/authenticated
    console.log('3. Updating default privileges for future tables...');
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;`;
    await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;`;
    console.log('   ✅ Default privileges hardened.\n');

    // 4. Verify no sensitive columns are exposed to anon or authenticated
    const exposed = await sql`
      SELECT c.table_name, c.column_name, g.grantee, g.privilege_type
      FROM information_schema.columns c
      JOIN information_schema.role_table_grants g 
        ON g.table_name = c.table_name AND g.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND g.grantee IN ('anon', 'authenticated')
      GROUP BY c.table_name, c.column_name, g.grantee, g.privilege_type;
    `;

    console.log(`4. Audit verification: ${exposed.length} columns exposed to anon/authenticated.`);
    if (exposed.length === 0) {
      console.log('   ✅ ZERO tables or columns are exposed to public PostgREST API!');
    } else {
      console.warn('   ⚠️ Remaining exposed items:', exposed);
    }

    // 5. Verify that our backend app connection still works perfectly
    const countTest = await sql`SELECT count(*) FROM "user";`;
    console.log('\n5. Verifying Codeward backend direct connection:');
    console.log(`   ✅ Direct PostgreSQL query succeeded: ${countTest[0].count} users found.`);

    console.log('\n🎉 Supabase Security Hardening Completed Successfully!');
  } catch (err) {
    console.error('Error hardening database:', err);
  } finally {
    await sql.end();
  }
}

fixSecurity();
