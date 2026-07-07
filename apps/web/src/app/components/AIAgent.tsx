import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import { Send, ShieldCheck, ChevronRight, Loader2, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../lib/api';

/** Minimal markdown → React: headings, bullet lists, **bold**, `code`, line breaks. No dependency. */
function renderInline(text: string, keyBase: string) {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={`${keyBase}-b${i}`}>{tok.slice(2, -2)}</strong>);
    else nodes.push(<code key={`${keyBase}-c${i}`} className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const h = line.match(/^(#{1,3})\s+(.*)/);
        if (h) return <div key={i} className={`font-semibold ${h[1].length === 1 ? 'text-sm' : 'text-xs'} text-cw-txt mt-1`}>{renderInline(h[2], `h${i}`)}</div>;
        const bullet = line.match(/^\s*[-*]\s+(.*)/);
        if (bullet) return <div key={i} className="flex gap-1.5 pl-1"><span className="text-cw-txt3 shrink-0">•</span><span>{renderInline(bullet[1], `l${i}`)}</span></div>;
        return <div key={i}>{renderInline(line, `p${i}`)}</div>;
      })}
    </div>
  );
}

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
        <span className="font-mono text-cw-txt2">{name}</span>
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

const SUGGESTIONS = [
  'Which of my repos has the lowest health score?',
  'What are the top things I should fix first?',
  'Show me the security findings from my latest scan',
  'How has my code health trended over the last 30 days?',
];

export function AIAgent() {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: `${API_URL}/api/chat`, credentials: 'include' }),
  });
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, status]);

  const send = (text: string) => {
    const val = text.trim();
    if (!val || busy) return;
    setInput('');
    sendMessage({ text: val });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-5 py-4">
      <div className="bg-[#F5F3FF] border border-[#C4B5FD] rounded-[10px] px-3.5 py-2.5 mb-3 text-[11px] text-cw-purple flex items-start gap-2">
        <ShieldCheck size={14} className="shrink-0 mt-[1px]" />
        <span><strong>Gordon</strong> reads your real runs, findings and trends and answers from live data — never guesses. Action execution (running agents, opening fixes) is landing next.</span>
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
            <div className={`rounded-[10px] px-3 py-2 text-xs leading-[1.6] max-w-[85%] border ${msg.role === 'user' ? 'bg-cw-blue border-cw-blue text-white' : 'bg-cw-bg2 border-cw-bdr text-cw-txt'}`}>
              {msg.parts.map((part, i) => {
                if (part.type === 'text') return <Markdown key={i} text={part.text} />;
                if (isToolUIPart(part)) return <ToolCard key={i} name={getToolName(part)} state={part.state} input={(part as any).input} output={(part as any).output} />;
                return null;
              })}
            </div>
          </div>
        ))}

        {busy && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2.5 items-center text-cw-txt3 text-[11px]"><div className="w-[26px] h-[26px] rounded-full bg-cw-blue text-white flex items-center justify-center"><ShieldCheck size={14} /></div><Loader2 size={13} className="animate-spin" /> Gordon is thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2.5 border-t border-cw-bdr mt-auto shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask Gordon about your codebase…"
          disabled={busy}
          className="flex-1 px-3 py-2 border border-cw-bdr rounded-lg text-xs bg-cw-bg2 text-cw-txt outline-none focus:border-cw-blue transition-colors disabled:opacity-60"
        />
        <button onClick={() => send(input)} disabled={busy || !input.trim()} className="px-3.5 py-2 bg-cw-blue text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
          <Send size={13} /> Send
        </button>
      </div>
    </div>
  );
}
