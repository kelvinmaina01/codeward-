import { useState, useEffect } from 'react';
import { Search, Star, Lock, Globe, Check, Loader, GitBranch, AlertCircle, RefreshCw, X, ChevronDown, Shield, FileWarning, Zap, Server, ShieldAlert, Cpu, LogOut, Clock, Sun, Moon, Circle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '../../lib/auth';
import { api } from '../../lib/api';

interface Props {
  user: { name: string; email?: string; image?: string };
  onConnect: (repos: string[]) => void;
  onSkip: () => void;
  activeOrg?: string;
  setActiveOrg?: (org: string) => void;
  orgs?: string[];
  theme?: string;
  onCycleTheme?: () => void;
}

interface RepoConfig {
  agents: {
    security: boolean;
    bloat: boolean;
    broken_code: boolean;
    architecture: boolean;
    ai_era: boolean;
    compliance: boolean;
    data_dx: boolean;
  };
}

interface Repo {
  name: string;
  full: string;
  desc: string;
  lang: string;
  stars: number;
  forks: number;
  issues: number;
  size: number;
  topics: string[];
  defaultBranch: string;
  archived: boolean;
  isFork: boolean;
  private: boolean;
  pushed: string;
  owner: string;
  connected: boolean;
  auditStatus?: 'pending_audit' | 'active' | 'unconnected';
}

const langColors: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Go: '#00ADD8',
  Ruby: '#CC342D',
  Shell: '#4EAA25',
  Rust: '#DEA584',
  Java: '#B07219',
  'C#': '#178600',
  Unknown: '#6B7280',
};

const AGENTS = [
  { id: 'security', name: 'Security Agent', desc: 'Secrets, CVEs, OWASP, SQL injection', icon: Shield, locked: true }, // Always on
  { id: 'bloat', name: 'Bloat Agent', desc: 'Dead code, duplicates, unused deps', icon: FileWarning },
  { id: 'broken_code', name: 'Broken Code Agent', desc: 'Tests, flaky detection', icon: Zap },
  { id: 'architecture', name: 'Architecture Agent', desc: 'N+1 queries, missing indexes', icon: Server },
  { id: 'ai_era', name: 'AI-Era Agent', desc: 'Prompt injection, RAG drift', icon: Cpu },
  { id: 'compliance', name: 'Compliance Agent', desc: 'GDPR, EU AI Act, WCAG', icon: ShieldAlert },
];

