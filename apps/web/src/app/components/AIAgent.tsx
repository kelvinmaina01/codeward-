import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, ShieldCheck, ChevronRight, Loader2, Wrench, CheckCircle2, AlertTriangle,
  History, Plus, Search, Pencil, Trash2, X, Square, MessageSquare,
} from 'lucide-react';
import { API_URL } from '../../lib/api';

/* ---------------------------------- markdown ---------------------------------- */

/** GFM markdown (tables, strikethrough, task lists) styled to the cw design tokens. */
function Markdown({ text }: { text: string }) {
  return (
    <div className="gordon-md text-xs leading-[1.65] [&>*+*]:mt-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <div className="text-sm font-semibold text-cw-txt mt-1">{children}</div>,
          h2: ({ children }) => <div className="text-[13px] font-semibold text-cw-txt mt-1">{children}</div>,
          h3: ({ children }) => <div className="text-xs font-semibold text-cw-txt mt-1">{children}</div>,
          p: ({ children }) => <p>{children}</p>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-cw-blue underline underline-offset-2 hover:opacity-80">{children}</a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          code: ({ className, children }) => {
            const isBlock = /language-/.test(className ?? '');
            return isBlock
              ? <code className="block bg-cw-bg3 border border-cw-bdr rounded-md p-2.5 text-[11px] font-mono overflow-x-auto whitespace-pre">{children}</code>
              : <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-1">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-1.5 border border-cw-bdr rounded-md">
              <table className="w-full text-[11px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-cw-bg3 text-cw-txt2">{children}</thead>,
          th: ({ children }) => <th className="text-left font-semibold px-2.5 py-1.5 border-b border-cw-bdr whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-cw-bdr/50 align-top">{children}</td>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-cw-bdr pl-2.5 text-cw-txt2">{children}</blockquote>,
          hr: () => <hr className="border-cw-bdr my-2" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/* ---------------------------------- tool card ---------------------------------- */

const TOOL_LABELS: Record<string, string> = {
  list_repositories: 'Listed your repositories',
  query_run_history: 'Queried run history',
  get_finding_details: 'Read finding details',
  search_findings: 'Searched findings',
  get_fix_priority_list: 'Built fix priority list',
  get_health_trend: 'Computed health trend',
  compare_repos: 'Compared repositories',
};

function ToolCard({ name, state, input, output }: { name: string; state: string; input: unknown; output: unknown }) {
  const [open, setOpen] = useState(false);
  const running = state === 'input-streaming' || state === 'input-available';
  const errored = state === 'output-error';
  const Icon = errored ? AlertTriangle : running ? Loader2 : CheckCircle2;
  const tone = errored ? 'text-cw-red' : running ? 'text-cw-blue' : 'text-cw-green';
  return (
    <div className="border border-cw-bdr rounded-md bg-cw-bg3/60 mt-1.5 text-[11px] overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-black/[0.03] transition-colors">
        <ChevronRight size={11} className={`shrink-0 text-cw-txt3 transition-transform ${open ? 'rotate-90' : ''}`} />
        <Wrench size={11} className="shrink-0 text-cw-txt3" />
        <span className="text-cw-txt2">{TOOL_LABELS[name] ?? name}</span>
        <Icon size={12} className={`shrink-0 ml-auto ${tone} ${running ? 'animate-spin' : ''}`} />
        <span className={`shrink-0 ${tone}`}>{running ? 'running' : errored ? 'error' : 'done'}</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-0.5 space-y-1.5 border-t border-cw-bdr/60">
          {input != null && <pre className="text-[10px] text-cw-txt3 whitespace-pre-wrap break-all max-h-24 overflow-auto">{JSON.stringify(input, null, 2)}</pre>}
          {output != null && <pre className="text-[10px] text-cw-txt2 whitespace-pre-wrap break-all max-h-56 overflow-auto bg-cw-bg2 rounded p-1.5">{JSON.stringify(output, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- history drawer -------------------------------- */

interface ChatSession {
  id: string;
  title: string | null;
  repoId: number | null;
  createdAt: string;
  updatedAt: string;
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 7) return 'Previous 7 days';
  return 'Older';
}

function HistoryDrawer({ sessions, activeId, onSelect, onRename, onDelete, onClose }: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (s: ChatSession) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = sessions.filter((s) => (s.title ?? 'New chat').toLowerCase().includes(query.toLowerCase()));
  const groups: Record<string, ChatSession[]> = {};
  for (const s of filtered) (groups[groupLabel(s.updatedAt)] ??= []).push(s);
  const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'].filter((g) => groups[g]?.length);

  return (
    <div className="w-[290px] shrink-0 border-l border-cw-bdr bg-cw-bg2 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-cw-bdr">
        <History size={13} className="text-cw-txt2" />
        <span className="text-xs font-semibold text-cw-txt">Chat history</span>
        <button onClick={onClose} className="ml-auto text-cw-txt3 hover:text-cw-txt transition-colors"><X size={14} /></button>
      </div>
      <div className="px-3 py-2 border-b border-cw-bdr">
        <div className="flex items-center gap-1.5 border border-cw-bdr rounded-md px-2 py-1.5 bg-cw-bg focus-within:border-cw-blue transition-colors">
          <Search size={12} className="text-cw-txt3 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats…" className="flex-1 bg-transparent text-[11px] text-cw-txt outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {order.length === 0 && <div className="text-[11px] text-cw-txt3 text-center py-6">{query ? 'No chats match.' : 'No chats yet — start one!'}</div>}
        {order.map((g) => (
          <div key={g} className="mb-2">
            <div className="text-[10px] uppercase tracking-wide text-cw-txt3 px-2 py-1">{g}</div>
            {groups[g].map((s) => (
              <div key={s.id} className={`group rounded-md px-2 py-1.5 cursor-pointer flex items-center gap-1.5 ${activeId === s.id ? 'bg-cw-blue/10 border border-cw-blue/30' : 'hover:bg-cw-bg3 border border-transparent'}`}>
                {renamingId === s.id ? (
                  <input
                    autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && renameValue.trim()) { onRename(s.id, renameValue.trim()); setRenamingId(null); }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => setRenamingId(null)}
                    className="flex-1 bg-cw-bg border border-cw-blue rounded px-1.5 py-0.5 text-[11px] text-cw-txt outline-none"
                  />
                ) : confirmDeleteId === s.id ? (
                  <div className="flex-1 flex items-center gap-1.5 text-[11px]">
                    <span className="text-cw-red">Delete?</span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); setConfirmDeleteId(null); }} className="text-cw-red font-semibold hover:underline">Yes</button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="text-cw-txt3 hover:underline">No</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => onSelect(s)} className="flex-1 text-left text-[11px] text-cw-txt truncate">
                      {s.title ?? <span className="text-cw-txt3 italic">New chat</span>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.title ?? ''); }}
                      className="opacity-0 group-hover:opacity-100 text-cw-txt3 hover:text-cw-txt transition-all shrink-0"><Pencil size={11} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                      className="opacity-0 group-hover:opacity-100 text-cw-txt3 hover:text-cw-red transition-all shrink-0"><Trash2 size={11} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------- the page ----------------------------------- */

const SUGGESTIONS = [
  'Which of my repos has the lowest health score?',
  'What are the top things I should fix first?',
  'Show me the security findings from my latest scan',
  'How has my code health trended over the last 30 days?',
];

export function AIAgent() {
  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`, { credentials: 'include' });
      if (res.ok) setSessions((await res.json()).sessions ?? []);
    } catch { /* drawer degrades to empty; chatting still works */ }
  }, []);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  // Transport: sessionId rides along in the body (lazily null on a fresh chat); the wrapped
  // fetch adopts the server-created session id from the response header after the first send.
  const transport = useMemo(() => new DefaultChatTransport({
    api: `${API_URL}/api/chat`,
    credentials: 'include',
    body: () => ({ sessionId: sessionIdRef.current }),
    fetch: (async (info: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(info, init);
      const sid = res.headers.get('X-Chat-Session-Id');
      if (sid && sid !== sessionIdRef.current) {
        sessionIdRef.current = sid;
        setActiveSessionId(sid);
        // New session was just created server-side; title arrives async — refresh shortly.
        setTimeout(() => { refreshSessions(); }, 3500);
      }
      return res;
    }) as typeof fetch,
  }), [refreshSessions]);

  const { messages, setMessages, sendMessage, status, stop } = useChat({ transport });
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, status]);

  const send = (text: string) => {
    const val = text.trim();
    if (!val || busy) return;
    setInput('');
    sendMessage({ text: val });
  };

  const newChat = () => {
    stop();
    sessionIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
  };

  const selectSession = async (s: ChatSession) => {
    if (busy) stop();
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions/${s.id}/messages`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      sessionIdRef.current = s.id;
      setActiveSessionId(s.id);
      // Stored parts are verbatim UIMessage parts — old tool cards replay exactly.
      setMessages((data.messages ?? []) as UIMessage[]);
    } catch { /* leave current chat untouched on failure */ }
  };

  const renameSession = async (id: string, title: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    await fetch(`${API_URL}/api/chat/sessions/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
    }).catch(() => refreshSessions());
  };

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === sessionIdRef.current) newChat();
    await fetch(`${API_URL}/api/chat/sessions/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => refreshSessions());
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* main chat column */}
      <div className="flex-1 flex flex-col overflow-hidden px-5 py-4 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-[#F5F3FF] border border-[#C4B5FD] rounded-[10px] px-3.5 py-2.5 text-[11px] text-cw-purple flex items-start gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-[1px]" />
            <span><strong>Gordon</strong> reads your real runs, findings and trends and answers from live data — never guesses. Action execution (running agents, opening fixes) is landing next.</span>
          </div>
          <button onClick={newChat} title="New chat"
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border border-cw-bdr rounded-lg text-[11px] text-cw-txt2 hover:border-cw-blue hover:text-cw-blue transition-colors">
            <Plus size={13} /> New
          </button>
          <button onClick={() => setDrawerOpen((o) => !o)} title="Chat history"
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-[11px] transition-colors ${drawerOpen ? 'border-cw-blue text-cw-blue bg-cw-blue/5' : 'border-cw-bdr text-cw-txt2 hover:border-cw-blue hover:text-cw-blue'}`}>
            <History size={13} /> History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2.5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-cw-txt3">
              <div className="w-11 h-11 rounded-full bg-cw-blue/10 flex items-center justify-center"><ShieldCheck size={22} className="text-cw-blue" /></div>
              <div className="text-xs text-cw-txt2 max-w-[280px]">Ask Gordon about your codebase. It queries real run data to answer.</div>
              <div className="flex flex-col gap-1.5 w-full max-w-[340px]">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left text-[11px] text-cw-txt2 border border-cw-bdr rounded-lg px-3 py-2 hover:border-cw-blue hover:bg-cw-blue/[0.03] transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${msg.role === 'assistant' ? 'bg-cw-blue text-white' : 'bg-cw-bg3 text-cw-txt2'}`}>
                {msg.role === 'assistant' ? <ShieldCheck size={14} /> : 'You'}
              </div>
              <div className={`rounded-[10px] px-3 py-2 text-xs leading-[1.6] max-w-[85%] min-w-0 border ${msg.role === 'user' ? 'bg-cw-blue border-cw-blue text-white' : 'bg-cw-bg2 border-cw-bdr text-cw-txt'}`}>
                {msg.parts.map((part, i) => {
                  if (part.type === 'text') return msg.role === 'user' ? <span key={i}>{part.text}</span> : <Markdown key={i} text={part.text} />;
                  if (isToolUIPart(part)) return <ToolCard key={i} name={getToolName(part)} state={part.state} input={(part as any).input} output={(part as any).output} />;
                  return null;
                })}
              </div>
            </div>
          ))}

          {busy && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2.5 items-center text-cw-txt3 text-[11px]">
              <div className="w-[26px] h-[26px] rounded-full bg-cw-blue text-white flex items-center justify-center"><ShieldCheck size={14} /></div>
              <Loader2 size={13} className="animate-spin" /> Gordon is thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-2.5 border-t border-cw-bdr mt-auto shrink-0 items-center">
          {messages.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-cw-txt3 shrink-0">
              <MessageSquare size={11} />
              <span className="max-w-[140px] truncate">{sessions.find((s) => s.id === activeSessionId)?.title ?? 'New chat'}</span>
            </div>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask Gordon about your codebase…"
            disabled={busy}
            className="flex-1 px-3 py-2 border border-cw-bdr rounded-lg text-xs bg-cw-bg2 text-cw-txt outline-none focus:border-cw-blue transition-colors disabled:opacity-60"
          />
          {busy ? (
            <button onClick={() => stop()} className="px-3.5 py-2 bg-cw-red/90 text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity">
              <Square size={12} /> Stop
            </button>
          ) : (
            <button onClick={() => send(input)} disabled={!input.trim()} className="px-3.5 py-2 bg-cw-blue text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={13} /> Send
            </button>
          )}
        </div>
      </div>

      {/* right pull: history */}
      {drawerOpen && (
        <HistoryDrawer
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={(s) => selectSession(s)}
          onRename={renameSession}
          onDelete={deleteSession}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
