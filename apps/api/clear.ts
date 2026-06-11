import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres.hubafrfddfrrrhgzoxef:paraKenya8%23%26%23@aws-1-eu-central-1.pooler.supabase.com:5432/postgres');
async function run() {
  await sql`TRUNCATE TABLE repositories CASCADE;`;
  console.log('Truncated');
  process.exit(0);
}
run();
