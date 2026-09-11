import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function check() {
  const scores = await sql`SELECT * FROM leaderboard_score ORDER BY score DESC LIMIT 5;`;
  console.log('Top leaderboard scores in DB:', scores);

  if (scores.length > 0) {
    // Opt in the top 2 users so we can test the leaderboard feed
    await sql`UPDATE "user" SET leaderboard_opt_in = true WHERE id = ${scores[0].owner_user_id};`;
    console.log('Opted in user:', scores[0].owner_name);
  }

  const res = await fetch('http://localhost:3000/api/stats/leaderboard');
  const lb = await res.json();
  console.log('API /api/stats/leaderboard result:');
  console.log(JSON.stringify(lb, null, 2));

  if (scores.length > 0) {
    const trajRes = await fetch('http://localhost:3000/api/stats/leaderboard/' + encodeURIComponent(scores[0].entity_id) + '/trajectory');
    const traj = await trajRes.json();
    console.log('API /api/stats/leaderboard/:entityId/trajectory result:');
    console.log(JSON.stringify(traj, null, 2));
  }

  await sql.end();
  process.exit(0);
}

check().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
