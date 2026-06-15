import { useState, useEffect } from 'react';
import {
  Key, Rocket, Unlock, Lightbulb, RotateCcw, Scale, BarChart2, TimerOff, Pause,
  Plus, ShieldCheck, GitPullRequest, Bot, LineChart, ClipboardList,
  Hash, Mail, MessageCircle, Calendar, X, ChevronRight, Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface AlertItem {
  id: number;
  tab: string[];
  icon: any;
  color: 'red' | 'green' | 'amber' | 'purple' | 'gray';
  title: string;
  source: string;
  repo: string;
  desc: string;
  time: string;
  chip: string;
  chipColor: 'danger' | 'success' | 'warning' | 'info' | 'secondary' | 'tertiary';
  body: string;
  evidence: string;
  channels: string[];
  actions: string[];
}

const ALERTS: AlertItem[] = [
  { id:1, tab:['all','security'], icon: Key, color:'red', title:'Critical: API key exposed', source:'Security Agent', repo:'payments-api', desc:'Stripe key hardcoded in config.js:14 — auto-fixed and moved to env var. Git history flagged for rotation.', time:'2m ago', chip:'Critical', chipColor:'danger',
    body:'The Security Agent found a live Stripe secret key committed in config.js line 14, visible in 47 prior commits. Codeward moved it to an environment variable immediately and opened a PR. The exposed key should be rotated in your Stripe dashboard.',
    evidence:'truffleHog · config.js:14 · sk_live_4xT9... · 47 commits exposed',
    channels:['Slack','Email','WhatsApp'], actions:['View PR #214','Mark resolved','Snooze 1h'] },

  { id:2, tab:['all','deploy'], icon: Rocket, color:'green', title:'Staging ready for review', source:'Deploy Manager', repo:'my-api', desc:'Commit 3fa2c1 passed all gates — 142/142 tests, score 91/100. Auto-approves in 1h 52m.', time:'4m ago', chip:'Ready', chipColor:'success',
    body:'All 5 agents passed for commit 3fa2c1. Live preview is ready at staging-3fa2c1.codeward.app. Calendar shows your team free until 5pm — auto-approve window aligned to working hours.',
    evidence:'Gate: security ✓ · broken-code ✓ · architecture: 1 warning (N+1)',
    channels:['Slack','WhatsApp','Calendar'], actions:['Approve now','Open preview','Review diff'] },

  { id:3, tab:['all','security'], icon: Unlock, color:'amber', title:'RLS missing on users table', source:'Security Agent', repo:'payments-api', desc:'Row-level security not enabled — any authenticated user can query all rows.', time:'12m ago', chip:'High', chipColor:'warning',
    body:'Supabase table users has no RLS policy. Codeward generated a suggested policy restricting reads to auth.uid() = id. This is a suggested fix only — review before applying in payments-api per its trust mode.',
    evidence:'Supabase RLS check · table: users · policy_count: 0',
    channels:['Slack','Email'], actions:['View suggested SQL','Create issue','Dismiss'] },

  { id:4, tab:['all','agent'], icon: Lightbulb, color:'purple', title:'Pattern noticed across 3 repos', source:'Chat Agent', repo:'my-api, auth-service, frontend-api', desc:'Same N+1 query pattern on profile fetching appears in all three. I can fix all three in one operation.', time:'1h ago', chip:'Suggestion', chipColor:'info',
    body:'The Chat Agent compared Architecture Agent findings across your repos and found an identical N+1 pattern: fetching user profiles in a loop instead of a single JOIN. Estimated impact: ~40% latency reduction on the affected endpoints.',
    evidence:'fallow check_health · 3 repos · pattern: loop-query (12 occurrences)',
    channels:['Slack'], actions:['Run fix across all 3','Show details','Not now'] },

  { id:5, tab:['all','deploy'], icon: RotateCcw, color:'red', title:'Auto-rollback triggered', source:'Deploy Manager', repo:'frontend', desc:'Error rate spiked 4× baseline within 6 minutes of deploy — rolled back to previous stable commit.', time:'3h ago', chip:'Critical', chipColor:'danger',
    body:'Post-deploy monitoring (Sentry) detected error rate at 4.2× baseline 6 minutes after commit c33f91 went live. Auto-rollback restored commit aa01b2. No manual schema changes were involved, so rollback completed cleanly.',
    evidence:'Sentry · error_rate: 4.2x baseline · window: 6m · rollback: c33f91 → aa01b2',
    channels:['Slack','Email','WhatsApp'], actions:['View incident','Open Sentry','Acknowledge'] },

  { id:6, tab:['all','compliance'], icon: Scale, color:'amber', title:'Accessibility regression detected', source:'Compliance Agent', repo:'frontend', desc:'3 new components fail WCAG 2.2 contrast checks — added in last 5 commits.', time:'Today, scheduled', chip:'Medium', chipColor:'warning',
    body:'Daily Compliance Agent scan found 3 components with text contrast below WCAG 2.2 AA (4.5:1). All were introduced in the last 5 commits to the design system. Batched into your weekly compliance review.',
    evidence:'axe-core · 3 violations · contrast-ratio: 2.8–3.4 (required 4.5)',
    channels:['Email'], actions:['View report','Add to sprint board','Snooze'] },

  { id:7, tab:['all','agent'], icon: BarChart2, color:'gray', title:'Weekly health digest', source:'Data/DX Agent', repo:'all repos', desc:'Health score 71 → 87 (+16) over 30 days. 47 debt items removed. payments-api still lagging at 52.', time:'Mon 9:00am', chip:'Digest', chipColor:'info',
    body:'Your codebase is 4.2% leaner and security issues are down from 9 to 0 across all repos. Test coverage rose from 68% to 84%. payments-api remains your biggest opportunity — want a full audit pass scheduled?',
    evidence:'Aggregated from 142 runs · 5 repos · 30-day window',
    channels:['Email','WhatsApp'], actions:['View full report','Schedule payments-api audit'] },

  { id:8, tab:['all','security'], icon: TimerOff, color:'gray', title:'Stale feature flag — 100% on for 38 days', source:'Broken Code Agent', repo:'my-api', desc:'NEW_CHECKOUT_FLOW flag has been fully enabled for 38 days. Suggest removing the conditional.', time:'Yesterday', chip:'Low', chipColor:'tertiary',
    body:'Fallow feature-flag detection found NEW_CHECKOUT_FLOW set to 100% rollout since May 9 with no remaining false-branch usage in telemetry. Removing the flag and dead branch would simplify 3 files.',
    evidence:'fallow feature_flags · flag: NEW_CHECKOUT_FLOW · rollout: 100% · age: 38d',
    channels:['Slack'], actions:['Preview cleanup diff','Dismiss'] },

  { id:9, tab:['all','deploy'], icon: Pause, color:'gray', title:'Push held — baseline audit in progress', source:'Orchestrator', repo:'legacy-billing', desc:'Repo just connected. Full audit running (Mode 1) — this push will process once complete (~12 min remaining).', time:'Just now', chip:'Paused', chipColor:'tertiary',
    body:'legacy-billing was connected 8 minutes ago. The one-time full-repo audit is scanning 1,840 files across all 8 agents. Your push to main is queued and will run automatically once the baseline completes.',
    evidence:'Mode 1 audit · status: auditing · progress: 64% · eta: 12m',
    channels:['Email'], actions:['View live progress','Cancel queue'] }
];

// Reusing tailwind colors mapping
const colorToBgClass: Record<string, string> = {
  red: 'bg-cw-red/15 text-cw-red',
  green: 'bg-cw-green/15 text-cw-green',
  amber: 'bg-cw-amber/15 text-cw-amber',
  purple: 'bg-cw-purple/15 text-cw-purple',
  gray: 'bg-cw-bg3 text-cw-txt3'
};

const chipColors: Record<string, string> = {
  danger: 'bg-cw-red/15 text-cw-red',
  success: 'bg-cw-green/15 text-cw-green',
  warning: 'bg-cw-amber/15 text-cw-amber',
  info: 'bg-cw-purple/15 text-cw-purple',
  secondary: 'bg-cw-bg3 text-cw-txt2',
  tertiary: 'bg-cw-bg2 text-cw-txt3 border border-cw-bdr'
};

export function Alerts() {
  const [activeTab, setActiveTab] = useState('all');
  const [activeStat, setActiveStat] = useState<string | null>('active');
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);

  const filteredAlerts = ALERTS.filter(a => {
    if (activeStat) return true; // simplified filtering for stats vs tabs
    return activeTab === 'all' || a.tab.includes(activeTab);
  });

  const selectedAlert = ALERTS.find(a => a.id === selectedAlertId);

  const handleStatClick = (stat: string) => {
    if (activeStat === stat) {
      setActiveStat(null);
    } else {
      setActiveStat(stat);
      setActiveTab('all');
    }
    setSelectedAlertId(null);
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setActiveStat(null);
    setSelectedAlertId(null);
  };

  const renderChannelIcon = (name: string) => {
    switch(name) {
      case 'Slack': return <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-3.5 h-3.5 object-contain" />;
      case 'Email': return <img src="https://cdn.simpleicons.org/gmail" alt="Email" className="w-3.5 h-3.5 object-contain" />;
      case 'WhatsApp': return <img src="https://cdn.simpleicons.org/whatsapp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" />;
      case 'Calendar': return <img src="https://cdn.simpleicons.org/googlecalendar" alt="Calendar" className="w-3.5 h-3.5 object-contain" />;
      default: return null;
    }
  };

  const handleCreateSave = () => {
    toast.success('Alert rule saved successfully');
  };

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full transition-all duration-300">
        <div className="p-8 max-w-[1000px] mx-auto pb-24">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[22px] font-bold text-cw-txt">Alerts</h1>
              <div className="text-[13px] text-cw-txt2 mt-1">codeward.io · acme-corp · 5 repos</div>
            </div>
            <button 
              onClick={() => document.getElementById('create-alert')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-cw-bg2 border border-cw-bdr hover:bg-cw-bg3 text-cw-txt px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
            >
              <Plus size={16} /> New alert
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { id: 'active', num: 24, label: 'Active alerts', color: 'text-cw-purple' },
              { id: 'triggered', num: 18, label: 'Triggered today', color: 'text-cw-red' },
              { id: 'high', num: 7, label: 'High priority', color: 'text-cw-amber' },
              { id: 'paused', num: 3, label: 'Paused', color: 'text-cw-txt3' }
            ].map(stat => (
              <div 
                key={stat.id}
                onClick={() => handleStatClick(stat.id)}
                className={`bg-cw-bg2 rounded-xl p-4 cursor-pointer transition-all border ${activeStat === stat.id ? 'border-cw-purple shadow-sm' : 'border-transparent hover:border-cw-bdr'}`}
              >
                <div className={`text-[24px] font-bold mb-0.5 ${stat.color}`}>{stat.num}</div>
                <div className="text-[12px] text-cw-txt2">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-cw-bdr overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'security', label: 'Security' },
              { id: 'deploy', label: 'Deploy & staging' },
              { id: 'agent', label: 'Agent activity' },
              { id: 'compliance', label: 'Compliance' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id && !activeStat ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alert List */}
          <div className="flex flex-col gap-2 mb-12">
            {filteredAlerts.map(alert => {
              const isSel = selectedAlertId === alert.id;
              return (
                <div 
                  key={alert.id}
                  onClick={() => setSelectedAlertId(isSel ? null : alert.id)}
                  className={`flex gap-4 items-center p-3.5 md:p-4 rounded-xl border cursor-pointer transition-colors ${isSel ? 'bg-cw-purple/5 border-cw-purple' : 'bg-cw-bg2 border-cw-bdr hover:bg-cw-bg3'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 self-start ${colorToBgClass[alert.color]}`}>
                    <alert.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0 mt-0.5 self-start">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="text-[14px] font-semibold text-cw-txt flex items-center gap-2 truncate">
                        {alert.title}
                      </div>
                      <div className="text-[12px] text-cw-txt3 whitespace-nowrap shrink-0">{alert.time}</div>
                    </div>
                    <div className="text-[13px] text-cw-txt2 mb-2 line-clamp-2 pr-4">{alert.desc}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${chipColors[alert.chipColor]}`}>
                        {alert.chip}
                      </span>
                      <span className="text-[11px] text-cw-txt3">•</span>
                      <span className="text-[12px] text-cw-txt2 font-medium">{alert.source}</span>
                      <span className="text-[11px] text-cw-txt3">•</span>
                      <span className="text-[12px] text-cw-txt3">{alert.repo}</span>
                    </div>
                  </div>
                  <div className="hidden sm:block shrink-0 pl-2">
                    <button className="px-3 py-1.5 bg-cw-green/10 border border-cw-green/20 hover:bg-cw-green/20 text-cw-green text-[12px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                      Details <ChevronRight size={14} className="text-cw-green/70" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredAlerts.length === 0 && (
              <div className="py-10 text-center text-cw-txt3">No alerts found for this filter.</div>
            )}
          </div>

          {/* Roles Grid */}
          <div className="mb-12">
            <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-4">Who sends what — roles in this system</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Security Agent', icon: ShieldCheck, color: 'text-cw-red', desc: 'Critical/High findings — secrets, missing auth, RLS gaps, CVEs. Always immediate, never batched.' },
                { name: 'Guardian Agent', icon: GitPullRequest, color: 'text-cw-purple', desc: 'PR reviews posted, issues created, approve/block decisions. Links straight to the GitHub thread.' },
                { name: 'Deploy Manager', icon: Rocket, color: 'text-cw-green', desc: 'Staging ready, approval windows, auto-rollback triggers. Time-sensitive — calendar-aware.' },
                { name: 'Chat Agent', icon: Bot, color: 'text-cw-purple', desc: 'Proactive cross-repo patterns — "I noticed the same N+1 in 3 repos." Surfaced, not pushed.' },
                { name: 'Compliance Agent', icon: Scale, color: 'text-cw-amber', desc: 'Daily scheduled. RTBF gaps, consent drift, accessibility regressions. Batched into reviews.' },
                { name: 'Data/DX Agent', icon: LineChart, color: 'text-cw-txt3', desc: 'Weekly digest — health score trend, debt removed, onboarding friction. One summary alert.' }
              ].map(role => (
                <div key={role.name} className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-cw-txt mb-1.5">
                    <role.icon size={16} className={role.color} /> {role.name}
                  </div>
                  <div className="text-[12px] text-cw-txt2 leading-relaxed">{role.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Alert Form */}
          <div id="create-alert" className="scroll-mt-8">
            <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-4">Create new alert</h3>
            <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 md:p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6 items-center mb-5">
                <label className="text-[13px] text-cw-txt2 font-medium">Source</label>
                <select className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt outline-none focus:border-cw-purple">
                  <option>Security Agent — any repo</option>
                  <option>Guardian Agent — specific repo</option>
                  <option>Deploy Manager — staging events</option>
                  <option>Compliance Agent — scheduled</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6 items-center mb-5">
                <label className="text-[13px] text-cw-txt2 font-medium">Condition</label>
                <select className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt outline-none focus:border-cw-purple">
                  <option>Severity is Critical or High</option>
                  <option>Health score drops below 70</option>
                  <option>PR blocked for &gt; 2 hours</option>
                  <option>Contains keyword "RLS" or "secret"</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6 items-center mb-5">
                <label className="text-[13px] text-cw-txt2 font-medium self-start md:mt-2">Channels</label>
                <div className="flex flex-wrap gap-3">
                  {['Slack', 'Email', 'WhatsApp', 'Calendar'].map((ch, i) => (
                    <label key={ch} className="flex items-center gap-2 bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 cursor-pointer hover:border-cw-txt3 transition-colors">
                      <input type="checkbox" defaultChecked={i < 2} className="accent-cw-purple" />
                      <span className="flex items-center gap-1.5 text-[12px] text-cw-txt font-medium">
                        {renderChannelIcon(ch)} {ch}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6 items-center mb-6">
                <label className="text-[13px] text-cw-txt2 font-medium">Schedule</label>
                <select className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt outline-none focus:border-cw-purple">
                  <option>Immediate</option>
                  <option>Batched — every 4 hours</option>
                  <option>Daily digest</option>
                  <option>Weekly digest</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-6">
                <div className="hidden md:block"></div>
                <div>
                  <button 
                    onClick={handleCreateSave}
                    className="bg-cw-purple hover:brightness-110 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
                  >
                    Save alert rule
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Side Pull Detail View */}
      <div 
        className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedAlert ? 'w-[450px] min-w-[320px] lg:w-[450px] md:w-[380px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}
      >
        {selectedAlert && (
          <>
            <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
              <div className="min-w-0 pr-4">
                <h2 className="text-[16px] font-bold text-cw-txt truncate">Alert Details</h2>
              </div>
              <button onClick={() => setSelectedAlertId(null)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-cw-bg">
              
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorToBgClass[selectedAlert.color]}`}>
                  <selectedAlert.icon size={24} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-cw-txt mb-1 leading-tight">{selectedAlert.title}</h3>
                  <div className="text-[12px] text-cw-txt3">{selectedAlert.source} · {selectedAlert.repo} · {selectedAlert.time}</div>
                </div>
              </div>

              <div className="text-[14px] text-cw-txt2 leading-relaxed mb-6">
                {selectedAlert.body}
              </div>

              <div className="bg-cw-bg2 border border-cw-bdr rounded-lg p-3 mb-6 font-mono text-[11px] text-cw-txt2 leading-relaxed flex items-start gap-3">
                <ClipboardList size={14} className="mt-0.5 shrink-0 text-cw-txt3" />
                <span>{selectedAlert.evidence}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {selectedAlert.actions.map((act, i) => (
                  <button 
                    key={act}
                    onClick={() => {
                      toast.success(`Action triggered: ${act}`);
                      setSelectedAlertId(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${i === 0 ? 'bg-cw-purple hover:brightness-110 text-white' : 'bg-cw-bg2 border border-cw-bdr hover:bg-cw-bg3 text-cw-txt'}`}
                  >
                    {act}
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-cw-bdr">
                <div className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider mb-3">Delivered via</div>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.channels.map(ch => (
                    <div key={ch} className="flex items-center gap-1.5 bg-cw-bg2 border border-cw-bdr rounded-md px-2.5 py-1 text-[11px] font-medium text-cw-txt2">
                      {renderChannelIcon(ch)} {ch}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}
