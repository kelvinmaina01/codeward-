const repos = [
  { name: 'my-api', score: 91, pct: 91, color: 'bg-[#16A34A]', trend: '+6', up: true },
  { name: 'frontend', score: 87, pct: 87, color: 'bg-[#16A34A]', trend: '+4', up: true },
  { name: 'auth-service', score: 79, pct: 79, color: 'bg-[#D97706]', trend: '−2', up: false },
  { name: 'payments-api', score: 52, pct: 52, color: 'bg-[#DC2626]', trend: '−14', up: false },
];

export function Repositories() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {repos.map(r => (
        <div key={r.name} className="flex items-center gap-2.5 px-3 py-2 border border-cw-bdr rounded-lg mb-2 bg-cw-bg2">
          <span className="font-medium text-xs flex-1 text-cw-txt">{r.name}</span>
          <div className="w-20 h-1 bg-cw-bg3 rounded-sm">
            <div className={`h-1 rounded-sm ${r.color}`} style={{ width: `${r.pct}%` }} />
          </div>
          <span className="text-xs font-medium min-w-[28px] text-right text-cw-txt">{r.score}</span>
          <span className={`text-[10px] min-w-[35px] ml-1.5 ${r.up ? 'text-cw-green' : 'text-cw-red'}`}>
            {r.up ? '↑' : '↓'} {r.trend}
          </span>
          <button className="text-[10px] px-[9px] py-[3px] rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt2 cursor-pointer ml-2 hover:bg-cw-bg3 transition-colors">
            View
          </button>
        </div>
      ))}
    </div>
  );
}
