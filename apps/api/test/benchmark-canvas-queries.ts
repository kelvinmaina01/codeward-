import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function benchmark() {
  const connectionString = process.env.DATABASE_URL!;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const sql = postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : 'require',
  });

  try {
    console.log('Testing CTE recent runs query with EXPLAIN ANALYZE...');

    const plan = await sql`
      EXPLAIN (ANALYZE, BUFFERS)
      WITH recent AS (
        SELECT id, status, repo_id, commit_sha, score, created_at
        FROM runs
        ORDER BY created_at DESC
        LIMIT 10
      )
      SELECT *
      FROM recent
      ORDER BY
        CASE WHEN status = 'running' THEN 1 ELSE 2 END,
        (EXISTS (SELECT 1 FROM agent_tasks t WHERE t.run_id = recent.id)) DESC,
        created_at DESC
      LIMIT 1;
    `;
    console.log(plan.map(r => r['QUERY PLAN']).join('\n'));

    let t0 = performance.now();
    const [targetRun] = await sql`
      WITH recent AS (
        SELECT id, status, repo_id, commit_sha, score, created_at
        FROM runs
        ORDER BY created_at DESC
        LIMIT 10
      )
      SELECT *
      FROM recent
      ORDER BY
        CASE WHEN status = 'running' THEN 1 ELSE 2 END,
        (EXISTS (SELECT 1 FROM agent_tasks t WHERE t.run_id = recent.id)) DESC,
        created_at DESC
      LIMIT 1;
    `;
    let t1 = performance.now();
    console.log(`Execution result: Run ID ${targetRun?.id}, status: ${targetRun?.status}`);

  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    await sql.end();
  }
}

benchmark();
