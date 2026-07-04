import { useEffect, useState } from 'react';
import { Copy, RefreshCw, Link2 } from 'lucide-react';
import { API_URL } from '../../lib/api';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors shrink-0 ${on ? 'bg-cw-blue' : 'bg-cw-bdr'}`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-[left] shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </div>
  );
}

function SetRow({ label, desc, control }: { label: string; desc?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-cw-bg3">
      <div>
        <div className="text-xs font-medium text-cw-txt">{label}</div>
        {desc && <div className="text-[11px] text-cw-txt3 mt-0.5">{desc}</div>}
      </div>
      {control}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-[10px] px-4 py-3.5 mb-3">
      <div className="text-[10px] font-bold text-cw-txt3 uppercase tracking-[.09em] mb-2.5 flex items-center gap-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function InputRow({ label, value, masked, buttonLabel, buttonColor, onButton }: {
  label?: string; value: string; masked?: boolean; buttonLabel: string; buttonColor?: string; onButton?: () => void;
}) {
  return (
    <div className="mb-2.5">
      {label && <div className="text-[11px] text-cw-txt3 mb-1">{label}</div>}
      <div className="flex gap-2">
        <input
          type={masked ? 'password' : 'text'}
          defaultValue={value}
          readOnly={masked}
          className={`flex-1 px-2.5 py-1.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg3 text-cw-txt outline-none ${masked ? 'font-mono' : ''}`}
        />
        <button
          onClick={onButton}
          className={`px-3 py-1.5 text-[11px] rounded-md border-none text-white cursor-pointer font-medium shrink-0 ${buttonColor || 'bg-cw-blue'}`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Real per-repo auto-merge policy — backed by GET/PUT /api/approvals/settings/:repoId, which
 * persists into repositories.config and drives the real BullMQ timeout-merge scheduling.
 */
function AutoMergePolicyCard() {
  const [repos, setRepos] = useState<Array<{ id: number; fullName: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [timeoutMinutes, setTimeoutMinutes] = useState(120);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const list = (Array.isArray(data) ? data : data?.repos ?? data?.connectedRepos ?? []).map((r: any) => ({ id: r.id, fullName: r.fullName }));
        setRepos(list.filter((r: any) => r.id != null));
        if (list.length > 0) setSelectedRepo(list[0].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedRepo == null) return;
    fetch(`${API_URL}/api/approvals/settings/${selectedRepo}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setMode(data.settings.mode);
          setTimeoutMinutes(data.settings.timeoutMinutes);
        }
      })
      .catch(console.error);
  }, [selectedRepo]);

  const save = async (nextMode: 'manual' | 'auto', nextTimeout: number) => {
    if (selectedRepo == null) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/approvals/settings/${selectedRepo}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode, timeoutMinutes: nextTimeout }),
      });
      const data = await res.json();
      if (res.ok && data?.settings) {
        setMode(data.settings.mode);
        setTimeoutMinutes(data.settings.timeoutMinutes);
        setSavedMsg('Saved');
        setTimeout(() => setSavedMsg(null), 2000);
      } else {
        setSavedMsg(data?.error ?? 'Save failed');
      }
    } catch (e) {
      setSavedMsg('Save failed');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="🔀 Auto-Merge Policy (per repository)">
      <div className="text-[11px] text-cw-txt3 mb-2.5 leading-[1.5]">
        Controls what happens after Guardian approves a Codeward auto-fix PR. Manual: nothing merges without your click.
        Auto: if you don't respond within the window, the PR merges on your standing authorization. High/critical-severity
        fixes always require a manual click regardless of this setting.
      </div>

      {repos.length === 0 ? (
        <div className="text-[11px] text-cw-txt3 py-2">No connected repositories yet.</div>
      ) : (
        <>
          <SetRow label="Repository" control={
            <select
              value={selectedRepo ?? ''}
              onChange={(e) => setSelectedRepo(Number(e.target.value))}
              className="text-[11px] px-2 py-1 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt outline-none max-w-[220px]"
            >
              {repos.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
            </select>
          } />
          <SetRow label="Merge mode" desc={mode === 'auto' ? `Unactioned approved PRs merge after ${timeoutMinutes >= 60 ? `${Math.round(timeoutMinutes / 60)}h` : `${timeoutMinutes}m`}.` : 'Every merge requires your explicit click.'} control={
            <select
              value={mode === 'manual' ? 'manual' : String(timeoutMinutes)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'manual') { save('manual', timeoutMinutes); }
                else { save('auto', Number(v)); }
              }}
              disabled={saving}
              className="text-[11px] px-2 py-1 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt outline-none"
            >
              <option value="manual">Manual approval required</option>
              <option value="120">Auto-merge after 2 hours</option>
              <option value="720">Auto-merge after 12 hours</option>
              <option value="1440">Auto-merge after 24 hours</option>
            </select>
          } />
          {savedMsg && <div className={`text-[11px] mt-1.5 ${savedMsg === 'Saved' ? 'text-cw-green' : 'text-cw-red'}`}>{savedMsg}</div>}
        </>
      )}
    </SectionCard>
  );
}

