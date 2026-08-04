/**
 * McpConnectionDrawer
 *
 * Rendered inside the existing push-drawer in Integrations.tsx.
 * Provider-specific: shows different form fields for 'postgres' vs 'redis'.
 *
 * Flow:
 * 1. User fills in connection details specific to the provider.
 * 2. "Test connection" pings the backend (no save).
 * 3. After a successful test, "Save" becomes enabled.
 * 4. On save, credentials are encrypted server-side and the server is persisted.
 */

import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Zap, Save, ShieldAlert, Copy } from 'lucide-react';
import { API_URL } from '../../lib/api';

// ─── Logos ────────────────────────────────────────────────────────────────────
// Using official CDN logos so they look identical to what you'd find in the docs.
const LOGOS = {
  postgres: 'https://cdn.simpleicons.org/postgresql',
  redis: 'https://cdn.simpleicons.org/redis',
  custom: 'https://cdn.simpleicons.org/jsonwebtokens',
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type McpProvider = 'postgres' | 'redis' | 'custom';

interface Props {
  provider: McpProvider;
  /** If editing an existing server, pass its id */
  existingId?: string;
  onClose: () => void;
  onSaved: (server: { id: string; displayName: string; status: string }) => void;
}

// ─── Provider metadata ────────────────────────────────────────────────────────
const PROVIDER_META: Record<McpProvider, { label: string; logoUrl: string; subtitle: string; testEndpoint: string; saveEndpoint: string }> = {
  postgres: {
    label: 'PostgreSQL Database',
    logoUrl: LOGOS.postgres,
    subtitle: 'Direct read-only connection to your database',
    testEndpoint: '/api/mcp/postgres/test',
    saveEndpoint: '/api/mcp/postgres/save',
  },
  redis: {
    label: 'Redis Cache',
    logoUrl: LOGOS.redis,
    subtitle: 'Read-only key inspection and monitoring',
    testEndpoint: '/api/mcp/redis/test',
    saveEndpoint: '/api/mcp/redis/save',
  },
  custom: {
    label: 'Custom MCP Server',
    logoUrl: LOGOS.custom,
    subtitle: 'Bring your own MCP-compatible server endpoint',
    testEndpoint: '/api/mcp/custom/test',
    saveEndpoint: '/api/mcp/custom/save',
  },
};

// ─── Read-only role SQL snippet ───────────────────────────────────────────────
const PG_READONLY_SNIPPET = `-- Run this once in your database as a superuser
CREATE ROLE codeward_readonly WITH LOGIN PASSWORD 'your-secure-password';
GRANT CONNECT ON DATABASE your_database TO codeward_readonly;
GRANT USAGE ON SCHEMA public TO codeward_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO codeward_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO codeward_readonly;`;

// ─── Component ────────────────────────────────────────────────────────────────
export function McpConnectionDrawer({ provider, onClose, onSaved }: Props) {
  const meta = PROVIDER_META[provider];

  // ── Postgres fields
  const [pgDisplayName, setPgDisplayName] = useState('');
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('5432');
  const [pgDb, setPgDb] = useState('');
  const [pgUser, setPgUser] = useState('codeward_readonly');
  const [pgPassword, setPgPassword] = useState('');
  const [pgSslMode, setPgSslMode] = useState<'require' | 'prefer' | 'disable'>('require');

  // ── Redis fields
  const [rdDisplayName, setRdDisplayName] = useState('');
  const [rdHost, setRdHost] = useState('');
  const [rdPort, setRdPort] = useState('6379');
  const [rdPassword, setRdPassword] = useState('');
  const [rdDb, setRdDb] = useState('0');
  const [rdTls, setRdTls] = useState(false);

  // ── Custom MCP fields
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customToken, setCustomToken] = useState('');

  // ── State machine
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; latencyMs?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);

  // ── Build the payload for test / save
  function buildPayload(forSave = false) {
    if (provider === 'postgres') {
      return {
        ...(forSave ? { displayName: pgDisplayName } : {}),
        host: pgHost,
        port: pgPort,
        database: pgDb,
        user: pgUser,
        password: pgPassword,
        sslMode: pgSslMode,
      };
    }
    if (provider === 'redis') {
      return {
        ...(forSave ? { displayName: rdDisplayName } : {}),
        host: rdHost,
        port: rdPort,
        password: rdPassword || undefined,
        db: rdDb,
        tls: rdTls,
      };
    }
    return {
      ...(forSave ? { displayName: customDisplayName } : {}),
      url: customUrl,
      token: customToken,
    };
  }

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}${meta.testEndpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false)),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, msg: `Connected — ${data.latencyMs ?? '—'}ms`, latencyMs: data.latencyMs });
      } else {
        setTestResult({ success: false, msg: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: 'Network error. Is the API running?' });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}${meta.saveEndpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(true)),
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.server);
      } else {
        setTestResult({ success: false, msg: data.error || 'Save failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: 'Network error. Is the API running?' });
    }
    setSaving(false);
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(PG_READONLY_SNIPPET).then(() => {
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    });
  };

  const displayName = provider === 'postgres' ? pgDisplayName : provider === 'redis' ? rdDisplayName : customDisplayName;
  const canTest = provider === 'postgres'
    ? pgHost && pgDb && pgUser && pgPassword
    : provider === 'redis'
      ? !!rdHost
      : !!(customUrl);
  const canSave = testResult?.success && !!displayName;

  return (
    <>
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-cw-bdr p-1.5">
            <img src={meta.logoUrl} alt={meta.label} className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-cw-txt truncate">Connect {meta.label}</div>
            <div className="text-[11px] text-cw-txt3">{meta.subtitle}</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* ── Postgres form ── */}
        {provider === 'postgres' && (
          <>
            {/* Security advisory */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-cw-txt mb-1">Use a read-only role</p>
                  <p className="text-[12px] text-cw-txt3 leading-relaxed mb-3">
                    Create a <span className="font-mono bg-cw-bg px-1 rounded text-amber-500">codeward_readonly</span> role in your database with <code className="font-mono text-[11px]">SELECT</code> access only. Agents are blocked at the API level from writing, but a scoped role adds defense-in-depth.
                  </p>
                  <button
                    onClick={copySnippet}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    <Copy size={12} />
                    {snippetCopied ? 'Copied!' : 'Copy setup SQL'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Display Name</span>
                <input
                  type="text"
                  value={pgDisplayName}
                  onChange={(e) => setPgDisplayName(e.target.value)}
                  placeholder="e.g. Production Postgres"
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 block">
                  <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Host</span>
                  <input
                    type="text"
                    value={pgHost}
                    onChange={(e) => setPgHost(e.target.value)}
                    placeholder="db.example.com"
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Port</span>
                  <input
                    type="number"
                    value={pgPort}
                    onChange={(e) => setPgPort(e.target.value)}
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Database</span>
                <input
                  type="text"
                  value={pgDb}
                  onChange={(e) => setPgDb(e.target.value)}
                  placeholder="my_database"
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Username</span>
                  <input
                    type="text"
                    value={pgUser}
                    onChange={(e) => setPgUser(e.target.value)}
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Password</span>
                  <input
                    type="password"
                    value={pgPassword}
                    onChange={(e) => setPgPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">SSL Mode</span>
                <select
                  value={pgSslMode}
                  onChange={(e) => setPgSslMode(e.target.value as any)}
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                >
                  <option value="require">require (recommended)</option>
                  <option value="prefer">prefer</option>
                  <option value="disable">disable (local only)</option>
                </select>
              </label>
            </div>
          </>
        )}

        {/* ── Redis form ── */}
        {provider === 'redis' && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Display Name</span>
              <input
                type="text"
                value={rdDisplayName}
                onChange={(e) => setRdDisplayName(e.target.value)}
                placeholder="e.g. Analytics Redis"
                className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2 block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Host</span>
                <input
                  type="text"
                  value={rdHost}
                  onChange={(e) => setRdHost(e.target.value)}
                  placeholder="redis.example.com"
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Port</span>
                <input
                  type="number"
                  value={rdPort}
                  onChange={(e) => setRdPort(e.target.value)}
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Password (optional)</span>
                <input
                  type="password"
                  value={rdPassword}
                  onChange={(e) => setRdPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-cw-txt block mb-1.5">DB Index</span>
                <input
                  type="number"
                  value={rdDb}
                  onChange={(e) => setRdDb(e.target.value)}
                  min={0}
                  max={15}
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
                />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-cw-bdr bg-cw-bg2">
              <div>
                <p className="text-[13px] font-medium text-cw-txt">TLS / SSL</p>
                <p className="text-[11px] text-cw-txt3">Encrypt the connection (recommended for production)</p>
              </div>
              <button
                onClick={() => setRdTls(!rdTls)}
                className={`w-9 h-[22px] rounded-full relative transition-colors ${rdTls ? 'bg-cw-blue' : 'bg-cw-bg border border-cw-bdr'}`}
              >
                <div className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all shadow-sm ${rdTls ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
            </div>

            <div className="p-3 bg-cw-bg2 border border-cw-bdr rounded-xl">
              <p className="text-[12px] text-cw-txt3 leading-relaxed">
                <span className="font-medium text-cw-txt">Read-only access only.</span>{' '}
                Codeward agents can read keys and scan patterns, but cannot write, delete, or flush any data.
              </p>
            </div>
          </div>
        )}

        {/* ── Custom MCP form ── */}
        {provider === 'custom' && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Display Name</span>
              <input
                type="text"
                value={customDisplayName}
                onChange={(e) => setCustomDisplayName(e.target.value)}
                placeholder="e.g. Internal GraphQL API"
                className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Server URL</span>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://mcp.your-company.com"
                className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-cw-txt block mb-1.5">Bearer Token (optional)</span>
              <input
                type="password"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-3 py-2 text-[13px] text-cw-txt placeholder:text-cw-txt3 focus:outline-none focus:border-cw-purple focus:ring-2 focus:ring-cw-purple/10 transition-all"
              />
            </label>
          </div>
        )}

        {/* ── Test result banner ── */}
        {testResult && (
          <div className={`flex items-center gap-2.5 p-3 rounded-lg border text-[13px] ${
            testResult.success
              ? 'bg-green-500/10 border-green-500/20 text-green-500'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{testResult.msg}</span>
          </div>
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="px-5 py-4 border-t border-cw-bdr bg-cw-bg shrink-0 flex gap-2">
        <button
          onClick={handleTest}
          disabled={!canTest || testing}
          className="flex-1 py-2 rounded-lg border border-cw-bdr bg-cw-bg2 text-[13px] font-medium text-cw-txt hover:border-cw-purple/40 hover:text-cw-purple transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-yellow-400" />}
          Test connection
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1 py-2 rounded-lg bg-cw-purple text-white text-[13px] font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </>
  );
}
