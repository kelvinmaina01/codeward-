import { useEffect, useState } from 'react';
import { Loader, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { GithubIcon, githubFileUrl, isValidRepoFullName } from './GithubLink';

interface RealAlert {
  id: string;
  kind: string;
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  category?: string | null;
  title: string;
  description: string;
  source: string;
  repo: string;
  file?: string | null;
  line?: number | null;
  evidence?: string | null;
  suggestedFix?: string | null;
  htmlUrl?: string | null;
}

const sevBg: Record<string, string> = {
  CRITICAL: 'bg-cw-red/10 border-cw-red/30',
  HIGH: 'bg-cw-amber/10 border-cw-amber/30',
  INFO: 'bg-cw-bg2 border-cw-bdr',
};
const sevDot: Record<string, string> = { CRITICAL: '🔴', HIGH: '🟠', INFO: '🔵' };

export function Security() {
  const [issues, setIssues] = useState<RealAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        // Real security-relevant findings only, from the real alerts feed.
        const sec = (data.alerts || []).filter((a: RealAlert) => a.kind === 'finding' && a.source === 'Security Agent');
        setIssues(sec);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex justify-center items-center py-20"><Loader size={24} className="animate-spin text-cw-purple" /></div>;
  if (error) return <div className="flex-1 py-10 text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <div className="w-full max-w-[1000px] mx-auto">
        
        {/* Main Hero Banner */}
        <div className="relative w-full h-[220px] rounded-2xl overflow-hidden mb-8 border border-cw-bdr/50 shadow-lg group cursor-pointer">
          {/* Background Image */}
          <img 
            src="/security_banner.png" 
            alt="Security Center" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          
          {/* Content Overlay */}
          <div className="absolute inset-0 p-8 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight max-w-md">
              Prove your <br />
              code security <span className="text-cw-red inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </h2>
            <p className="text-[14px] text-gray-300 max-w-sm mt-1 font-medium">
              Share your Codeward verified security report to build trust with investors, partners, and customers.
            </p>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className="py-16 text-center text-cw-txt3 bg-cw-bg2 border border-cw-bdr rounded-2xl">
            <ShieldCheck size={32} className="mx-auto mb-3 text-cw-green" />
            <div className="text-[14px] text-cw-txt2">No open critical or high security findings.</div>
            <div className="text-[12px] text-cw-txt3 mt-1">Real Security Agent findings across your repos appear here.</div>
          </div>
        ) : issues.map((issue) => (
          <div key={issue.id} className={`flex gap-3 p-4 rounded-xl mb-3 items-start border shadow-sm ${sevBg[issue.severity]}`}>
            <div className="text-[20px] leading-none pt-0.5">{sevDot[issue.severity]}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold mb-1 text-cw-txt">{issue.title} <span className="text-cw-txt3 font-normal">· {issue.repo}</span></div>
              <div className="text-[12px] text-cw-txt2 leading-relaxed mb-2">{issue.description}</div>
              {(issue.file || issue.evidence) && (
                <div className="text-[11px] text-cw-txt3 font-mono mt-1 mb-2 truncate bg-black/20 px-2 py-1.5 rounded-md border border-white/5 inline-block max-w-full">
                  {issue.file ? `${issue.file}${issue.line != null ? `:${issue.line}` : ''}` : ''}{issue.file && issue.evidence ? ' · ' : ''}{issue.evidence ?? ''}
                </div>
              )}
              {issue.suggestedFix && <div className="text-[12px] text-cw-txt2 mt-1 bg-cw-bg2 p-3 rounded-md border border-cw-bdr"><span className="text-cw-txt3 font-medium mb-1 block">Suggested fix:</span> {issue.suggestedFix}</div>}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {issue.file && isValidRepoFullName(issue.repo) && (
                  <a href={githubFileUrl(issue.repo, issue.file, issue.line)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-cw-blue no-underline hover:underline font-mono">
                    <GithubIcon size={12} /> {issue.file}{issue.line != null ? `:${issue.line}` : ''}
                  </a>
                )}
                {issue.htmlUrl && (
                  <a href={issue.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-cw-blue no-underline hover:underline">
                    <GithubIcon size={12} /> View on GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