export function Settings() {
  const [toggles, setToggles] = useState({
    autoRefactor: true,
    autoDeploy: true,
    autoMerge: false,
    autonomous: false,
    autoRollback: true,
    aggressiveDedup: true,
    prMode: true,
    dryRunOnly: true,
    slack: true,
    email: true,
    push: false,
    aiAlerts: true,
  });

  const [copied, setCopied] = useState(false);

  const tg = (key: keyof typeof toggles) => setToggles(s => ({ ...s, [key]: !s[key] }));

  const webhookUrl = 'https://6da03ff7-234d-4d3e-ab48df5075fb7.codeward.app/reposeive';

  const copyWebhook = () => {
    navigator.clipboard?.writeText(webhookUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">

      {/* ── INCOMING WEBHOOK ── */}
      <SectionCard title="⬇ Incoming Webhook">
        <div className="text-[11px] text-cw-txt3 mb-2.5 leading-[1.5]">
          Add this URL in your repository's push webhook settings to trigger automated analysis on every commit.
        </div>
        <div className="flex gap-2 mb-2.5">
          <div className="flex-1 px-2.5 py-1.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg3 text-cw-blue font-mono overflow-hidden text-ellipsis whitespace-nowrap">
            {webhookUrl}
          </div>
          <button onClick={copyWebhook} className="px-3 py-1.5 text-[11px] rounded-md border-none bg-cw-bg3 text-cw-txt2 cursor-pointer flex items-center gap-1.5">
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="text-[11px] text-cw-txt2 font-medium mb-1.5">Setup Instructions</div>
        <div className="bg-cw-bg3 border border-cw-bdr rounded-md px-2.5 py-2 text-[11px] text-cw-txt2 leading-[1.7] mb-2.5">
          <div>Settings → Webhooks → Add webhook → Paste URL → Content type: <code className="font-mono bg-cw-bg2 px-1 py-[1px] rounded-[3px]">application/json</code> → Push events</div>
          <div>Settings → Webhooks → SSL: Field → Paste webhook url → Check <code className="font-mono bg-cw-bg2 px-1 py-[1px] rounded-[3px]">"Push events"</code> → Add webhook</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-[10px] text-cw-txt3 mb-1">Secret Token (HMAC validation)</div>
            <input type="password" defaultValue="••••••••••••••••••••" readOnly className="w-full px-2.5 py-1.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg3 text-cw-txt outline-none font-mono" />
          </div>
          <button className="px-3 py-1.5 text-[11px] rounded-md border-none bg-cw-bg3 text-cw-txt2 cursor-pointer self-end flex items-center gap-1.5">
            <RefreshCw size={12} /> Rotate
          </button>
        </div>
        <div className="text-[10px] text-cw-txt3 mt-1.5">Add this in your webhook secret field to verify payload authenticity.</div>
      </SectionCard>

      {/* ── PROVIDER CONNECTIONS ── */}
      <SectionCard title="🔗 Provider Connections">
        <div className="text-[11px] text-cw-txt3 mb-2.5">Configure access tokens for reading repo metadata and opening PRs.</div>

        <InputRow
          label="GitHub Personal Access Token"
          value="••••••••••••••••••••••••••"
          masked
          buttonLabel="Update"
        />
        <div className="text-[10px] text-cw-txt3 mb-2.5">Repositories, repos, workflows, read:org scopes.</div>

        <div className="text-[11px] text-cw-txt2 mb-1">GitHub Org Token</div>
        <div className="flex gap-2">
          <input
            placeholder="Org/..."
            className="flex-1 px-2.5 py-1.5 border border-cw-bdr rounded-md text-[11px] bg-cw-bg3 text-cw-txt outline-none"
          />
          <button className="px-3.5 py-1.5 text-[11px] rounded-md border-none bg-cw-green text-white cursor-pointer font-medium">
            Connect
          </button>
        </div>
      </SectionCard>

      {/* ── AUTONOMOUS ENGINE PARAMETERS ── */}
      <SectionCard title="⚙ Autonomous Engine Parameters">
        <div className="text-[11px] text-cw-txt3 mb-2.5">Configure how the autonomous Codeward Engine behaves mode.</div>

        <SetRow label="Auto Rollback on Test Failure" desc="Automatically revert commits that break verification tests." control={<Toggle on={toggles.autoRollback} onChange={() => tg('autoRollback')} />} />
        <SetRow label="Aggressive Deduplication" desc="Also deep-scan this duplicated duplicates, not just exact matches." control={<Toggle on={toggles.aggressiveDedup} onChange={() => tg('aggressiveDedup')} />} />
        <SetRow label="PR Mode (Requires Manual Review)" desc="Open a pull request and review before committing directly." control={<Toggle on={toggles.prMode} onChange={() => tg('prMode')} />} />
        <SetRow label="Dry Run Only" desc="Analyse and report but without applying any changes." control={<Toggle on={toggles.dryRunOnly} onChange={() => tg('dryRunOnly')} />} />
      </SectionCard>

      {/* ── TRUST MODE ── */}
      <SectionCard title="🛡 Trust Mode">
        <SetRow label="Auto-refactor low-risk files" desc="Utilities, helpers, test files. Never touches business logic without asking." control={<Toggle on={toggles.autoRefactor} onChange={() => tg('autoRefactor')} />} />
        <SetRow label="Auto-deploy to staging" desc="After sandbox passes all gates, deploy to ephemeral staging automatically." control={<Toggle on={toggles.autoDeploy} onChange={() => tg('autoDeploy')} />} />
        <SetRow label="Auto-merge to production" desc="Merge after staging approval. Off = always require human click." control={<Toggle on={toggles.autoMerge} onChange={() => tg('autoMerge')} />} />
        <SetRow label="Codeward AI autonomous mode" desc="Allow the agent to proactively suggest and execute refactors on a schedule." control={<Toggle on={toggles.autonomous} onChange={() => tg('autonomous')} />} />
      </SectionCard>

      {/* ── PRODUCTION GATE ── */}
      <SectionCard title="🚀 Production Gate">
        <SetRow label="Staging approval mode" control={<select className="text-[11px] px-2 py-1 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt outline-none"><option>Manual approval required</option><option>Auto-approve after 2 hours</option><option>Auto-approve after 30 min</option></select>} />
        <SetRow label="Post-deploy monitoring window" control={<select className="text-[11px] px-2 py-1 rounded-md border border-cw-bdr bg-cw-bg2 text-cw-txt outline-none"><option>10 minutes</option><option>30 minutes</option><option>1 hour</option></select>} />
        <SetRow label="Auto-rollback on anomaly" desc="Rollback if error rate spikes 3× baseline within monitoring window." control={<Toggle on={toggles.autoRollback} onChange={() => tg('autoRollback')} />} />
      </SectionCard>

      {/* ── NOTIFICATIONS ── */}
      <SectionCard title="🔔 Notifications">
        <SetRow label="Slack" control={<Toggle on={toggles.slack} onChange={() => tg('slack')} />} />
        <SetRow label="Email digest (weekly)" control={<Toggle on={toggles.email} onChange={() => tg('email')} />} />
        <SetRow label="Push notifications (mobile)" control={<Toggle on={toggles.push} onChange={() => tg('push')} />} />
        <SetRow label="Codeward AI proactive alerts" desc="Agent notifies you when it spots a pattern worth discussing across repos." control={<Toggle on={toggles.aiAlerts} onChange={() => tg('aiAlerts')} />} />
      </SectionCard>
    </div>
  );
}
