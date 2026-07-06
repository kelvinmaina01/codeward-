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
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {issues.length === 0 ? (
        <div className="py-16 text-center text-cw-txt3">
          <ShieldCheck size={32} className="mx-auto mb-3 text-cw-green" />
          <div className="text-[14px] text-cw-txt2">No open critical or high security findings.</div>
          <div className="text-[12px] text-cw-txt3 mt-1">Real Security Agent findings across your repos appear here.</div>
        </div>
      ) : issues.map((issue) => (
        <div key={issue.id} className={`flex gap-2.5 px-3 py-2.5 rounded-lg mb-2 items-start border ${sevBg[issue.severity]}`}>
          <div className="text-[20px]">{sevDot[issue.severity]}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium mb-[3px] text-cw-txt">{issue.title} <span className="text-cw-txt3 font-normal">· {issue.repo}</span></div>
            <div className="text-[11px] text-cw-txt2 leading-[1.4]">{issue.description}</div>
            {(issue.file || issue.evidence) && (
              <div className="text-[10px] text-cw-txt3 font-mono mt-1 truncate">
                {issue.file ? `${issue.file}${issue.line != null ? `:${issue.line}` : ''}` : ''}{issue.file && issue.evidence ? ' · ' : ''}{issue.evidence ?? ''}
              </div>
            )}
            {issue.suggestedFix && <div className="text-[11px] text-cw-txt2 mt-1"><span className="text-cw-txt3">Suggested fix:</span> {issue.suggestedFix}</div>}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {issue.file && isValidRepoFullName(issue.repo) && (
                <a href={githubFileUrl(issue.repo, issue.file, issue.line)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cw-blue no-underline hover:underline font-mono">
                  <GithubIcon size={11} /> {issue.file}{issue.line != null ? `:${issue.line}` : ''}
                </a>
              )}
              {issue.htmlUrl && (
                <a href={issue.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cw-blue no-underline hover:underline">
                  <GithubIcon size={11} /> View on GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
