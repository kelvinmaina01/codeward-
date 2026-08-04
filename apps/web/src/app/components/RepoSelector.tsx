import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Github, Search, Check } from 'lucide-react';

export interface RepoOption {
  id: number | string;
  fullName: string;
  provider?: 'github' | 'gitlab' | 'bitbucket';
}

function RepoIcon({ fullName, provider, size = 14, className = '' }: { fullName?: string; provider?: string; size?: number; className?: string }) {
  const [error, setError] = useState(false);
  
  if (!fullName || fullName === 'All') {
    return <Github size={size} className={className} />;
  }

  if (!error) {
    const owner = fullName.split('/')[0];
    const src = provider === 'gitlab' ? `https://gitlab.com/${owner}.png` : `https://github.com/${owner}.png`;
    return (
      <img 
        src={src} 
        alt={owner}
        width={size}
        height={size}
        className={`rounded-full shrink-0 object-cover ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return <Github size={size} className={className} />;
}

interface RepoSelectorProps {
  options: RepoOption[];
  value: number | string;
  onChange: (value: number | string, fullName: string) => void;
  placeholder?: string;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export function RepoSelector({
  options,
  value,
  onChange,
  placeholder = 'Select repository',
  className = '',
  showAllOption = false,
  allOptionLabel = 'All connected repositories',
}: RepoSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAllSelected = value === 'All' || value === '';
  const selected = options.find((o) => String(o.id) === String(value) || o.fullName === String(value));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.fullName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cw-bg2 border border-cw-bdr hover:border-cw-purple/50 text-cw-txt text-[11px] font-mono transition-all duration-150 shadow-sm group active:scale-98"
      >
        <RepoIcon fullName={isAllSelected ? 'All' : selected?.fullName} provider={selected?.provider} size={14} className="text-cw-purple shrink-0 group-hover:scale-110 transition-transform" />
        <span className="truncate max-w-[210px] font-semibold">
          {isAllSelected ? allOptionLabel : selected ? selected.fullName : placeholder}
        </span>
        <ChevronDown size={13} className={`text-cw-txt3 transition-transform duration-200 ${open ? 'rotate-180 text-cw-purple' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-72 bg-cw-bg2 border border-cw-bdr rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search box */}
          <div className="p-2 border-b border-cw-bdr bg-cw-bg3/50 flex items-center gap-2">
            <Search size={13} className="text-cw-txt3 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repository..."
              className="bg-transparent text-cw-txt text-[11px] outline-none w-full font-mono placeholder:text-cw-txt3"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-1 flex flex-col gap-0.5">
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onChange('All', 'All connected repositories');
                  setOpen(false);
                  setSearch('');
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono transition-colors text-left w-full ${
                  isAllSelected ? 'bg-cw-purple/15 text-cw-purple font-bold' : 'text-cw-txt hover:bg-cw-bg3 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Github size={14} className="text-cw-purple" />
                  <span className="truncate">{allOptionLabel}</span>
                </div>
                {isAllSelected && <Check size={13} className="text-cw-purple shrink-0" />}
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="py-4 text-center text-cw-txt3 text-[11px]">No repositories match "{search}"</div>
            ) : (
              filtered.map((r) => {
                const isSelected = !isAllSelected && selected && (selected.id === r.id || selected.fullName === r.fullName);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onChange(r.id, r.fullName);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono transition-colors text-left w-full ${
                      isSelected ? 'bg-cw-purple/15 text-cw-purple font-bold' : 'text-cw-txt hover:bg-cw-bg3 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <RepoIcon fullName={r.fullName} provider={r.provider} size={14} className={isSelected ? 'text-cw-purple ring-1 ring-cw-purple/20' : 'text-cw-txt3'} />
                      <span className="truncate">{r.fullName}</span>
                    </div>
                    {isSelected && <Check size={13} className="text-cw-purple shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
