import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Paperclip,
  ListOrdered,
  Puzzle,
  FileSpreadsheet,
  Search,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { API_URL } from '../../../lib/api';

export interface AttachmentFile {
  id: string;
  name: string;
  content: string;
  size: number;
}

export interface TaskItem {
  id: string;
  title: string;
  excerpt: string;
  status: 'completed' | 'failed' | 'running';
  timestamp: string;
}

export interface GordonAttachmentMenuProps {
  onAttachFile: (file: AttachmentFile) => void;
  onSelectSkill: (skillPrompt: string) => void;
  onAttachTask: (task: TaskItem) => void;
  onTogglePlanMode: () => void;
  isPlanMode: boolean;
  onOpenIntegrationSettings?: (id: string) => void;
}

// Gordon Skills Menu
const GORDON_SKILLS_LIST = [
  { id: 'scan', label: '/scan', desc: 'Run security scan on active repo', prompt: 'Run a security scan on active repository and summarize findings.' },
  { id: 'full-scan', label: '/full-scan', desc: 'Run all 6 agent suites', prompt: 'Run the full agent suite (Security, Bloat, Architecture, Broken Code, AI-Era, Compliance) on active repo.' },
  { id: 'fix', label: '/fix', desc: 'Auto-fix top priority vulnerabilities', prompt: 'Find the highest-priority issues in active repo and open auto-fix PRs.' },
  { id: 'branches', label: '/branches', desc: 'List git branches for scanning', prompt: 'List all repository branches and recommend which to scan.' },
  { id: 'diff', label: '/diff', desc: 'Analyze latest commit diff', prompt: 'Inspect the latest commit diff, explain risk, and suggest agent checks.' },
  { id: 'logs', label: '/logs', desc: 'Check live agent run logs', prompt: 'Check live run logs for active repo and summarize current status.' },
  { id: 'escalate', label: '/escalate', desc: 'Open GitHub issue for findings', prompt: 'Find unresolved high-priority findings and open GitHub issues for manual fixes.' },
  { id: 'report', label: '/report', desc: 'Generate run summary report', prompt: 'Generate a summary report of the latest run with health score and findings table.' },
  { id: 'compare', label: '/compare', desc: 'Compare health across repos', prompt: 'Compare health scores across all connected repositories in a table.' },
  { id: 'health', label: '/health', desc: 'Show 30-day health trend', prompt: 'Show code health score trend over the last 30 days.' },
  { id: 'approvals', label: '/approvals', desc: 'Show pending auto-fix PRs', prompt: 'List all pending Codeward auto-fix PRs waiting for merge decision.' }
];

// Default Codeward Recent Tasks List (used when no DB chat sessions exist)
const DEFAULT_CODEWARD_TASKS: TaskItem[] = [
  { id: 'cw-task-1', title: 'Security Audit: SQL Injection & Auth Check', excerpt: 'Scanned files across auth service. Isolated 2 high severity items with auto-fix PRs.', status: 'completed', timestamp: '10m ago' },
  { id: 'cw-task-2', title: 'Bloat Analysis & Dead Code Cleanup', excerpt: 'Identified unused exports and redundant imports saving ~42KB bundle footprint.', status: 'completed', timestamp: '1h ago' },
  { id: 'cw-task-3', title: 'Guardian Agent Architecture Review', excerpt: 'Analyzed module boundaries, API contracts, and dependency injection patterns.', status: 'completed', timestamp: '3h ago' },
  { id: 'cw-task-4', title: 'Compliance Check: Data Privacy Audit', excerpt: 'Verified PII data handling and signed audit logs across database entities.', status: 'completed', timestamp: 'Yesterday' }
];

