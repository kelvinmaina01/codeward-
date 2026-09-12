import 'dotenv/config';
import { PolarService } from '../src/services/polar.service.js';
import { appConfig } from '../src/config/app.config.js';
import crypto from 'crypto';

/**
 * ============================================================================
 * test-polar-billing.ts — Automated Test Suite for Polar Billing & Portal Flow
 * ============================================================================
 * Run with: npx tsx test/test-polar-billing.ts
 */

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Starting Polar Billing Test Suite');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Environment & App Config Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📋 Test Group 1: Configuration & Environment Integrity');

  const token = appConfig.polar.accessToken;
  const webhookSecret = appConfig.polar.webhookSecret;
  const orgId = appConfig.polar.organizationId;
  const proId = appConfig.polar.proProductId;
  const teamId = appConfig.polar.teamProductId;

  assert(Boolean(token && token.startsWith('polar_oat_')), 'POLAR_ACCESS_TOKEN is configured with polar_oat_ prefix');
  assert(Boolean(webhookSecret && webhookSecret.startsWith('whsec_')), 'POLAR_WEBHOOK_SECRET is configured with whsec_ prefix');
  assert(orgId === '53f14cc0-043b-499e-9a47-512423611fd0', `POLAR_ORGANIZATION_ID matches expected org (${orgId})`);
  assert(proId === '2b25c8f2-06ea-4058-b046-6d0a8e2c3a7a', `POLAR_PRO_PRODUCT_ID matches Pro product ID (${proId})`);
  assert(teamId === 'f900bad6-2d11-4d49-9f88-498847620eb7', `POLAR_TEAM_PRODUCT_ID matches Team product ID (${teamId})`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Live Polar Products Query
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📦 Test Group 2: Live Polar Products & Catalog');
  try {
    const products = await PolarService.listProducts();
    assert(Array.isArray(products) && products.length > 0, `PolarService.listProducts() returned ${products.length} products`);

    const hasPro = products.some(p => p.id === proId);
    const hasTeam = products.some(p => p.id === teamId);
    assert(hasPro, 'Pro product exists in live Polar account catalog');
    assert(hasTeam, 'Team product exists in live Polar account catalog');

    const matchesOrg = products.every(p => p.organizationId === orgId);
    assert(matchesOrg, 'All catalog products belong to configured organization');
  } catch (err: any) {
    assert(false, `listProducts threw error: ${err?.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Customer Lookup & Idempotency
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n👤 Test Group 3: Polar Customer Resolution & Idempotency');
  let testCustomerId: string | null = null;
  try {
    const testEmail = process.env.POLAR_TEST_EMAIL || `qa-${Date.now()}@codeward.cloud`;
    const customer = await PolarService.getOrCreateCustomer({
      email: testEmail,
      name: 'Codeward Test User',
    });
    assert(Boolean(customer && customer.id), `Customer created/resolved successfully -> ID: ${customer?.id}`);
    testCustomerId = customer.id;

    const resolvedAgain = await PolarService.getOrCreateCustomer({
      email: testEmail,
      name: 'Codeward Test User',
    });
    assert(resolvedAgain.id === customer.id, 'getOrCreateCustomer is idempotent and resolves same customer ID');
  } catch (err: any) {
    assert(false, `Customer lookup threw error: ${err?.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Customer Portal Session Generation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🌐 Test Group 4: Customer Portal Session Token & URL Generation');
  try {
    if (testCustomerId) {
      const session = await PolarService.createCustomerSession(testCustomerId);
      assert(Boolean(session.token && session.token.startsWith('polar_mst_')), 'Customer session token generated (polar_mst_...)');
      assert(
        session.customerPortalUrl.startsWith('https://polar.sh/') &&
        session.customerPortalUrl.includes('customer_session_token='),
        'Authenticated Customer Portal URL is properly formatted for redirection'
      );
      assert(Boolean(session.expiresAt), `Session has valid expiration timestamp (${session.expiresAt})`);

      // Cleanup test customer if created dynamically
      if (!process.env.POLAR_TEST_EMAIL) {
        try {
          await fetch(`https://api.polar.sh/v1/customers/${testCustomerId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // ignore cleanup failures
        }
      }
    } else {
      assert(false, 'Cannot test session generation without customer record');
    }
  } catch (err: any) {
    assert(false, `createCustomerSession threw error: ${err?.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Webhook Signature Verification Spec (Standard Webhooks)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔐 Test Group 5: Webhook HMAC Signature Verification');
  try {
    const rawPayload = JSON.stringify({ type: 'order.created', data: { id: 'test_order_123' } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const webhookId = 'msg_test_' + Date.now();

    // Polar standard webhook secret (after prefix 'whsec_')
    const secretBytes = Buffer.from(webhookSecret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${webhookId}.${timestamp}.${rawPayload}`;
    const validSignature = 'v1,' + crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    // Simulate verification
    function verify(payload: string, headers: { id: string; timestamp: string; signature: string }) {
      const toSign = `${headers.id}.${headers.timestamp}.${payload}`;
      const expected = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
      const sigParts = headers.signature.split(',').slice(1);
      return sigParts.some(sig => {
        try {
          return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
        } catch {
          return false;
        }
      });
    }

    const isValid = verify(rawPayload, { id: webhookId, timestamp, signature: validSignature });
    assert(isValid, 'Valid Polar webhook signature passes HMAC verification');

    const isTamperedInvalid = !verify(rawPayload + 'tampered', { id: webhookId, timestamp, signature: validSignature });
    assert(isTamperedInvalid, 'Tampered webhook payload correctly fails signature verification');

    const isBadSigInvalid = !verify(rawPayload, { id: webhookId, timestamp, signature: 'v1,invalid_sig' });
    assert(isBadSigInvalid, 'Invalid signature header correctly rejected');
  } catch (err: any) {
    assert(false, `Webhook signature test threw error: ${err?.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
