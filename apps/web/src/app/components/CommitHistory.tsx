import { useEffect, useState, useRef } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowLeft, Bot, Bug, CheckCircle2, ChevronDown,
  ChevronRight, ExternalLink, FileText, GitCommit, GitPullRequest, Github,
  GitBranch, Info, Layers, Loader2, Lock, RefreshCw, ShieldCheck, Sparkles, Wrench, XCircle,
  Zap, Filter, Check,
} from 'lucide-react';
import { API_URL } from '../../lib/api';
import { RepoSelector } from './RepoSelector';

type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'agent_failed';
type AgentStatus = 'completed' | 'failed' | 'skipped' | 'running' | 'queued';
type Gate = 'PASS' | 'WARN' | 'BLOCK' | null;

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

interface ToolExecuted {
  toolName?: string;
  name?: string;
  durationMs?: number;
  duration?: number;
  resultSummary?: string;
  result?: string;
}

interface AutoFixPR {
  opened?: boolean;
  pullRequestNumber?: number;
  htmlUrl?: string;
  fixedCount?: number;
  number?: number;
  url?: string;
  guardianReview?: { reviewed: boolean; event?: string; reason?: string } | null;
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
  summary: unknown;
  autoFixPR: AutoFixPR | null;
  error: string | null;
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
  escalation: { issues: { agentId: string; title: string; file: string | null; issueNumber: number; htmlUrl: string }[]; skippedCount: number } | null;
  agents: AgentReport[];
}

interface AgentResult {
  id: string;
  name: string;
  status: AgentStatus;
  score: number | null;
  gate: Gate;
  findings: number;
  durationMs: number | null;
  autoFixPR: { number: number; url: string } | null;
  skippedReason?: string;
}

interface CommitRun {
  id: number;
  status: RunStatus;
  score: number | null;
  isIncremental: boolean;
  changedFileCount: number | null;
  changedFiles?: string[];
  agentsRun: number;
  agentsSkipped: number;
  gateDecision: Gate;
  agents: AgentResult[];
  createdAt: string;
  completedAt: string | null;
}

interface Commit {
  sha: string;
  message: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  date: string | null;
  htmlUrl: string | null;
  branch: string;
  run: CommitRun | null;
}

interface CommitDiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  blobUrl: string | null;
  rawUrl: string | null;
}

interface CommitDiff {
  sha: string;
  htmlUrl: string | null;
  stats: { additions?: number; deletions?: number; total?: number } | null;
  files: CommitDiffFile[];
}

interface Props {
  repoId?: number;
  repoFullName?: string;
  onBack: () => void;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  security: <ShieldCheck size={13} />,
  bloat: <Zap size={13} />,
  broken_code: <Bug size={13} />,
  architecture: <Layers size={13} />,
  compliance: <FileText size={13} />,
  data_dx: <Bot size={13} />,
  ai_era: <Sparkles size={13} />,
};

const GATE_STYLES: Record<string, string> = {
  PASS: 'bg-cw-green/10 text-cw-green border-cw-green/30',
  WARN: 'bg-cw-amber/10 text-cw-amber border-cw-amber/30',
  BLOCK: 'bg-cw-red/10 text-cw-red border-cw-red/30',
};

const SEV_STYLE: Record<string, string> = {
  CRITICAL: 'bg-cw-red text-white',
  HIGH: 'bg-cw-red/80 text-white',
  MEDIUM: 'bg-cw-amber text-cw-bg',
  LOW: 'bg-cw-blue/70 text-white',
  INFO: 'bg-cw-bg3 text-cw-txt2',
};

const AGENT_STATUS_ICON: Record<AgentStatus, React.ReactNode> = {
  completed: <CheckCircle2 size={13} className="text-cw-green" />,
  failed: <XCircle size={13} className="text-cw-red" />,
  skipped: <div className="w-1.5 h-1.5 rounded-full bg-cw-txt3" />,
  running: <Loader2 size={13} className="text-cw-blue animate-spin" />,
  queued: <div className="w-2 h-2 rounded-full border border-cw-txt3" />,
};

