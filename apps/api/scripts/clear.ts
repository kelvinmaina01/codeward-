import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}
const sql = postgres(dbUrl);
async function run() {
  await sql`TRUNCATE TABLE repositories CASCADE;`;
  console.log('Truncated');
  process.exit(0);
}
run();
