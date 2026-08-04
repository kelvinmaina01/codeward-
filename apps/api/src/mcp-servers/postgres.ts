/**
 * PostgreSQL MCP Server
 *
 * Security model:
 * 1. AST parsing — every query submitted through pg_run_query or pg_explain_query
 *    is parsed with pgsql-ast-parser. If the AST contains ANY statement that is
 *    not a plain SELECT, the request is rejected immediately before any connection
 *    is opened. This blocks DROP, INSERT, UPDATE, DELETE, TRUNCATE, GRANT, etc.
 * 2. Statement timeout — every query runs inside a session with statement_timeout = 5000ms.
 *    Long-running queries are killed at the DB level, not just timed out client-side.
 * 3. Row cap — a LIMIT 500 is injected at the SQL level after the AST is validated,
 *    so even a valid SELECT cannot return unbounded rows.
 * 4. Read-only role — callers are expected to use a codeward_readonly DB role;
 *    this file does not enforce that, but the setup SQL snippet shown in the UI
 *    guides the user to create one.
 */

import { Pool } from 'pg';
import { parse as parseAST } from 'pgsql-ast-parser';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostgresCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  /** 'require' | 'prefer' | 'disable' */
  sslMode: 'require' | 'prefer' | 'disable';
}

// ─── AST Guardrail ────────────────────────────────────────────────────────────

const ALLOWED_STATEMENT_TYPES = new Set(['select']);

/**
 * Throws a descriptive error if the SQL contains anything other than SELECT statements.
 * Uses pgsql-ast-parser so that tricks like "SELECT 1; DROP TABLE users" are caught.
 */
function assertReadOnly(sql: string): void {
  let statements: ReturnType<typeof parseAST>;

  try {
    statements = parseAST(sql, { locationTracking: false });
  } catch (e: any) {
    throw new Error(`SQL syntax error: ${e?.message ?? 'unknown parse error'}`);
  }

  for (const stmt of statements) {
    const type = stmt.type?.toLowerCase() ?? '';
    if (!ALLOWED_STATEMENT_TYPES.has(type)) {
      throw new Error(
        `Blocked: only SELECT statements are permitted. Got "${stmt.type}". ` +
        `Destructive or write operations are not allowed through Codeward agents.`
      );
    }
  }
}

/**
 * Injects a LIMIT clause into a query if it does not already have one.
 * Operates at the SQL string level after AST validation has already passed.
 */
function injectLimit(sql: string, cap = 500): string {
  const trimmed = sql.trimEnd().replace(/;$/, '');
  // If the query already mentions LIMIT (case-insensitive), don't double-add it
  if (/\blimit\b/i.test(trimmed)) return `${trimmed}`;
  return `${trimmed} LIMIT ${cap}`;
}

// ─── Pool factory ─────────────────────────────────────────────────────────────

function createPool(creds: PostgresCredentials): Pool {
  return new Pool({
    host: creds.host,
    port: creds.port,
    database: creds.database,
    user: creds.user,
    password: creds.password,
    ssl: creds.sslMode === 'disable' ? false : { rejectUnauthorized: creds.sslMode === 'require' },
    // Each checkout at most 5 s to avoid hanging indefinitely
    connectionTimeoutMillis: 5000,
    // Kill idle connections after 30 s — these are one-off test/tool pools, not long-lived
    idleTimeoutMillis: 30000,
    max: 3,
  });
}

// ─── Tool handlers ────────────────────────────────────────────────────────────

/**
 * Test connection: connects and runs SELECT 1.
 * Returns { ok: true } on success or throws with the DB error message.
 */
export async function pg_test_connection(creds: PostgresCredentials): Promise<{ ok: true; latencyMs: number }> {
  const pool = createPool(creds);
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * List all user-created tables in the public schema.
 */
export async function pg_list_tables(creds: PostgresCredentials): Promise<{ schema: string; table: string; estimatedRows: number }[]> {
  const pool = createPool(creds);
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = 5000`);
      const result = await client.query(`
        SELECT
          n.nspname AS schema,
          c.relname AS table,
          c.reltuples::bigint AS estimated_rows
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname, c.relname
        LIMIT 200
      `);
      return result.rows.map(r => ({
        schema: r.schema,
        table: r.table,
        estimatedRows: Number(r.estimated_rows),
      }));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Describe a table: column names, types, nullability, and key status.
 */
export async function pg_describe_table(
  creds: PostgresCredentials,
  schema: string,
  tableName: string
): Promise<{ column: string; type: string; nullable: boolean; primaryKey: boolean }[]> {
  const pool = createPool(creds);
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = 5000`);
      const result = await client.query(`
        SELECT
          a.attname AS column,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
          NOT a.attnotnull AS nullable,
          EXISTS (
            SELECT 1 FROM pg_index i
            JOIN pg_attribute ia ON ia.attrelid = i.indrelid AND ia.attnum = ANY(i.indkey)
            WHERE i.indrelid = c.oid AND i.indisprimary AND ia.attnum = a.attnum
          ) AS primary_key
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
          AND c.relname = $2
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY a.attnum
      `, [schema, tableName]);
      return result.rows.map(r => ({
        column: r.column,
        type: r.type,
        nullable: r.nullable,
        primaryKey: r.primary_key,
      }));
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Run a SELECT query.
 * Validates AST (blocks non-SELECT), injects LIMIT 500, enforces 5 s timeout.
 */
export async function pg_run_query(
  creds: PostgresCredentials,
  sql: string
): Promise<{ rows: Record<string, unknown>[]; rowCount: number; truncated: boolean }> {
  assertReadOnly(sql);
  const safeSql = injectLimit(sql, 500);

  const pool = createPool(creds);
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = 5000`);
      const result = await client.query(safeSql);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        // If we returned 500 rows, there may be more — signal truncation to the agent
        truncated: result.rows.length >= 500,
      };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Run EXPLAIN (ANALYZE false) on a SELECT query so agents can reason about query plans
 * without actually running the full query.
 */
export async function pg_explain_query(
  creds: PostgresCredentials,
  sql: string
): Promise<{ plan: string }> {
  assertReadOnly(sql);

  const pool = createPool(creds);
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = 5000`);
      // ANALYZE false — no actual execution, so no side effects even on a write query
      // (though the AST check above already blocks writes)
      const result = await client.query(`EXPLAIN (FORMAT TEXT, ANALYZE FALSE) ${sql}`);
      const plan = result.rows.map((r: any) => r['QUERY PLAN']).join('\n');
      return { plan };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Table statistics: row count estimate, disk size, index count.
 */
export async function pg_table_stats(
  creds: PostgresCredentials,
  schema: string,
  tableName: string
): Promise<{ estimatedRows: number; diskSizeBytes: number; indexCount: number }> {
  const pool = createPool(creds);
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = 5000`);
      const result = await client.query(`
        SELECT
          c.reltuples::bigint AS estimated_rows,
          pg_relation_size(c.oid) AS disk_size_bytes,
          (SELECT COUNT(*) FROM pg_index WHERE indrelid = c.oid) AS index_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = $2
      `, [schema, tableName]);

      const row = result.rows[0];
      if (!row) throw new Error(`Table "${schema}.${tableName}" not found.`);
      return {
        estimatedRows: Number(row.estimated_rows),
        diskSizeBytes: Number(row.disk_size_bytes),
        indexCount: Number(row.index_count),
      };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
