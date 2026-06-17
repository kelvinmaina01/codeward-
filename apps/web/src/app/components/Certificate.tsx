import { useState } from 'react';
import { Download, Share2, Globe, Printer, ChevronRight, CheckCircle2, TrendingDown, Activity, ShieldAlert, Zap, LayoutTemplate, FileText, X } from 'lucide-react';

export function Certificate() {
  const [sidePanel, setSidePanel] = useState<'history' | 'share' | 'feed' | null>(null);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-cw-bg flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg2 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[14px] font-medium text-cw-txt">Health certificate</div>
            <div className="text-[11px] text-cw-txt3">shareable · updates on every scan · acme-corp / my-api</div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSidePanel('share')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-bg rounded-md border border-cw-bdr text-[11px] text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 transition-colors"
            >
              <Printer size={14} /> Print / Export
            </button>
            <button 
              onClick={() => setSidePanel('feed')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-bg rounded-md border border-cw-bdr text-[11px] text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 transition-colors"
            >
              <Globe size={14} /> Global feed
            </button>
            <button 
              onClick={() => setSidePanel('share')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-blue hover:brightness-110 rounded-md text-[11px] text-white font-medium transition-colors"
            >
              <Share2 size={14} /> Share link
            </button>
          </div>
        </div>

        <div className="p-6 w-full">
          {/* Hero Score */}
          <div 
            onClick={() => setSidePanel('history')}
            className="relative overflow-hidden rounded-2xl border border-cw-green/30 bg-gradient-to-br from-cw-green/10 via-cw-teal/5 to-transparent p-8 text-center mb-6 cursor-pointer hover:border-cw-green/50 transition-colors group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.15),transparent_70%)] pointer-events-none" />
            
            <div className="absolute top-4 right-4 text-[10px] text-cw-green font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              View History <ChevronRight size={12} />
            </div>

            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle cx="70" cy="70" r="58" className="stroke-cw-bg4 stroke-[10] fill-none" />
                <circle cx="70" cy="70" r="58" className="stroke-cw-green stroke-[10] fill-none stroke-round" style={{ strokeDasharray: 364.4, strokeDashoffset: 36.4 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-cw-green leading-none">91</div>
                <div className="text-[12px] text-cw-txt3 mt-1">/100</div>
              </div>
            </div>

            <div className="text-[14px] font-medium text-cw-txt mb-3 relative z-10">Codeward health score · acme-corp / my-api</div>
            
            <div className="inline-flex items-center gap-2 bg-cw-green/10 border border-cw-green/30 rounded-full px-4 py-1.5 text-[12px] font-medium text-cw-green mb-4 relative z-10">
              <CheckCircle2 size={14} /> Passed Codeward security & quality review
            </div>
            
            <div className="text-[11px] text-cw-txt3 relative z-10">
              Last scan: 4 minutes ago · 0 critical · 0 high · 1 medium · 142/142 tests passing
            </div>
          </div>

          {/* Grade Bands */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { grade: 'F', range: '0–49', label: 'Critical debt', color: 'text-cw-red', active: false },
              { grade: 'D', range: '50–64', label: 'Poor', color: 'text-cw-amber', active: false },
              { grade: 'C', range: '65–74', label: 'Moderate', color: 'text-cw-amber', active: false },
              { grade: 'B', range: '75–89', label: 'Good', color: 'text-cw-blue', active: false },
              { grade: 'A', range: '90–100', label: 'Excellent ✓', color: 'text-cw-green', active: true },
            ].map(b => (
              <div key={b.grade} className={`rounded-xl p-3 text-center border transition-colors ${b.active ? 'bg-cw-green/5 border-cw-green/40' : 'bg-cw-bg2 border-cw-bdr'}`}>
                <div className={`text-2xl font-bold mb-1 ${b.color}`}>{b.grade}</div>
                <div className="text-[10px] text-cw-txt3 mb-1">{b.range}</div>
                <div className="text-[11px] font-medium text-cw-txt2">{b.label}</div>
              </div>
            ))}
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: ShieldAlert, cat: 'Security', score: '100', pct: '100%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '0 issues · ×2.0 weight' },
              { icon: Activity, cat: 'Broken code', score: '100', pct: '100%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '142/142 tests · ×1.8 weight' },
              { icon: Zap, cat: 'AI-era', score: '96', pct: '96%', color: 'text-cw-green', bg: 'bg-cw-teal', stat: '1 low risk · ×1.5 weight' },
              { icon: LayoutTemplate, cat: 'Architecture', score: '82', pct: '82%', color: 'text-cw-amber', bg: 'bg-cw-amber', stat: '1 N+1 open · ×1.2 weight' },
              { icon: TrendingDown, cat: 'Bloat', score: '91', pct: '91%', color: 'text-cw-green', bg: 'bg-cw-green', stat: '−247 lines removed · ×1.0' },
              { icon: FileText, cat: 'Compliance', score: '88', pct: '88%', color: 'text-cw-amber', bg: 'bg-cw-amber', stat: '1 WCAG warning · ×1.6' },
            ].map(s => (
              <div key={s.cat} className="bg-cw-bg2 border border-cw-bdr rounded-xl p-3 cursor-pointer hover:bg-cw-bg3 transition-colors">
                <div className="flex items-center gap-2 text-[11px] font-medium text-cw-txt2 mb-2">
                  <s.icon size={14} className={s.color} /> {s.cat}
                </div>
                <div className={`text-2xl font-bold mb-2 ${s.color}`}>{s.score}</div>
                <div className="h-1 bg-cw-bg4 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${s.bg} rounded-full`} style={{ width: s.pct }} />
                </div>
                <div className="text-[10px] text-cw-txt3">{s.stat}</div>
              </div>
            ))}
          </div>

          {/* Comparisons */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-6 mb-6">
            <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-10">How you compare</div>
            
            <div className="relative w-full h-2 mb-10">
              {/* Base line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-cw-bg4 rounded-full" />
              
              {/* Plot markers */}
              {[
                { label: 'Lovable avg', val: 58, color: 'bg-cw-amber', pos: 'bottom' },
                { label: 'All Codeward (median)', val: 67, color: 'bg-cw-txt3', pos: 'top' },
                { label: 'Cursor avg', val: 71, color: 'bg-cw-blue', pos: 'bottom' },
                { label: 'Your score (Top 8%)', val: 91, color: 'bg-cw-green', pos: 'top' },
              ].map(m => (
                <div 
                  key={m.label} 
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${m.val}%` }}
                >
                  {m.pos === 'top' && (
                    <div className="absolute bottom-full mb-2 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <span className="text-[10px] font-medium text-cw-txt2">{m.label}</span>
                      <span className="text-[14px] font-bold text-cw-txt">{m.val}</span>
                      <div className="w-[1px] h-3 bg-cw-bdr mt-1" />
                    </div>
                  )}
                  
                  <div className={`w-3.5 h-3.5 rounded-full ${m.color} ring-4 ring-cw-bg2 z-10`} />

                  {m.pos === 'bottom' && (
                    <div className="absolute top-full mt-2 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <div className="w-[1px] h-3 bg-cw-bdr mb-1" />
                      <span className="text-[14px] font-bold text-cw-txt">{m.val}</span>
                      <span className="text-[10px] font-medium text-cw-txt2">{m.label}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Axis labels */}
              <div className="absolute left-0 top-full mt-3 text-[10px] text-cw-txt3 font-medium">0</div>
              <div className="absolute right-0 top-full mt-3 text-[10px] text-cw-txt3 font-medium">100</div>
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
                {sidePanel === 'history' && 'Score History'}
                {sidePanel === 'share' && 'Export / Print options'}
                {sidePanel === 'feed' && 'Global Feed'}
              </h2>
            </div>
            <button onClick={() => setSidePanel(null)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-cw-bg">
            {sidePanel === 'history' && (
              <div className="space-y-6">
                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[13px] font-medium text-cw-txt">Health score over time</div>
                    <div className="flex gap-1">
                      {['30d', '90d', '1y'].map(d => (
                        <button key={d} className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${d === '30d' ? 'bg-cw-bg3 text-cw-txt' : 'text-cw-txt3 hover:text-cw-txt'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-48 border-b border-cw-bdr mb-3 relative flex items-end pb-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-cw-green/5 to-transparent pointer-events-none" />
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M0,90 L20,85 L40,70 L60,65 L80,30 L100,10" fill="none" stroke="var(--color-cw-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M0,90 L20,85 L40,70 L60,65 L80,30 L100,10 L100,100 L0,100 Z" fill="url(#grad)" opacity="0.2" />
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-cw-green)" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                      <circle cx="100" cy="10" r="3" fill="#fff" stroke="var(--color-cw-green)" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-cw-txt3">
                    <span>May 18</span><span>Jun 1</span><span>Today</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                    <div className="text-[11px] text-cw-txt2 mb-1">Starting score</div>
                    <div className="text-2xl font-bold text-cw-red mb-1">52</div>
                    <div className="text-[10px] text-cw-txt3">May 18</div>
                  </div>
                  <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                    <div className="text-[11px] text-cw-txt2 mb-1">Peak improvement</div>
                    <div className="text-2xl font-bold text-cw-green mb-1">+39 pts</div>
                    <div className="text-[10px] text-cw-txt3">over 30 days</div>
                  </div>
                </div>
              </div>
            )}

            {sidePanel === 'share' && (
              <div className="space-y-6">
                <div className="text-[12px] font-bold text-cw-txt uppercase tracking-wider mb-2">Certificate / Report format</div>
                
                <div className="space-y-3 mb-6">
                  {[
                    { title: 'Health certificate PDF', desc: 'shareable, investor-ready, signed by Codeward', active: true },
                    { title: 'Full debt audit PDF', desc: 'all findings, evidence, fix recommendations', active: false },
                    { title: 'Executive summary', desc: '1-page brief for CTOs and boards', active: false },
                    { title: 'Compliance report', desc: 'EU AI Act / GDPR format, includes audit trail', active: false },
                    { title: 'CSV export', desc: 'all findings for spreadsheet / Jira import', active: false },
                  ].map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${opt.active ? 'border-cw-blue' : 'border-cw-txt3'}`}>
                        {opt.active && <div className="w-2 h-2 rounded-full bg-cw-blue" />}
                      </div>
                      <div className="text-[12px]">
                        <span className="font-semibold text-cw-txt">{opt.title}</span>
                        <span className="text-cw-txt3 mx-1">—</span>
                        <span className="text-cw-txt2">{opt.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-6 relative overflow-hidden">
                  <div className="text-[10px] font-bold text-cw-txt3 uppercase tracking-wider mb-4">PDF Preview</div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                      <div className="text-blue-600 font-bold flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 rounded-sm rotate-45" /> Codeward
                      </div>
                      <div className="text-[10px] text-gray-400 text-right">
                        <div>Health Certificate · June 17, 2026</div>
                        <div>acme-corp / my-api</div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-6 text-center border border-green-100 mb-4">
                      <div className="text-5xl font-bold text-green-600 leading-none mb-2">91</div>
                      <div className="text-[12px] font-bold text-green-600 mb-2">Grade A — Excellent</div>
                      <div className="text-[10px] text-green-600/70">Passed Codeward security & quality review</div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 border border-gray-100 rounded">
                        <div className="text-red-500 font-bold text-lg">0</div>
                        <div className="text-[8px] text-gray-500 uppercase">Critical Issues</div>
                      </div>
                      <div className="text-center p-2 border border-gray-100 rounded">
                        <div className="text-amber-500 font-bold text-lg">1</div>
                        <div className="text-[8px] text-gray-500 uppercase">Medium Issues</div>
                      </div>
                      <div className="text-center p-2 border border-gray-100 rounded">
                        <div className="text-green-600 font-bold text-lg">142</div>
                        <div className="text-[8px] text-gray-500 uppercase">Tests passing</div>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3 bg-cw-blue hover:brightness-110 rounded-lg text-[13px] text-white font-medium transition-colors">
                  Download PDF
                </button>
              </div>
            )}

            {sidePanel === 'feed' && (
              <div className="text-center py-12 text-cw-txt3 text-[12px]">
                Global feed content appears here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
