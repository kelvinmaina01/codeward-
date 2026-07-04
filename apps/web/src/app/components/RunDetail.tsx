import { useEffect, useState } from 'react';
import { X, RefreshCw, ChevronDown, ChevronRight, Wrench, ShieldCheck, GitPullRequest, ExternalLink, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../lib/api';

interface Props {
  repoId: number;
  runId: number;
  onBack: () => void;
}

interface Finding {
  id: string | null;
  severity: string;
  category: string | null;
  title: string;
  description: string;
  file: string | null;
  line: number | null;
  toolName: string | null;
  rawEvidence: string | null;
  fixStatus: 'suggested' | 'dismissed' | 'pr_opened';
  suggestedFix: string | null;
  refactorSafe: boolean | null;
  dismissed: boolean;
  dismissalReason: string | null;
}

interface AutoFixPR {
  opened: boolean;
  pullRequestNumber?: number;
  htmlUrl?: string;
  fixedCount?: number;
  reason?: string;
  guardianReview?: { reviewed: boolean; event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'; reason?: string } | null;
}

interface ToolExecuted {
  toolName: string;
  calledAt: string;
  durationMs: number;
  resultSummary: string;
}

interface AgentReport {
  agentId: string;
  displayName: string;
  status: string;
  score: number | null;
  gateDecision: string | null;
  durationMs: number | null;
  findingsCount: number;
  findings: Finding[];
  toolsExecuted: ToolExecuted[];
  summary: Record<string, unknown> | null;
  autoFixPR: AutoFixPR | null;
  error: string | null;
}

interface EscalatedIssue {
  agentId: string;
  title: string;
  file: string | null;
  issueNumber: number;
  htmlUrl: string;
}

interface RunReport {
  runId: number;
  repoId: number;
  commitSha: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  agentsRun: number;
  totalFindings: number;
  severityCounts: Record<string, number>;
  escalation: { issues: EscalatedIssue[]; skippedCount: number } | null;
  agents: AgentReport[];
}

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-cw-red text-white',
  HIGH: 'bg-cw-red/80 text-white',
  MEDIUM: 'bg-cw-amber text-cw-bg',
  LOW: 'bg-cw-blue/70 text-white',
  INFO: 'bg-cw-bg3 text-cw-txt2',
};

const GATE_STYLE: Record<string, string> = {
  PASS: 'bg-cw-green/10 text-cw-green border-cw-green/30',
  WARN: 'bg-cw-amber/10 text-cw-amber border-cw-amber/30',
  BLOCK: 'bg-cw-red/10 text-cw-red border-cw-red/30',
  HIGH: 'bg-cw-red/10 text-cw-red border-cw-red/30',
};

function AgentSection({ agent }: { agent: AgentReport }) {
  const [expanded, setExpanded] = useState(agent.findingsCount > 0);
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="bg-cw-bg border border-cw-bdr rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-cw-bg3/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {expanded ? <ChevronDown size={14} className="text-cw-txt3" /> : <ChevronRight size={14} className="text-cw-txt3" />}
          <span className="text-[13px] font-bold text-cw-txt">{agent.displayName}</span>
          {agent.gateDecision && (
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${GATE_STYLE[agent.gateDecision] ?? 'bg-cw-bg3 text-cw-txt2 border-cw-bdr'}`}>
              {agent.gateDecision}
            </span>
          )}
          {agent.status === 'failed' && (
            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-cw-red/10 text-cw-red border border-cw-red/30 uppercase">Agent Failed</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-cw-txt2">
          {agent.score != null && <span>Score: <span className="font-semibold text-cw-txt">{agent.score}/100</span></span>}
          <span>{agent.findingsCount} finding{agent.findingsCount === 1 ? '' : 's'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-cw-bdr">
          {agent.error && (
            <div className="px-4 py-2.5 text-[11px] text-cw-red bg-cw-red/5 border-b border-cw-bdr">{agent.error}</div>
          )}

          {agent.autoFixPR?.opened && (() => {
            const review = agent.autoFixPR!.guardianReview;
            const reviewText = review?.reviewed
              ? review.event === 'APPROVE' ? 'Approved by Guardian'
                : review.event === 'REQUEST_CHANGES' ? 'Guardian requested changes'
                : 'Guardian commented — needs a human look'
              : review && !review.reviewed ? `Guardian review incomplete (${review.reason})`
                : 'awaiting Guardian review';
            const colorClass = review?.reviewed && review.event === 'APPROVE' ? 'bg-cw-green/5 text-cw-green hover:bg-cw-green/10'
              : review?.reviewed && review.event === 'REQUEST_CHANGES' ? 'bg-cw-red/5 text-cw-red hover:bg-cw-red/10'
              : 'bg-cw-amber/5 text-cw-amber hover:bg-cw-amber/10';
            return (
              <a
                href={agent.autoFixPR!.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 px-4 py-2.5 border-b border-cw-bdr text-[11px] no-underline transition-colors ${colorClass}`}
              >
                <GitPullRequest size={13} />
                <span className="font-medium">Auto-fix PR #{agent.autoFixPR!.pullRequestNumber} — {agent.autoFixPR!.fixedCount} fix{agent.autoFixPR!.fixedCount === 1 ? '' : 'es'} applied — {reviewText}</span>
                <ExternalLink size={11} className="ml-auto shrink-0" />
              </a>
            );
          })()}

          {agent.findings.length === 0 ? (
            <div className="px-4 py-3 text-[11px] text-cw-txt3">No findings from this agent.</div>
          ) : (
            <div className="divide-y divide-cw-bg3">
              {agent.findings.map((f, i) => (
                <div key={f.id ?? i} className="px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${SEVERITY_STYLE[f.severity.toUpperCase()] ?? 'bg-cw-bg3 text-cw-txt2'}`}>
                        {f.severity}
                      </span>
                      {f.category && <span className="text-[10px] text-cw-txt3 uppercase tracking-wide">{f.category}</span>}
                      <span className="text-[13px] font-medium text-cw-txt">{f.title}</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                      f.fixStatus === 'dismissed' ? 'bg-cw-bg3 text-cw-txt3'
                        : f.fixStatus === 'pr_opened' ? 'bg-cw-green/10 text-cw-green border border-cw-green/20'
                        : 'bg-cw-blue/10 text-cw-blue border border-cw-blue/20'
                    }`}>
                      {f.fixStatus === 'dismissed' ? 'Dismissed' : f.fixStatus === 'pr_opened' ? 'PR Opened' : 'Suggested'}
                    </span>
                  </div>

                  <div className="text-[12px] text-cw-txt2">{f.description}</div>

                  {(f.file || f.toolName) && (
                    <div className="flex items-center gap-2 text-[10px] text-cw-txt3 font-mono">
                      {f.file && <span>{f.file}{f.line != null ? `:${f.line}` : ''}</span>}
                      {f.toolName && <span className="px-1.5 py-0.5 bg-cw-bg3 rounded">{f.toolName}</span>}
                    </div>
                  )}

                  {f.dismissed && f.dismissalReason && (
                    <div className="text-[11px] text-cw-txt3 italic">Dismissed: {f.dismissalReason}</div>
                  )}

                  {f.suggestedFix && f.fixStatus === 'suggested' && (
                    <div className="mt-1 flex items-start gap-2 text-[11px] bg-cw-bg3/50 border border-cw-bdr rounded-md px-2.5 py-2">
                      <Wrench size={12} className="text-cw-amber shrink-0 mt-0.5" />
                      <div>
                        <span className="text-cw-txt3">Suggested fix{f.refactorSafe === false ? ' (needs manual review — no test coverage confirmed)' : ''}: </span>
                        <span className="text-cw-txt2">{f.suggestedFix}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {agent.toolsExecuted.length > 0 && (
            <div className="border-t border-cw-bdr">
              <button
                onClick={() => setShowTools((s) => !s)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-transparent border-none cursor-pointer text-[10px] font-semibold text-cw-txt3 uppercase tracking-wide hover:text-cw-txt2"
              >
                <ShieldCheck size={12} />
                {showTools ? 'Hide' : 'Show'} checks run ({agent.toolsExecuted.length})
              </button>
              {showTools && (
                <div className="px-4 pb-3 flex flex-col gap-1">
                  {agent.toolsExecuted.map((t, i) => (
                    <div key={i} className="text-[10px] text-cw-txt3 font-mono flex gap-2">
                      <span className="text-cw-txt2 shrink-0">{t.toolName}</span>
                      <span className="text-cw-txt3">({t.durationMs}ms)</span>
                      <span className="truncate">{t.resultSummary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RunDetail({ repoId, runId, onBack }: Props) {
  const [report, setReport] = useState<RunReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/reports/${repoId}/runs/${runId}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setReport(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId, runId]);

  return (
    <div className="flex-1 flex flex-col bg-cw-bg2 overflow-hidden relative border-l border-cw-bdr">
      {/* Header */}
      <div className="bg-cw-bg border-b border-cw-bdr px-5 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-cw-bg3 border border-cw-bdr flex items-center justify-center">
            <RefreshCw size={14} className={`${loading ? 'text-cw-blue animate-spin' : 'text-cw-green'}`} />
          </div>
          <div>
            <span className="text-[15px] font-semibold text-cw-txt">Run Report</span>
            <div className="text-[11px] text-cw-txt2 mt-0.5">Run #{runId}{report ? ` · ${report.commitSha.slice(0, 7)}` : ''}</div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full hover:bg-cw-bg3 flex items-center justify-center text-cw-txt3 hover:text-cw-txt transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {loading && <div className="text-[12px] text-cw-txt3 text-center py-8">Loading real report data...</div>}
        {error && <div className="text-[12px] text-cw-red text-center py-8">{error}</div>}

        {report && (
          <>
            {/* Summary strip */}
            <div className="bg-cw-bg border border-cw-bdr rounded-xl p-4 grid grid-cols-4 gap-3">
              <div>
                <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Overall Score</div>
                <div className="text-[20px] font-semibold text-cw-txt">{report.overallScore != null ? `${report.overallScore}/100` : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Agents Run</div>
                <div className="text-[20px] font-semibold text-cw-txt">{report.agentsRun}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">Total Findings</div>
                <div className="text-[20px] font-semibold text-cw-txt">{report.totalFindings}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-cw-txt3 uppercase tracking-wide mb-1">By Severity</div>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {Object.entries(report.severityCounts).length === 0 ? (
                    <span className="text-[11px] text-cw-txt3">None</span>
                  ) : Object.entries(report.severityCounts).map(([sev, n]) => (
                    <span key={sev} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${SEVERITY_STYLE[sev] ?? 'bg-cw-bg3 text-cw-txt2'}`}>
                      {n} {sev}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Real escalated issues — opened when agents couldn't auto-fix a CRITICAL/HIGH finding */}
            {report.escalation && report.escalation.issues.length > 0 && (
              <div className="bg-cw-red/5 border border-cw-red/20 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-cw-red uppercase tracking-wide">
                  <AlertTriangle size={13} />
                  Escalated to GitHub — could not be auto-fixed ({report.escalation.issues.length})
                </div>
                {report.escalation.issues.map((issue) => (
                  <a
                    key={issue.issueNumber}
                    href={issue.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-[12px] text-cw-txt2 no-underline hover:text-cw-txt"
                  >
                    <span className="font-mono text-cw-red">#{issue.issueNumber}</span>
                    <span>{issue.title}</span>
                    <span className="text-cw-txt3">({issue.agentId})</span>
                    <ExternalLink size={11} className="ml-auto shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {/* Per-agent breakdown — the real, detailed report */}
            <div className="flex flex-col gap-3">
              {report.agents.length === 0 ? (
                <div className="text-[12px] text-cw-txt3 text-center py-6">No agents have reported on this run yet.</div>
              ) : report.agents.map((agent) => <AgentSection key={agent.agentId} agent={agent} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
