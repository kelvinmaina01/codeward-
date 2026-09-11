import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const cols = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user';
    `;
    console.log('Columns in "user":', cols);

    console.log('Adding leaderboard_opt_in column if not exists...');
    await sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "leaderboard_opt_in" boolean DEFAULT true NOT NULL;`;
    console.log('Column leaderboard_opt_in verified.');
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
