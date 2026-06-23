import { useState } from 'react';
import { ChevronRight, Search, Download, CheckCircle2, TrendingUp, TrendingDown, Clock, ShieldAlert, AlertTriangle, AlertCircle, FileText, Zap, Activity, LayoutTemplate, X } from 'lucide-react';

export function DebtReport() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sidePanel, setSidePanel] = useState<{ type: 'category' | 'queue', id: string } | null>(null);

  const categories = [
    { id: 'security', icon: ShieldAlert, color: 'text-cw-red', label: 'Security debt', desc: '3 open · 12 fixed', open: [
      { title: 'Hardcoded API keys', desc: '2 live keys found in config.js. Must be moved to .env and git history cleaned.', status: 'OPEN', sColor: 'bg-cw-amber/10 text-cw-amber' },
      { title: 'Missing route auth', desc: '/api/admin/users is unprotected. Add authentication middleware.', status: 'IN PROGRESS', sColor: 'bg-cw-blue/10 text-cw-blue' },
      { title: 'No max_tokens guard', desc: 'LLM endpoint exposed to cost attack. Limit added.', status: 'FIXED', sColor: 'bg-cw-green/10 text-cw-green' },
    ]},
    { id: 'broken', icon: Activity, color: 'text-cw-amber', label: 'Broken code', desc: '0 open · 142 tests passing', open: []},
    { id: 'arch', icon: LayoutTemplate, color: 'text-cw-blue', label: 'Architecture', desc: '1 open · N+1 query', open: [
      { title: 'N+1 on /api/users', desc: 'Query executing inside loop. Needs JOIN rewrite.', status: 'OPEN', sColor: 'bg-cw-amber/10 text-cw-amber' }
    ]},
    { id: 'bloat', icon: TrendingDown, color: 'text-cw-green', label: 'Bloat', desc: '0 open · 247 lines removed', open: []},
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[14px] font-medium text-cw-txt">Debt report</div>
            <div className="text-[11px] text-cw-txt3">my-api · tracking fixes and open issues</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-cw-bg3 p-1 rounded-lg">
              {['All', 'Security', 'Broken code', 'Architecture', 'Bloat', 'Compliance'].map(f => (
                <button 
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-md text-[11px] transition-colors ${activeFilter === f ? 'bg-cw-bg2 text-cw-txt shadow-sm font-medium' : 'text-cw-txt3 hover:text-cw-txt2'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-cw-bg border border-cw-bdr rounded-lg px-2.5 py-1.5">
              <Search size={14} className="text-cw-txt3" />
              <input type="text" placeholder="Search debt..." className="bg-transparent border-none outline-none text-[11px] text-cw-txt w-24 placeholder:text-cw-txt3" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-bg rounded-md border border-cw-bdr text-[11px] text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 transition-colors">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="p-8 w-full space-y-8">
          
          {/* Stat Grid */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { n: '127', label: 'Debt items fixed', trend: '+12 this week', tColor: 'text-cw-green', tIcon: TrendingUp },
              { n: '4', label: 'Critical open', trend: '-2 this week', tColor: 'text-cw-green', tIcon: TrendingDown },
              { n: '24', label: 'High open', trend: '+3 this week', tColor: 'text-cw-red', tIcon: TrendingUp },
              { n: '91', label: 'Health score', trend: '+2 pts this month', tColor: 'text-cw-green', tIcon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="bg-cw-bg2 border border-cw-bdr rounded-2xl p-6 min-h-[160px] flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="text-5xl font-bold text-cw-txt leading-none mb-3">{s.n}</div>
                  <div className="text-[14px] font-medium text-cw-txt2">{s.label}</div>
                </div>
                <div className={`flex items-center gap-2 text-[12px] font-medium ${s.tColor} mt-4`}>
                  <s.tIcon size={16} /> {s.trend}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-[2fr_1fr] gap-8 items-start mt-8">
            
            {/* Main List */}
            <div className="space-y-4">
              
              <div className="text-[12px] font-bold text-cw-txt3 uppercase tracking-wider mb-2">Debt Categories</div>
              
              {categories.map(c => (
                <div 
                  key={c.id}
                  onClick={() => setSidePanel({ type: 'category', id: c.id })}
                  className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg2 cursor-pointer hover:border-cw-txt3 transition-colors group"
                >
                  <div className="w-full flex items-center justify-between px-4 py-4 bg-cw-bg3/50">
                    <div className="flex items-center">
                      <c.icon size={18} className={c.color} />
                      <span className="text-[14px] font-semibold text-cw-txt">{c.label}</span>
                      <span className="text-[11px] text-cw-txt3 ml-2">{c.desc}</span>
                    </div>
                    <ChevronRight size={16} className="text-cw-txt3 group-hover:text-cw-txt transition-colors" />
                  </div>
                </div>
              ))}

              {/* What Was Fixed */}
              <div className="border border-cw-green/30 bg-cw-bg2 rounded-xl p-5 mt-8">
                <div className="text-[12px] font-bold text-cw-txt mb-4 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-cw-green" /> What was fixed today
                </div>
                <div className="space-y-3">
                  {[
                    { text: 'Removed 247 lines of dead code in api/users.js', agent: 'Bloat agent' },
                    { text: 'Applied RLS policies to profiles table', agent: 'Security agent' },
                    { text: 'Merged 3 identical instances of validateEmail()', agent: 'Architecture agent' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-3 text-[11px]">
                      <CheckCircle2 size={14} className="text-cw-green shrink-0 mt-0.5" />
                      <div className="flex-1 text-cw-txt2">{f.text}</div>
                      <div className="text-cw-txt3">{f.agent}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              
              {/* Trend Mini Chart */}
              <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5">
                <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-4">Debt Volume Trend</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cw-bg3 rounded-lg p-3">
                    <div className="flex justify-between text-[10px] text-cw-txt3 mb-2">
                      <span>Critical</span><span>-40%</span>
                    </div>
                    <div className="flex items-end gap-[2px] h-8">
                      {[40,35,42,28,25,15,8].map((h,i) => (
                        <div key={i} className="flex-1 bg-cw-red/50 rounded-t-sm hover:bg-cw-red transition-colors" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-cw-bg3 rounded-lg p-3">
                    <div className="flex justify-between text-[10px] text-cw-txt3 mb-2">
                      <span>Bloat</span><span>-12%</span>
                    </div>
                    <div className="flex items-end gap-[2px] h-8">
                      {[80,78,82,75,70,68,65].map((h,i) => (
                        <div key={i} className="flex-1 bg-cw-amber/50 rounded-t-sm hover:bg-cw-amber transition-colors" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fix Queue */}
              <div 
                onClick={() => setSidePanel({ type: 'queue', id: 'all' })}
                className="bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden cursor-pointer hover:border-cw-txt3 transition-colors group"
              >
                <div className="bg-cw-bg3 px-4 py-3 border-b border-cw-bdr flex justify-between items-center">
                  <span className="text-[12px] font-semibold text-cw-txt">Priority Fix Queue</span>
                  <ChevronRight size={14} className="text-cw-txt3 group-hover:text-cw-txt transition-colors" />
                </div>
                <div className="flex flex-col">
                  {[
                    { title: 'Hardcoded API keys', effort: 'Low', pColor: 'bg-cw-red', stat: 'Assigned to Agent' },
                    { title: 'Missing route auth', effort: 'High', pColor: 'bg-cw-red', stat: 'Blocked' },
                    { title: 'N+1 on /api/users', effort: 'Med', pColor: 'bg-cw-amber', stat: 'Queued' },
                  ].map((q, i) => (
                    <div key={i} className="px-4 py-3 border-b border-cw-bdr last:border-0 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${q.pColor}`} />
                      <div className="text-[11px] text-cw-txt2 flex-1 truncate">{q.title}</div>
                      <div className="text-[9px] px-1.5 py-0.5 rounded bg-cw-bg4 text-cw-txt3">{q.effort}</div>
                    </div>
                  ))}
                  <div className="px-4 py-2 text-[10px] text-cw-txt3 text-center bg-cw-bg">
                    + 14 more queued
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* RIGHT DRAWER / SIDE PULL */}
      {sidePanel && (
        <div className="w-[450px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col h-full overflow-hidden shadow-2xl z-10 transition-transform duration-300 animate-in slide-in-from-right">
          <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
            <div>
              <h2 className="text-[16px] font-bold text-cw-txt flex items-center gap-2">
                {sidePanel.type === 'queue' ? 'Priority Fix Queue' : categories.find(c => c.id === sidePanel.id)?.label}
              </h2>
            </div>
            <button onClick={() => setSidePanel(null)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-cw-bg">
            {sidePanel.type === 'category' && (
              <div className="flex flex-col">
                {categories.find(c => c.id === sidePanel.id)?.open.map((item, i) => (
                  <div key={i} className="p-5 border-b border-cw-bdr last:border-0 flex justify-between items-start gap-4">
                    <div>
                      <div className="text-[13px] font-medium text-cw-txt mb-1.5">{item.title}</div>
                      <div className="text-[12px] text-cw-txt2 leading-relaxed">{item.desc}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider shrink-0 mt-0.5 ${item.sColor}`}>
                      {item.status}
                    </div>
                  </div>
                ))}
                {categories.find(c => c.id === sidePanel.id)?.open.length === 0 && (
                  <div className="p-8 text-center text-[12px] text-cw-txt3 flex flex-col items-center gap-3">
                    <CheckCircle2 size={32} className="text-cw-green/50" />
                    No open issues detected in this category!
                  </div>
                )}
              </div>
            )}

            {sidePanel.type === 'queue' && (
              <div className="flex flex-col">
                {[
                  { title: 'Hardcoded API keys', effort: 'Low', pColor: 'bg-cw-red', stat: 'Assigned to Agent' },
                  { title: 'Missing route auth', effort: 'High', pColor: 'bg-cw-red', stat: 'Blocked' },
                  { title: 'N+1 on /api/users', effort: 'Med', pColor: 'bg-cw-amber', stat: 'Queued' },
                  { title: 'Missing index: orders', effort: 'Low', pColor: 'bg-cw-blue', stat: 'Queued' },
                  { title: 'Duplicate formatTime()', effort: 'Low', pColor: 'bg-cw-green', stat: 'Queued' },
                ].map((q, i) => (
                  <div key={i} className="p-5 border-b border-cw-bdr last:border-0 hover:bg-cw-bg3/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${q.pColor}`} />
                      <div className="text-[13px] font-medium text-cw-txt">{q.title}</div>
                      <div className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-cw-bg4 text-cw-txt3">{q.effort} effort</div>
                    </div>
                    <div className="flex items-center gap-2 pl-5 text-[11px] text-cw-txt3">
                      <span>Status:</span>
                      <span className={q.stat === 'Blocked' ? 'text-cw-red font-medium' : 'text-cw-txt2'}>{q.stat}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
