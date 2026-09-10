import test from 'node:test';
import assert from 'node:assert';
import { getCategoryTaskTemplate, GENERIC_FALLBACK_TEMPLATE } from './prompt-templates.js';
import { renderCoachingPrompt } from './render-coaching-prompt.js';

test('getCategoryTaskTemplate returns the correct template for all defined categories', () => {
  const categories = [
    'SECRETS', 'CVE', 'AUTH', 'INJECTION', 'CRYPTO',
    'SUPPLY_CHAIN', 'RATE_LIMIT', 'RLS', 'SSRF', 'MULTITENANT',
    'MFA', 'CI_CD', 'ERROR_LEAKAGE', 'BUSINESS_LOGIC', 'NHI',
    'DEAD_CODE', 'UNUSED_DEPS', 'ARCHITECTURE'
  ];
  
  for (const cat of categories) {
    const template = getCategoryTaskTemplate(cat);
    assert.ok(template);
    assert.notStrictEqual(template, GENERIC_FALLBACK_TEMPLATE);
    assert.ok(template.length > 0);
  }
});

test('getCategoryTaskTemplate returns GENERIC_FALLBACK_TEMPLATE for unknown categories', () => {
  const template = getCategoryTaskTemplate('UNKNOWN_CATEGORY_XYZ');
  assert.strictEqual(template, GENERIC_FALLBACK_TEMPLATE);
});

test('renderCoachingPrompt generates a full prompt without breaking markdown code blocks', () => {
  const input = {
    category: 'DEAD_CODE',
    severity: 'HIGH',
    location: 'src/utils.ts:42',
    description: 'Unused export foo',
    rawEvidence: 'export const foo = "bar";\n```\nsome stray backticks\n```',
    reason: 'AUTOFIX_ATTEMPTED_FAILED' as const,
    reasonDetail: 'High risk of breaking API',
    fixPrUrl: 'https://github.com/org/repo/pull/123'
  };

  const result = renderCoachingPrompt(input);
  
  assert.ok(result.includes('Search the ENTIRE repo (not just this directory) for any import.'));
  assert.ok(result.includes('\\`\\`\\`\nsome stray backticks\n\\`\\`\\`'));
  assert.ok(!result.includes('\n```\nsome stray backticks\n```'));
  assert.ok(result.includes('High risk of breaking API'));
});

test('renderCoachingPrompt renders the correct WHY THIS NEEDS MANUAL WORK section based on reason', () => {
  const result1 = renderCoachingPrompt({
    category: 'DEAD_CODE',
    severity: 'HIGH',
    location: 'src/',
    description: 'test',
    rawEvidence: 'test',
    reason: 'NOT_ELIGIBLE',
  });
  assert.ok(result1.includes("This finding category isn't yet covered by Codeward's automatic-fix support"));

  const result2 = renderCoachingPrompt({
    category: 'DEAD_CODE',
    severity: 'HIGH',
    location: 'src/',
    description: 'test',
    rawEvidence: 'test',
    reason: 'AUTOFIX_DISABLED_FOR_REPO',
  });
  assert.ok(result2.includes("Auto-fix is disabled for this repository's settings"));

  const result3 = renderCoachingPrompt({
    category: 'DEAD_CODE',
    severity: 'HIGH',
    location: 'src/',
    description: 'test',
    rawEvidence: 'test',
    reason: 'APPROVAL_EXPIRED',
    fixPrUrl: 'https://example.com/pr/1'
  });
  assert.ok(result3.includes("A fix was generated and reviewed, but the approval window passed"));
  assert.ok(result3.includes("https://example.com/pr/1"));
});
