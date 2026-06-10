import { useState } from 'react';

interface DiffFile {
  id: string;
  filename: string;
  badge: string;
  badgeClass: string;
  lines: { type: 'add' | 'rem' | 'ctx' | 'why'; text: string }[];
}

const files: DiffFile[] = [
  {
    id: 'validators',
    filename: 'auth/validators.js',
    badge: 'duplicate removed',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E]',
    lines: [
      { type: 'rem', text: "- function validateEmail(str) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(str); }" },
      { type: 'rem', text: "- function validatePhone(str) { return /^\\+?[1-9]\\d{1,14}$/.test(str); }" },
      { type: 'add', text: "+ import { validateEmail, validatePhone } from '../utils/validators';" },
      { type: 'why', text: "↳ Reason: identical functions exist in utils/validators.js lines 42–48. Removed 8 lines of duplication. Reuse score: 100%." },
    ],
  },
  {
    id: 'config',
    filename: 'config/api.js',
    badge: 'security fix — critical',
    badgeClass: 'bg-[#FEE2E2] text-[#991B1B]',
    lines: [
      { type: 'rem', text: '- const STRIPE_KEY = "sk_live_REDACTED_API_KEY";' },
      { type: 'rem', text: '- const OPENAI_KEY = "sk-proj-REDACTED_API_KEY";' },
      { type: 'add', text: '+ const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;' },
      { type: 'add', text: '+ const OPENAI_KEY = process.env.OPENAI_API_KEY;' },
      { type: 'why', text: '↳ Critical: live API keys hardcoded in source. Visible in git history for 47 commits. Moved to environment variables.' },
    ],
  },
  {
    id: 'users',
    filename: 'api/users.js',
    badge: 'dead code removed',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E]',
    lines: [
      { type: 'rem', text: '- // Old user sync — deprecated Jan 2025' },
      { type: 'rem', text: '- // async function syncUsersFromLegacyDB(batch) { ... 52 lines' },
      { type: 'ctx', text: '  export async function getUser(id) {' },
      { type: 'why', text: '↳ 52 lines of commented-out dead code removed. Never called. Last modified 14 months ago.' },
    ],
  },
];

const lineClasses: Record<string, string> = {
  add: 'bg-[#F0FDF4] text-[#166534]',
  rem: 'bg-[#FEF2F2] text-[#991B1B]',
  ctx: 'text-[#999]',
  why: 'bg-[#EFF6FF] text-[#1E40AF]',
};

export function DiffViewer() {
  const [accepted, setAccepted] = useState<Record<string, boolean | null>>({});

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {files.map(f => {
        const status = accepted[f.id];
        return (
          <div key={f.id} className={`mb-3 transition-opacity duration-200 ${status !== null && status !== undefined ? 'opacity-60' : 'opacity-100'}`}>
            <div className="bg-cw-bg3 border border-cw-bdr rounded-t-lg px-2.5 py-1.5 text-[11px] font-medium flex justify-between items-center text-cw-txt">
              <span className="font-mono">{f.filename}</span>
              <span className={`${f.badgeClass} text-[10px] px-1.5 py-0.5 rounded-[3px] font-medium`}>{f.badge}</span>
            </div>
            <div className="border border-cw-bdr border-t-0 rounded-b-lg overflow-hidden">
              {f.lines.map((l, i) => (
                <div key={i} className={`font-mono leading-[1.5] ${l.type === 'why' ? 'text-[10px] italic px-2 py-[3px]' : 'text-[11px] px-2 py-0.5'} ${lineClasses[l.type]}`}>
                  {l.text}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {status === undefined || status === null ? (
                <>
                  <button
                    onClick={() => setAccepted(a => ({ ...a, [f.id]: true }))}
                    className="text-[10px] px-[9px] py-[3px] rounded-md border-none bg-cw-blue text-white cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setAccepted(a => ({ ...a, [f.id]: false }))}
                    className="text-[10px] px-[9px] py-[3px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer hover:bg-cw-bg3 transition-colors"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <span className={`text-[10px] font-medium ${status ? 'text-cw-green' : 'text-cw-red'}`}>
                  {status ? '✓ Accepted' : '✕ Rejected'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

