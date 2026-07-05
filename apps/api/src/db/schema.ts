import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, real, uuid } from "drizzle-orm/pg-core";

export interface Finding {
  severity: "info" | "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
}

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
  status: varchar('status', { length: 50 }).notNull(), // 'queued', 'running', 'completed', 'failed', 'agent_failed'
  visibility: varchar('visibility', { length: 20 }).default('private').notNull(), // 'private' or 'public'
  score: integer('score'),
  rawLogs: text('raw_logs'), // Stores exact sandbox logs for Dashboard
  // null = comprehensive full-repo run (first connect). For incremental push runs:
  // { incremental: true, beforeSha, changedFiles: string[] } — every agent job for this run
  // reads it and scopes analysis to the changed files instead of rescanning the whole repo.
  scope: jsonb('scope'),
  // Set when this run analyzes a specific pull request (human-opened). Drives guardian's
  // real review of that PR after Phase 3. null for push/first-connect runs.
  prNumber: integer('pr_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const runResults = pgTable('run_results', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  agentName: varchar('agent_name', { length: 100 }).notNull(), // e.g. 'trufflehog', 'jest'
  passed: boolean('passed').notNull(),
  output: jsonb('output'), // The raw parsed JSON
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Agent Tasks — tracks individual agent runs within a parent run.
 * 
 * Each row represents one agent execution (Security, Bloat, etc.)
 * running against one commit. The provider and model fields enable
 * full audit trail — you can see exactly which LLM powered each analysis.
 */
export const agentTasks = pgTable('agent_tasks', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 100 }).notNull(),         // 'security', 'bloat', etc.
  status: varchar('status', { length: 50 }).notNull(),              // 'queued','running','completed','failed'
  provider: varchar('provider', { length: 50 }).default('anthropic'),
  model: varchar('model', { length: 100 }),
  score: integer('score'),
  findingsCount: integer('findings_count').default(0),
  findings: jsonb('findings'),                                      // AgentFinding[]
  reportMeta: jsonb('report_meta'),                                 // { gateDecision, toolsExecuted, summary } — the rest of submit_*_report beyond findings/score
  tokenUsage: jsonb('token_usage'),                                 // { input, output }
  duration: integer('duration'),                                    // Wall-clock ms
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Merge Approvals — one row per auto-fix PR awaiting a human/auto merge decision.
 *
 * Created when guardian finishes reviewing a bot-opened fix PR. The dashboard's Pending
 * Approvals panel reads pending rows; approve/reject endpoints resolve them; the delayed
 * merge worker resolves 'auto'-mode rows whose deadline passed unactioned. humanApproved
 * for a timeout merge is the user's standing opt-in to auto mode — recorded per-row so the
 * audit trail shows exactly which authorization path merged what.
 */
export const mergeApprovals = pgTable('merge_approvals', {
  id: serial('id').primaryKey(),
  repoId: integer('repo_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  runId: integer('run_id').references(() => runs.id, { onDelete: 'set null' }),
  agentId: varchar('agent_id', { length: 100 }).notNull(),          // which agent's fixes the PR contains
  pullRequestNumber: integer('pull_request_number').notNull(),
  prUrl: text('pr_url'),
  prTitle: text('pr_title'),
  guardianVerdict: varchar('guardian_verdict', { length: 30 }),     // APPROVE | REQUEST_CHANGES | COMMENT | null (review failed)
  maxSeverity: varchar('max_severity', { length: 20 }),             // highest severity among the findings this PR fixes
  mode: varchar('mode', { length: 20 }).notNull().default('manual'),// manual | auto (auto = merge at deadline if unactioned)
  deadlineAt: timestamp('deadline_at'),                             // only set for mode='auto'
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending | approved | rejected | auto_merged | merge_failed
  decidedBy: text('decided_by'),                                    // user id, or 'timeout' for auto-merges
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Agent Memory — Shared intelligence across runs and agents
 */
export const agentMemory = pgTable('agent_memory', {
  id: text('id').primaryKey(),
  repoId: text('repo_id'), // null = global / cross-repo
  agentType: text('agent_type').notNull(), // which agent wrote this
  memoryType: text('memory_type').notNull(), // pattern | exception | preference | regression
  filePath: text('file_path'), // scoped to a file, or null
  summary: text('summary').notNull(),
  // Note: requires pgvector extension in Postgres to uncomment later
  // embedding: vector('embedding', { dimensions: 1536 }),
  confidence: real('confidence').default(0.5),
  useCount: integer('use_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
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

export const agentReports = pgTable("agent_reports", {
  id:          uuid("id").defaultRandom().primaryKey(),
  runId:       text("run_id").notNull(),
  agentType:   text("agent_type").notNull(),
  status:      text("status").notNull().default("pending"), // pending | completed | error
  severity:    text("severity"),
  findings:    jsonb("findings").$type<Finding[]>().default([]),
  completedAt: timestamp("completed_at"),
  createdAt:   timestamp("created_at").defaultNow(),
});

export const demoLeads = pgTable("demo_leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  teamSize: varchar("team_size", { length: 50 }).notNull(),
  gitProvider: varchar("git_provider", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
