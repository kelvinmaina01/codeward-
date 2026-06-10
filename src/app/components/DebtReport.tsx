export function DebtReport() {
  const stats = [
    { n: '3', label: 'Critical security', color: 'text-cw-red' },
    { n: '8', label: 'Duplicate functions', color: 'text-cw-amber' },
    { n: '247', label: 'Dead code lines', color: 'text-cw-txt' },
    { n: '91', label: 'Health score', color: 'text-cw-green' },
  ];

  const cats = [
    {
      label: 'Security debt',
      chip: 'Critical · 3 issues · all auto-fixed',
      chipClass: 'bg-[#FEE2E2] text-[#991B1B]',
      headBg: 'bg-[#FEF2F2]',
      headColor: 'text-cw-red',
      items: [
        { title: 'Hardcoded API keys', desc: '2 live keys in config.js · moved to .env · git history flagged' },
        { title: 'Missing route auth', desc: '/api/admin/users unprotected · auth middleware added' },
        { title: 'RLS missing on users table', desc: 'Supabase policy added · per-user row isolation enforced' },
        { title: 'AI: no max_tokens guard', desc: 'LLM endpoint exposed to cost attack · limit added' },
      ],
    },
    {
      label: 'Bloat debt',
      chip: 'High · 8 duplicates · 247 lines removed',
      chipClass: 'bg-[#FEF3C7] text-[#92400E]',
      headBg: 'bg-[#FFFBEB]',
      headColor: 'text-cw-amber',
      items: [
        { title: 'validateEmail() × 3', desc: 'Found in auth/, api/, utils/ · merged to utils/validators.js' },
        { title: 'formatDate() × 4', desc: '4 files had identical logic · extracted to utils/dates.js' },
        { title: 'Commented dead code', desc: '52 lines in api/users.js · last modified 14 months ago · removed' },
        { title: 'Unused package: moment.js', desc: 'Never imported after date-fns migration · removed from package.json' },
      ],
    },
    {
      label: 'Architecture debt',
      chip: 'Medium · N+1 pattern · 2 missing indexes',
      chipClass: 'bg-[#DBEAFE] text-[#1E40AF]',
      headBg: 'bg-[#EFF6FF]',
      headColor: 'text-cw-blue',
      items: [
        { title: 'N+1 on /api/users', desc: '1 query per user row · fix: JOIN profiles in main query' },
        { title: 'Missing index: orders.user_id', desc: 'Full scan on 84k rows · CREATE INDEX suggested' },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="grid grid-cols-4 gap-2.5 mb-3.5">
        {stats.map(s => (
          <div key={s.label} className="bg-cw-bg3 rounded-lg p-3">
            <div className={`text-2xl font-medium mb-0.5 ${s.color}`}>{s.n}</div>
            <div className="text-[11px] text-cw-txt2">{s.label}</div>
          </div>
        ))}
      </div>

      {cats.map(cat => (
        <div key={cat.label} className="rounded-lg overflow-hidden mb-2 border border-cw-bdr">
          <div className={`px-3 py-2 text-xs font-medium flex justify-between items-center ${cat.headBg}`}>
            <span className={cat.headColor}>{cat.label}</span>
            <span className={`${cat.chipClass} text-[10px] px-1.5 py-0.5 rounded-[3px] font-medium`}>{cat.chip}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-2 bg-cw-bg2">
            {cat.items.map(item => (
              <div key={item.title} className="bg-cw-bg2 border border-cw-bdr rounded-md px-2.5 py-2">
                <div className="text-[11px] font-medium text-cw-txt mb-0.5">{item.title}</div>
                <div className="text-[10px] text-cw-txt2 leading-[1.4]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
