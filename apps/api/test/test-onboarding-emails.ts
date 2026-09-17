import assert from 'node:assert';
import React from 'react';
import { render } from '@react-email/render';
import { ReposConnectedInitiatedEmail } from '../src/notifications/templates/ReposConnectedInitiatedEmail.js';
import { QueuedRepoStartedEmail } from '../src/notifications/templates/QueuedRepoStartedEmail.js';
import { RepoConnectedSuccessEmail } from '../src/notifications/templates/RepoConnectedSuccessEmail.js';
import { NotificationService } from '../src/notifications/NotificationService.js';

async function runTests() {
  console.log('🧪 Starting Clean Onboarding & Repository Emails Test Suite...\n');

  // ─── Test 1: Render ReposConnectedInitiatedEmail (Single Repo) ────────────────
  console.log('Test 1: Render ReposConnectedInitiatedEmail (Single Repo)...');
  const html1 = await render(
    React.createElement(ReposConnectedInitiatedEmail, {
      userName: 'Kelvin Maina',
      activeRepo: 'kelvinmaina01/codeward-core',
      queuedRepos: [],
      streamUrl: 'http://localhost:5173/dashboard/livefeed?view=stream',
    })
  );

  assert(html1.length > 500, 'HTML output should be substantive (>500 bytes)');
  assert(html1.includes('Repository Protection Initiated'), 'Contains main headline');
  assert(html1.includes('kelvinmaina01/codeward-core'), 'Contains active repo name');
  assert(html1.includes('7 AGENTS'), 'Contains 7 agents hero stat');
  assert(html1.includes('Watch Live Agent Stream'), 'Contains stream CTA text');
  assert(html1.includes('http://localhost:5173/dashboard/livefeed?view=stream'), 'Contains stream link');
  // Strict assertion: zero emojis
  assert(!html1.includes('⚡') && !html1.includes('⏳') && !html1.includes('🛡️'), 'Must contain zero emojis');
  console.log('  ✅ Single repo initiated email rendered successfully (zero emojis).');

  // ─── Test 2: Render ReposConnectedInitiatedEmail (Multi-Repo with Queue Count) ──
  console.log('\nTest 2: Render ReposConnectedInitiatedEmail (Multi-Repo with Queue Count)...');
  const html2 = await render(
    React.createElement(ReposConnectedInitiatedEmail, {
      userName: 'Kelvin Maina',
      activeRepo: 'kelvinmaina01/codeward-core',
      queuedRepos: ['kelvinmaina01/codeward-api', 'kelvinmaina01/codeward-web'],
      streamUrl: 'http://localhost:5173/dashboard/livefeed?view=stream',
    })
  );

  assert(html2.includes('repositories queued for sequential scan'), 'Contains queued repos count text');
  assert(html2.includes('2'), 'Displays exact queued count number');
  assert(html2.includes('Sequential Policy:'), 'Contains sequential queue policy explanation');
  assert(!html2.includes('⚡') && !html2.includes('⏳'), 'Must contain zero emojis');
  console.log('  ✅ Multi-repo queued email rendered with clean count (no full table, zero emojis).');

  // ─── Test 3: Render QueuedRepoStartedEmail ───────────────────────────────────
  console.log('\nTest 3: Render QueuedRepoStartedEmail...');
  const html3 = await render(
    React.createElement(QueuedRepoStartedEmail, {
      userName: 'Kelvin Maina',
      previousRepo: 'kelvinmaina01/codeward-core',
      activeRepo: 'kelvinmaina01/codeward-api',
      remainingQueuedRepos: ['kelvinmaina01/codeward-web'],
      streamUrl: 'http://localhost:5173/dashboard/livefeed?view=stream',
    })
  );

  assert(html3.length > 500, 'HTML output should be substantive (>500 bytes)');
  assert(html3.includes('Next Repository Dequeued'), 'Contains headline');
  assert(html3.includes('kelvinmaina01/codeward-core'), 'Mentions previous finished repo');
  assert(html3.includes('kelvinmaina01/codeward-api'), 'Mentions newly active repo');
  assert(html3.includes('repository remaining in queue'), 'Contains remaining queue counter text');
  assert(html3.includes('1'), 'Displays exact remaining count');
  assert(!html3.includes('⚡') && !html3.includes('⏳'), 'Must contain zero emojis');
  console.log('  ✅ Queued repo started email rendered successfully (zero emojis).');

  // ─── Test 4: Render Modernized RepoConnectedSuccessEmail ─────────────────────
  console.log('\nTest 4: Render Modernized RepoConnectedSuccessEmail...');
  const html4 = await render(
    React.createElement(RepoConnectedSuccessEmail, {
      repoName: 'kelvinmaina01/codeward-core',
      baselineScore: 92,
      dashboardUrl: 'http://localhost:5173/dashboard',
      recipientName: 'Kelvin Maina',
    })
  );

  assert(html4.length > 500, 'HTML output should be substantive (>500 bytes)');
  assert(html4.includes('Initial Deep Scan Complete'), 'Contains headline');
  assert(html4.includes('92/100'), 'Contains baseline score in hero stat');
  assert(html4.includes('Continuous Autonomous Protection Active'), 'Contains protection card');
  assert(html4.includes('View Full Health Report &amp; Audit'), 'Contains report button text');
  assert(!html4.includes('🛡️'), 'Must contain zero emojis');
  console.log('  ✅ Baseline audit success email rendered successfully with global design (zero emojis).');

  // ─── Test 5: End-to-End NotificationService Dispatch ────────────────────────
  console.log('\nTest 5: NotificationService Methods Dispatch (Mock / Live Safe)...');
  const res1 = await NotificationService.sendReposConnectedInitiated({
    to: 'test@example.com',
    userName: 'Kelvin Maina',
    activeRepo: 'kelvinmaina01/codeward-core',
    queuedRepos: ['kelvinmaina01/codeward-api'],
    streamUrl: 'http://localhost:5173/dashboard/livefeed?view=stream',
  });
  assert(res1?.id, 'sendReposConnectedInitiated returned dispatch id');

  const res2 = await NotificationService.sendQueuedRepoStarted({
    to: 'test@example.com',
    userName: 'Kelvin Maina',
    previousRepo: 'kelvinmaina01/codeward-core',
    activeRepo: 'kelvinmaina01/codeward-api',
    remainingQueuedRepos: [],
    streamUrl: 'http://localhost:5173/dashboard/livefeed?view=stream',
  });
  assert(res2?.id, 'sendQueuedRepoStarted returned dispatch id');

  const res3 = await NotificationService.sendRepoConnectedSuccess(
    'test@example.com',
    'kelvinmaina01/codeward-core',
    94,
    'http://localhost:5173/dashboard'
  );
  assert(res3?.id, 'sendRepoConnectedSuccess returned dispatch id');

  console.log('  ✅ All NotificationService methods dispatched successfully.');

  console.log('\n🎉 ALL ONBOARDING & REPO EMAIL TESTS PASSED (5/5)!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
