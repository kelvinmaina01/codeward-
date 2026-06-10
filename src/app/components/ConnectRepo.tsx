import { useState } from 'react';
import { Search, Github, Star, Lock, Globe, ChevronRight, Check, Loader, GitBranch, AlertCircle } from 'lucide-react';
import { MockUser } from './AuthPage';

interface Props {
  user: MockUser;
  onConnect: (repos: string[]) => void;
  onSkip: () => void;
}

interface Repo {
  name: string;
  full: string;
  desc: string;
  lang: string;
  stars: number;
  private: boolean;
  pushed: string;
  score?: number;
}

const mockRepos: Record<string, Repo[]> = {
  'acme-corp': [
    { name: 'my-api', full: 'acme-corp/my-api', desc: 'Main REST API server — Node 20 + Postgres', lang: 'TypeScript', stars: 0, private: true, pushed: '2m ago', score: 52 },
    { name: 'frontend', full: 'acme-corp/frontend', desc: 'React 18 + Vite customer dashboard', lang: 'TypeScript', stars: 0, private: true, pushed: '1h ago', score: 87 },
    { name: 'auth-service', full: 'acme-corp/auth-service', desc: 'JWT authentication microservice', lang: 'TypeScript', stars: 0, private: true, pushed: '3h ago', score: 79 },
    { name: 'payments-api', full: 'acme-corp/payments-api', desc: 'Stripe integration + billing webhooks', lang: 'TypeScript', stars: 0, private: true, pushed: '1d ago', score: 52 },
    { name: 'data-pipeline', full: 'acme-corp/data-pipeline', desc: 'Analytics ETL + event streaming', lang: 'Python', stars: 0, private: true, pushed: '2d ago' },
    { name: 'mobile-backend', full: 'acme-corp/mobile-backend', desc: 'GraphQL API for iOS/Android apps', lang: 'TypeScript', stars: 0, private: true, pushed: '4d ago' },
  ],
  personal: [
    { name: 'side-project', full: 'jkimani/side-project', desc: 'Personal project using Next.js', lang: 'TypeScript', stars: 12, private: false, pushed: '1w ago' },
    { name: 'scripts', full: 'jkimani/scripts', desc: 'Utility scripts and automation', lang: 'Shell', stars: 3, private: false, pushed: '2w ago' },
  ],
};

const langColors: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3776AB',
  Go: '#00ADD8',
  Ruby: '#CC342D',
  Shell: '#4EAA25',
};

