import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

export const repositories = pgTable('repositories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const runs = pgTable('runs', {
  id: serial('id').primaryKey(),
  repoId: integer('repo_id').references(() => repositories.id),
  commitSha: varchar('commit_sha', { length: 40 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'queued', 'running', 'completed', 'failed'
  score: integer('score'),
  createdAt: timestamp('created_at').defaultNow(),
});
