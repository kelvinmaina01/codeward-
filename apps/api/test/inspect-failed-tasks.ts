import 'dotenv/config';
import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { inArray, desc } from 'drizzle-orm';

async function main() {
  const failed = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.id, [136, 135, 134, 133, 132, 131, 130, 129]));
  for (const t of failed) {
    console.log(`Task #${t.id} (${t.agentId}): status=${t.status}`);
    console.log(`  Error: ${t.error}`);
    console.log(`  Duration: ${t.duration}`);
    console.log(`  Created: ${t.createdAt}, Completed: ${t.completedAt}`);
  }

  // Also check run #77 task #138
  const task138 = await db.select().from(schema.agentTasks).where(schema.eq(schema.agentTasks.id, 138));
  console.log('Task #138:', task138[0]);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
