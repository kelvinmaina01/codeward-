import { pgTable, serial, text, varchar, timestamp, integer, boolean, jsonb, real, uuid, bigint } from "drizzle-orm/pg-core";

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
  paused: boolean('paused').default(false).notNull(),
  autoFixEnabled: boolean('auto_fix_enabled').default(true).notNull(),
  auditTriggeredAt: timestamp('audit_triggered_at'),
  auditCompletedAt: timestamp('audit_completed_at'),
  baselineScore: integer('baseline_score'),
  fullName: varchar('full_name', { length: 255 }).notNull().unique(),
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
  status: varchar('status', { length: 50 }).notNull(),
  visibility: varchar('visibility', { length: 20 }).default('private').notNull(),
  score: integer('score'),
  rawLogs: text('raw_logs'),
  scope: jsonb('scope'),
  prNumber: integer('pr_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const runResults = pgTable('run_results', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  agentName: varchar('agent_name', { length: 100 }).notNull(),
  passed: boolean('passed').notNull(),
  output: jsonb('output'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentTasks = pgTable('agent_tasks', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).default('anthropic'),
  model: varchar('model', { length: 100 }),
  score: integer('score'),
  findingsCount: integer('findings_count').default(0),
  findings: jsonb('findings'),
  checkpointState: jsonb('checkpoint_state'),
  reportMeta: jsonb('report_meta'),
  tokenUsage: jsonb('token_usage'),
  duration: integer('duration'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mergeApprovals = pgTable('merge_approvals', {
  id: serial('id').primaryKey(),
  repoId: integer('repo_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  runId: integer('run_id').references(() => runs.id, { onDelete: 'set null' }),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  pullRequestNumber: integer('pull_request_number').notNull(),
  prUrl: text('pr_url'),
  prTitle: text('pr_title'),
  guardianVerdict: varchar('guardian_verdict', { length: 30 }),
  maxSeverity: varchar('max_severity', { length: 20 }),
  mode: varchar('mode', { length: 20 }).notNull().default('manual'),
  deadlineAt: timestamp('deadline_at'),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  decidedBy: text('decided_by'),
  decisionNote: text('decision_note'),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentMemory = pgTable('agent_memory', {
  id: text('id').primaryKey(),
  repoId: text('repo_id'),
  agentType: text('agent_type').notNull(),
  memoryType: text('memory_type').notNull(),
  filePath: text('file_path'),
  summary: text('summary').notNull(),
  confidence: real('confidence').default(0.5),
  useCount: integer('use_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
});

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
  id: uuid("id").defaultRandom().primaryKey(),
  runId: text("run_id").notNull(),
  agentType: text("agent_type").notNull(),
  status: text("status").notNull().default("pending"),
  severity: text("severity"),
  findings: jsonb("findings").$type<Finding[]>().default([]),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title'),
  repoId: integer('repo_id').references(() => repositories.id, { onDelete: 'set null' }),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  parts: jsonb('parts').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gordonEvents = pgTable('gordon_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'set null' }),
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'set null' }),
  toolName: text('tool_name').notNull(),
  repoId: integer('repo_id'),
  input: jsonb('input'),
  outputSummary: jsonb('output_summary'),
  success: boolean('success').notNull(),
  errorText: text('error_text'),
  requiredApproval: boolean('required_approval').notNull().default(false),
  durationMs: integer('duration_ms').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type IntegrationMetadata = {
  linearTeamId?: string;
  linearLabels?: string[];
  slackIncidentChannel?: string;
  slackPRChannel?: string;
  slackUserMapping?: Record<string, string>;
  datadogRegion?: 'us' | 'eu';
  datadogWebhookUrl?: string;
  figmaWatchedFiles?: string[];
  googleScopes?: Record<string, boolean>;
  googleDigestRecipients?: string[];
  googleExportFolderId?: string;
  sentryProjectMapping?: Record<string, string>;
  whatsappOnCallNumbers?: string[];
  whatsappChannelPreference?: 'whatsapp' | 'sms';
  mcpServerUrl?: string;
  mcpAuthType?: string;
  [key: string]: any;
};

export const connectorRequests = pgTable('connector_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: integer('org_id').references(() => organization.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').references(() => user.id, { onDelete: 'set null' }),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  useCase: text('use_case'),
  notifyEmail: varchar('notify_email', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  voteCount: integer('vote_count').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  orgId: integer('org_id').references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).default('connected').notNull(),
  credentialsJson: jsonb('credentials_json'),
  metadata: jsonb('metadata').$type<IntegrationMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const agentIntegrationAccess = pgTable('agent_integration_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 100 }).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: integer('org_id').references(() => organization.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  encryptedCredentials: text('encrypted_credentials'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  agentAccess: jsonb('agent_access').default({}).notNull(),
  config: jsonb('config').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Workspaces & RBAC ─────────────────────────────────────────────────────────
export const workspace = pgTable('workspace', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 20 }).default('private').notNull(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceMember = pgTable('workspace_member', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaceInvite = pgTable('workspace_invite', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  otp: varchar('otp', { length: 10 }), // Nullable now since we use magic links
  expiresAt: timestamp('expires_at').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  invitedBy: text('invited_by').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaceAuditLog = pgTable('workspace_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspace.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  actorName: varchar('actor_name', { length: 255 }).notNull(),
  action: text('action').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  status: varchar('status', { length: 20 }).default('success').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const runLogs = pgTable('run_logs', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').references(() => runs.id, { onDelete: 'cascade' }),
  repoId: integer('repo_id').references(() => repositories.id, { onDelete: 'cascade' }),
  agent: varchar('agent', { length: 100 }).notNull().default('system'),
  logType: varchar('log_type', { length: 50 }).notNull().default('run'), // 'build' | 'run' | 'system'
  level: varchar('level', { length: 20 }).notNull().default('plain'), // 'ok' | 'err' | 'inf' | 'warn' | 'plain'
  tsMs: bigint('ts_ms', { mode: 'number' }).notNull(), // epoch millisecond timestamp
  message: text('message').notNull(),
  meta: jsonb('meta'), // extra structured attributes (exitCode, toolName, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


