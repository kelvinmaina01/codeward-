import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {
  isResendQuotaOrFailoverError,
  sendEmailViaEusend,
} from '../src/services/email-fallback.service.js';
import { NotificationService } from '../src/notifications/NotificationService.js';
import React from 'react';

dotenv.config();

async function runTests() {
  console.log('🧪 [Test] Starting Email Fallback (Eusend) Test Suite...\n');

  // Test 1: Quota & rate limit detection
  console.log('Test 1: Detecting Resend rate limit & daily/monthly quota errors...');
  assert.equal(isResendQuotaOrFailoverError({ status: 429, message: 'Too many requests' }), true);
  assert.equal(isResendQuotaOrFailoverError({ message: 'You have reached your daily limit of 300 emails' }), true);
  assert.equal(isResendQuotaOrFailoverError({ message: 'daily_quota_exceeded' }), true);
  assert.equal(isResendQuotaOrFailoverError({ message: 'monthly_limit_exceeded' }), true);
  assert.equal(isResendQuotaOrFailoverError({ status: 503, message: 'Service Unavailable' }), true);
  assert.equal(isResendQuotaOrFailoverError(new Error('Resend service failure')), true);
  assert.equal(isResendQuotaOrFailoverError({ status: 400, message: 'Invalid recipient format' }), false);
  assert.equal(isResendQuotaOrFailoverError(null), false);
  console.log('✅ Test 1 Passed: Error signatures accurately identified.\n');

  // Test 2: Missing API key handling
  console.log('Test 2: Handling missing EUSEND_API_KEY safely...');
  const originalKey = process.env.EUSEND_API_KEY;
  try {
    delete process.env.EUSEND_API_KEY;
    const res = await sendEmailViaEusend({
      to: 'test@example.com',
      subject: 'Test without key',
      html: '<p>Test</p>',
    });
    assert.equal(res.success, false);
    assert.equal(res.provider, 'eusend');
    assert.ok(res.error?.includes('not configured'));
  } finally {
    if (originalKey) process.env.EUSEND_API_KEY = originalKey;
  }
  console.log('✅ Test 2 Passed: Missing key handled gracefully without throwing unhandled exceptions.\n');

  // Test 3: Live Eusend dispatch test with configured key
  console.log('Test 3: Testing live Eusend email dispatch...');
  assert.ok(process.env.EUSEND_API_KEY, 'EUSEND_API_KEY must be present in environment for live verification');
  
  const liveSend = await sendEmailViaEusend({
    to: 'kelvin.reallife8@gmail.com',
    subject: 'Automated Eusend Fallback Verification',
    html: '<div style="font-family:sans-serif;padding:16px;"><h3>Codeward Email Fallback Active</h3><p>This email confirms that the Eusend failover provider is operational and verified.</p></div>',
    text: 'Codeward Email Fallback Active. This email confirms that the Eusend failover provider is operational.',
  });

  assert.equal(liveSend.success, true);
  assert.equal(liveSend.provider, 'eusend');
  assert.ok(liveSend.id, 'Expected live email dispatch ID from Eusend');
  console.log(`✅ Test 3 Passed: Live email accepted by Eusend with ID: ${liveSend.id}\n`);

  console.log('🎉 ALL EMAIL FALLBACK TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
