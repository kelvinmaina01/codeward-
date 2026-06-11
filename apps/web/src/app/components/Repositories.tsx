import { useState, useEffect } from 'react';
import { Search, Loader, AlertCircle, Plus, Play, Pause, Settings as SettingsIcon, BarChart2, GitFork, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface RepoConfig {
  agents: Record<string, boolean>;
}

interface ConnectedRepo {
  id: number;
  userId: string;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  config: RepoConfig;
  createdAt: string;
  // Mock data for UI since we don't have actual runs yet
  healthScore?: number;
  trend?: string;
  isUp?: boolean;
  lastScan?: string;
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

// Simple hash to generate deterministic fake stats for now
function hashStringToNum(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function Repositories({ activeOrg }: { activeOrg?: string }) {
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [pausedRepos, setPausedRepos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchConnectedRepos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:3001/api/repos/connected', { credentials: 'include' });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch connected repos');
        const data = await res.json();
        
        // Enrich with fake health data for the dashboard demo
        const enriched = (data.repos || []).map((r: ConnectedRepo) => {
          const hash = hashStringToNum(r.fullName);
          return {
            ...r,
            healthScore: 50 + (hash % 48), // 50 to 98
            trend: (hash % 2 === 0 ? '+' : '-') + (hash % 12 + 1),
            isUp: hash % 2 === 0,
            lastScan: (hash % 60 + 1) + 'm ago'
          };
        });
        
        setRepos(enriched);
      } catch (err: any) {
        toast.error('Failed to load connected repositories');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConnectedRepos();
  }, []);

  const languages = ['All', ...Array.from(new Set(repos.map(r => r.language))).filter(Boolean)];

  const filteredRepos = repos.filter(r => {
    const matchesOrg = !activeOrg || r.owner === activeOrg;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesLang = filterLang === 'All' || r.language === filterLang;
    return matchesOrg && matchesSearch && matchesLang;
  });

  const togglePause = (fullName: string) => {
    setPausedRepos(prev => {
      const isPaused = !prev[fullName];
      toast.success(`${fullName} ${isPaused ? 'paused' : 'resumed'}`);
      return { ...prev, [fullName]: isPaused };
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-cw-green';
    if (score >= 60) return 'text-cw-amber';
    return 'text-cw-red';
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 bg-cw-bg text-cw-txt">

      {/* Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cw-txt3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search connected repos..."
            className="w-full py-2 pl-9 pr-3 bg-cw-bg2 border border-cw-bdr rounded-lg text-[13px] text-cw-txt outline-none focus:border-cw-purple transition-colors"
          />
        </div>
        <select 
          value={filterLang} 
          onChange={e => setFilterLang(e.target.value)}
          className="bg-cw-bg2 border border-cw-bdr rounded-lg text-[13px] text-cw-txt py-2 px-3 outline-none min-w-[150px]"
        >
          {languages.map(l => <option key={l || 'unknown'} value={l || 'Unknown'}>{l === 'All' ? 'All Languages' : l}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-[300px]">
          <Loader size={24} className="animate-spin text-cw-purple" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-cw-bdr rounded-xl bg-cw-bg2">
          <AlertCircle size={32} className="text-cw-red mb-3" />
          <p className="text-cw-txt font-medium">{error}</p>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-cw-bdr rounded-xl bg-cw-bg2">
          <GitFork size={32} className="text-cw-txt3 mb-3" />
          <h3 className="text-cw-txt font-medium mb-1">No repositories found</h3>
          <p className="text-[13px] text-cw-txt2">Try adjusting your search or connect a new repository.</p>
        </div>
      ) : (
        <div className="border border-cw-bdr rounded-lg bg-cw-bg2 overflow-hidden shadow-sm">
          <div className="bg-cw-bg3 px-5 py-3 border-b border-cw-bdr flex justify-between items-center">
            <span className="text-[13px] font-semibold text-cw-txt">{filteredRepos.length} Repositories</span>
          </div>
          <div className="flex flex-col">
            {filteredRepos.map((repo, i) => {
              const isPaused = pausedRepos[repo.fullName];
              const score = repo.healthScore || 0;
              const langName = repo.language || 'Unknown';
              const numAgents = Object.values(repo.config?.agents || {}).filter(Boolean).length;

              return (
                <div 
                  key={repo.id} 
                  className={`flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-cw-bdr last:border-0 hover:bg-cw-bg3 transition-colors ${isPaused ? 'opacity-60' : ''}`}
                >
                  {/* Left: Info */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0 pr-4 mb-4 md:mb-0">
                    <div className="flex items-center gap-2">
                      {repo.isPrivate ? <Lock size={15} className="text-cw-txt3" /> : <Globe size={15} className="text-cw-txt3" />}
                      <h3 className="text-[16px] font-semibold text-cw-blue hover:underline cursor-pointer">{repo.name}</h3>
                      {isPaused && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-cw-bdr bg-cw-bg text-cw-txt3 tracking-wide">PAUSED</span>}
                    </div>
                    <p className="text-[13px] text-cw-txt2 truncate max-w-3xl">{repo.description || 'No description provided.'}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-cw-txt3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: langColors[langName] || langColors.Unknown }} />
                        {langName}
                      </div>
                      <span>Updated {repo.lastScan}</span>
                      <div className="flex items-center gap-1">
                        Health: <span className={`font-semibold ${getHealthColor(score)}`}>{score}/100</span>
                      </div>
                      <div className="flex items-center gap-1 text-cw-txt2">
                        {numAgents} Agents
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => togglePause(repo.fullName)}
                      className="px-3 py-1.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                    </button>
                    <button className="px-3 py-1.5 bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5">
                      <BarChart2 size={14} /> Runs
                    </button>
                    <button className="w-8 h-[30px] flex items-center justify-center bg-cw-bg border border-cw-bdr hover:bg-cw-bg2 text-cw-txt rounded-lg transition-colors">
                      <SettingsIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
