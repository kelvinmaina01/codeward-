import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FolderGit2, 
  Terminal, 
  Layers,
  Loader2
} from 'lucide-react';
import { useSession } from '../../../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || '';

interface RepoStatusItem {
  full: string;
  name?: string;
  status: 'running' | 'queued';
}

export function OnboardingStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();

  // Preparation animation phase (0 to 100%)
  const [isPreparing, setIsPreparing] = useState(true);
  const [prepProgress, setPrepProgress] = useState(20);
  const [prepStep, setPrepStep] = useState(0);

  // Repositories list state
  const [reposList, setReposList] = useState<RepoStatusItem[]>(() => {
    // 1. Check router navigation state
    const stateRepos = (location.state as any)?.repos;
    if (Array.isArray(stateRepos) && stateRepos.length > 0) {
      return stateRepos.map((r: any, idx: number) => ({
        full: typeof r === 'string' ? r : r.full || r.name,
        name: typeof r === 'string' ? r.split('/').pop() : r.name,
        status: idx === 0 ? 'running' : 'queued',
      }));
    }

    // 2. Check query params e.g. ?repo=owner/repo
    const queryRepo = searchParams.get('repo');
    if (queryRepo) {
      return [{
        full: queryRepo,
        name: queryRepo.split('/').pop(),
        status: 'running',
      }];
    }

    return [];
  });

  // If no repos provided in state, fetch the latest connected repositories from API
  useEffect(() => {
    if (reposList.length === 0) {
      fetch(`${API_URL}/api/repos/connected`, { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : { repos: [] }))
        .then((data) => {
          if (data?.repos && Array.isArray(data.repos) && data.repos.length > 0) {
            const mapped: RepoStatusItem[] = data.repos.map((r: any, idx: number) => ({
              full: r.full_name || r.name || r.fullName,
              name: (r.full_name || r.name || r.fullName || '').split('/').pop(),
              status: idx === 0 ? 'running' : 'queued',
            }));
            setReposList(mapped);
          } else {
            setReposList([{
              full: 'primary-repository',
              name: 'primary-repository',
              status: 'running',
            }]);
          }
        })
        .catch(() => {
          setReposList([{
            full: 'primary-repository',
            name: 'primary-repository',
            status: 'running',
          }]);
        });
    }
  }, []);

  // Preparation micro-sequence steps (clean engineering copy)
  const prepSteps = [
    'Verifying repository handshake…',
    'Allocating isolated microVM environment…',
    'Initializing baseline analysis agents…',
    'Repository connected and stream ready.'
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPrepProgress(50);
      setPrepStep(1);
    }, 600);

    const timer2 = setTimeout(() => {
      setPrepProgress(85);
      setPrepStep(2);
    }, 1300);

    const timer3 = setTimeout(() => {
      setPrepProgress(100);
      setPrepStep(3);
    }, 2000);

    const timer4 = setTimeout(() => {
      setIsPreparing(false);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const activeRepo = reposList.find((r) => r.status === 'running') || reposList[0];
  const queuedCount = reposList.filter((r) => r.status === 'queued').length;

  const handleWatchLiveStream = () => {
    localStorage.setItem('cw_has_onboarded', 'true');
    navigate('/dashboard/livefeed?view=stream');
  };

  const handleEnterDashboard = () => {
    localStorage.setItem('cw_has_onboarded', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F3F5F6] text-[#121316] flex items-center justify-center p-2.5 sm:p-4 font-sans select-none overflow-hidden">
      
      {/* ─── Fluid Responsive Card Container with Dynamic Tangent Grid Lines ─── */}
      <div className="relative w-[94%] sm:w-[88%] md:w-[80%] lg:w-[68%] max-w-2xl">
        
        {/* Dynamic Architectural Grid Lines (Tight minimal offset framing card) */}
        <div className="absolute -top-3 sm:-top-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        <div className="absolute -bottom-3 sm:-bottom-4 -left-[100vw] -right-[100vw] h-px bg-[#D8DBDF] pointer-events-none" />
        <div className="absolute -left-3 sm:-left-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />
        <div className="absolute -right-3 sm:-right-4 -top-[100vh] -bottom-[100vh] w-px bg-[#D8DBDF] pointer-events-none" />

        {/* ─── The Card (Minimized padding) ─── */}
        <div className="relative z-10 w-full bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-4 sm:p-5 md:p-6 transition-all duration-200">
          
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#F3F4F6] mb-3.5 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[10px] sm:text-[11px] font-mono font-medium uppercase tracking-wider text-[#6B7280]">
                {isPreparing ? 'Initializing' : 'Connected'}
              </span>
            </div>
          </div>

          {/* ─── PHASE 1: Minimalist Animated Preparation ─── */}
          {isPreparing ? (
            <div className="py-6 sm:py-8 flex flex-col items-center text-center animate-in fade-in duration-200">
              
              {/* Minimal Line Loader */}
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center mb-3.5 text-[#121316]">
                <Loader2 size={16} className="animate-spin text-[#121316]" />
              </div>

              <h2 className="text-sm sm:text-base font-bold text-[#121316] tracking-tight mb-1">
                Preparing repo for Codeward agents…
              </h2>

              <p className="text-xs text-[#4B5563] font-normal h-4 mb-4 transition-all duration-200">
                {prepSteps[prepStep]}
              </p>

              {/* Clean Minimal Progress Track */}
              <div className="w-full max-w-xs bg-[#F3F4F6] h-1 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-[#121316] h-full transition-all duration-400 ease-out rounded-full"
                  style={{ width: `${prepProgress}%` }}
                />
              </div>

              <span className="text-[10px] font-mono text-[#9CA3AF]">
                {prepProgress}%
              </span>
            </div>
          ) : (
            /* ─── PHASE 2: Repositories Connected & Queue Number Display ─── */
            <div className="animate-in fade-in duration-200">
              
              {/* Title Section (Compact) */}
              <div className="mb-3.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] text-[11px] font-medium mb-1.5 border border-[#E5E7EB]">
                  <CheckCircle2 size={12} className="text-[#10B981]" />
                  <span>Repository Connected</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-[#121316] tracking-tight">
                  Repository Protected & Active
                </h1>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Baseline audit is currently running.
                </p>
              </div>

              {/* Repositories Status Cards (Tighter spacing) */}
              <div className="space-y-2.5 mb-4">
                
                {/* 1. Currently Active Repository */}
                {activeRepo && (
                  <div className="p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] text-[#121316] flex items-center justify-center shrink-0 mt-0.5">
                          <FolderGit2 size={14} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-[13px] font-semibold font-mono text-[#121316] truncate max-w-[240px] sm:max-w-xs">
                              {activeRepo.full}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-[#374151] border border-[#D1D5DB]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              Active Scan
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                            Parsing AST dependencies, scanning CVEs, and analyzing code health.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Queued Repositories (Count only, no table) */}
                {queuedCount > 0 && (
                  <div className="p-2.5 sm:p-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between text-xs text-[#4B5563]">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-[#6B7280] shrink-0" />
                      <span>
                        <strong className="text-[#121316] font-semibold">{queuedCount}</strong> {queuedCount === 1 ? 'repository' : 'repositories'} queued
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-mono">
                      Sequential execution
                    </span>
                  </div>
                )}

                {/* Multi-Repo Queueing Policy Notice */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-[#F3F5F6] border border-[#E5E7EB] flex items-start gap-2 text-[11px] text-[#4B5563] leading-relaxed">
                  <Layers size={13} className="text-[#6B7280] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#121316]">Sequential Policy: </span>
                    Repositories run sequentially to prevent API rate limits, VM saturation, and agent throttling.
                  </div>
                </div>

              </div>

              {/* ─── Actions: Watch Live Agent Stream button on left, Enter Dashboard link with arrow on right ─── */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-[#F3F4F6]">
                
                {/* Primary CTA: Watch Live Agent Stream Button */}
                <button
                  type="button"
                  onClick={handleWatchLiveStream}
                  className="py-2.5 px-4 rounded-xl bg-[#121316] hover:bg-[#27272A] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <Terminal size={14} />
                  <span>Watch Live Agent Stream</span>
                  <ArrowRight size={13} className="text-[#9CA3AF]" />
                </button>

                {/* Secondary Action: Enter Dashboard as a clean text link with arrow (NOT a button) */}
                <button
                  type="button"
                  onClick={handleEnterDashboard}
                  className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-[#6B7280] hover:text-[#121316] transition-colors cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-[#F3F5F6] group"
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight size={13} className="text-[#9CA3AF] group-hover:text-[#121316] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
