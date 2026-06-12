import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const organization = pgTable('organization', {
  id: serial('id').primaryKey(),
  githubLogin: varchar('github_login', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const organizationMember = pgTable('organization_member', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const repositories = pgTable('repositories', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  orgId: integer('org_id').references(() => organization.id, { onDelete: 'cascade' }),
  githubRepoId: integer('github_repo_id'),
  installationId: integer('installation_id'),
  status: varchar('status', { length: 50 }).default('pending_audit').notNull(),
  auditTriggeredAt: timestamp('audit_triggered_at'),
  auditCompletedAt: timestamp('audit_completed_at'),
  baselineScore: integer('baseline_score'),
  fullName: varchar('full_name', { length: 255 }).notNull().unique(), // e.g. "kelvinmaina01/my-repo"
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  language: varchar('language', { length: 100 }),
  isPrivate: boolean('is_private').notNull().default(false),
  config: jsonb('config').default({
    agents: {
      security: true,
      bloat: true,
      broken_code: true,
      architecture: true,
      ai_era: true,
      compliance: true,
      data_dx: true
    }
  }),
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

// Better Auth Tables (Phase 2)
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull(),
	image: text('image'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId').notNull().references(() => user.id)
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId').notNull().references(() => user.id),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	createdAt: timestamp('createdAt'),
	updatedAt: timestamp('updatedAt')
});
