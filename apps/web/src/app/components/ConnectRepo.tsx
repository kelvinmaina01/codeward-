import React, { useState, useEffect } from 'react';
import { Search, Loader, ShieldAlert, ArrowRight, ChevronDown, Check, Sun, Moon, Circle, Shield, FileWarning, Zap, Server, Cpu, BarChart2, Lock, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { authClient } from '../../lib/auth';

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
  alerts: {
    slack: boolean;
    email: boolean;
    whatsapp: boolean;
    calendar: boolean;
  };
}

const DEFAULT_CONFIG: RepoConfig = {
  agents: { security: true, bloat: true, broken_code: true, architecture: true, ai_era: true, compliance: true, data_dx: true },
  alerts: { slack: true, email: true, whatsapp: false, calendar: false }
};

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
  auditStatus?: 'pending_audit' | 'active' | 'unconnected';
  grantedToApp?: boolean;
  connected?: boolean;
}

const AGENTS = [
  { id: 'security', name: 'Security Agent', desc: 'Secrets, CVEs, OWASP, SQL injection', icon: Shield, bg: 'bg-cw-red/10', border: 'border-cw-red/20', text: 'text-cw-red' },
  { id: 'bloat', name: 'Bloat Agent', desc: 'Dead code, duplicates, unused deps', icon: FileWarning, bg: 'bg-cw-blue/10', border: 'border-cw-blue/20', text: 'text-cw-blue' },
  { id: 'broken_code', name: 'Broken Code Agent', desc: 'Tests, flaky detection', icon: Zap, bg: 'bg-cw-amber/10', border: 'border-cw-amber/20', text: 'text-cw-amber' },
  { id: 'architecture', name: 'Architecture Agent', desc: 'N+1 queries, missing indexes', icon: Server, bg: 'bg-cw-purple/10', border: 'border-cw-purple/20', text: 'text-cw-purple' },
  { id: 'ai_era', name: 'AI-Era Agent', desc: 'Prompt injection, RAG drift', icon: Cpu, bg: 'bg-cw-purple/10', border: 'border-cw-purple/20', text: 'text-cw-purple' },
  { id: 'compliance', name: 'Compliance Agent', desc: 'GDPR, EU AI Act, WCAG', icon: ShieldAlert, bg: 'bg-cw-amber/10', border: 'border-cw-amber/20', text: 'text-cw-amber' },
  { id: 'data_dx', name: 'Data & DX Agent', desc: 'Health score, tech debt tracking', icon: BarChart2, bg: 'bg-cw-green/10', border: 'border-cw-green/20', text: 'text-cw-green' },
];

const renderChannelIcon = (name: string) => {
  switch(name) {
    case 'slack': return <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-3.5 h-3.5 object-contain" />;
    case 'email': return <img src="https://cdn.simpleicons.org/gmail" alt="Email" className="w-3.5 h-3.5 object-contain" />;
    case 'whatsapp': return <img src="https://cdn.simpleicons.org/whatsapp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" />;
    case 'calendar': return <img src="https://cdn.simpleicons.org/googlecalendar" alt="Calendar" className="w-3.5 h-3.5 object-contain" />;
    default: return null;
  }
};

const getRelativeTime = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  
  if (diffInSeconds < 60) return formatter.format(-diffInSeconds, 'second');
  if (diffInSeconds < 3600) return formatter.format(-Math.floor(diffInSeconds / 60), 'minute');
  if (diffInSeconds < 86400) return formatter.format(-Math.floor(diffInSeconds / 3600), 'hour');
  if (diffInSeconds < 2592000) return formatter.format(-Math.floor(diffInSeconds / 86400), 'day');
  if (diffInSeconds < 31536000) return formatter.format(-Math.floor(diffInSeconds / 2592000), 'month');
  return formatter.format(-Math.floor(diffInSeconds / 31536000), 'year');
};

const STEPS = {
  SELECT_METHOD: 1,
  GITLAB_AUTH: 2,
  SELECT_REPOSITORY: 3,
  CONFIGURE_APPLICATION: 4
};