function firstLine(message: string | null): string {
  return (message || 'Commit from connected repository').split('\n')[0];
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function durationLabel(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'unknown';
  const ms = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(ms / 60_000);
  return m > 0 ? `${m}m ago` : 'just now';
}

function formatSummary(summary: unknown): string | null {
  if (summary == null || summary === '') return null;
  if (typeof summary === 'string') return summary;
  try {
    return JSON.stringify(summary);
  } catch {
    return 'Structured summary returned.';
  }
}

function parsePatch(patch: string): string[] {
  return patch.split('\n').filter((line) => !line.startsWith('+++') && !line.startsWith('---'));
}

function AgentRow({ agent }: { agent: AgentResult }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-[11px] border-b border-cw-bg3 last:border-0 ${agent.status === 'skipped' ? 'opacity-60' : ''}`}>
      <div className="w-4 flex items-center justify-center shrink-0">{AGENT_STATUS_ICON[agent.status] ?? AGENT_STATUS_ICON.queued}</div>
      <div className="flex items-center gap-1.5 w-[120px] shrink-0 text-cw-txt font-medium">
        <span className="text-cw-txt3">{AGENT_ICONS[agent.id]}</span>{agent.name}
      </div>
      {agent.status === 'skipped' ? (
        <span className="text-cw-txt3 italic text-[10px] flex-1">{agent.skippedReason ?? 'Skipped by orchestrator'}</span>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {agent.gate && <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${GATE_STYLES[agent.gate]}`}>{agent.gate}</span>}
          {agent.score != null && <span className="text-cw-txt2">Score: <span className="font-semibold text-cw-txt">{agent.score}/100</span></span>}
          {agent.findings > 0 && <span className="text-cw-txt3">{agent.findings} finding{agent.findings === 1 ? '' : 's'}</span>}
          {agent.durationMs != null && <span className="text-cw-txt3 ml-auto">{durationLabel(agent.durationMs)}</span>}
          {agent.autoFixPR && (
            <a href={agent.autoFixPR.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="ml-2 flex items-center gap-1 text-cw-blue hover:text-cw-txt transition-colors no-underline text-[10px]">
              <GitPullRequest size={11} /> PR #{agent.autoFixPR.number} <ExternalLink size={9} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ReportDrawer({ repoId, runId, onClose }: { repoId: number; runId: number; onClose: () => void }) {
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
    <>
      <div className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[640px] max-w-[calc(100vw-2rem)] bg-cw-bg2 border-l border-cw-bdr z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg3/60 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-cw-txt">Full Agent Analysis Report</h2>
            <div className="text-[11px] text-cw-txt3 mt-0.5">Run #{runId} · Detailed breakdown across all autonomous sub-agents</div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cw-bdr bg-cw-bg text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 text-[11px] font-medium transition-colors"
          >
            Collapse <ChevronRight size={13} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-20 flex items-center justify-center text-[12px] text-cw-txt3 gap-2">
              <Loader2 size={18} className="animate-spin text-cw-blue" /> Loading full analysis report...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-cw-red/30 bg-cw-red/10 text-cw-red text-xs">{error}</div>
          ) : !report ? null : (
            <>
              {/* Stat Banner */}
              <div className="p-4 rounded-xl border border-cw-bdr bg-cw-bg flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] text-cw-txt3 uppercase tracking-wider font-bold">Overall Score</div>
                  <div className={`text-2xl font-bold mt-0.5 ${
                    report.overallScore == null ? 'text-cw-txt3' : report.overallScore >= 80 ? 'text-cw-green' : report.overallScore >= 60 ? 'text-cw-amber' : 'text-cw-red'
                  }`}>
                    {report.overallScore ?? '-'}<span className="text-xs font-normal text-cw-txt3">/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {Object.entries(report.severityCounts).map(([sev, count]) => (
                    <span key={sev} className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${SEV_STYLE[sev] ?? 'bg-cw-bg3 text-cw-txt2'}`}>
                      {count} {sev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Escalated Issues */}
              {report.escalation && report.escalation.issues.length > 0 && (
                <div className="p-4 rounded-xl border border-cw-red/30 bg-cw-red/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cw-red uppercase tracking-wide">
                    <AlertTriangle size={14} /> Escalated GitHub Issues
                  </div>
                  <div className="space-y-1.5">
                    {report.escalation.issues.map((issue) => (
                      <a key={issue.issueNumber} href={issue.htmlUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-cw-bg border border-cw-red/20 text-xs text-cw-txt hover:border-cw-red flex items-center justify-between no-underline">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-cw-red font-bold">#{issue.issueNumber}</span>
                          <span>{issue.title}</span>
                        </div>
                        <ExternalLink size={12} className="text-cw-txt3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-cw-txt uppercase tracking-wider">Sub-Agent Results</div>
                {report.agents.map((agent) => (
                  <AgentReportCard key={agent.agentId} agent={agent} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DiffDrawer({ repoId, sha, onClose }: { repoId: number; sha: string; onClose: () => void }) {
  const [diff, setDiff] = useState<CommitDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/reports/${repoId}/commits/${sha}/diff`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setDiff(data);
        const initial: Record<string, boolean> = {};
        (data.files || []).slice(0, 5).forEach((file: CommitDiffFile) => { initial[file.filename] = true; });
        setOpenFiles(initial);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoId, sha]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[640px] max-w-[calc(100vw-2rem)] bg-cw-bg2 border-l border-cw-bdr z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cw-bdr bg-cw-bg3/60 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-cw-txt">Commit Diff</h2>
            <div className="text-[11px] font-mono text-cw-txt3 mt-0.5">Commit {shortSha(sha)}</div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cw-bdr bg-cw-bg text-cw-txt2 hover:text-cw-txt hover:bg-cw-bg3 text-[11px] font-medium transition-colors"
          >
            Collapse <ChevronRight size={13} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex items-center justify-center text-[12px] text-cw-txt3 gap-2">
              <Loader2 size={18} className="animate-spin text-cw-blue" /> Loading commit diff...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-cw-red/30 bg-cw-red/10 text-cw-red text-xs">{error}</div>
          ) : !diff ? null : (
            <>
              {/* Summary Bar */}
              <div className="p-3.5 rounded-xl border border-cw-bdr bg-cw-bg flex items-center justify-between text-xs font-mono">
                <span className="text-cw-txt2">{diff.files.length} file{diff.files.length === 1 ? '' : 's'} changed</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cw-green/10 text-cw-green font-bold">+{diff.stats?.additions ?? diff.files.reduce((n, f) => n + f.additions, 0)}</span>
                  <span className="px-2 py-0.5 rounded bg-cw-red/10 text-cw-red font-bold">-{diff.stats?.deletions ?? diff.files.reduce((n, f) => n + f.deletions, 0)}</span>
                  {diff.htmlUrl && (
                    <a href={diff.htmlUrl} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded bg-cw-bg3 text-cw-blue hover:underline flex items-center gap-1">
                      GitHub <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Files */}
              <div className="space-y-3">
                {diff.files.map((file) => {
                  const open = openFiles[file.filename] ?? false;
                  const rows = file.patch ? parsePatch(file.patch) : [];

                  return (
                    <div key={file.filename} className="border border-cw-bdr rounded-xl overflow-hidden bg-cw-bg">
                      <button
                        onClick={() => setOpenFiles((prev) => ({ ...prev, [file.filename]: !open }))}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-cw-bg3/40"
                      >
                        <div className="flex items-center gap-2 min-w-0 font-mono text-xs">
                          {open ? <ChevronDown size={13} className="text-cw-txt3" /> : <ChevronRight size={13} className="text-cw-txt3" />}
                          <span className="text-cw-txt truncate font-semibold">{file.filename}</span>
                          <span className="text-[9px] uppercase font-bold text-cw-txt3 bg-cw-bg3 rounded px-1.5 py-0.5">{file.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                          <span className="text-cw-green font-bold">+{file.additions}</span>
                          <span className="text-cw-red font-bold">-{file.deletions}</span>
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-cw-bdr">
                          {rows.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-cw-txt3 font-mono">No textual patch available for this file.</div>
                          ) : (
                            <div className="bg-[#0b0e14] font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[500px] p-2">
                              {rows.map((line, i) => (
                                <div key={i} className={`whitespace-pre px-2.5 py-0.5 rounded-sm ${line.startsWith('+') ? 'bg-[#0d2818] text-[#4ade80]' : line.startsWith('-') ? 'bg-[#2d0d14] text-[#f87171]' : line.startsWith('@@') ? 'bg-cw-bg3 text-cw-blue font-bold' : 'text-cw-txt3'}`}>
                                  {line || ' '}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function AgentReportCard({ agent }: { agent: AgentReport }) {
  const [open, setOpen] = useState(agent.findingsCount > 0 || agent.status === 'failed');
  const [toolsOpen, setToolsOpen] = useState(false);
  const summary = formatSummary(agent.summary);

  return (
    <div className={`rounded-lg border overflow-hidden ${agent.gateDecision === 'BLOCK' ? 'border-cw-red/30 bg-cw-red/5' : agent.gateDecision === 'WARN' ? 'border-cw-amber/30 bg-cw-amber/5' : 'border-cw-bdr bg-cw-bg2'}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-cw-bg3/30">
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={13} className="text-cw-txt3" /> : <ChevronRight size={13} className="text-cw-txt3" />}
          <span className="text-cw-txt3">{AGENT_ICONS[agent.agentId]}</span>
          <span className="text-[12px] font-bold text-cw-txt truncate">{agent.displayName}</span>
          {agent.gateDecision && <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${GATE_STYLES[agent.gateDecision] ?? 'bg-cw-bg3 text-cw-txt2 border-cw-bdr'}`}>{agent.gateDecision}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] text-cw-txt2">
          {agent.score != null && <span>Score: <span className="font-semibold text-cw-txt">{agent.score}/100</span></span>}
          <span>{agent.findingsCount} finding{agent.findingsCount === 1 ? '' : 's'}</span>
          {agent.durationMs != null && <span className="text-cw-txt3">{durationLabel(agent.durationMs)}</span>}
        </div>
      </button>

      {open && (
        <div className="border-t border-cw-bdr">
          {agent.error && <div className="px-3 py-2 text-[11px] text-cw-red bg-cw-red/5">{agent.error}</div>}
          {summary && <div className="px-3 py-2 text-[12px] text-cw-txt2 border-b border-cw-bdr">{summary}</div>}
          {agent.autoFixPR?.opened && (
            <a href={agent.autoFixPR.htmlUrl} target="_blank" rel="noreferrer" className="px-3 py-2 text-[11px] text-cw-green bg-cw-green/5 hover:bg-cw-green/10 border-b border-cw-bdr flex items-center gap-2 no-underline">
              <Github size={12} /> Auto-fix PR #{agent.autoFixPR.pullRequestNumber} · {agent.autoFixPR.fixedCount} fix{agent.autoFixPR.fixedCount === 1 ? '' : 'es'}
              <ExternalLink size={10} className="ml-auto" />
            </a>
          )}
          {agent.findings.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-cw-txt3">No findings from this agent.</div>
          ) : (
            <div className="divide-y divide-cw-bg3">
              {agent.findings.map((finding, i) => (
                <div key={finding.id ?? i} className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${SEV_STYLE[String(finding.severity).toUpperCase()] ?? 'bg-cw-bg3 text-cw-txt2'}`}>{finding.severity}</span>
                      {finding.category && <span className="text-[10px] text-cw-txt3 uppercase tracking-wide">{finding.category}</span>}
                      <span className="text-[12px] font-semibold text-cw-txt">{finding.title}</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded uppercase ${finding.fixStatus === 'pr_opened' ? 'bg-cw-green/10 text-cw-green border border-cw-green/20' : finding.fixStatus === 'dismissed' ? 'bg-cw-bg3 text-cw-txt3' : 'bg-cw-blue/10 text-cw-blue border border-cw-blue/20'}`}>
                      {finding.fixStatus === 'pr_opened' ? 'PR Opened' : finding.fixStatus === 'dismissed' ? 'Dismissed' : 'Suggested'}
                    </span>
                  </div>
                  <div className="text-[12px] text-cw-txt2 mt-1.5">{finding.description}</div>
                  {(finding.file || finding.toolName) && (
                    <div className="flex items-center gap-2 text-[10px] font-mono mt-2">
                      {finding.file && <span className="text-cw-blue">{finding.file}{finding.line != null ? `:${finding.line}` : ''}</span>}
                      {finding.toolName && <span className="px-1.5 py-0.5 bg-cw-purple/10 text-cw-purple rounded border border-cw-purple/20">{finding.toolName}</span>}
                    </div>
                  )}
                  {finding.suggestedFix && finding.fixStatus === 'suggested' && (
                    <div className="mt-2 flex items-start gap-2 text-[11px] bg-cw-amber/5 border border-cw-amber/20 rounded px-2.5 py-2">
                      <Wrench size={12} className="text-cw-amber shrink-0 mt-0.5" />
                      <div><span className="text-cw-amber font-bold">Fix: </span><span className="text-cw-txt">{finding.suggestedFix}</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {agent.toolsExecuted.length > 0 && (
            <div className="border-t border-cw-bdr">
              <button onClick={() => setToolsOpen((v) => !v)} className="w-full px-3 py-2 flex items-center gap-2 text-[10px] font-semibold text-cw-txt3 uppercase tracking-wide hover:text-cw-txt2">
                <ShieldCheck size={12} /> {toolsOpen ? 'Hide' : 'Show'} checks run ({agent.toolsExecuted.length})
              </button>
              {toolsOpen && (
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {agent.toolsExecuted.map((tool, i) => {
                    const name = tool.toolName ?? tool.name ?? 'tool';
                    const duration = tool.durationMs ?? tool.duration ?? 0;
                    const result = tool.resultSummary ?? tool.result ?? 'Completed';
                    return (
                      <div key={i} className="text-[10px] font-mono flex items-start gap-2 p-2 rounded border bg-cw-bg3 border-cw-bdr text-cw-txt2">
                        <span className="font-bold shrink-0 text-cw-txt">{name}</span>
                        <span className="opacity-60 shrink-0">({duration}ms)</span>
                        <span className="flex-1">{result}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommitRow({ commit, isLast, repoId }: { commit: Commit; isLast: boolean; repoId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const run = commit.run;
  const scoreColor = run?.score == null ? 'text-cw-txt3' : run.score >= 80 ? 'text-cw-green' : run.score >= 60 ? 'text-cw-amber' : 'text-cw-red';
  const canOpenReport = !!run && ['completed', 'failed', 'agent_failed'].includes(run.status);

  return (
    <div className="relative flex gap-0">
      <div className="flex flex-col items-center w-10 shrink-0 pt-4">
        <div className={`w-3 h-3 rounded-full border-2 border-cw-bg shrink-0 z-10 ${!run ? 'bg-cw-bg3 border-cw-bdr' : run.status === 'running' ? 'bg-cw-blue animate-pulse' : run.status === 'queued' ? 'bg-cw-txt3' : run.gateDecision === 'PASS' ? 'bg-cw-green' : run.gateDecision === 'WARN' ? 'bg-cw-amber' : run.gateDecision === 'BLOCK' ? 'bg-cw-red' : 'bg-cw-txt3'}`} />
        {!isLast && <div className="w-[2px] flex-1 bg-cw-bdr mt-1" />}
      </div>

      <div className="flex-1 pb-4 min-w-0" style={{ marginTop: '8px' }}>
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl overflow-hidden hover:border-cw-txt3/40 transition-colors">
          <div className="flex items-start gap-3 px-4 py-3.5 cursor-pointer" onClick={() => run && setExpanded((e) => !e)}>
            <div className="mt-0.5 text-cw-txt3 shrink-0 w-4">
              {run ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-cw-txt leading-snug">{firstLine(commit.message)}</span>
                {run?.gateDecision && <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${GATE_STYLES[run.gateDecision]}`}>{run.gateDecision}</span>}
                {run?.status === 'running' && <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-cw-blue/10 border border-cw-blue/30 text-cw-blue text-[9px] font-bold uppercase"><Loader2 size={8} className="animate-spin" /> Running</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-cw-txt3">
                <a href={commit.htmlUrl ?? '#'} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-mono text-cw-blue hover:underline flex items-center gap-1"><GitCommit size={10} />{shortSha(commit.sha)}</a>
                <span>{commit.authorName ?? 'Unknown author'}</span>
                <span>{timeAgo(commit.date)}</span>
                <span className="flex items-center gap-1"><Lock size={10} /> {commit.branch ?? 'main'}</span>
                {run?.isIncremental && run.changedFileCount != null && <span className="px-1.5 py-0.5 rounded bg-cw-bg3 border border-cw-bdr text-[9px] font-medium">Incremental · {run.changedFileCount} file{run.changedFileCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {run?.score != null && <span className={`text-[18px] font-bold tabular-nums ${scoreColor}`}>{run.score}<span className="text-[11px] font-normal text-cw-txt3">/100</span></span>}
              {commit.htmlUrl && (
                <button onClick={(e) => { e.stopPropagation(); setDiffOpen(true); }}
                  className="px-3 py-1.5 text-[11px] font-semibold border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap text-cw-txt2 border-cw-bdr bg-cw-bg hover:bg-cw-bg3 hover:text-cw-txt">
                  View diff <ChevronRight size={11} />
                </button>
              )}
              {canOpenReport && (
                <button onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
                  className="px-3 py-1.5 text-[11px] font-semibold border rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap text-cw-purple border-cw-purple/30 bg-cw-purple/10 hover:bg-cw-purple/20">
                  Full report <ChevronRight size={11} />
                </button>
              )}
            </div>
          </div>

          {expanded && run && (
            <div className="border-t border-cw-bdr">
              <div className="px-4 py-2.5 bg-cw-bg flex items-center gap-4 text-[11px] border-b border-cw-bdr flex-wrap">
                <Bot size={12} className="text-cw-purple shrink-0" />
                <span className="text-cw-txt3">Orchestrator decision</span>
                <span className="text-cw-txt2"><span className="font-semibold text-cw-txt">{run.agentsRun}</span> agents ran · <span className="text-cw-txt3">{run.agentsSkipped} skipped</span>{run.changedFileCount != null && ` · ${run.changedFileCount} files in scope`}</span>
                {run.completedAt && <span className="ml-auto text-cw-txt3">Completed {timeAgo(run.completedAt)}</span>}
              </div>
              <div className="divide-y divide-cw-bg3">
                {run.agents.map((agent) => <AgentRow key={agent.id} agent={agent} />)}
              </div>
              {run.changedFiles && run.changedFiles.length > 0 && (
                <div className="px-4 py-2.5 bg-cw-bg border-t border-cw-bdr flex flex-wrap gap-1.5">
                  {run.changedFiles.slice(0, 12).map((file) => <span key={file} className="text-[10px] font-mono bg-cw-bg3 border border-cw-bdr px-2 py-0.5 rounded text-cw-blue">{file}</span>)}
                  {run.changedFiles.length > 12 && <span className="text-[10px] text-cw-txt3">+{run.changedFiles.length - 12} more</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side-Pull Drawers for View Diff and Full Report */}
      {reportOpen && run && <ReportDrawer repoId={repoId} runId={run.id} onClose={() => setReportOpen(false)} />}
      {diffOpen && <DiffDrawer repoId={repoId} sha={commit.sha} onClose={() => setDiffOpen(false)} />}
    </div>
  );
}

export function CommitHistory({ repoId: initialRepoId, repoFullName: initialRepoFullName = 'Repository', onBack }: Props) {
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<number | null>(initialRepoId ?? null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [resolvedRepoName, setResolvedRepoName] = useState(initialRepoFullName);
  const [branches, setBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'PASS' | 'WARN' | 'BLOCK' | 'RUNNING' | 'SKIPPED' | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/chat/repos`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { repos: [] })
      .then((d) => {
        const list = d.repos ?? [];
        setRepoList(list);
        if (!initialRepoId && list.length > 0) {
          setActiveRepoId(list[0].id);
          setResolvedRepoName(list[0].fullName);
        }
      })
      .catch(() => {});
  }, [initialRepoId]);

  const loadCommits = (targetRepoId = activeRepoId, branch = selectedBranch) => {
    if (!targetRepoId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (branch) params.set('branch', branch);
    const query = params.toString();
    fetch(`${API_URL}/api/reports/${targetRepoId}/commits${query ? `?${query}` : ''}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        setCommits(data.commits || []);
        setResolvedRepoName(data.repoFullName || initialRepoFullName);
        setBranches(Array.isArray(data.branches) ? data.branches : []);
        setDefaultBranch(data.defaultBranch || null);
        setSelectedBranch(data.selectedBranch || branch || data.defaultBranch || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeRepoId) loadCommits(activeRepoId);
  }, [activeRepoId]);

  const filteredCommits = commits.filter((commit) => {
    if (!activeFilter) return true;
    const run = commit.run;
    if (activeFilter === 'PASS') return run?.gateDecision === 'PASS';
    if (activeFilter === 'WARN') return run?.gateDecision === 'WARN';
    if (activeFilter === 'BLOCK') return run?.gateDecision === 'BLOCK';
    if (activeFilter === 'RUNNING') return run?.status === 'running';
    if (activeFilter === 'SKIPPED') return !run;
    return true;
  });

  const toggleFilter = (filter: typeof activeFilter) => {
    setActiveFilter(prev => prev === filter ? null : filter);
  };

  return (
    <div className="flex h-full overflow-hidden bg-cw-bg">
      <div className="flex flex-col min-w-0 flex-1 transition-all duration-300">
        {/* Unbundled Single-Level Control Bar */}
        <div className="px-6 py-3 border-b border-cw-bdr bg-cw-bg shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {onBack && (
              <button onClick={onBack} className="w-7 h-7 rounded-full border border-cw-bdr bg-cw-bg2 flex items-center justify-center text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 transition-colors shrink-0">
                <ArrowLeft size={14} />
              </button>
            )}

            {/* Repo selector dropdown with GitHub logo and search */}
            <RepoSelector
              options={repoList}
              value={activeRepoId ?? ''}
              onChange={(val, name) => {
                const id = Number(val);
                setActiveRepoId(id);
                setResolvedRepoName(name);
              }}
              placeholder="Select repository"
            />

            {/* Branch selector dropdown */}
            <div className="flex items-center gap-2 text-[11px] text-cw-txt bg-cw-bg2 border border-cw-bdr px-2.5 py-1 rounded-lg">
              <GitBranch size={12} className="text-cw-blue shrink-0" />
              <select
                value={selectedBranch || defaultBranch || 'main'}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  loadCommits(activeRepoId, e.target.value);
                }}
                disabled={!activeRepoId || loading}
                className="bg-transparent text-cw-txt font-mono text-[11px] outline-none max-w-[160px]"
                title="Filter commits by branch"
              >
                {(branches.length > 0 ? branches : [selectedBranch || 'main', 'dev', 'staging'].filter((v, i, a) => a.indexOf(v) === i)).map((branch) => (
                  <option key={branch} value={branch}>{branch}{branch === defaultBranch ? ' (default)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-cw-bdr/60 mx-1 hidden sm:block" />

            {/* Collapsible Gate Filter Popover */}
            <div ref={filterRef} className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setFilterOpen((f) => !f)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono transition-all ${
                  activeFilter
                    ? 'bg-cw-purple/15 border-cw-purple text-cw-purple font-bold'
                    : 'bg-cw-bg2 border-cw-bdr text-cw-txt hover:border-cw-purple/50'
                }`}
              >
                <Filter size={12} className={activeFilter ? 'text-cw-purple' : 'text-cw-txt3'} />
                <span>{activeFilter ? `Filter: ${activeFilter}` : 'Filter Gates'}</span>
                <ChevronDown size={12} className={`transition-transform ${filterOpen ? 'rotate-180 text-cw-purple' : 'text-cw-txt3'}`} />
              </button>

              {filterOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-cw-bg2 border border-cw-bdr rounded-xl shadow-2xl z-50 overflow-hidden p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-cw-txt3 uppercase tracking-wider border-b border-cw-bdr/60 mb-0.5">
                    Filter Runs by Gate
                  </div>
                  {[
                    { id: 'PASS' as const, label: 'PASS gate', color: 'bg-cw-green', desc: 'All checks passed' },
                    { id: 'WARN' as const, label: 'WARN gate', color: 'bg-cw-amber', desc: 'Warnings / debt flags' },
                    { id: 'BLOCK' as const, label: 'BLOCK gate', color: 'bg-cw-red', desc: 'Blocked by criticals' },
                    { id: 'RUNNING' as const, label: 'Running now', color: 'bg-cw-blue animate-pulse', desc: 'Active in sandbox' },
                    { id: 'SKIPPED' as const, label: 'Skipped', color: 'bg-cw-txt3', desc: 'Orchestrator bypassed' },
                  ].map((item) => {
                    const isSelected = activeFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          toggleFilter(item.id);
                          setFilterOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono text-left w-full transition-colors ${
                          isSelected ? 'bg-cw-purple/15 text-cw-purple font-bold' : 'text-cw-txt hover:bg-cw-bg3'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          <div>
                            <div>{item.label}</div>
                            <div className="text-[9px] text-cw-txt3 font-sans font-normal">{item.desc}</div>
                          </div>
                        </div>
                        {isSelected && <Check size={13} className="text-cw-purple shrink-0" />}
                      </button>
                    );
                  })}
                  {activeFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFilter(null);
                        setFilterOpen(false);
                      }}
                      className="mt-1 pt-1.5 pb-1 px-3 border-t border-cw-bdr text-[10px] text-cw-red hover:underline text-center w-full"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-cw-green bg-cw-green/5 border border-cw-green/20 px-2.5 py-1 rounded-lg">
              <Info size={11} /> Live data
            </div>
            <button onClick={() => loadCommits(activeRepoId)} disabled={!activeRepoId || loading} className="w-7 h-7 rounded-md border border-cw-bdr bg-cw-bg2 flex items-center justify-center text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin text-cw-blue' : ''} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="max-w-4xl mx-auto">
            {!activeRepoId ? (
              <div className="py-20 text-center text-cw-txt3">
                <GitCommit size={32} className="mx-auto mb-3 opacity-40" />
                <div className="text-[14px] text-cw-txt2">Open commit history from a connected repository.</div>
                <div className="text-[12px] text-cw-txt3 mt-1">Per-repo history needs a repository id so Codeward can fetch GitHub commits and overlay agent runs.</div>
              </div>
            ) : loading ? (
              <div className="py-20 flex items-center justify-center text-[12px] text-cw-txt3 gap-2"><Loader2 size={18} className="animate-spin text-cw-blue" /> Loading real commits...</div>
            ) : error ? (
              <div className="py-20 text-center text-cw-red flex items-center justify-center gap-2"><AlertCircle size={16} /> {error}</div>
            ) : filteredCommits.length === 0 ? (
              <div className="py-20 text-center text-cw-txt3">
                <GitCommit size={32} className="mx-auto mb-3 opacity-40" />
                <div className="text-[14px] text-cw-txt2">{activeFilter ? 'No commits match the selected filter.' : 'No commits found.'}</div>
                <div className="text-[12px] text-cw-txt3 mt-1">Once GitHub returns commits or Codeward records runs, they will appear here.</div>
              </div>
            ) : filteredCommits.map((commit, i) => (
              <CommitRow key={`${commit.sha}-${commit.run?.id ?? 'no-run'}`} commit={commit} isLast={i === filteredCommits.length - 1} repoId={activeRepoId!} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
