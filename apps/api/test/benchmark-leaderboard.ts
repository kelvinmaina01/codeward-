import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log('Benchmarking Leaderboard Aggregation Query...');
    const t0 = performance.now();
    const rows = await sql`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT
        u.id as user_id,
        u.name,
        u.image,
        u.leaderboard_opt_in,
        COALESCE(SUM((t.report_meta->>'linesRemoved')::int), 0) as lines_removed,
        COALESCE(SUM((t.report_meta->>'fixedCount')::int), 0) as fixed_count,
        COALESCE(SUM(
          CASE 
            WHEN jsonb_typeof(t.report_meta->'autoFixPR'->'appliedFixes') = 'array' 
            THEN jsonb_array_length(t.report_meta->'autoFixPR'->'appliedFixes') 
            ELSE 0 
          END
        ), 0) as applied_fixes,
        MIN(org.github_login) as org_name
      FROM "user" u
      LEFT JOIN repositories r ON r.user_id = u.id
      LEFT JOIN runs rn ON rn.repo_id = r.id
      LEFT JOIN agent_tasks t ON t.run_id = rn.id
      LEFT JOIN organization org ON org.id = r.org_id
      WHERE u."isDeleted" = false
      GROUP BY u.id, u.name, u.image, u.leaderboard_opt_in;
    `;
    const t1 = performance.now();
    console.log(rows.map(r => r['QUERY PLAN']).join('\n'));
    console.log(`\nQuery plan benchmarked in ${(t1 - t0).toFixed(2)}ms`);

    // Fetch actual data
    const data = await sql`
      SELECT
        u.id as user_id,
        u.name,
        u.image,
        u.leaderboard_opt_in,
        COALESCE(SUM((t.report_meta->>'linesRemoved')::int), 0) as lines_removed,
        COALESCE(SUM((t.report_meta->>'fixedCount')::int), 0) as fixed_count,
        COALESCE(SUM(
          CASE 
            WHEN jsonb_typeof(t.report_meta->'autoFixPR'->'appliedFixes') = 'array' 
            THEN jsonb_array_length(t.report_meta->'autoFixPR'->'appliedFixes') 
            ELSE 0 
          END
        ), 0) as applied_fixes,
        MIN(org.github_login) as org_name
      FROM "user" u
      LEFT JOIN repositories r ON r.user_id = u.id
      LEFT JOIN runs rn ON rn.repo_id = r.id
      LEFT JOIN agent_tasks t ON t.run_id = rn.id
      LEFT JOIN organization org ON org.id = r.org_id
      WHERE u."isDeleted" = false
      GROUP BY u.id, u.name, u.image, u.leaderboard_opt_in;
    `;
    console.log('Actual data rows count:', data.length);
    console.log('Sample row:', data[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