export function ConnectRepo({ user, onConnect, onSkip, activeOrg, setActiveOrg, orgs: propOrgs, theme, onCycleTheme }: Props) {
  const [activeStep, setActiveStep] = useState(STEPS.SELECT_METHOD);
  const [authProvider, setAuthProvider] = useState<'github' | 'gitlab' | null>(null);
  
  // GitLab state form values
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com');
  const [gitlabToken, setGitlabToken] = useState('');

  // Repositories state
  const [repos, setRepos] = useState<Repo[]>([]);
  const [localOrgs, setLocalOrgs] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'white' | 'cream'>((theme as 'dark' | 'white' | 'cream') || 'dark');
  const themeIcons: Record<string, React.ReactNode> = { cream: <Circle size={14} fill="#c5a882" color="#c5a882" />, dark: <Moon size={14} />, white: <Sun size={14} /> };
  
  // Organization UI state
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Config state
  const [configs, setConfigs] = useState<Record<string, RepoConfig>>({});
  const [connecting, setConnecting] = useState(false);

  // Fetch repositories
  useEffect(() => {
    const fetchRepos = async () => {
      setLoadingRepos(true);
      setRepoError(null);
      try {
        const res = await api.api.repos.$get();
        if (!res.ok) {
          const errData = await res.json() as any;
          throw new Error(errData.error || 'Failed to fetch repos');
        }
        const data = await res.json() as any;
        
        // Setup initial org
        const firstOrg = data.orgs[0];
        const isPersonal = typeof firstOrg === 'string' ? firstOrg === 'personal' : firstOrg?.name === 'personal';
        const githubUser = isPersonal ? user.name?.split(' ')[0] : (typeof firstOrg === 'string' ? firstOrg : firstOrg?.name);
        
        const restOrgs = data.orgs.slice(1).map((o: any) => typeof o === 'string' ? o : o.name);
        const actualOrgs = [githubUser, ...restOrgs].filter(Boolean);
        
        setLocalOrgs(actualOrgs);
        if (!activeOrg && setActiveOrg) setActiveOrg(actualOrgs[0] || '');

        setRepos(data.repos || []);
        
        // If we successfully fetched repos, we are connected to GitHub, so we can jump to Step 3
        setAuthProvider('github');
        setActiveStep(STEPS.SELECT_REPOSITORY);
      } catch (err: any) {
        setRepoError(err.message || 'Failed to load repositories');
        // If "No GitHub account linked", stay on step 1
      } finally {
        setLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [user.name, activeOrg, setActiveOrg]);

  const handleCycleTheme = () => {
    const themes: ('dark' | 'white' | 'cream')[] = ['dark', 'white', 'cream'];
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    const nextTheme = themes[nextIdx];
    setCurrentTheme(nextTheme);
    onCycleTheme?.();
  };

  const handleLinkAccount = async (provider: 'github' | 'gitlab') => {
    try {
      await authClient.signIn.social({
        provider: provider,
        callbackURL: window.location.origin + '/connect',
      });
    } catch (err: any) {
      toast.error(err.message || `Failed to connect ${provider} account`);
    }
  };

  const toggleRepoSelection = (full: string) => {
    const repo = repos.find(r => r.full === full);
    if (repo && repo.grantedToApp === false) {
      toast.error('You must grant the GitHub App access to this repository first.');
      return;
    }
    setSelectedRepos(s => s.includes(full) ? s.filter(x => x !== full) : [...s, full]);
  };

  const toggleAlert = (repoFull: string, channel: keyof RepoConfig['alerts']) => {
    setConfigs(prev => {
      const current = prev[repoFull] || DEFAULT_CONFIG;
      return { ...prev, [repoFull]: { ...current, alerts: { ...current.alerts, [channel]: !current.alerts[channel] } } };
    });
  };

  const executeConnect = async () => {
    if (selectedRepos.length === 0) return;
    setConnecting(true);
    const connectToast = toast.loading(`Connecting ${selectedRepos.length} repo(s)...`);
    
    try {
      const payload = selectedRepos.map(full => {
        const r = repos.find(rp => rp.full === full)!;
        return {
          full: r.full,
          name: r.name,
          owner: r.owner,
          desc: r.desc,
          lang: r.lang,
          isPrivate: r.private,
          defaultBranch: r.defaultBranch,
          config: configs[r.full] || DEFAULT_CONFIG
        };
      });

      const res = await api.api.repos.connect.$post({ json: { repos: payload } });

      if (!res.ok) {
        const errData = await res.json() as any;
        throw new Error(errData.error || 'Failed to connect repos');
      }
      
      toast.dismiss(connectToast);
      
      // Call prop callback if we successfully connected
      onConnect(payload.map(p => p.full));

    } catch (err: any) {
      toast.dismiss(connectToast);
      toast.error(err.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const filteredRepos = repos.filter(r => {
    const matchesOrg = !activeOrg || r.owner === activeOrg;
    const matchesSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.desc && r.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesOrg && matchesSearch;
  });

  return (
    <div className={`theme-${currentTheme} min-h-screen bg-cw-bg text-cw-txt flex items-center justify-center p-6 font-sans relative`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&display=swap');`}</style>
      
      {/* Floating Theme Toggle (Top Right) */}
      <button 
        onClick={handleCycleTheme} 
        className="fixed top-4 right-6 w-9 h-9 rounded-full border border-cw-bdr bg-cw-bg2 text-cw-txt2 flex items-center justify-center hover:bg-cw-bg3 hover:text-cw-txt shadow-md transition-all z-50 cursor-pointer"
        title="Toggle Theme"
      >
        {themeIcons[currentTheme]}
      </button>

      {/* Skip for now button */}
      <button 
        onClick={onSkip}
        className="fixed top-4 right-20 px-4 py-2 text-[13px] font-medium text-cw-txt2 hover:text-cw-txt bg-cw-bg2 border border-cw-bdr rounded-lg hover:bg-cw-bg3 transition-colors z-50 cursor-pointer shadow-md"
      >
        Skip for now
      </button>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* LEFT COLUMN: Section Descriptor */}
        <div className="col-span-1 md:col-span-3 pt-4">
          <h2 className="text-2xl font-bold tracking-tight text-cw-txt" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Connect Repositories
          </h2>
          <p className="text-[13px] text-cw-txt2 mt-2">
            Link your codebase to Codeward for automated security, bloat, and code architecture tracking.
          </p>
          <div className="mt-8 pt-6 border-t border-cw-bdr flex flex-col gap-3 text-[12px] text-cw-txt2">
            <span className="flex items-center gap-2">
              <Lock size={14} className="text-cw-purple" />
              Encrypted OAuth Handshake
            </span>
            <span className="flex items-center gap-2">
              <Check size={14} className="text-cw-green" />
              Granular Repo Permissions
            </span>
            <span className="flex items-center gap-2">
              <Shield size={14} className="text-cw-purple" />
              SOC2 Ready Security
            </span>
          </div>
        </div>

        {/* CENTER COLUMN: Central Interactive Core Card Panel */}
        <div className="col-span-1 md:col-span-6 bg-cw-bg2 border border-cw-bdr rounded-xl p-4 sm:p-6 min-h-[460px] flex flex-col justify-between shadow-xl w-full max-w-full overflow-hidden">
          
          {/* STEP 1: Select Authentication Provider */}
          {activeStep === STEPS.SELECT_METHOD && (
            <div className="space-y-6 flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-cw-txt">Ship something new</h3>
                <p className="text-[13px] text-cw-txt2 mt-1">Select your provider to link repositories to Codeward.</p>
                
                {repoError && repoError !== 'No GitHub account linked' && (
                  <div className="mt-4 p-3 bg-red-900/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] flex items-center gap-2">
                    <ShieldAlert size={16} /> {repoError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button 
                    onClick={() => handleLinkAccount('github')}
                    className="flex items-center justify-center gap-3 p-3 bg-cw-bg3 border border-cw-bdr rounded-lg hover:border-cw-purple transition text-sm font-medium text-cw-txt"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
                    Continue with GitHub
                  </button>

                  <button 
                    onClick={() => { setAuthProvider('gitlab'); setActiveStep(STEPS.GITLAB_AUTH); }}
                    className="flex items-center justify-center gap-3 p-3 bg-cw-bg3 border border-cw-bdr rounded-lg hover:border-cw-purple transition text-sm font-medium text-cw-txt"
                  >
                    <img src="https://i.ibb.co/SDsmVD5S/GITLABLOGO-removebg-preview.png" className="w-5 h-5 object-contain" alt="GitLab" />
                    Continue with GitLab
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Custom GitLab Setup Form View */}
          {activeStep === STEPS.GITLAB_AUTH && (
            <div className="space-y-6 flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-cw-txt">Configure GitLab Instance</h3>
                <p className="text-[13px] text-cw-txt2 mt-1">Provide self-hosted or SaaS credentials to integrate with your projects.</p>
                
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-cw-txt2 mb-1.5">GitLab Instance URL</label>
                    <input 
                      type="text" 
                      value={gitlabUrl}
                      onChange={(e) => setGitlabUrl(e.target.value)}
                      className="w-full bg-cw-bg border border-cw-bdr rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-cw-purple transition text-cw-txt" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-cw-txt2 mb-1.5">Personal Access Token</label>
                    <input 
                      type="password" 
                      placeholder="glpat-xxxxxxxxxxxx"
                      value={gitlabToken}
                      onChange={(e) => setGitlabToken(e.target.value)}
                      className="w-full bg-cw-bg border border-cw-bdr rounded-lg p-2.5 text-[13px] focus:outline-none focus:border-cw-purple transition text-cw-txt" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-cw-bdr">
                <button onClick={() => setActiveStep(STEPS.SELECT_METHOD)} className="text-[13px] font-medium text-cw-txt2 hover:text-cw-txt transition">
                  Back
                </button>
                <button 
                  onClick={() => {
                    handleLinkAccount('gitlab');
                    setActiveStep(STEPS.SELECT_REPOSITORY);
                  }}
                  disabled={!gitlabToken}
                  className="px-4 py-2 bg-cw-purple disabled:bg-cw-purple/40 disabled:text-cw-txt2 hover:bg-cw-purple/80 text-cw-txt rounded-lg text-[13px] font-bold transition shadow-md"
                >
                  Connect & Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Search and Select Repository */}
          {activeStep === STEPS.SELECT_REPOSITORY && (
            <div className="space-y-4 flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-cw-txt">Select repositories</h3>
                <p className="text-[13px] text-cw-txt2">Choose connected repositories to protect with Codeward agents.</p>
                
                <div className="flex gap-2 mt-4 relative">
                  {/* Custom Workspace Dropdown (simplified for this UI) */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                      className="bg-cw-bg border border-cw-bdr hover:border-cw-bdr rounded-lg px-3 py-2 text-[13px] flex items-center gap-2 cursor-pointer text-cw-txt2 transition-colors h-[42px]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
                      {typeof activeOrg === 'string' ? activeOrg : (activeOrg as any)?.name}
                      <ChevronDown size={14} className="text-cw-txt3 ml-2" />
                    </button>
                    {showOrgDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-cw-bg2 border border-cw-bdr rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="max-h-[200px] overflow-y-auto py-1">
                            {(propOrgs?.length ? propOrgs : localOrgs).map((orgObj, idx) => {
                              const orgName = typeof orgObj === 'string' ? orgObj : orgObj.name;
                              if (!orgName) return null;
                              return (
                                <button
                                  key={orgName + idx}
                                  onClick={() => { setActiveOrg?.(orgName); setShowOrgDropdown(false); }}
                                  className="w-full flex items-center px-4 py-2 hover:bg-cw-purple/20 transition-colors text-left text-[13px] text-cw-txt2"
                                >
                                  {orgName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
                    <input 
                      type="text" 
                      placeholder="Search repositories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-[42px] bg-cw-bg border border-cw-bdr rounded-lg pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-cw-purple transition text-cw-txt" 
                    />
                  </div>
                </div>

                <div className="mt-3 bg-cw-log-bg border border-cw-bdr rounded-lg divide-y divide-cw-bdr max-h-[200px] overflow-y-auto custom-scrollbar">
                  {loadingRepos ? (
                    <div className="p-8 flex justify-center"><Loader size={20} className="animate-spin text-cw-purple" /></div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="p-6 text-center text-[13px] text-cw-txt3">No repositories found.</div>
                  ) : (
                    filteredRepos.map((repo) => {
                      const sel = selectedRepos.includes(repo.full);
                      return (
                        <div 
                          key={repo.full} 
                          onClick={() => {
                            if (repo.connected) return;
                            toggleRepoSelection(repo.full);
                          }}
                          className={`p-3 text-[13px] transition flex justify-between items-center ${
                            repo.connected 
                              ? 'cursor-not-allowed text-cw-txt3 bg-cw-bg/50' 
                              : sel 
                                ? 'cursor-pointer bg-cw-purple/10 text-cw-purple' 
                                : 'cursor-pointer text-cw-txt2 hover:bg-cw-purple/10 hover:text-cw-purple'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-[16px] h-[16px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-all shrink-0 ${sel ? 'border-cw-purple bg-cw-purple' : 'border-cw-bdr bg-transparent'}`}>
                              {sel && <Check size={10} color="currentColor" />}
                            </div>
                            <div className="flex flex-col min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <img src={`https://github.com/${repo.owner}.png`} alt={repo.owner} className="w-4 h-4 rounded-full bg-cw-bg shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span className="font-medium truncate">{repo.name}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-cw-txt2 font-normal flex-wrap">
                                {repo.lang && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> {repo.lang}</span>}
                                {repo.pushed && <span className="flex items-center gap-1 text-cw-txt3">Updated {getRelativeTime(repo.pushed)}</span>}
                                {repo.stars > 0 && <span className="flex items-center gap-1" title="Stars">★ {repo.stars}</span>}
                                {repo.forks > 0 && <span className="flex items-center gap-1" title="Forks"><GitBranch size={11} /> {repo.forks}</span>}
                                {repo.issues > 0 && <span className="flex items-center gap-1" title="Issues"><ShieldAlert size={11} /> {repo.issues}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {repo.connected && <span className="text-[10px] bg-cw-bg border border-cw-bdr px-2 py-0.5 rounded text-cw-txt2">Connected</span>}
                            <span className={`text-[10px] px-2 py-0.5 rounded ${repo.private ? 'bg-cw-purple/20 text-cw-purple' : 'bg-cw-green/20 text-cw-green'}`}>{repo.private ? 'Private' : 'Public'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-cw-bdr">
                <button 
                  onClick={() => setActiveStep(authProvider === 'gitlab' ? STEPS.GITLAB_AUTH : STEPS.SELECT_METHOD)} 
                  className="text-[13px] font-medium text-cw-txt2 hover:text-cw-txt transition"
                >
                  Back
                </button>
                <button 
                  onClick={() => setActiveStep(STEPS.CONFIGURE_APPLICATION)}
                  disabled={selectedRepos.length === 0}
                  className="px-5 py-2 bg-cw-purple disabled:bg-cw-purple/40 disabled:text-cw-txt2 hover:bg-cw-purple/80 text-cw-txt rounded-lg text-[13px] font-bold transition shadow-md flex items-center gap-2"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Build Config Setup & Deployment Action */}
          {activeStep === STEPS.CONFIGURE_APPLICATION && (
            <div className="space-y-6 flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <h3 className="text-lg font-bold text-cw-txt">Set up your application</h3>
                <p className="text-[13px] text-cw-txt2 mt-1">Configure your Codeward agents and alert channels for the selected repositories.</p>
                
                <div className="mt-5 mb-3 bg-cw-bg border border-cw-bdr rounded-lg px-4 py-3 flex items-center gap-2 text-[13px] text-cw-txt2">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"></span>
                  Configuring <strong className="text-cw-txt ml-1">{selectedRepos.length}</strong> repositor{selectedRepos.length === 1 ? 'y' : 'ies'}
                </div>

                <div className="space-y-5 mt-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Alert Channels Configuration */}
                  <div>
                    <label className="block text-[12px] font-bold text-cw-txt2 mb-2 uppercase tracking-wider">Alert Channels</label>
                    <div className="flex flex-wrap gap-2">
                      {['slack', 'email', 'whatsapp', 'calendar'].map((channel) => {
                        // Using global config check via selectedRepos[0] or default
                        const firstRepo = selectedRepos[0];
                        const conf = configs[firstRepo] || DEFAULT_CONFIG;
                        const isEnabled = conf.alerts[channel as keyof RepoConfig['alerts']];
                        return (
                          <label key={channel} className={`flex items-center gap-2 cursor-pointer text-[12px] font-medium bg-cw-bg px-3 py-2 border rounded-lg transition-colors ${isEnabled ? 'border-cw-purple bg-cw-purple/10 text-cw-txt' : 'border-cw-bdr text-cw-txt2 hover:border-cw-bdr'}`}>
                            <input 
                              type="checkbox" 
                              checked={isEnabled}
                              onChange={() => {
                                // Apply to all selected
                                selectedRepos.forEach(repoFull => toggleAlert(repoFull, channel as keyof RepoConfig['alerts']));
                              }} 
                              className="hidden" 
                            />
                            {renderChannelIcon(channel)}
                            <span className="capitalize">{channel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Agents Configuration */}
                  <div>
                    <label className="block text-[12px] font-bold text-cw-txt2 mb-2 uppercase tracking-wider">Active Agents</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AGENTS.map(agent => (
                        <div 
                          key={agent.id}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border bg-cw-bg border-cw-bdr transition-all`}
                        >
                          <div className={`mt-0.5 w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0 ${agent.bg} ${agent.text}`}>
                            <agent.icon size={12} />
                          </div>
                          <div>
                            <div className="text-[12px] font-bold text-cw-txt line-clamp-1">{agent.name}</div>
                            <div className="text-[11px] text-cw-txt3 mt-0.5 leading-tight line-clamp-1">{agent.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-cw-bdr">
                <button onClick={() => setActiveStep(STEPS.SELECT_REPOSITORY)} className="text-[13px] font-medium text-cw-txt2 hover:text-cw-txt transition">
                  Back
                </button>
                <button 
                  onClick={executeConnect}
                  disabled={connecting}
                  className="px-5 py-2 bg-cw-purple disabled:bg-cw-purple/40 disabled:text-cw-txt2 hover:bg-cw-purple/80 text-cw-txt rounded-lg text-[13px] font-bold transition shadow-lg tracking-wide flex items-center gap-2"
                >
                  {connecting ? <Loader size={14} className="animate-spin" /> : <Shield size={14} />}
                  Connect & Protect
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Static Stepper Side Progress List */}
        <div className="col-span-1 md:col-span-3 pt-4 md:pl-4 md:border-l border-cw-bdr space-y-5 hidden md:block">
          <StepIndicator label="Select a method" active={activeStep === STEPS.SELECT_METHOD} done={activeStep > STEPS.SELECT_METHOD} />
          {authProvider === 'gitlab' && <StepIndicator label="Authenticate provider" active={activeStep === STEPS.GITLAB_AUTH} done={activeStep > STEPS.GITLAB_AUTH} />}
          <StepIndicator label="Select repositories" active={activeStep === STEPS.SELECT_REPOSITORY} done={activeStep > STEPS.SELECT_REPOSITORY} />
          <StepIndicator label="Configure & Connect" active={activeStep === STEPS.CONFIGURE_APPLICATION} done={activeStep > STEPS.CONFIGURE_APPLICATION} />
        </div>

      </div>
    </div>
  );
}

// Side Helper Subcomponent for Stepper Tracker UI Item
function StepIndicator({ label, active, done }: { label: string, active: boolean, done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <div className="w-3.5 h-3.5 rounded-full bg-cw-bg border border-cw-bdr flex items-center justify-center shrink-0">
          <Check size={8} className="text-cw-txt2" />
        </div>
      ) : active ? (
        <div className="w-3.5 h-3.5 rounded-full bg-cw-purple ring-4 ring-cw-purple/20 shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-cw-bdr shrink-0" />
      )}
      <span className={`text-[13px] font-medium ${active ? 'text-cw-purple font-bold' : done ? 'text-cw-txt2' : 'text-cw-txt3'}`}>
        {label}
      </span>
    </div>
  );
}