export function ConnectRepo({ user, onConnect, onSkip }: Props) {
  const [selectedOrg, setSelectedOrg] = useState(user.orgs[0] || 'personal');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState(false);

  const repos = (mockRepos[selectedOrg] || mockRepos.personal).filter(r =>
    !search || r.name.includes(search.toLowerCase()) || r.desc?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRepo = (full: string) => {
    setSelected(s => s.includes(full) ? s.filter(x => x !== full) : [...s, full]);
  };

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => onConnect(selected), 1600);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e8e8e6] font-sans flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1117] border-b border-[#1e2535] px-8 py-4 flex items-center justify-between">
        <div className="text-base font-bold tracking-tight">
          Code<span className="text-[#8B5CF6]">ward</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#6D28D9] flex items-center justify-center text-[11px] font-bold text-white">{user.avatar}</div>
          <span className="text-[13px] text-[#aaa]">@{user.login}</span>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex justify-center pt-7 pb-4 gap-0">
        {[
          { n: '1', label: 'Create account', done: true },
          { n: '2', label: 'Connect repos', active: true },
          { n: '3', label: 'First scan', done: false },
        ].map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold ${step.done ? 'bg-green-500 text-white' : step.active ? 'bg-[#6D28D9] text-white' : 'bg-[#1e2535] text-[#555]'}`}>
                {step.done ? <Check size={13} /> : step.n}
              </div>
              <span className={`text-xs ${step.active ? 'text-[#e8e8e6] font-medium' : 'text-[#555] font-normal'}`}>{step.label}</span>
            </div>
            {i < 2 && <div className="w-12 h-px bg-[#1e2535] mx-3" />}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="max-w-[760px] w-full mx-auto px-6 pb-15">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Which repos should Codeward guard?</h1>
          <p className="text-sm text-[#555] leading-[1.6]">
            Select up to 2 repos on the free tier. Codeward installs a webhook and gains read-only access.<br />
            It will <strong className="text-[#e8e8e6]">never push directly to production</strong>.
          </p>
        </div>

        {/* Alert */}
        <div className="bg-[#6D28D9]/10 border border-[#6D28D9]/30 rounded-lg px-3.5 py-2.5 mb-5 flex gap-2.5 items-start text-xs text-[#C4B5FD]">
          <AlertCircle size={14} className="shrink-0 mt-px" />
          <span>We request <strong>read access to code</strong> and <strong>write access to checks and pull requests</strong>. That's it. No write access to code, no secrets, no deployments.</span>
        </div>

        {/* Org selector + search */}
        <div className="flex gap-2.5 mb-4">
          <div className="flex bg-[#0f1117] border border-[#1e2535] rounded-lg overflow-hidden">
            {user.orgs.map(org => (
              <button
                key={org}
                onClick={() => setSelectedOrg(org)}
                className={`px-3.5 py-1.5 text-xs font-medium cursor-pointer border-none border-r border-[#1e2535] transition-all duration-150 ${selectedOrg === org ? 'bg-[#1e2535] text-[#e8e8e6]' : 'bg-transparent text-[#555] hover:bg-[#1e2535]/50'}`}>
                {org}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#374151]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Find a repository..."
              className="w-full py-2 pl-7 pr-2.5 bg-[#0f1117] border border-[#1e2535] rounded-lg text-xs text-[#e8e8e6] outline-none focus:border-[#6D28D9] transition-colors"
            />
          </div>
        </div>

        {/* Repo list */}
        <div className="bg-[#0f1117] border border-[#1e2535] rounded-xl overflow-hidden mb-5">
          {repos.map((repo, i) => {
            const sel = selected.includes(repo.full);
            const atLimit = selected.length >= 2 && !sel;
            return (
              <div
                key={repo.full}
                onClick={() => !atLimit && toggleRepo(repo.full)}
                className={`flex items-center gap-3.5 px-4 py-3.5 ${i < repos.length - 1 ? 'border-b border-[#1e2535]' : ''} ${atLimit ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-white/2'} ${sel ? 'bg-[#6D28D9]/10 hover:bg-[#6D28D9]/15' : 'bg-transparent'} transition-colors duration-150`}
              >
                {/* Checkbox */}
                <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150 ${sel ? 'border-[#6D28D9] bg-[#6D28D9]' : 'border-[#2a3040] bg-transparent'}`}>
                  {sel && <Check size={11} color="#fff" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-[3px]">
                    {repo.private ? <Lock size={12} className="text-[#555]" /> : <Globe size={12} className="text-[#555]" />}
                    <span className="text-[13px] font-semibold text-[#e8e8e6]">{repo.name}</span>
                    {repo.score !== undefined && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-[.04em] ${repo.score < 60 ? 'bg-red-500/15 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        PREV SCORE: {repo.score}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#555] truncate">{repo.desc}</div>
                </div>

                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: langColors[repo.lang] || '#666' }} />
                    <span className="text-[11px] text-[#555]">{repo.lang}</span>
                  </div>
                  {repo.stars > 0 && (
                    <div className="flex items-center gap-1">
                      <Star size={11} className="text-[#555]" />
                      <span className="text-[11px] text-[#555]">{repo.stars}</span>
                    </div>
                  )}
                  <span className="text-[11px] text-[#374151]">{repo.pushed}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selection status + connect */}
        <div className="flex items-center justify-between bg-[#0f1117] border border-[#1e2535] rounded-[10px] px-[18px] py-3.5">
          <div>
            <div className="text-[13px] text-[#e8e8e6] font-medium">
              {selected.length === 0 ? 'No repos selected' : `${selected.length} repo${selected.length > 1 ? 's' : ''} selected`}
            </div>
            <div className="text-[11px] text-[#555] mt-0.5">Free tier: up to 2 repositories</div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={onSkip} className="px-4 py-2 bg-transparent border border-[#2a3040] rounded-[7px] text-xs text-[#555] cursor-pointer hover:bg-white/5 transition-colors">
              Skip for now
            </button>
            <button
              onClick={handleConnect}
              disabled={selected.length === 0 || connecting}
              className={`px-5 py-2 border-none rounded-[7px] text-[13px] font-semibold flex items-center gap-2 transition-colors ${selected.length > 0 ? 'bg-[#6D28D9] text-white cursor-pointer hover:bg-[#5b21b6]' : 'bg-[#1e2535] text-[#374151] cursor-not-allowed'}`}>
              {connecting ? <Loader size={14} className="animate-spin" /> : <GitBranch size={14} />}
              {connecting ? 'Connecting...' : `Connect ${selected.length > 0 ? `${selected.length} repo${selected.length > 1 ? 's' : ''}` : 'repos'}`}
            </button>
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-[#374151]">
          You can add more repos later from the Repositories panel · Settings → Incoming Webhook
        </div>
      </div>
    </div>
  );
}
