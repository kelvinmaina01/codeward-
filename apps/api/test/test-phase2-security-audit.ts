/**
 * Phase 2 Security & Endpoints Verification Suite
 * 
 * Verifies:
 * 1. CW-012: Wildcard CORS (Strict allowedOrigins whitelist, rejection of untrusted origins)
 * 2. CW-006/007/013: Fallback Secrets (Boot fail-fast in production, webhook test secret rejection)
 * 3. CW-003: WebSocket Leak (Authentication enforcement & tenant-isolated broadcasts)
 * 4. CW-001/002: BOLA / IDOR (Ownership checks on MCP and Reports, removal of global demo fallbacks)
 * 5. CW-009/008: Missing Rate Limits (HTTP 429 when limits exceeded, retry headers)
 * 6. CW-010: Blind Input (Zod validation rejecting invalid/malicious payloads with clean 400s)
 */

import 'dotenv/config';
import { Hono } from 'hono';
import { z } from 'zod';
import { isAllowedOrigin } from '../src/lib/cors.js';
import { validateProductionSecrets } from '../src/config/app.config.js';
import { rateLimiter } from '../src/middleware/rate-limiter.js';
import { validateBody } from '../src/middleware/zod-validator.js';
import { broadcast, activeClients } from '../src/routes/ws.js';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 2: SECURITY & ENDPOINTS TESTS');
  console.log('======================================================\n');

  // ─── Test 1: CW-012 Strict CORS Whitelist ───
  console.log('--- Test 1: CW-012 Wildcard CORS Protection ---');
  try {
    assert(isAllowedOrigin('http://localhost:5173'), 'Allows localhost:5173');
    assert(isAllowedOrigin('https://codeward.cloud'), 'Allows production domain codeward.cloud');
    assert(isAllowedOrigin('https://app.codeward.cloud'), 'Allows app.codeward.cloud');
    assert(!isAllowedOrigin('https://evil-attacker.com'), 'Rejects arbitrary untrusted origin evil-attacker.com');
    assert(!isAllowedOrigin('http://localhost:9999'), 'Rejects untrusted port localhost:9999');
    assert(!isAllowedOrigin(''), 'Rejects empty origin');
    assert(!isAllowedOrigin(undefined), 'Rejects undefined origin');
  } catch (err: any) {
    assert(false, 'CW-012 test error', err.message);
  }

  // ─── Test 2: CW-006/007/013 Fallback Secrets Boot Guard ───
  console.log('\n--- Test 2: CW-006/007/013 Production Secrets Validation ---');
  try {
    const prevEnv = process.env.NODE_ENV;
    const prevPolar = process.env.POLAR_WEBHOOK_SECRET;

    // Test in development mode: should NOT throw
    process.env.NODE_ENV = 'development';
    process.env.POLAR_WEBHOOK_SECRET = 'test_secret';
    let devThrew = false;
    try {
      validateProductionSecrets();
    } catch {
      devThrew = true;
    }
    assert(!devThrew, 'validateProductionSecrets allows test_secret in development mode');

    // Test in production mode with test_secret: MUST throw
    process.env.NODE_ENV = 'production';
    process.env.POLAR_WEBHOOK_SECRET = 'test_secret';
    let prodThrew = false;
    let prodErrMsg = '';
    try {
      validateProductionSecrets();
    } catch (e: any) {
      prodThrew = true;
      prodErrMsg = e.message;
    }
    assert(prodThrew, 'validateProductionSecrets throws loudly in production with test_secret');
    assert(prodErrMsg.includes('SECURITY FATAL'), 'Error message indicates SECURITY FATAL');

    // Restore env
    process.env.NODE_ENV = prevEnv;
    process.env.POLAR_WEBHOOK_SECRET = prevPolar;
  } catch (err: any) {
    assert(false, 'CW-006 test error', err.message);
  }

  // ─── Test 3: CW-003 WebSocket Tenant Isolation ───
  console.log('\n--- Test 3: CW-003 WebSocket Leak & Isolation ---');
  try {
    const clientTenantA = {
      clientMeta: {
        userId: 'user-tenant-a',
        orgIds: new Set([1]),
        repoIds: new Set([101]),
        repoNames: new Set(['tenanta/repo1']),
      },
      received: [] as any[],
      send(msg: string) {
        this.received.push(JSON.parse(msg));
      }
    };

    const clientTenantB = {
      clientMeta: {
        userId: 'user-tenant-b',
        orgIds: new Set([2]),
        repoIds: new Set([202]),
        repoNames: new Set(['tenantb/repo2']),
      },
      received: [] as any[],
      send(msg: string) {
        this.received.push(JSON.parse(msg));
      }
    };

    activeClients.clear();
    activeClients.add(clientTenantA);
    activeClients.add(clientTenantB);

    // Broadcast an event for Tenant A's repo
    broadcast('scan_event', {
      repo: 'tenanta/repo1',
      repoId: 101,
      vulnerability: 'SQL Injection detected in private file',
    });

    assert(clientTenantA.received.length === 1, 'Tenant A receives events for their own repo');
    assert(clientTenantB.received.length === 0, 'Tenant B does NOT receive events for Tenant A repo (isolated)');

    // Broadcast an event for Tenant B's repo
    broadcast('scan_event', {
      repo: 'tenantb/repo2',
      repoId: 202,
      vulnerability: 'Hardcoded secret in private file',
    });

    assert(clientTenantB.received.length === 1, 'Tenant B receives events for their own repo');
    assert(clientTenantA.received.length === 1, 'Tenant A does NOT receive events for Tenant B repo (isolated)');

    activeClients.clear();
  } catch (err: any) {
    assert(false, 'CW-003 test error', err.message);
  }

  // ─── Test 4: CW-001/002 BOLA / IDOR Verification ───
  console.log('\n--- Test 4: CW-001/002 BOLA / IDOR Protection ---');
  try {
    // Check reports.ts for removal of demo fallback
    const fs = await import('node:fs');
    const path = await import('node:path');
    const reportsContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/reports.ts'), 'utf8');

    assert(
      !reportsContent.includes('// If user has no personal repositories yet, allow viewing platform / demo repositories'),
      'Global demo repositories fallback removed from reports.ts'
    );
    assert(
      reportsContent.includes("if (!session) return c.json({ error: 'Unauthorized' }, 401)"),
      'GET /canvas enforces session authentication'
    );
    assert(
      reportsContent.includes('userCanAccessRepo(session.user.id, targetRun.repoId)') ||
      reportsContent.includes('userCanAccessRepo(session.user.id, r.repoId)'),
      'reports.ts verifies user access to targetRun repo'
    );

    // Check mcp.ts for createdBy constraints
    const mcpContent = fs.readFileSync(path.resolve(__dirname, '../src/routes/mcp.ts'), 'utf8');
    assert(
      mcpContent.includes('eq(mcpServers.createdBy, user.id)'),
      'mcp.ts queries filter by createdBy = user.id'
    );
  } catch (err: any) {
    assert(false, 'CW-001/002 test error', err.message);
  }

  // ─── Test 5: CW-009/008 Rate Limiting Verification ───
  console.log('\n--- Test 5: CW-009/008 Rate Limiting ---');
  try {
    const testApp = new Hono();
    testApp.use('*', rateLimiter({ limit: 5, windowMs: 10000, keyPrefix: 'test-rl' }));
    testApp.get('/test', (c) => c.text('OK'));

    let lastStatus = 200;
    let rateLimitedResponse: any = null;

    // Send 6 requests — first 5 should be 200, 6th should be 429
    for (let i = 1; i <= 6; i++) {
      const res = await testApp.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.50' }
      });
      lastStatus = res.status;
      if (res.status === 429) {
        rateLimitedResponse = await res.json();
      }
    }

    assert(lastStatus === 429, 'Rate limiter throttles after limit exceeded with HTTP 429');
    assert(rateLimitedResponse?.error === 'Too Many Requests', '429 response contains structured Too Many Requests error');
    assert(typeof rateLimitedResponse?.retryAfter === 'number', '429 response includes retryAfter header/field');
  } catch (err: any) {
    assert(false, 'CW-009 test error', err.message);
  }

  // ─── Test 6: CW-010 Zod Payload Validation ───
  console.log('\n--- Test 6: CW-010 Zod Validation ---');
  try {
    const testSchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    const testApp = new Hono();
    testApp.post('/validate', validateBody(testSchema), (c) => {
      const body = c.get('validatedBody');
      return c.json({ success: true, body });
    });

    // 1. Invalid email
    const resInvalid = await testApp.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', age: 25 }),
    });
    assert(resInvalid.status === 400, 'Zod validator returns 400 on invalid email');
    const jsonInvalid = await resInvalid.json();
    assert(jsonInvalid.error === 'Validation Error', 'Error payload has Validation Error');

    // 2. Underage (< 18)
    const resAge = await testApp.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@codeward.cloud', age: 15 }),
    });
    assert(resAge.status === 400, 'Zod validator returns 400 on out-of-range value');

    // 3. Valid input
    const resValid = await testApp.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@codeward.cloud', age: 21 }),
    });
    assert(resValid.status === 200, 'Zod validator passes valid payload');
    const jsonValid = await resValid.json();
    assert(jsonValid.success === true, 'Handler receives validated payload');
  } catch (err: any) {
    assert(false, 'CW-010 test error', err.message);
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 2 RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase2Tests().catch((e) => {
  console.error('Fatal error during Phase 2 testing:', e);
  process.exit(1);
});
