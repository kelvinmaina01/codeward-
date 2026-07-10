import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, ShieldCheck, TrendingDown, Zap, Loader2, XCircle, X, TerminalSquare, AlertTriangle, Settings, RotateCcw, AlertOctagon, Server } from 'lucide-react';

interface Props {
  onRunClick?: (sha: string) => void;
}

type DeployState = 'intercepting' | 'reviewing' | 'approved' | 'rejected' | 'live' | 'hard-blocked' | 'auto-merged';

export function Staging({ onRunClick }: Props) {
  const [deployState, setDeployState] = useState<DeployState>('intercepting');
  const [timeLeft, setTimeLeft] = useState(112 * 60); // 1h 52m in seconds
  const [diffOpen, setDiffOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    if (deployState === 'intercepting') {
      const t = setTimeout(() => setDeployState('reviewing'), 2500);
      return () => clearTimeout(t);
    }
    if (deployState === 'approved' || deployState === 'auto-merged') {
      const t = setTimeout(() => setDeployState('live'), 3500);
      return () => clearTimeout(t);
    }
  }, [deployState]);

  useEffect(() => {
    if (deployState === 'reviewing' && timeLeft > 0) {
      const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(t);
    } else if (deployState === 'reviewing' && timeLeft === 0) {
      setDeployState('auto-merged');
    }
  }, [deployState, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const statusLabel = {
    'intercepting': 'Booting',
    'reviewing': 'Staging deploy',
    'approved': 'Merging',
    'rejected': 'Blocked',
    'live': 'Production',
    'hard-blocked': 'Critical Alert',
    'auto-merged': 'Auto-Merging'
  }[deployState];

  const closeAllDrawers = () => {
    setDiffOpen(false);
    setLogsOpen(false);
    setEnvOpen(false);
    setTimerSettingsOpen(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Main Panel ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        
        {/* Testing Controls - Just for Demo */}
        <div className="flex gap-2 mb-4 justify-end">
          <button onClick={() => setDeployState('hard-blocked')} className="px-2 py-1 text-[10px] bg-cw-red/10 text-cw-red border border-cw-red/20 rounded">Simulate Hard Block</button>
          <button onClick={() => setTimeLeft(3)} className="px-2 py-1 text-[10px] bg-cw-purple/10 text-cw-purple border border-cw-purple/20 rounded">Simulate Auto-Merge</button>
        </div>

        <div className={`border rounded-xl p-5 mb-3 shadow-sm transition-colors ${deployState === 'hard-blocked' ? 'bg-cw-red/5 border-cw-red/30' : 'bg-cw-bg2 border-cw-bdr'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[16px] font-semibold text-cw-txt">my-api <span className="text-cw-txt3 font-normal mx-1">·</span> <span className="font-mono text-[14px]">3fa2c1</span></div>
            <div className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wide ${deployState === 'hard-blocked' ? 'bg-cw-red/10 border-cw-red/20 text-cw-red' : 'bg-cw-blue/10 border-cw-blue/20 text-cw-blue'}`}>
              {statusLabel}
            </div>
          </div>
          
          <div className="text-[12px] text-cw-txt2 mb-2">Deployed 4 minutes ago · all 142 tests passed · 3 debt items fixed by agent</div>
          
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-[11px] font-medium text-cw-txt2 mr-1">Files modified:</span>
            <span className="px-2 py-0.5 bg-cw-bg border border-cw-bdr/60 rounded flex items-center text-[10px] font-mono text-cw-txt opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-cw-amber mr-1.5 opacity-80"></span>src/api/users.ts</span>
            <span className="px-2 py-0.5 bg-cw-bg border border-cw-bdr/60 rounded flex items-center text-[10px] font-mono text-cw-txt opacity-80"><span className="w-1.5 h-1.5 rounded-full bg-cw-amber mr-1.5 opacity-80"></span>src/utils/logger.ts</span>
          </div>

          {deployState === 'intercepting' && (
            <div className="py-12 flex flex-col items-center justify-center text-cw-txt2">
              <Loader2 size={32} className="animate-spin text-cw-purple mb-4" />
              <p className="text-[13px] font-medium text-cw-txt">Pipeline paused.</p>
              <p className="text-[12px]">Booting staging environment...</p>
            </div>
          )}

          {deployState === 'approved' && (
            <div className="py-10 flex flex-col items-center justify-center text-cw-green bg-cw-green/5 border border-cw-green/20 rounded-lg">
              <CheckCircle size={32} className="mb-3" />
              <p className="text-[14px] font-medium text-cw-txt">Approved!</p>
              <p className="text-[12px] text-cw-txt2 mt-1">Resuming pipeline... merging to production.</p>
            </div>
          )}

          {deployState === 'auto-merged' && (
            <div className="py-10 flex flex-col items-center justify-center text-cw-purple bg-cw-purple/5 border border-cw-purple/20 rounded-lg">
              <CheckCircle size={32} className="mb-3" />
              <p className="text-[14px] font-medium text-cw-txt">Auto-Merged by System</p>
              <p className="text-[12px] text-cw-purple/60 mt-1">Timer expired. No critical issues found. Merging to production.</p>
            </div>
          )}

          {deployState === 'live' && (
            <div className="py-10 flex flex-col items-center justify-center text-cw-txt">
              <Zap size={32} className="mb-3 text-cw-purple" />
              <p className="text-[14px] font-medium text-cw-txt">Live in Production!</p>
              <p className="text-[12px] text-cw-txt2 mt-1 mb-4">The pipeline successfully deployed the commit to production.</p>
              
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-2 bg-cw-blue/5 border border-cw-blue/15 rounded-lg px-4 py-2 text-[12px] font-medium text-cw-blue cursor-pointer hover:bg-cw-blue/10 transition-colors"
                  onClick={() => alert("Mock: Opened production app in new tab")}
                >
                  <ExternalLink size={14} /> Open Production App
                </div>
                {/* Emergency Rollback Feature */}
                <div 
                  className="flex items-center gap-2 bg-cw-red/5 border border-cw-red/15 rounded-lg px-4 py-2 text-[12px] font-medium text-cw-red cursor-pointer hover:bg-cw-red/10 transition-colors"
                  onClick={() => alert("Mock: Triggered emergency rollback workflow")}
                >
                  <RotateCcw size={14} /> Emergency Rollback
                </div>
              </div>
            </div>
          )}

          {deployState === 'rejected' && (
            <div className="py-10 flex flex-col items-center justify-center text-cw-red bg-cw-red/5 border border-cw-red/20 rounded-lg">
              <XCircle size={32} className="mb-3" />
              <p className="text-[14px] font-medium text-cw-txt">Rejected</p>
              <p className="text-[12px] text-cw-txt2 mt-1">Deployment blocked. Pipeline aborted.</p>
            </div>
          )}

          {deployState === 'hard-blocked' && (
            <div className="py-6 flex flex-col items-center justify-center text-cw-txt animate-[pulse_2s_ease-in-out_infinite]">
              <AlertOctagon size={40} className="mb-3 text-cw-red" />
              <p className="text-[16px] font-bold text-cw-red">Pipeline Blocked - Critical Vulnerability</p>
              <p className="text-[12px] text-cw-txt2 mt-1 mb-6 text-center max-w-md">The Security Agent detected an unauthenticated SSRF vulnerability in this commit but was unable to safely auto-fix it. Automatic merge is disabled to protect production.</p>
              
              {!showOverride ? (
                <button 
                  onClick={() => setShowOverride(true)}
                  className="px-4 py-2 text-[12px] font-semibold rounded-lg border border-cw-bdr bg-cw-bg text-cw-txt cursor-pointer hover:bg-cw-bg3 transition-colors"
                >
                  Show Admin Override Options
                </button>
              ) : (
                <div className="w-full max-w-md bg-cw-bg border border-cw-red/30 p-4 rounded-lg">
                  <p className="text-[12px] font-semibold text-cw-txt mb-2 flex items-center gap-1.5"><AlertTriangle size={14} className="text-cw-amber" /> Admin Force Merge</p>
                  <input 
                    type="text" 
                    placeholder="Mandatory justification reason..." 
                    className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2 text-[12px] text-cw-txt mb-3 outline-none focus:border-cw-purple"
                    value={forceReason}
                    onChange={(e) => setForceReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDeployState('approved')}
                      disabled={forceReason.length < 5}
                      className="flex-1 px-3 py-2 text-[12px] rounded border-none bg-cw-red text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Override & Force Merge
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {deployState === 'reviewing' && (
            <>
              <div className="flex items-center gap-2 bg-cw-blue/5 border border-cw-blue/15 rounded-lg px-3 py-2.5 text-[12px] font-medium text-cw-blue mb-4">
                <div className="flex-1 flex items-center gap-2 cursor-pointer hover:underline" onClick={() => alert("Mock: Opened staging preview in new tab")}>
                  <ExternalLink size={14} /> staging-3fa2c1.codeward.app <span className="opacity-60 font-normal ml-1">— open live preview</span>
                </div>
                {/* Environment Variable Configurator */}
                <button onClick={() => { closeAllDrawers(); setEnvOpen(true); }} className="w-6 h-6 flex items-center justify-center hover:bg-cw-blue/10 rounded shrink-0 transition-colors">
                  <Settings size={14} />
                </button>
              </div>

              {/* Added Infra Cost Metric */}
              <div className="grid grid-cols-5 gap-3 my-4">
                {[
                  { icon: <CheckCircle size={16} className="text-cw-blue" />, label: '142/142 tests', desc: 'Code quality checks' },
                  { icon: <ShieldCheck size={16} className="text-cw-teal" />, label: '0 critical vulns', desc: 'Security scan clean' },
                  { icon: <TrendingDown size={16} className="text-cw-purple" />, label: '−247 lines', desc: 'Code debt removed' },
                  { icon: <Zap size={16} className="text-cw-amber" />, label: 'p99 < 120ms', desc: 'API latency profile' },
                  { icon: <Server size={16} className="text-cw-red" />, label: '+$14/mo infra', desc: 'Cloud billing estimate' },
                ].map((c, i) => (
                  <div key={i} className="bg-cw-bg border border-cw-bdr/50 rounded-lg p-2.5 flex items-center justify-center flex-col gap-1 text-center">
                    <div className="mb-0.5">{c.icon}</div>
                    <div className="text-[11px] font-bold text-cw-txt">{c.label}</div>
                    <div className="text-[9px] text-cw-txt3 leading-tight px-1">{c.desc}</div>
                  </div>
                ))}
              </div>

              <div className="text-[12px] text-cw-txt2 mb-4 bg-cw-bg3/40 rounded-lg p-3 border border-cw-bdr/30">
                <span className="font-semibold text-cw-txt">Score: 91/100</span> <span className="mx-1.5 opacity-40">|</span> 
                Security: <span className="text-cw-blue font-bold">PASS</span> <span className="mx-1.5 opacity-40">|</span> 
                Broken code: <span className="text-cw-blue font-bold">PASS</span> <span className="mx-1.5 opacity-40">|</span> 
                Architecture: <span className="text-cw-amber font-medium">1 warning</span>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setDeployState('approved')}
                  className="flex-[1.5] px-3 py-2 text-[12px] rounded-lg border-none bg-cw-green text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} /> Approve & Merge
                </button>
                <button 
                  onClick={() => setDeployState('rejected')}
                  className="flex-1 px-3 py-2 text-[12px] rounded-lg border-none bg-cw-red text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle size={14} /> Reject
                </button>
                {/* Agent Summary Button */}
                <button 
                  onClick={() => { closeAllDrawers(); setLogsOpen(true); }}
                  className="flex-1 px-3 py-2 text-[12px] rounded-lg border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 text-cw-txt cursor-pointer font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <TerminalSquare size={14} className="text-cw-purple" /> Agent Summary
                </button>
                <button 
                  onClick={() => { closeAllDrawers(); setDiffOpen(true); }}
                  className="flex-1 px-3 py-2 text-[12px] rounded-lg border-none bg-cw-purple text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} /> View diff
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="text-[10px] text-cw-txt3 text-center">
                  Auto-approves in <span className="font-mono text-cw-purple font-semibold">{formatTime(timeLeft)}</span> if no action taken
                </div>
                <button 
                  onClick={() => { closeAllDrawers(); setTimerSettingsOpen(true); }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors"
                  title="Configure Auto-Actions"
                >
                  <Settings size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right side-pull Timer/Action Settings drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${timerSettingsOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        {timerSettingsOpen && (
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg2 shrink-0">
              <div>
                <h3 className="text-[14px] font-semibold text-cw-txt leading-none mb-1">Gatekeeper Settings</h3>
                <p className="text-[11px] text-cw-txt3 leading-none">Configure auto-actions for this PR</p>
              </div>
              <button 
                onClick={() => setTimerSettingsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="mb-5">
                <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">Action on Expiry</label>
                <select className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt outline-none focus:border-cw-purple appearance-none">
                  <option>Auto-Approve & Merge</option>
                  <option>Auto-Reject & Block</option>
                  <option>Do Nothing (Wait indefinitely)</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">Review Timeout Duration</label>
                <div className="flex gap-2">
                  <input type="number" defaultValue="2" className="w-20 bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt font-mono outline-none focus:border-cw-purple text-center" />
                  <select className="flex-1 bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt outline-none focus:border-cw-purple appearance-none">
                    <option>Hours</option>
                    <option>Days</option>
                    <option>Minutes</option>
                  </select>
                </div>
              </div>

              <div className="mb-6 p-3 bg-cw-blue/5 border border-cw-blue/20 rounded-lg">
                <p className="text-[11px] text-cw-blue leading-relaxed">
                  These settings currently apply only to this specific deployment gate. To change the default behavior for all future pipelines, visit your Project Settings.
                </p>
              </div>

              <button 
                onClick={() => { alert("Mock: Gatekeeper rules updated!"); setTimerSettingsOpen(false); }}
                className="w-full py-2.5 text-[12px] rounded-lg border-none bg-cw-purple text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} /> Save Rules
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side-pull agent summary drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${logsOpen ? 'w-[440px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        {logsOpen && (
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg2 shrink-0">
              <div>
                <h3 className="text-[14px] font-semibold text-cw-txt leading-none mb-1">Agent Decision Summary</h3>
                <p className="text-[11px] text-cw-txt3 leading-none">High-level rationale for this deployment</p>
              </div>
              <button 
                onClick={() => setLogsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="mb-6">
                <h4 className="text-[12px] font-semibold text-cw-txt mb-2">Final Recommendation</h4>
                <div className="bg-cw-green/10 border border-cw-green/20 rounded-lg p-3 text-[12px] text-cw-green font-medium leading-relaxed">
                  Merge Recommended. All critical security checks passed. The architecture flaw identified during analysis was successfully auto-remediated, making this build safe for production.
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-[12px] font-semibold text-cw-txt mb-2">Security & Compliance</h4>
                <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3 text-[12px] text-cw-txt2 leading-relaxed">
                  Zero unauthenticated access paths or SSRF vulnerabilities detected across the 412 modified lines. The codebase remains compliant with SOC2 constraints.
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-[12px] font-semibold text-cw-txt mb-2 flex items-center justify-between">
                  Architecture Remediation <span className="bg-cw-amber/20 text-cw-amber px-2 py-0.5 rounded text-[10px] uppercase font-bold">Auto-Fixed</span>
                </h4>
                <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3 text-[12px] text-cw-txt2 leading-relaxed">
                  <p className="mb-2"><strong>Issue:</strong> An N+1 query loop was detected in <code className="text-cw-txt bg-cw-bg border border-cw-bdr px-1 rounded">/api/users</code> which would have resulted in an exponential database load under heavy traffic.</p>
                  <p><strong>Action:</strong> The agent automatically injected <code className="text-cw-txt bg-cw-bg border border-cw-bdr px-1 rounded">include: {'{'} profile: true {'}'}</code> to flatten the query and eliminate the loop, resolving the architectural risk.</p>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-cw-txt mb-2">Cost & Performance Impact</h4>
                <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3 text-[12px] text-cw-txt2 leading-relaxed">
                  The updated data access patterns (heavier join queries) will marginally increase database CPU usage. The estimated infrastructure cost increase is <strong>$14/mo</strong>, which is well within acceptable limits.
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── Right side-pull ENV configurator drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${envOpen ? 'w-[400px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        {envOpen && (
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg2 shrink-0">
              <div>
                <h3 className="text-[14px] font-semibold text-cw-txt leading-none mb-1">Environment Variables</h3>
                <p className="text-[11px] text-cw-txt3 leading-none">Inject overrides for this staging build</p>
              </div>
              <button 
                onClick={() => setEnvOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">DATABASE_URL</label>
                <input type="text" defaultValue="postgres://staging:***@db.internal:5432/main" className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt font-mono outline-none focus:border-cw-purple" />
              </div>
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">NEXT_PUBLIC_API_URL</label>
                <input type="text" defaultValue="https://api-staging.codeward.app" className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt font-mono outline-none focus:border-cw-purple" />
              </div>
              <div className="mb-6">
                <label className="text-[11px] font-semibold text-cw-txt2 uppercase tracking-wide mb-2 block">STRIPE_SECRET_KEY</label>
                <input type="password" defaultValue="sk_test_123456789" className="w-full bg-cw-bg2 border border-cw-bdr rounded p-2.5 text-[12px] text-cw-txt font-mono outline-none focus:border-cw-purple" />
              </div>

              <button 
                onClick={() => { alert("Mock: Restarting staging with new ENV vars..."); setEnvOpen(false); }}
                className="w-full py-2.5 text-[12px] rounded-lg border-none bg-cw-purple text-white cursor-pointer font-semibold shadow-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={14} /> Restart Staging
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right side-pull diff drawer ── */}
      <div className={`shrink-0 h-full bg-cw-bg border-l border-cw-bdr flex flex-col transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${diffOpen ? 'w-[440px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        {diffOpen && (
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-cw-bdr flex items-center justify-between bg-cw-bg2 shrink-0">
              <div>
                <h3 className="text-[14px] font-semibold text-cw-txt leading-none mb-1">Commit 3fa2c1 Diff</h3>
                <p className="text-[11px] text-cw-txt3 leading-none">Viewing changes proposed for production</p>
              </div>
              <button 
                onClick={() => setDiffOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="mb-4">
                <div className="text-[12px] font-semibold text-cw-txt mb-2">src/api/users.ts</div>
                <div className="bg-[#1e1e1e] rounded-md overflow-hidden font-mono text-[11px] leading-relaxed border border-[#333]">
                  <div className="p-3">
                    <div className="text-[#858585]">@@ -45,8 +45,8 @@ export async function getUsers(req, res) {'{'}</div>
                    <div className="text-[#cccccc] px-2 py-0.5">   try {'{'}</div>
                    <div className="text-[#f14c4c] bg-[#4a0000]/50 px-2 py-0.5">-    const users = await db.users.findMany();</div>
                    <div className="text-[#f14c4c] bg-[#4a0000]/50 px-2 py-0.5">-    for (const user of users) {'{'} user.profile = await db.profiles.findUnique({'{'} userId: user.id {'}'}); {'}'}</div>
                    <div className="text-[#73c991] bg-[#004a00]/50 px-2 py-0.5">+    const users = await db.users.findMany({'{'} include: {'{'} profile: true {'}'} {'}'});</div>
                    <div className="text-[#cccccc] px-2 py-0.5">     res.json(users);</div>
                    <div className="text-[#cccccc] px-2 py-0.5">   {'}'} catch (err) {'{'}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[12px] font-semibold text-cw-txt mb-2">src/utils/logger.ts</div>
                <div className="bg-[#1e1e1e] rounded-md overflow-hidden font-mono text-[11px] leading-relaxed border border-[#333]">
                  <div className="p-3">
                    <div className="text-[#858585]">@@ -12,4 +12,1 @@</div>
                    <div className="text-[#cccccc] px-2 py-0.5">   console.log(msg);</div>
                    <div className="text-[#f14c4c] bg-[#4a0000]/50 px-2 py-0.5">-  // TODO: Fix memory leak in logger</div>
                    <div className="text-[#f14c4c] bg-[#4a0000]/50 px-2 py-0.5">-  global.logs.push(msg);</div>
                    <div className="text-[#f14c4c] bg-[#4a0000]/50 px-2 py-0.5">-  if (global.logs.length &gt; 10000) global.logs = [];</div>
                    <div className="text-[#cccccc] px-2 py-0.5"> {'}'}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
