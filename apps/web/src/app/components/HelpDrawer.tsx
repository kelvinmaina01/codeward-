import React, { useState, useRef, useEffect } from 'react';
import { 
  X, MessageSquare, Lightbulb, ChevronRight, 
  ArrowUp, Paperclip, ArrowLeft, Bell, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'menu' | 'feedback';
type ChatMessage = { role: 'user' | 'bot'; text: string; showNotify?: boolean };

export function HelpDrawer({ isOpen, onClose }: HelpDrawerProps) {
  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<ViewState>('menu');
  
  // Chat state
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Feedback form state
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [priority, setPriority] = useState('Medium');

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(350, Math.min(800, window.innerWidth - e.clientX));
      setWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');

    // Mock bot reply
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        { 
          role: 'bot', 
          text: "We are currently working on that feature! Our team is actively developing it and we'll have updates soon.",
          showNotify: true
        }
      ]);
    }, 600);
  };

  const handleNotifyMe = () => {
    toast.success("You'll be notified as soon as there's an update!");
  };

  const handleSendFeedback = () => {
    if (!feedbackMsg.trim()) {
      toast.error("Please enter a message for your feedback.");
      return;
    }
    toast.success("Thanks for your feedback! We've received it.");
    setFeedbackMsg('');
    setPriority('Medium');
    setView('menu');
  };

  const renderMenu = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-12 pb-6 space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] border border-cw-bdr bg-cw-bg overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
            <img 
              src="https://avatars.githubusercontent.com/in/4029840?s=41&u=2d62d6d33d7b1197056c93741230d09bd6859d15&v=4" 
              alt="Bot Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-[20px] font-bold text-cw-txt tracking-tight font-sans">How can we help?</h2>
        </div>

        {/* Primary Links */}
        <div className="space-y-1">
          <button onClick={() => setView('feedback')} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cw-bg2 transition-colors text-cw-txt cursor-pointer">
            <span className="font-medium text-[14px]">Contact us</span>
            <MessageSquare size={16} className="text-cw-txt2" />
          </button>
          <button onClick={() => setView('feedback')} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cw-bg2 transition-colors text-cw-txt cursor-pointer">
            <span className="font-medium text-[14px]">Share feedback</span>
            <Lightbulb size={16} className="text-cw-txt2" />
          </button>
          <div className="w-full flex items-center justify-between p-3 rounded-lg text-cw-txt cursor-pointer">
            <span className="font-medium text-[14px] text-cw-green">All systems operational</span>
            <div className="w-2 h-2 rounded-full bg-cw-green shrink-0"></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={() => window.open('/docs', '_blank')}
              className="w-full flex items-center justify-between p-3.5 bg-cw-bg2 hover:bg-cw-bg3 border border-cw-bdr rounded-xl transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cw-bg border border-cw-bdr flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-cw-txt2" />
                </div>
                <div>
                  <div className="text-[13px] text-cw-txt font-medium">Read the Documentation</div>
                  <div className="text-[11px] text-cw-txt3 mt-0.5">Learn how Codeward works</div>
                </div>
              </div>
              <ChevronRight size={14} className="text-cw-txt3 group-hover:text-cw-txt transition-colors" />
            </button>
            <button 
              onClick={() => window.open('https://discord.gg/nnMH4URBsK', '_blank')}
              className="w-full flex items-center justify-between p-3.5 bg-cw-bg2 hover:bg-cw-bg3 border border-cw-bdr rounded-xl transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cw-purple/10 border border-cw-purple/20 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor" className="text-cw-purple">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0c2.64-27.38-4.51-51.11-19.32-72.15ZM42.63,65.22c-5.22,0-9.49-4.77-9.49-10.6s4.19-10.6,9.49-10.6,9.54,4.77,9.49,10.6c0,5.83-4.27,10.6-9.49,10.6Zm41.83,0c-5.22,0-9.49-4.77-9.49-10.6s4.19-10.6,9.49-10.6,9.54,4.77,9.49,10.6c0,5.83-4.27,10.6-9.49,10.6Z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] text-cw-txt font-medium">Join our Discord</div>
                  <div className="text-[11px] text-cw-txt3 mt-0.5 leading-tight">Open support tickets or join a vibrant community</div>
                </div>
              </div>
              <ChevronRight size={14} className="text-cw-txt3 group-hover:text-cw-purple transition-colors" />
            </button>
          </div>
        </div>

        {/* Recent Chats */}
        {chatMessages.length > 0 && (
          <div>
            <h3 className="text-[12px] font-bold text-cw-txt3 mb-3 uppercase tracking-wider">Recent chats</h3>
            <div className="space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] ${msg.role === 'user' ? 'bg-cw-bg3 text-cw-txt' : 'bg-cw-bg2 border border-cw-bdr text-cw-txt2'}`}>
                    {msg.text}
                    {msg.showNotify && (
                      <button onClick={handleNotifyMe} className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-cw-bg border border-cw-bdr rounded-md text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition">
                        <Bell size={12} /> Get notified
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Box Area */}
      <div className="p-4 bg-cw-bg border-t border-cw-bdr shrink-0">
        <form onSubmit={handleSendMessage} className="relative bg-cw-bg2 border border-cw-bdr rounded-2xl flex items-end overflow-hidden focus-within:border-cw-purple focus-within:ring-1 focus-within:ring-cw-purple transition-all">
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask anything..."
            className="w-full bg-transparent border-none pt-4 px-4 pb-12 text-[14px] text-cw-txt placeholder-cw-txt3 resize-none focus:outline-none min-h-[100px] max-h-[200px]"
            rows={1}
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <button type="button" className="p-2 text-cw-txt3 hover:text-cw-txt transition rounded-lg hover:bg-cw-bg3">
              <Paperclip size={16} />
            </button>
          </div>
          <div className="absolute bottom-2 right-2">
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="p-2 rounded-lg bg-cw-bg3 text-cw-txt hover:bg-cw-bg border border-cw-bdr disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="flex-1 flex flex-col h-full bg-cw-bg animate-in slide-in-from-right-4">
      {/* Feedback Header */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-cw-bdr shrink-0">
        <button onClick={() => setView('menu')} className="p-1.5 rounded-md hover:bg-cw-bg2 text-cw-txt2 hover:text-cw-txt transition">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-[16px] font-bold text-cw-txt">Share Feedback</h2>
      </div>

      {/* Feedback Form */}
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
        <div>
          <label className="block text-[13px] font-medium text-cw-txt2 mb-2">Message</label>
          <textarea 
            value={feedbackMsg}
            onChange={(e) => setFeedbackMsg(e.target.value)}
            placeholder="Describe your issue or suggestion in detail..."
            className="w-full bg-cw-bg2 border border-cw-bdr rounded-xl p-4 text-[14px] text-cw-txt placeholder-cw-txt3 min-h-[120px] focus:outline-none focus:border-cw-purple focus:ring-1 focus:ring-cw-purple transition"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-cw-txt2 mb-2">Priority</label>
          <div className="space-y-2">
            {[
              { id: 'Critical', desc: 'Sending is down or critical' },
              { id: 'High', desc: 'Blocked, but sending still works' },
              { id: 'Medium', desc: 'Affects me, but doesn\'t block me' },
              { id: 'Low', desc: 'Looking for guidance' },
            ].map((p) => (
              <label key={p.id} className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${priority === p.id ? 'border-cw-purple bg-cw-purple/5' : 'border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3'}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] text-cw-txt">{p.id}</span>
                  <span className="text-[13px] text-cw-txt3">· {p.desc}</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${priority === p.id ? 'border-cw-purple' : 'border-cw-txt3'}`}>
                  {priority === p.id && <div className="w-2 h-2 rounded-full bg-cw-purple" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-cw-txt2 mb-2">Attachments <span className="text-cw-txt3 font-normal">(optional)</span></label>
          <div className="border border-dashed border-cw-bdr rounded-xl bg-cw-bg2 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-cw-bg3 transition">
            <span className="font-bold text-[14px] text-cw-txt mb-1">Drag files or click to select</span>
            <span className="text-[12px] text-cw-txt3">Up to 5 files. Max of 5MB each.</span>
            <span className="text-[12px] text-cw-txt3">JPEG, PNG, GIF, WebP, PDF</span>
          </div>
        </div>
      </div>

      {/* Feedback Footer */}
      <div className="p-6 border-t border-cw-bdr shrink-0">
        <button onClick={handleSendFeedback} className="bg-cw-bg3 hover:bg-cw-bg border border-cw-bdr text-cw-txt px-4 py-2 rounded-lg text-[13px] font-bold transition flex items-center gap-2 shadow-sm">
          Send <span className="text-[10px] bg-cw-bg2 px-1.5 py-0.5 rounded text-cw-txt3 border border-cw-bdr ml-1 font-mono">Ctrl ↵</span>
        </button>
      </div>
    </div>
  );

  return (
    <div 
      style={{ width: `${width}px` }}
      className={`relative shrink-0 border-l border-cw-bdr bg-cw-bg2 shadow-2xl flex flex-col h-full overflow-hidden transition-transform duration-300 animate-in slide-in-from-right font-sans`}
    >
      {/* Drag Handle */}
      <div 
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-cw-purple/50 active:bg-cw-purple/70 z-10 transition-colors"
      />

      {/* Absolutely positioned controls */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-1.5 text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 rounded-md transition z-20"
        title="Close Help Drawer (Esc)"
      >
        <X size={18} />
      </button>

      {view === 'menu' ? renderMenu() : renderFeedback()}
    </div>
  );
}
