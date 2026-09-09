import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

async function run() {
  try {
    // 1. Any table in public without rowsecurity?
    const noRls = await sql`
      SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND NOT c.relrowsecurity;
    `;
    console.log('Tables in public without RLS:', noRls);

    // 2. Any table in public where anon can SELECT?
    const anonSelect = await sql`
      SELECT table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'anon'
        AND table_schema = 'public'
        AND privilege_type = 'SELECT';
    `;
    console.log('Tables where anon has SELECT permission:', anonSelect.map(r => r.table_name));

    // 3. Tables with sensitive columns where anon has SELECT
    const sensitiveExposed = await sql`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.role_table_grants g 
        ON g.table_name = c.table_name AND g.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND g.grantee = 'anon'
        AND g.privilege_type = 'SELECT'
        AND (
          c.column_name ILIKE '%password%'
          OR c.column_name ILIKE '%token%'
          OR c.column_name ILIKE '%secret%'
          OR c.column_name ILIKE '%email%'
          OR c.column_name ILIKE '%key%'
        )
      GROUP BY c.table_name, c.column_name
      ORDER BY c.table_name, c.column_name;
    `;
    console.log('\n=== SENSITIVE COLUMNS EXPOSED TO ANON ===');
    for (const s of sensitiveExposed) {
      console.log(`❌ ${s.table_name}.${s.column_name}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
