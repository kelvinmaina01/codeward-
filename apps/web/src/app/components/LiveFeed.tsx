import { useEffect, useRef } from 'react';

const logs = [
  { ts: '14:23:01', cls: 'inf', text: 'Webhook received · commit 3fa2c1 · branch: main · 14 files changed' },
  { ts: '14:23:01', cls: 'inf', text: 'Signature verified · HMAC-SHA256 ✓' },
  { ts: '14:23:03', cls: 'inf', text: 'Stack detected: Node 20 + Postgres 16 + Redis 7' },
  { ts: '14:23:03', cls: 'inf', text: 'Provisioning Firecracker microVM · isolated environment' },
  { ts: '14:23:38', cls: 'ok', text: 'Sandbox ready · boot 35s · zero external network access ✓' },
  { ts: '14:23:39', cls: 'inf', text: 'Installing dependencies · 847 packages · node_modules from cache' },
  { ts: '14:23:44', cls: 'ok', text: 'Dependencies installed ✓' },
  { ts: '14:23:45', cls: 'inf', text: 'Loading seed DB · 12,400 anonymised rows · migrations running' },
  { ts: '14:23:52', cls: 'ok', text: 'DB seeded · all migrations passed ✓' },
  { ts: '14:23:53', cls: 'inf', text: 'AST engine · scanning 14 changed files · tree-sitter parsing' },
  { ts: '14:24:01', cls: 'warn', text: 'BLOAT · validateEmail() in auth/validators.js duplicates utils/validators.js:42' },
  { ts: '14:24:01', cls: 'ok', text: '  → refactored · import rewritten to use existing helper ✓' },
  { ts: '14:24:03', cls: 'warn', text: 'BLOAT · formatDate() appears in 4 files · extracting to utils/dates.js' },
  { ts: '14:24:05', cls: 'ok', text: '  → 3 files updated · 52 duplicate lines removed ✓' },
  { ts: '14:24:08', cls: 'inf', text: 'Security scan · OWASP top 10 · secrets detection · CVE audit' },
  { ts: '14:24:22', cls: 'ok', text: 'No secrets detected · 847 files + full git log scanned ✓' },
  { ts: '14:24:24', cls: 'ok', text: 'No critical CVEs · 3 low-severity flagged in report ✓' },
  { ts: '14:24:26', cls: 'inf', text: 'Auth check · firing unauthenticated requests at all 34 routes' },
  { ts: '14:24:28', cls: 'ok', text: 'All routes return 401 without valid token ✓' },
  { ts: '14:24:28', cls: 'inf', text: 'Rate limit check · 100 rapid requests → /api/auth/login' },
  { ts: '14:24:30', cls: 'ok', text: 'Rate limiting active · 429 returned at request 11 ✓' },
  { ts: '14:24:31', cls: 'inf', text: 'Test runner starting · Jest · 142 tests' },
  { ts: '14:25:12', cls: 'ok', text: '142/142 tests passed · 0 failures ✓' },
  { ts: '14:25:14', cls: 'inf', text: 'Performance · EXPLAIN ANALYZE on all queries · load test' },
  { ts: '14:25:44', cls: 'warn', text: 'ARCH · N+1 detected · /api/users fires 1 query per row · suggest JOIN' },
  { ts: '14:25:46', cls: 'inf', text: 'AI-era scan · LLM endpoints · prompt injection · token limits' },
  { ts: '14:25:49', cls: 'warn', text: 'AI-ERA · /api/chat has no max_tokens guard · adversarial cost risk' },
  { ts: '14:25:51', cls: 'ok', text: 'Debt score: 91/100 · all gates passed ✓' },
  { ts: '14:25:52', cls: 'ok', text: 'Promoting to staging · ephemeral environment deploying ✓' },
  { ts: '14:25:58', cls: 'ok', text: 'Staging live · staging-3fa2c1.codeward.app ✓' },
  { ts: '14:25:58', cls: 'inf', text: 'Waiting for approval · auto-approve in 2h if no action', cursor: true },
];

const clsColor: Record<string, string> = {
  ok: 'text-[#22C55E]',
  err: 'text-[#EF4444]',
  inf: 'text-[#60A5FA]',
  warn: 'text-[#F59E0B]',
  plain: 'text-[#aaa]',
};

export function LiveFeed() {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="bg-[#0f1117] rounded-lg px-3 py-2.5 font-mono text-[11px] leading-[1.7] overflow-y-auto max-h-[520px]">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2.5 mb-[1px]">
            <span className="text-[#555] shrink-0">{l.ts}</span>
            <span className={clsColor[l.cls] || 'text-[#aaa]'}>
              {l.text}
              {l.cursor && <span className="inline-block w-[7px] h-[11px] bg-[#e8e8e6] rounded-[1px] align-middle ml-1 animate-[blink_0.8s_infinite]" />}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

