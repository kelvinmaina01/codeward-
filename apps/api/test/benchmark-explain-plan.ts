import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function benchmark() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log('=== APPLYING MIGRATION: CREATE INDEX IF NOT EXISTS agent_tasks_run_id_idx ===');
    await sql`CREATE INDEX IF NOT EXISTS "agent_tasks_run_id_idx" ON "agent_tasks" USING btree ("run_id");`;
    await sql`ANALYZE "agent_tasks";`;
    console.log('Index created and table analyzed successfully.\n');

    const [countRow] = await sql`SELECT count(*) FROM agent_tasks;`;
    const rowCount = Number(countRow.count);
    console.log(`Row count in agent_tasks: ${rowCount}`);

    const testRunId = 1;

    console.log('\n================== AFTER MIGRATION: EXPLAIN ANALYZE ==================');
    console.log('\n--- Query 1: SELECT WHERE run_id = $1 AND agent_id = \'orchestrator_phase2\' ---');
    const q1Plan = await sql`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM agent_tasks WHERE run_id = ${testRunId} AND agent_id = 'orchestrator_phase2';`;
    console.log(q1Plan.map(r => r['QUERY PLAN']).join('\n'));

    console.log('\n--- Query 2: SELECT WHERE run_id = $1 ---');
    const q2Plan = await sql`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM agent_tasks WHERE run_id = ${testRunId};`;
    console.log(q2Plan.map(r => r['QUERY PLAN']).join('\n'));

    console.log('\n--- Query 3: SELECT WHERE run_id = $1 AND agent_id NOT LIKE \'orchestrator%\' ---');
    const q3Plan = await sql`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM agent_tasks WHERE run_id = ${testRunId} AND agent_id NOT LIKE 'orchestrator%';`;
    console.log(q3Plan.map(r => r['QUERY PLAN']).join('\n'));

  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    await sql.end();
  }
}

benchmark();
