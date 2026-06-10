import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'ai' | 'user';
  content: React.ReactNode;
}

const replies: Record<string, string> = {
  'scan my repo': "Scanning now. I'll check all 5 debt categories across your full codebase. Results in about 90 seconds.",
  'what is the biggest risk': "Your biggest risk right now is <code>payments-api</code> — health score 52/100. It has 2 unprotected endpoints and no rate limiting on the payment confirmation route. I'd prioritise this immediately.",
  'fix the n+1': "Running N+1 fix across all 3 affected repos. Rewriting profile fetch to use a single JOIN query in each. I'll show you the diffs before committing anything.",
  'show me the security issues': "Switching to Security panel now.",
  default: "I've noted that. Let me check across your full codebase and come back with findings and a recommended action plan. Give me 60 seconds.",
};

const initialMessages: Message[] = [
  {
    role: 'ai',
    content: (
      <span>
        I've finished analysing <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">acme-corp/my-api</code>. Here's what I found across your 4 repos:<br /><br />
        <strong>Immediate action needed:</strong> 3 critical security issues including 2 hardcoded API keys and an unprotected admin endpoint.<br /><br />
        <strong>Architecture pattern I noticed:</strong> The same N+1 query pattern on user profile fetching appears in <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">my-api</code>, <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">auth-service</code>, and <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">frontend-api</code>. This is going to become a serious problem at scale — I can fix all three in one operation.<br /><br />
        <strong>AI-era risk:</strong> Your <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">/api/chat</code> endpoint has no token limit. I simulated an adversarial user and projected a $340/hour API cost at scale. One line fix.
      </span>
    ),
  },
  {
    role: 'user',
    content: 'Fix all three N+1 problems across the repos and show me what you changed',
  },
  {
    role: 'ai',
    content: (
      <span>
        Running now. I'll spin up sandboxes for all three repos in parallel, apply the JOIN refactor, run the full test suite in each, and show you the diffs before committing anything.
      </span>
    ),
  },
  {
    role: 'user',
    content: "What's the state of our codebase compared to 30 days ago?",
  },
  {
    role: 'ai',
    content: (
      <span>
        <strong>30-day comparison — acme-corp:</strong><br /><br />
        Health score: 71 → <strong className="text-[#16A34A]">87</strong> (+16 pts)<br />
        Codebase size: −4.2% (leaner, not bigger)<br />
        Critical security issues: 9 → 0 (all resolved)<br />
        Duplicate functions: 23 → 5 (−78%)<br />
        Dead code lines: 1,240 → 0<br />
        Test coverage: 68% → 84%<br /><br />
        The biggest improvements came from the security sweep in week 2 and the duplicate function cleanup in week 3. Your <code className="bg-black/10 px-1.5 py-[1px] rounded-[3px] text-[11px] font-mono">payments-api</code> is the laggard — health score only 52. Want me to do a full audit and fix pass on it?
      </span>
    ),
  },
  {
    role: 'user',
    content: 'Yes — and also check if our LLM integrations are safe from prompt injection',
  },
  {
    role: 'ai',
    content: (
      <span>
        On it. Running two parallel tasks:<br /><br />
        <strong>1. payments-api full audit:</strong> Sandbox spinning up · I'll scan all 5 debt categories and propose a prioritised fix list with effort estimates.<br /><br />
        <strong>2. Prompt injection sweep:</strong> Testing all 8 LLM-connected endpoints across your repos with standard and advanced override payloads. I'll also check for PII passing through to model context and unbounded token spend.
      </span>
    ),
  },
];

export function AIAgent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const val = input.trim();
    if (!val) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: val };
    setMessages(m => [...m, userMsg]);

    setTimeout(() => {
      const key = Object.keys(replies).find(k => val.toLowerCase().includes(k)) || 'default';
      const aiMsg: Message = {
        role: 'ai',
        content: <span dangerouslySetInnerHTML={{ __html: replies[key] }} />,
      };
      setMessages(m => [...m, aiMsg]);
    }, 700);
  };

  const AgentAction = ({ text, variant }: { text: string; variant?: 'green' | 'red' }) => {
    let containerClass = "bg-cw-bg3 border-cw-bdr";
    let dotClass = "bg-cw-green";
    
    if (variant === 'green') {
      containerClass = "bg-[#F0FDF4] border-[#BBF7D0]";
      dotClass = "bg-cw-green";
    } else if (variant === 'red') {
      containerClass = "bg-[#FEF2F2] border-[#FECACA]";
      dotClass = "bg-cw-red";
    }
    
    return (
      <div className={`border rounded-md px-2.5 py-1.5 text-[11px] text-cw-txt2 mt-1.5 flex items-center gap-1.5 ${containerClass}`}>
        <div className={`w-[5px] h-[5px] rounded-full shrink-0 animate-pulse ${dotClass}`} />
        {text}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-5 py-4">
      <div className="bg-[#F5F3FF] border border-[#C4B5FD] rounded-[10px] px-3.5 py-2.5 mb-3 text-[11px] text-cw-purple">
        <strong>Codeward AI is not a chatbot.</strong> It reads your full codebase, understands context across all repos, executes real actions (refactors, security fixes, architecture proposals), and can be triggered to run autonomously on a schedule or on push events.
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2.5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${msg.role === 'ai' ? 'bg-cw-blue text-white' : 'bg-cw-bg3 text-cw-txt2'}`}>
              {msg.role === 'ai' ? 'CW' : 'JK'}
            </div>
            <div className={`rounded-[10px] px-3 py-2 text-xs leading-[1.6] max-w-[80%] border ${msg.role === 'user' ? 'bg-cw-blue border-cw-blue text-white' : 'bg-cw-bg2 border-cw-bdr text-cw-txt'}`}>
              {msg.content}
              {msg.role === 'ai' && i === 2 && (
                <>
                  <AgentAction text="Spinning up 3 sandboxes in parallel · estimated 90 seconds" />
                  <AgentAction text="my-api: rewriting /api/users — SELECT * JOIN profiles in single query" />
                  <AgentAction text="auth-service: rewriting /api/sessions — same N+1 pattern" />
                  <AgentAction text="frontend-api: ✓ done · 142 tests passing · diff ready for review" variant="green" />
                </>
              )}
              {msg.role === 'ai' && i === 0 && (
                <AgentAction text="Watching: 4 repos · 847 files · last scan 4 min ago" />
              )}
              {msg.role === 'ai' && i === messages.length - 1 && i > 4 && (
                <>
                  <AgentAction text="payments-api sandbox: provisioning Node 18 + Postgres 15" />
                  <AgentAction text="Prompt injection test: firing payloads at /api/chat, /api/assist, /api/suggest" />
                  <AgentAction text='FINDING: /api/assist accepts "ignore previous instructions" payload — system prompt override confirmed' variant="red" />
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2.5 border-t border-cw-bdr mt-auto shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask the agent anything about your codebase, or tell it to take action..."
          className="flex-1 px-3 py-2 border border-cw-bdr rounded-lg text-xs bg-cw-bg2 text-cw-txt outline-none focus:border-cw-blue transition-colors"
        />
        <button onClick={send} className="px-3.5 py-2 bg-cw-blue text-white border-none rounded-lg text-xs cursor-pointer flex items-center gap-1.5 hover:opacity-90 transition-opacity">
          <Send size={13} /> Send
        </button>
      </div>
    </div>
  );
}
