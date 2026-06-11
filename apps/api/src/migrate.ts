import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function migrate() {
  console.log('Running migration...');
  
  // Drop old repositories table and recreate with proper schema
  await sql.unsafe(`
    DROP TABLE IF EXISTS runs;
    DROP TABLE IF EXISTS repositories;
    
    CREATE TABLE repositories (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id),
      full_name VARCHAR(255) NOT NULL UNIQUE,
      owner VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      language VARCHAR(100),
      is_private BOOLEAN NOT NULL DEFAULT false,
      config JSONB DEFAULT '{"agents":{"security":true,"bloat":true,"broken_code":true,"architecture":true,"ai_era":true,"compliance":true,"data_dx":true}}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE runs (
      id SERIAL PRIMARY KEY,
      repo_id INTEGER REFERENCES repositories(id),
      commit_sha VARCHAR(40) NOT NULL,
      status VARCHAR(50) NOT NULL,
      score INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Migration complete!');
  await sql.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
