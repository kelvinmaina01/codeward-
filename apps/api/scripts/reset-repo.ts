import 'dotenv/config';
import pg from 'pg';

const repoName = process.argv[2];
if (!repoName) {
  console.error("❌ Errore: Inserisci il nome del repository da disconnettere.");
  console.error("Esempio: npm run reset-repo AegisCode");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log(`⏳ Disconnessione in corso per: ${repoName}...`);
    await pool.query('DELETE FROM run_logs WHERE repo_id IN (SELECT id FROM repositories WHERE full_name ILIKE $1);', [`%${repoName}%`]);
    await pool.query('DELETE FROM runs WHERE repo_id IN (SELECT id FROM repositories WHERE full_name ILIKE $1);', [`%${repoName}%`]);
    const res = await pool.query('DELETE FROM repositories WHERE full_name ILIKE $1 RETURNING *;', [`%${repoName}%`]);
    
    if (res.rowCount && res.rowCount > 0) {
      console.log(`✅ Successo! Il repository ${res.rows[0].full_name} è stato rimosso dal database.`);
    } else {
      console.log(`⚠️ Nessun repository trovato con il nome: ${repoName}`);
    }
  } catch (e: any) {
    console.error("❌ Errore durante la disconnessione:", e.message);
  } finally {
    pool.end();
  }
})();
