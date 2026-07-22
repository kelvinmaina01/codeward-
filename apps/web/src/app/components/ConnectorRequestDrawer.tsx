/**
 * ConnectorRequestDrawer
 *
 * Two tabs:
 * 1. "SaaS Integration" — existing flow (search by tool name, vote or submit new)
 * 2. "MCP Server" — request a managed MCP server that Codeward should build / support
 *
 * Rendered inside the push drawer in Integrations.tsx (Fragment, not Sheet).
 */

import { useState, useEffect } from 'react';
import { Search, Loader2, Send, CheckCircle2, ChevronRight, Inbox, X, PlusCircle, Server } from 'lucide-react';
import { API_URL } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'saas' | 'mcp';

export function ConnectorRequestDrawer({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('saas');

  // ── SaaS tab state ──────────────────────────────────────────────────────────
  const [toolName, setToolName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [existingMatch, setExistingMatch] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── MCP tab state ───────────────────────────────────────────────────────────
  const [mcpName, setMcpName] = useState('');
  const [mcpType, setMcpType] = useState<'database' | 'cache' | 'api' | 'other'>('database');
  const [mcpUseCase, setMcpUseCase] = useState('');
  const [mcpEmail, setMcpEmail] = useState('');
  const [mcpSubmitLoading, setMcpSubmitLoading] = useState(false);
  const [mcpSubmitted, setMcpSubmitted] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // Debounced SaaS search
  useEffect(() => {
    if (toolName.trim().length < 2) {
      setExistingMatch(null);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/connector-requests/search?q=${encodeURIComponent(toolName)}`, { credentials: 'include' });
        const data = await res.json();
        setExistingMatch(data.results?.[0] ?? null);
      } catch {
        // Silently ignore search errors — don't block the form
      }
      setSearchLoading(false);
    }, 500);
    return () => clearTimeout(delay);
  }, [toolName]);

  const handleSaaSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    try {
      if (existingMatch) {
        const res = await fetch(`${API_URL}/api/connector-requests/vote`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingMatch.id }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      } else {
        const res = await fetch(`${API_URL}/api/connector-requests`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName, useCase, notifyEmail }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setSubmitLoading(false);
  };

  const handleMcpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMcpSubmitLoading(true);
    setMcpError(null);
    try {
      // Reuse connector-requests endpoint with a special prefix so the team can
      // triage MCP requests separately in their tracking tool
      const res = await fetch(`${API_URL}/api/connector-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: `[MCP] ${mcpName}`,
          useCase: `Type: ${mcpType}\n\n${mcpUseCase}`,
          notifyEmail: mcpEmail,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMcpSubmitted(true);
    } catch (err: any) {
      setMcpError(err.message || 'Something went wrong. Please try again.');
    }
    setMcpSubmitLoading(false);
  };

  if (!isOpen) return null;

  const showSaasSuccess = submitted;
  const showMcpSuccess = mcpSubmitted;

  return (
    <>
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cw-bg2 border border-cw-bdr text-cw-purple">
            <PlusCircle size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-cw-txt truncate">Request a Connector</div>
            <div className="text-[11px] text-cw-txt3">Missing something? Tell us what your agents need.</div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* ── Tab nav ── */}
      <div className="px-5 flex gap-5 border-b border-cw-bdr shrink-0">
        <button
          onClick={() => setActiveTab('saas')}
          className={`pb-3 pt-3 text-[12px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'saas' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
        >
          <PlusCircle size={13} /> SaaS Integration
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`pb-3 pt-3 text-[12px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'mcp' ? 'border-cw-purple text-cw-txt' : 'border-transparent text-cw-txt3 hover:text-cw-txt2'}`}
        >
          <Server size={13} /> MCP Server
        </button>
      </div>

      {/* ── SaaS tab ── */}
      {activeTab === 'saas' && (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {showSaasSuccess ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-cw-green/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={32} className="text-cw-green" />
              </div>
              <h3 className="text-[20px] font-semibold text-cw-txt mb-2">Request sent</h3>
              <p className="text-[14px] text-cw-txt3 leading-relaxed mb-8">
                Your request is on our roadmap. We will notify you when it becomes available.
              </p>
              <button onClick={onClose} className="px-6 py-2.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg3 transition-colors text-cw-txt font-medium rounded-lg">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaaSSubmit} className="space-y-6">
              <div>
                <label className="text-[13px] font-medium text-cw-txt block mb-2">Tool Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. Notion, Salesforce, Asana…"
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg pl-10 pr-4 py-2.5 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors"
                  />
                  <Search size={16} className="absolute left-3.5 top-3 text-cw-txt3" />
                  {searchLoading && <Loader2 size={14} className="absolute right-3.5 top-3 text-cw-purple animate-spin" />}
                </div>
              </div>

              {existingMatch ? (
                <div className="p-4 bg-cw-purple/5 border border-cw-purple/20 rounded-xl">
                  <h4 className="text-[14px] font-semibold text-cw-purple mb-1">We are on it</h4>
                  <p className="text-[13px] text-cw-txt2 mb-4">
                    <strong className="text-cw-txt">{existingMatch.voteCount}</strong> others have asked for <strong>{existingMatch.toolName}</strong> too.
                  </p>
                  <button type="submit" disabled={submitLoading} className="w-full py-2.5 bg-cw-purple text-white hover:brightness-110 font-semibold rounded-lg text-[13px] transition-all flex items-center justify-center gap-2">
                    {submitLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                    Add your vote
                  </button>
                  {error && <p className="text-red-500 text-[12px] mt-3 text-center">{error}</p>}
                </div>
              ) : (
                <div className={`space-y-6 transition-all duration-300 ${toolName.length >= 2 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div>
                    <label className="text-[13px] font-medium text-cw-txt block mb-2">Use Case</label>
                    <textarea
                      required={!existingMatch}
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      placeholder="How do you want the agents to use this tool?"
                      rows={4}
                      className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-4 py-3 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-cw-txt block mb-2">Notify Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        required={!existingMatch}
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-cw-bg border border-cw-bdr rounded-lg pl-10 pr-4 py-2.5 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors"
                      />
                      <Inbox size={16} className="absolute left-3.5 top-3 text-cw-txt3" />
                    </div>
                  </div>
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-500 text-[13px] font-medium">{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={submitLoading} className="w-full py-2.5 bg-cw-blue text-white hover:brightness-110 font-semibold rounded-lg text-[13px] transition-all flex items-center justify-center gap-2">
                    {submitLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Submit request
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* ── MCP tab ── */}
      {activeTab === 'mcp' && (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {showMcpSuccess ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-cw-green/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={32} className="text-cw-green" />
              </div>
              <h3 className="text-[20px] font-semibold text-cw-txt mb-2">MCP request sent</h3>
              <p className="text-[14px] text-cw-txt3 leading-relaxed mb-8">
                We will evaluate this and reach out when we have an update for you.
              </p>
              <button onClick={onClose} className="px-6 py-2.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg3 transition-colors text-cw-txt font-medium rounded-lg">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleMcpSubmit} className="space-y-5">
              <div className="p-4 bg-cw-bg2 rounded-xl border border-cw-bdr">
                <p className="text-[12px] text-cw-txt3 leading-relaxed">
                  <span className="font-medium text-cw-txt">MCP servers</span> give agents direct access to your infrastructure — databases, caches, internal APIs. Request one here and we will build the server-side implementation.
                </p>
              </div>

              <div>
                <label className="text-[13px] font-medium text-cw-txt block mb-2">Server / technology name</label>
                <input
                  type="text"
                  required
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. MongoDB, Elasticsearch, ClickHouse…"
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-4 py-2.5 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-cw-txt block mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['database', 'cache', 'api', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMcpType(t)}
                      className={`py-2 rounded-lg border text-[12px] font-medium capitalize transition-colors ${mcpType === t ? 'border-cw-purple bg-cw-purple/10 text-cw-purple' : 'border-cw-bdr bg-cw-bg text-cw-txt2 hover:border-cw-purple/40'}`}
                    >
                      {t === 'api' ? 'Internal API' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-cw-txt block mb-2">What would agents do with it?</label>
                <textarea
                  required
                  value={mcpUseCase}
                  onChange={(e) => setMcpUseCase(e.target.value)}
                  placeholder="e.g. Query slow query logs in ClickHouse to help the Architecture agent identify N+1 patterns."
                  rows={4}
                  className="w-full bg-cw-bg border border-cw-bdr rounded-lg px-4 py-3 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-cw-txt block mb-2">Notify Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={mcpEmail}
                    onChange={(e) => setMcpEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-cw-bg border border-cw-bdr rounded-lg pl-10 pr-4 py-2.5 text-[14px] text-cw-txt focus:outline-none focus:border-cw-purple transition-colors"
                  />
                  <Inbox size={16} className="absolute left-3.5 top-3 text-cw-txt3" />
                </div>
              </div>

              {mcpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-500 text-[13px] font-medium">{mcpError}</p>
                </div>
              )}

              <button type="submit" disabled={mcpSubmitLoading} className="w-full py-2.5 bg-cw-blue text-white hover:brightness-110 font-semibold rounded-lg text-[13px] transition-all flex items-center justify-center gap-2">
                {mcpSubmitLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit MCP request
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