export function GordonAttachmentMenu({
  onAttachFile,
  onSelectSkill,
  onAttachTask,
  onTogglePlanMode,
  isPlanMode
}: GordonAttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'main' | 'tasks' | 'skills'>('main');
  const [taskSearch, setTaskSearch] = useState('');
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>(DEFAULT_CODEWARD_TASKS);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu('main');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real chat histories / sessions from backend API
  useEffect(() => {
    fetch(`${API_URL}/api/chat/sessions`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
          const mappedSessions: TaskItem[] = data.sessions.map((s: any) => ({
            id: s.id,
            title: s.title || 'Gordon Architecture & Code Review Session',
            excerpt: `Session ${s.id.slice(0, 8)} · ${s.repoId ? `Repo #${s.repoId}` : 'Global Context'}`,
            status: 'completed' as const,
            timestamp: timeAgoShort(s.updatedAt || s.createdAt)
          }));
          setRecentTasks(mappedSessions);
        }
      })
      .catch(() => {});
  }, []);

  // Filter tasks
  const filteredTasks = recentTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.excerpt.toLowerCase().includes(taskSearch.toLowerCase())
  );

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      onAttachFile({
        id: String(Date.now()),
        name: file.name,
        content,
        size: file.size
      });
      setIsOpen(false);
      setActiveSubmenu('main');
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative flex items-center gap-1.5" ref={menuRef}>
      {/* 1. Main Plus (+) Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
          isOpen
            ? 'bg-cw-purple text-white border-cw-purple shadow-sm'
            : 'bg-cw-bg3 hover:bg-cw-bdr text-cw-txt2 hover:text-cw-txt border-cw-bdr'
        }`}
        title="Add attachments, recent tasks, and skills"
      >
        <Plus size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".ts,.tsx,.js,.jsx,.json,.py,.md,.env,.log,.css,.html"
      />

      {/* Main Multi-Level Action Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-cw-bg2 border border-cw-bdr rounded-2xl shadow-2xl z-50 overflow-hidden font-sans text-[12px] text-cw-txt animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[92vw]">
          
          {/* MAIN MENU */}
          {activeSubmenu === 'main' && (
            <div className="w-60 p-1.5 space-y-0.5">
              {/* Option 1: Add from local files */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer"
              >
                <Paperclip size={15} className="text-cw-purple shrink-0" />
                <span className="font-medium">Add from local files</span>
              </button>

              {/* Option 2: Recent tasks > */}
              <button
                type="button"
                onClick={() => setActiveSubmenu('tasks')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <ListOrdered size={15} className="text-cw-txt3 group-hover:text-cw-txt shrink-0" />
                  <span className="font-medium">Recent tasks</span>
                </div>
                <ChevronRight size={14} className="text-cw-txt3" />
              </button>

              {/* Option 3: Use Skills > */}
              <button
                type="button"
                onClick={() => setActiveSubmenu('skills')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cw-bg3 text-cw-txt transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Puzzle size={15} className="text-cw-txt3 group-hover:text-cw-txt shrink-0" />
                  <span className="font-medium">Use Skills</span>
                </div>
                <ChevronRight size={14} className="text-cw-txt3" />
              </button>

              {/* Option 4: Plan (Ctrl+/) */}
              <button
                type="button"
                onClick={() => {
                  onTogglePlanMode();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer ${
                  isPlanMode ? 'bg-cw-purple/15 text-cw-purple font-semibold' : 'hover:bg-cw-bg3 text-cw-txt'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={15} className={isPlanMode ? 'text-cw-purple' : 'text-cw-txt3'} />
                  <span className="font-medium">Plan</span>
                </div>
                <span className="text-[10px] font-mono text-cw-txt3 bg-cw-bg3 px-1.5 py-0.5 rounded border border-cw-bdr">Ctrl+/</span>
              </button>
            </div>
          )}

          {/* SUBMENU: RECENT TASKS / CHAT HISTORIES (Expanded width: w-[420px] responsive) */}
          {activeSubmenu === 'tasks' && (
            <div className="w-[420px] max-w-[92vw] p-3">
              <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-cw-bdr">
                <span className="font-bold text-[11px] uppercase tracking-wider text-cw-txt3">Recent tasks & chat histories</span>
                <button type="button" onClick={() => setActiveSubmenu('main')} className="text-[11px] text-cw-purple hover:underline cursor-pointer">
                  ← Back
                </button>
              </div>

              {/* Search input field */}
              <div className="relative mb-2.5">
                <Search size={14} className="absolute left-3 top-2.5 text-cw-txt3" />
                <input
                  type="text"
                  placeholder="Search tasks & chat histories..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cw-bg3 border border-cw-bdr rounded-xl text-[12px] text-cw-txt outline-none focus:border-cw-purple transition-colors"
                />
              </div>

              {/* Task Cards List */}
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
                {filteredTasks.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-cw-txt3">No tasks found.</div>
                ) : (
                  filteredTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onAttachTask(t);
                        setIsOpen(false);
                        setActiveSubmenu('main');
                      }}
                      className="w-full p-2.5 rounded-xl bg-cw-bg3/60 hover:bg-cw-bg3 border border-cw-bdr/50 hover:border-cw-purple text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-cw-purple/20 flex items-center justify-center text-cw-purple shrink-0">
                            <Sparkles size={12} />
                          </div>
                          <span className="font-semibold text-cw-txt text-[12px] truncate">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-cw-txt3 font-mono shrink-0">{t.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-cw-txt2 leading-snug pl-7">{t.excerpt}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBMENU: USE SKILLS */}
          {activeSubmenu === 'skills' && (
            <div className="w-[320px] max-w-[92vw] p-2.5">
              <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-cw-bdr">
                <span className="font-bold text-[11px] uppercase tracking-wider text-cw-txt3">Gordon Skills</span>
                <button type="button" onClick={() => setActiveSubmenu('main')} className="text-[11px] text-cw-purple hover:underline cursor-pointer">
                  ← Back
                </button>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                {GORDON_SKILLS_LIST.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectSkill(s.prompt);
                      setIsOpen(false);
                      setActiveSubmenu('main');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-cw-bg3 transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-cw-purple text-[12px]">{s.label}</div>
                    <div className="text-[10px] text-cw-txt3 truncate">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function timeAgoShort(dateStr: string): string {
  if (!dateStr) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

