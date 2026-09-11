import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    const users = await sql`SELECT id, name, email FROM "user";`;
    console.log('Users in DB:', users);

    const repos = await sql`SELECT id, user_id, org_id, full_name FROM repositories;`;
    console.log('Repos in DB:', repos);

    const [runsCount] = await sql`SELECT count(*) FROM runs;`;
    console.log('Runs count:', runsCount.count);

    const recentRuns = await sql`SELECT id, repo_id, status, created_at FROM runs ORDER BY created_at DESC LIMIT 5;`;
    console.log('Recent runs:', recentRuns);

    const [logsCount] = await sql`SELECT count(*) FROM run_logs;`;
    console.log('run_logs count:', logsCount.count);

    const recentLogs = await sql`SELECT id, run_id, repo_id, agent, level, message FROM run_logs ORDER BY id DESC LIMIT 10;`;
    console.log('Recent run_logs:', recentLogs);

    const [tasksCount] = await sql`SELECT count(*) FROM agent_tasks;`;
    console.log('agent_tasks count:', tasksCount.count);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
