interface Issue {
  icon: string;
  title: string;
  desc: string;
  fixLabel: string;
  bg: string;
  border?: string;
  btnPrimary?: boolean;
}

const issues: Issue[] = [
  {
    icon: '🔴',
    title: 'Hardcoded API keys — config/api.js lines 3–4',
    desc: 'Two live API keys (Stripe, OpenAI) found hardcoded. Visible in git history for 47 commits. Anyone with repo read access has these keys right now.',
    fixLabel: 'Auto-fix: move to .env',
    bg: 'bg-[#FEF2F2]',
    btnPrimary: true,
  },
  {
    icon: '🔴',
    title: 'Missing authentication — GET /api/admin/users',
    desc: 'Endpoint returns full user records with no auth check. Agent confirmed: 200 response with all user data when called with no token.',
    fixLabel: 'View suggested fix',
    bg: 'bg-[#FEF2F2]',
    btnPrimary: true,
  },
  {
    icon: '🔴',
    title: 'Database RLS missing — users table (Supabase)',
    desc: 'Row-level security not enabled. Any authenticated user can query all rows. Critical for multi-tenant apps.',
    fixLabel: 'Auto-fix: apply RLS policy',
    bg: 'bg-[#FEF2F2]',
    btnPrimary: true,
  },
  {
    icon: '🟡',
    title: 'No rate limiting — POST /api/auth/login',
    desc: '100 rapid requests all returned 200. Brute-force attack is trivially possible on this endpoint.',
    fixLabel: 'View fix',
    bg: 'bg-[#FFFBEB]',
    btnPrimary: false,
  },
  {
    icon: '🟣',
    title: 'AI-era: no max_tokens guard — /api/chat (LLM endpoint)',
    desc: 'OpenAI API called with no max_tokens set. Adversarial user input can trigger extremely long completions, draining your API budget in minutes.',
    fixLabel: 'Auto-fix: add max_tokens: 1000',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[3px] border-[#6D28D9]',
    btnPrimary: true,
  },
  {
    icon: '🔵',
    title: 'Outdated dependency — lodash 4.17.15 · 3 known CVEs',
    desc: 'CVE-2021-23337 (high), CVE-2020-28500 (medium). Update to lodash@4.17.21.',
    fixLabel: 'Auto-update',
    bg: 'bg-[#EFF6FF]',
    btnPrimary: true,
  },
];

export function Security() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {issues.map((issue, i) => (
        <div key={i} className={`flex gap-2.5 px-3 py-2.5 rounded-lg mb-2 items-start ${issue.bg} ${issue.border || 'border border-cw-bdr'}`}>
          <div className="text-[20px]">{issue.icon}</div>
          <div>
            <div className="text-xs font-medium mb-[3px] text-[#111]">{issue.title}</div>
            <div className="text-[11px] text-[#555] leading-[1.4]">{issue.desc}</div>
            <div className="mt-1.5">
              <button className={`text-[10px] px-[9px] py-[3px] rounded-md cursor-pointer transition-colors ${issue.btnPrimary ? 'border-none bg-cw-blue text-white hover:opacity-90' : 'border border-cw-bdr bg-cw-bg2 text-cw-txt2 hover:bg-cw-bg3'}`}>
                {issue.fixLabel}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
