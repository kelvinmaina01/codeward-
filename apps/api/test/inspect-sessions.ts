import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const sessions = await sql`
      SELECT s.id, s."userId", s."expiresAt", u.name, u.email 
      FROM session s 
      JOIN "user" u ON s."userId" = u.id 
      ORDER BY s."expiresAt" DESC;
    `;
    console.log('Active sessions in DB:', sessions);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
