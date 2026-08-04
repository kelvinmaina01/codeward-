import 'dotenv/config';
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Creating connector_requests table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS connector_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id integer REFERENCES organization(id) ON DELETE CASCADE,
      requested_by text REFERENCES "user"(id) ON DELETE SET NULL,
      tool_name varchar(100) NOT NULL,
      use_case text,
      notify_email varchar(255),
      status varchar(20) NOT NULL DEFAULT 'pending',
      vote_count integer NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    );
  `);
  console.log('connector_requests done.');

  console.log('Creating mcp_servers table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id integer REFERENCES organization(id) ON DELETE CASCADE,
      created_by text REFERENCES "user"(id) ON DELETE SET NULL,
      provider varchar(50) NOT NULL,
      display_name varchar(100) NOT NULL,
      encrypted_credentials text,
      status varchar(20) NOT NULL DEFAULT 'pending',
      agent_access jsonb NOT NULL DEFAULT '{}',
      config jsonb NOT NULL DEFAULT '{}',
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    );
  `);
  console.log('mcp_servers done.');

  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