function timeAgoColor(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'text-[#16A34A]';
  if (days <= 7) return 'text-[#e8e8e6]';
  return 'text-[#6B7280]';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ConnectRepo({ user, onConnect, onSkip, activeOrg, setActiveOrg, orgs: propOrgs, theme, onCycleTheme }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [localOrgs, setLocalOrgs] = useState<string[]>([]);
  // Selection state
  const [selected, setSelected] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [filterVis, setFilterVis] = useState('All');

  // UI State
  const [showAllPanel, setShowAllPanel] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);
  
  // Config state per repo
  const [configs, setConfigs] = useState<Record<string, RepoConfig>>({});

  // Close panels on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAllPanel(false);
        setShowPermissionsModal(false);
        setShowOrgDropdown(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.api.repos.$get();
        if (!res.ok) {
          const errData = await res.json() as any;
          throw new Error(errData.error || 'Failed to fetch repos');
        }
        const data = await res.json() as any;
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch repos');
        
        // Setup initial org
        const firstOrg = data.orgs[0];
        const isPersonal = typeof firstOrg === 'string' ? firstOrg === 'personal' : firstOrg?.name === 'personal';
        const githubUser = isPersonal ? user.name?.split(' ')[0] : (typeof firstOrg === 'string' ? firstOrg : firstOrg?.name);
        
        const restOrgs = data.orgs.slice(1).map((o: any) => typeof o === 'string' ? o : o.name);
        const actualOrgs = [githubUser, ...restOrgs].filter(Boolean);
        
        setLocalOrgs(actualOrgs);
        if (!activeOrg && setActiveOrg) setActiveOrg(actualOrgs[0] || '');

        setRepos(data.repos || []);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load repositories');
        setError(err.message || 'Failed to load repositories');
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, [user.name]);

  // Derived data
  const filteredRepos = repos.filter(r => {
    const matchesOrg = !activeOrg || r.owner === activeOrg;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.desc?.toLowerCase().includes(search.toLowerCase());
    const matchesLang = filterLang === 'All' || r.lang === filterLang;
    const matchesVis = filterVis === 'All' || (filterVis === 'Public' ? !r.private : r.private);
    return matchesOrg && matchesSearch && matchesLang && matchesVis;
  });

  const languages = ['All', ...Array.from(new Set(repos.filter(r => !activeOrg || r.owner === activeOrg).map(r => r.lang))).filter(Boolean)];

  // Actions
  const toggleRepoSelection = (full: string) => {
    setSelected(s => s.includes(full) ? s.filter(x => x !== full) : [...s, full]);
  };

  const toggleAgent = (repoFull: string, agentId: keyof RepoConfig['agents']) => {
    if (agentId === 'security') return; // Always on
    setConfigs(prev => {
      const current = prev[repoFull] || { agents: { security: true, bloat: true, broken_code: true, architecture: true, ai_era: true, compliance: true, data_dx: true } };
      return {
        ...prev,
        [repoFull]: {
          agents: { ...current.agents, [agentId]: !current.agents[agentId] }
        }
      };
    });
  };

  const executeConnect = async (repoSubset: Repo[]) => {
    setConnecting(true);
    const connectToast = toast.loading(`Connecting ${repoSubset.length} repo(s)...`);
    
    try {
      const payload = repoSubset.map(r => ({
        full: r.full,
        name: r.name,
        owner: r.owner,
        desc: r.desc,
        lang: r.lang,
        isPrivate: r.private,
        config: configs[r.full] || { agents: { security: true, bloat: true, broken_code: true, architecture: true, ai_era: true, compliance: true, data_dx: true } }
      }));

      const res = await api.api.repos.connect.$post({ json: { repos: payload } });

      if (!res.ok) {
        const errData = await res.json() as any;
        throw new Error(errData.error || 'Failed to connect repos');
      }
      
      toast.dismiss(connectToast);
      
      // Update local state to show connected
      setRepos(prev => prev.map(r => payload.find(p => p.full === r.full) ? { ...r, connected: true } : r));
      setSelected(s => s.filter(x => !payload.find(p => p.full === x)));
      setExpandedRepo(null);
      
      payload.forEach(p => toast.success(`✅ ${p.name} connected successfully`));
      
      // Call prop callback if we successfully connected
      onConnect(payload.map(p => p.full));

    } catch (err: any) {
      toast.dismiss(connectToast);
      toast.error(err.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleInlineConnect = (repo: Repo) => {
    executeConnect([repo]);
  };

  const handleBulkConnect = () => {
    const selectedRepos = repos.filter(r => selected.includes(r.full));
    executeConnect(selectedRepos);
  };

  const RepoCard = ({ repo, compact = false }: { repo: Repo, compact?: boolean }) => {
    const sel = selected.includes(repo.full);
    const isExpanded = expandedRepo === repo.full;
    const config = configs[repo.full] || { agents: { security: true, bloat: true, broken_code: true, architecture: true, ai_era: true, compliance: true, data_dx: true } };

    return (
      <div className={`relative flex flex-col bg-cw-bg transition-colors duration-200 ${
        compact 
          ? `border ${sel || repo.connected || isExpanded ? 'border-cw-purple' : 'border-cw-bdr'} rounded-xl mb-3 ${repo.archived ? 'opacity-50 grayscale' : 'hover:border-cw-txt3'}`
          : `border-b border-cw-bdr last:border-0 ${sel || isExpanded ? 'bg-cw-purple/5' : 'hover:bg-cw-bg3'} ${repo.archived ? 'opacity-50 grayscale' : ''}`
      }`}>
        {/* Main Row */}
        <div 
          onClick={() => {
            if (repo.archived) return;
            if (compact) {
              if (repo.connected) window.location.href = `/repositories/${repo.full}`;
              return;
            }
            if (repo.connected) {
              window.location.href = `/repositories/${repo.full}`;
            } else {
              setExpandedRepo(expandedRepo === repo.full ? null : repo.full);
            }
          }}
          className={
            compact 
              ? `p-4 md:p-5 flex items-start sm:items-center justify-between gap-4 ${!repo.archived ? 'cursor-pointer' : ''}`
              : `p-4 flex flex-col md:flex-row md:items-center gap-4 ${!repo.archived ? 'cursor-pointer' : ''}`
          }
        >
          {/* Checkbox (Always visible if needed, but here mainly for compact or left side of table) */}
          <div className="hidden md:flex w-8 shrink-0 items-center justify-center">
            <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-150 ${sel || repo.connected ? 'border-cw-purple bg-cw-purple' : 'border-cw-bdr bg-cw-bg2'}`}>
              {(sel || repo.connected) && <Check size={11} color="#fff" />}
            </div>
          </div>
          
          {/* Mobile Checkbox for compact */}
          {compact && (
            <div className={`md:hidden w-[18px] h-[18px] mt-0.5 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150 ${sel || repo.connected ? 'border-cw-purple bg-cw-purple' : 'border-cw-bdr bg-transparent'}`}>
              {(sel || repo.connected) && <Check size={11} color="#fff" />}
            </div>
          )}

          {/* Table Column 1: Repository Info */}
          <div className={`min-w-0 ${compact ? 'flex-1' : 'flex-[2] min-w-[200px]'}`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {repo.private ? <Lock size={14} className="text-cw-amber shrink-0" /> : <Globe size={14} className="text-cw-green shrink-0" />}
              <span className="text-[14px] font-bold text-cw-txt truncate">{repo.name}</span>
              {repo.connected && repo.auditStatus === 'pending_audit' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-amber/10 text-cw-amber tracking-wider ml-1 flex items-center gap-1 shrink-0"><Loader size={10} className="animate-spin" /> INITIAL AUDIT RUNNING...</span>}
              {repo.connected && repo.auditStatus === 'active' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-green/10 text-cw-green tracking-wider ml-1 flex items-center gap-1 shrink-0"><Shield size={10} /> PROTECTED</span>}
              {repo.connected && (!repo.auditStatus || repo.auditStatus === 'unconnected') && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-green/10 text-cw-green tracking-wider ml-1 shrink-0">✓ CONNECTED</span>}
              {repo.archived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cw-red/10 text-cw-red tracking-wider ml-1 shrink-0">ARCHIVED</span>}
            </div>
            
            <div className={`text-[12px] text-cw-txt2 mt-1 line-clamp-1 ${compact ? '' : 'pr-4'}`}>{repo.desc || 'No description provided.'}</div>
            
            {/* Mobile / Compact Meta tags (hidden on desktop if !compact) */}
            <div className={`flex items-center gap-3 mt-2 flex-wrap ${!compact ? 'md:hidden' : ''}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.lang] || langColors.Unknown }} />
                <span className="text-[11px] text-cw-txt">{repo.lang}</span>
              </div>
              {repo.stars > 0 && <span className="flex items-center gap-1 text-[11px] text-cw-txt"><Star size={11} className="text-cw-amber fill-cw-amber" /> {repo.stars}</span>}
              <span className="flex items-center gap-1 text-[11px] text-cw-txt3"><Clock size={11} /> {timeAgo(repo.pushed)}</span>
            </div>
          </div>

          {/* Table Column 2: Language (Desktop only when !compact) */}
          {!compact && (
            <div className="hidden md:flex flex-1 min-w-[100px] items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColors[repo.lang] || langColors.Unknown }} />
              <span className="text-[13px] text-cw-txt font-medium">{repo.lang}</span>
            </div>
          )}

          {/* Table Column 3: Stats (Desktop only when !compact) */}
          {!compact && (
            <div className="hidden md:flex flex-1 min-w-[120px] items-center gap-3 text-[12px] text-cw-txt2">
              {repo.stars > 0 && <span className="flex items-center gap-1" title="Stars"><Star size={13} className="text-cw-amber" /> {repo.stars}</span>}
              {repo.forks > 0 && <span className="flex items-center gap-1" title="Forks"><GitBranch size={13} /> {repo.forks}</span>}
              {repo.issues > 0 && <span className={`flex items-center gap-1 ${repo.issues > 10 ? 'text-cw-red' : 'text-cw-amber'}`} title="Issues"><AlertCircle size={13} /> {repo.issues}</span>}
              {repo.stars === 0 && repo.forks === 0 && repo.issues === 0 && <span className="text-cw-txt3 opacity-50">—</span>}
            </div>
          )}

          {/* Table Column 4: Updated (Desktop only when !compact) */}
          {!compact && (
            <div className="hidden md:flex flex-1 min-w-[100px] flex-col justify-center text-[12px]">
              <span className="text-cw-txt font-medium mb-0.5">{timeAgo(repo.pushed)}</span>
              {repo.size > 0 && <span className="text-cw-txt3">{(repo.size / 1024).toFixed(1)} MB</span>}
            </div>
          )}

          {/* Table Column 5 / Compact Action: Actions */}
          <div className={`shrink-0 flex items-center justify-end gap-2 ${compact ? 'pt-2 md:pt-0' : 'w-[120px]'}`}>
            {!repo.connected && !repo.archived && (
              <>
                {!compact && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedRepo(isExpanded ? null : repo.full); }}
                    className="w-8 h-[30px] flex items-center justify-center bg-cw-bg2 border border-cw-bdr hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt text-[12px] font-medium rounded-lg transition-colors"
                  >
                    <ChevronDown size={14} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleInlineConnect(repo); }}
                  disabled={connecting}
                  className={`h-[30px] bg-cw-purple hover:brightness-110 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 ${compact ? 'px-3 text-[11px]' : 'px-4 text-[12px]'}`}
                >
                  {connecting ? <Loader size={14} className="animate-spin" /> : <GitBranch size={14} />}
                  <span className={compact ? 'hidden sm:inline' : ''}>Connect</span>
                </button>
              </>
            )}

            {repo.connected && !repo.archived && (
              <button 
                onClick={(e) => { e.stopPropagation(); window.location.href = `/repositories/${repo.full}`; }}
                className={`h-[30px] bg-[#2EA043] hover:bg-[#2c974b] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${compact ? 'px-2.5 text-[11px]' : 'px-4 text-[12px]'}`}
              >
                Go <span className={compact ? 'hidden sm:inline' : ''}>to Repo</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Scope Selector Drawer (Expands below the row) */}
        {!compact && isExpanded && !repo.connected && (
          <div className="border-t border-cw-bdr bg-cw-bg2/50 p-5 md:pl-[4.5rem] animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-[13px] font-semibold text-cw-txt mb-1">Which agents should guard {repo.name}?</h4>
            <p className="text-[11px] text-cw-txt2 mb-4">Toggle the automated checks you want to run on every pull request.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {AGENTS.map(agent => {
                const isActive = config.agents[agent.id as keyof RepoConfig['agents']];
                return (
                  <div 
                    key={agent.id}
                    onClick={() => toggleAgent(repo.full, agent.id as keyof RepoConfig['agents'])}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'bg-cw-purple/10 border-cw-purple/40' : 'bg-cw-bg border-cw-bdr hover:border-cw-txt3'} ${agent.locked ? 'cursor-not-allowed opacity-90' : ''}`}
                  >
                    <div className={`mt-0.5 w-[16px] h-[16px] rounded-[4px] border-[1.5px] flex items-center justify-center shrink-0 ${isActive ? 'border-cw-purple bg-cw-purple' : 'border-cw-txt3 bg-transparent'}`}>
                      {isActive && <Check size={10} color="#fff" />}
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-cw-txt flex items-center gap-1.5 line-clamp-1">
                        <agent.icon size={13} className={isActive ? 'text-cw-purple' : 'text-cw-txt3 shrink-0'} />
                        {agent.name}
                        {agent.locked && <span className="text-[9px] px-1 bg-cw-bg2 text-cw-txt3 border border-cw-bdr rounded shrink-0">Always on</span>}
                      </div>
                      <div className="text-[11px] text-cw-txt3 mt-0.5 leading-tight line-clamp-2">{agent.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); handleInlineConnect(repo); }}
                disabled={connecting}
                className="px-5 py-2 bg-cw-purple hover:brightness-110 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {connecting ? <Loader size={14} className="animate-spin" /> : <GitBranch size={14} />}
                Confirm Connection
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentStep = connecting ? 3 : (expandedRepo || selected.length > 0 ? 2 : 1);
  const firstName = localOrgs[0] || user.name?.split(' ')[0] || 'User';
  const themeIcons: Record<string, React.ReactNode> = { cream: <Circle size={14} fill="#c5a882" color="#c5a882" />, dark: <Moon size={14} />, white: <Sun size={14} /> };


  return (
    <div className={`theme-${theme || 'dark'} h-screen bg-cw-bg text-cw-txt font-sans flex flex-col overflow-hidden`}>
      <style>{`@import url(\'https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&display=swap\');`}</style>
      {/* Header */}
      <div className="bg-cw-bg2 border-b border-cw-bdr px-8 py-4 flex items-center justify-between shrink-0">
        <div className="text-base font-bold tracking-tight">
          Code<span className="text-cw-purple">ward</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              await signOut();
              window.location.reload();
            }}
            className="flex items-center gap-2 text-cw-txt2 hover:text-cw-txt text-[13px] font-medium transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
          <div className="w-8 h-8 rounded-full bg-cw-purple flex items-center justify-center text-[12px] font-bold text-white overflow-hidden">
            {user.image ? <img src={user.image} alt="Avatar" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Split Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Left Content */}
        <div className="flex-1 overflow-y-auto w-full transition-all duration-300">
          <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 pt-8 pb-32 flex flex-col items-center">
            <h1 className="text-4xl text-cw-txt mb-2 tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back, <span className="text-cw-purple">{firstName}</span> 👋
            </h1>
            <p className="text-[14px] text-cw-txt2 mb-10">Connect your repositories to get started with Codeward</p>

            
            {/* Dynamic Steps Indicator */}
            <div className="w-full flex items-center justify-center gap-3 mb-10">
              {/* Step 1 */}
              <div className={`flex items-center gap-2 font-semibold text-[13px] transition-colors ${currentStep >= 1 ? 'text-[#2EA043]' : 'text-cw-txt3'}`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[12px] transition-colors ${currentStep >= 1 ? 'border-[#2EA043]' : 'border-cw-bdr'}`}>1</div>
                Select Repos
              </div>
              <div className="w-8 h-[1px] bg-cw-bdr/60" />
              
              {/* Step 2 */}
              <div className={`flex items-center gap-2 font-semibold text-[13px] transition-colors ${currentStep >= 2 ? 'text-[#58A6FF]' : 'text-cw-txt3'}`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[12px] transition-colors ${currentStep >= 2 ? 'border-[#58A6FF]' : 'border-cw-bdr'}`}>2</div>
                Configure Agents
              </div>
              <div className="w-8 h-[1px] bg-cw-bdr/60" />
              
              {/* Step 3 */}
              <div className={`flex items-center gap-2 font-semibold text-[13px] transition-colors ${currentStep >= 3 ? 'text-[#F85149]' : 'text-cw-txt3'}`}>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[12px] transition-colors ${currentStep >= 3 ? 'border-[#F85149]' : 'border-cw-bdr'}`}>3</div>
                Finish
              </div>

              {/* Skip Button */}
              <button 
                onClick={onSkip}
                className="ml-4 px-3 py-1.5 text-[12px] font-medium text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 rounded transition-colors"
              >
                Skip for now
              </button>
            </div>

            {/* Permissions Modal Trigger */}
            <button 
              onClick={() => setShowPermissionsModal(true)}
              className="text-cw-purple hover:underline text-[13px] font-medium mb-10 flex items-center justify-center gap-1.5"
            >
              <Shield size={14} /> Learn what Codeward can and cannot access
            </button>

            {/* Filters Row (Main Page) */}
            <div className="w-full max-w-[1000px] flex flex-wrap gap-4 items-center justify-center mb-8">
              
              {/* Custom Workspace Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className="flex items-center gap-3 px-3 py-1.5 border border-cw-bdr bg-cw-bg rounded-lg hover:border-cw-txt3 transition-colors min-w-[200px]"
                >
                  <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-[2px] leading-none absolute top-1 left-3">Workspace</div>
                  <div className="flex items-center gap-2 mt-3 mb-1 w-full justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-cw-purple/20 text-cw-purple flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                        {(typeof activeOrg === 'string' ? activeOrg : (activeOrg as any)?.name || '')?.charAt(0)}
                      </div>
                      <span className="text-[13px] font-semibold text-cw-txt truncate">
                        {typeof activeOrg === 'string' ? activeOrg : (activeOrg as any)?.name}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-cw-txt3 shrink-0" />
                  </div>
                </button>

                {showOrgDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-cw-bg border border-cw-bdr rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 text-[10px] font-bold text-cw-txt3 tracking-wider border-b border-cw-bdr">SWITCH WORKSPACE</div>
                      <div className="max-h-[300px] overflow-y-auto py-1">
                        {(propOrgs?.length ? propOrgs : localOrgs).map((orgObj, idx) => {
                          const orgName = typeof orgObj === 'string' ? orgObj : orgObj.name;
                          if (!orgName) return null;
                          const isSel = activeOrg === orgName;
                          return (
                            <button
                              key={orgName + idx}
                              onClick={() => { setActiveOrg?.(orgName); setShowOrgDropdown(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-cw-bg3 transition-colors text-left`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold uppercase shrink-0 ${isSel ? 'bg-cw-purple/20 text-cw-purple' : 'bg-cw-green/20 text-cw-green'}`}>
                                  {orgName.charAt(0)}
                                </div>
                                <span className={`text-[13px] font-semibold truncate ${isSel ? 'text-cw-purple' : 'text-cw-txt'}`}>
                                  {orgName}
                                </span>
                              </div>
                              {isSel && <Check size={14} className="text-cw-purple shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="h-6 w-[1px] bg-cw-bdr hidden md:block" />

              {/* Language Filter */}
              <select 
                value={filterLang} 
                onChange={e => setFilterLang(e.target.value)}
                className="bg-cw-bg border border-cw-bdr rounded-lg text-[13px] text-cw-txt py-1.5 px-3 outline-none"
              >
                {languages.map(l => <option key={l} value={l}>{l === 'All' ? 'All Languages' : l}</option>)}
              </select>

              {/* Visibility Filter */}
              <select 
                value={filterVis} 
                onChange={e => setFilterVis(e.target.value)}
                className="bg-cw-bg border border-cw-bdr rounded-lg text-[13px] text-cw-txt py-1.5 px-3 outline-none"
              >
                <option value="All">All Visibility</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>

              {/* Search */}
              <div className="relative w-full max-w-[250px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search repos..."
                  className="w-full py-1.5 pl-9 pr-3 bg-cw-bg border border-cw-bdr rounded-lg text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors"
                />
              </div>
            </div>

            {/* Main List (First 8) */}
            <div className="w-full transition-all">
              {loading ? (
                <div className="py-20 flex justify-center"><Loader size={24} className="animate-spin text-cw-purple" /></div>
              ) : error ? (
                <div className="py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-10 text-cw-txt3 text-center">No repositories found matching filters.</div>
              ) : (
                <>
                  <div className="flex flex-col w-full border border-cw-bdr rounded-xl bg-cw-bg2 overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="hidden md:flex items-center px-4 py-3 border-b border-cw-bdr bg-cw-bg3 text-[11px] font-bold text-cw-txt3 uppercase tracking-wider">
                      <div className="w-8 shrink-0"></div>
                      <div className="flex-[2] min-w-[200px]">Repository</div>
                      <div className="flex-1 min-w-[100px]">Language</div>
                      <div className="flex-1 min-w-[120px]">Stats</div>
                      <div className="flex-1 min-w-[100px]">Updated</div>
                      <div className="w-[120px] text-right shrink-0">Action</div>
                    </div>
                    {/* Table Body */}
                    <div className="flex flex-col bg-cw-bg">
                      {filteredRepos.slice(0, 8).map(repo => (
                        <RepoCard key={repo.full} repo={repo} />
                      ))}
                    </div>
                  </div>
                  
                  {filteredRepos.length > 8 && (
                    <div className="mt-8 flex justify-center">
                      <button 
                        onClick={() => setShowAllPanel(true)}
                        className={`px-6 py-2.5 bg-cw-bg2 hover:brightness-110 border border-cw-bdr text-cw-txt rounded-full text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2 ${showAllPanel ? 'hidden' : ''}`}
                      >
                        View all {filteredRepos.length} repos →
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-12 text-center">
                    <button onClick={onSkip} className="text-cw-txt3 hover:text-cw-txt text-[13px] transition-colors underline decoration-cw-bdr underline-offset-4">
                      Not ready? Skip for now — you can connect repos anytime from Settings.
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Slide-out Panel (Flex Sibling) */}
        <div 
          className={`shrink-0 h-full bg-cw-bg2 border-l border-cw-bdr flex flex-col transition-[width,min-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showAllPanel ? 'w-[480px] min-w-[320px] lg:w-[480px] md:w-[380px] opacity-100' : 'w-0 min-w-0 opacity-0 overflow-hidden border-none'}`}
        >
          {showAllPanel && (
            <>
              <div className="px-6 py-5 border-b border-cw-bdr flex items-center justify-between bg-cw-bg shrink-0">
                <div className="min-w-0 pr-4">
                  <h2 className="text-[16px] font-bold text-cw-txt truncate">All Repositories ({filteredRepos.length})</h2>
                  <p className="text-[12px] text-cw-txt2 truncate">Click a repo to configure it</p>
                </div>
                <button onClick={() => setShowAllPanel(false)} className="w-8 h-8 shrink-0 rounded hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Panel Repo List */}
              <div className="flex-1 overflow-y-auto p-4 bg-cw-bg">
                {filteredRepos.map(repo => (
                  <div 
                    key={repo.full}
                    onClick={() => {
                      if (repo.connected) {
                        window.location.href = `/repositories/${repo.full}`;
                      } else if (!repo.archived) {
                        setShowAllPanel(false);
                        setExpandedRepo(repo.full);
                        setSelected([]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <RepoCard repo={repo} compact={true} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Bottom Bar for Bulk Connect */}
      {selected.length > 0 && (
        <div className="fixed bottom-8 left-[calc(50vw)] -translate-x-1/2 w-[calc(100%-4rem)] max-w-[800px] bg-cw-bg2 border border-cw-bdr rounded-xl px-6 py-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-8 z-50">
          <div className="flex flex-col">
            <div className="text-[15px] text-cw-txt font-bold">
              {selected.length} repo{selected.length > 1 ? 's' : ''} selected
            </div>
            <div className="text-[12px] text-cw-txt3 mt-0.5">Free tier: up to 2 repositories</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected([])} className="px-5 py-2.5 border border-cw-bdr bg-cw-bg hover:bg-cw-bg3 text-cw-txt3 hover:text-cw-txt text-[13px] font-semibold rounded-lg transition-colors">
              Skip for now
            </button>
            <button
              onClick={handleBulkConnect}
              disabled={connecting}
              className="px-6 py-2.5 bg-cw-purple hover:brightness-110 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
            >
              {connecting ? <Loader size={14} className="animate-spin" /> : <GitBranch size={14} />}
              Connect {selected.length} repo{selected.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setShowPermissionsModal(false)}>
          <div className="w-full max-w-[600px] bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-cw-bg3 px-6 py-4 border-b border-cw-bdr flex items-center justify-between">
              <div className="flex items-center gap-3 text-[14px] font-semibold text-cw-txt">
                <Shield size={18} className="text-cw-green" /> What Codeward accesses
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-cw-txt3 hover:text-cw-txt transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-6 text-[13px]">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Check size={18} className="text-cw-green shrink-0 mt-0.5" />
                  <div><span className="text-cw-txt font-medium text-[14px]">Read your code</span> <div className="text-cw-txt2 mt-1">To analyse diffs, run security scanners, and find tech debt. We never store copies of your codebase permanently.</div></div>
                </div>
                <div className="flex items-start gap-3">
                  <Check size={18} className="text-cw-green shrink-0 mt-0.5" />
                  <div><span className="text-cw-txt font-medium text-[14px]">Write check runs</span> <div className="text-cw-txt2 mt-1">To post pass/fail status directly on your Pull Requests before they get merged.</div></div>
                </div>
                <div className="flex items-start gap-3">
                  <Check size={18} className="text-cw-green shrink-0 mt-0.5" />
                  <div><span className="text-cw-txt font-medium text-[14px]">Write PR comments</span> <div className="text-cw-txt2 mt-1">To post in-line code findings, fix suggestions, and feedback directly to developers.</div></div>
                </div>
              </div>
              <div className="bg-cw-bg3 p-4 rounded-lg border border-cw-bdr">
                <div className="text-cw-txt font-medium mb-3 flex items-center gap-2 text-[14px]">
                  <X size={18} className="text-cw-red" /> We NEVER:
                </div>
                <ul className="text-cw-txt2 space-y-2 list-none p-0 m-0">
                  <li className="flex items-center gap-2"><X size={14} className="text-cw-red opacity-70"/> Push code directly to your branches</li>
                  <li className="flex items-center gap-2"><X size={14} className="text-cw-red opacity-70"/> Access environment variables or CI secrets</li>
                  <li className="flex items-center gap-2"><X size={14} className="text-cw-red opacity-70"/> Trigger or modify your deployments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
          {/* Theme Toggle (Bottom Left) */}
      {onCycleTheme && (
        <button 
          onClick={onCycleTheme} 
          className="absolute bottom-6 left-6 w-10 h-10 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg3 hover:text-cw-txt shadow-sm transition-all z-50"
          title="Toggle Theme"
        >
          {themeIcons[theme || 'dark']}
        </button>
      )}
    </div>
  );
}
