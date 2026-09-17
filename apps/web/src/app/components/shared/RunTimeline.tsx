import type { ReactNode } from 'react';
import {
  Cpu, Shield, Trash2, Bug, Network, Brain, ShieldCheck, ListChecks, Database, MessageSquare, Bot,
  Check, X, Loader2, Minus, ChevronDown, ShieldQuestion, type LucideIcon,
} from 'lucide-react';
import type { AgentData } from './AgentCanvasData';
import { EYEBROW, TONE_DOT, TONE_PILL, FOCUS_RING, type Tone, type RunPolicySummary } from './findings/finding-ui';

/**
 * Compact, muted warning for surfaced findings whose cited tool never ran. Not a suppression — the
 * findings are still shown — but the developer should know the evidence behind them was capped
 * and none of them can be what blocked the merge.
 */
export function UnverifiedEvidenceBadge({ count, className = '' }: { count: number | null | undefined; className?: string }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded border text-[11px] font-medium ${TONE_PILL.amber} ${className}`}
      title={`${count} finding${count === 1 ? '' : 's'} cite a tool the agent never actually ran. Their evidence was capped, so they cannot block the merge — verify them before acting.`}
    >
      <ShieldQuestion size={11} strokeWidth={1.5} />
      {count} unverified
    </span>
  );
}

/** Backend/legacy icon names → Lucide (16px, 1.5 stroke, monochrome — tinted only by state). */
const AGENT_ICON: Record<string, LucideIcon> = {
  CpuIcon: Cpu, Shield01Icon: Shield, Shield02Icon: ShieldCheck, Delete01Icon: Trash2, Bug02Icon: Bug,
  Structure01Icon: Network, BrainIcon: Brain, TickDouble01Icon: ListChecks, Database01Icon: Database, Message01Icon: MessageSquare,
};
export function agentIcon(name: string): LucideIcon {
  return AGENT_ICON[name] ?? Bot;
}

export function statusTone(status: AgentData['status']): Tone {
  if (status === 'blocked') return 'red';
  if (status === 'passed') return 'green';
  if (status === 'running') return 'purple';
  return 'neutral';
}

/** Metric pills that are really model identifiers belong in the run footer, not on every row. */
const MODEL_LIKE = /\/|gpt|claude|glm|llama|gemini|mistral|sonnet|haiku|opus|-mini\b|-free\b/i;
export function isModelLabel(text: string): boolean {
  return MODEL_LIKE.test(text);
}

function StatusGlyph({ status }: { status: AgentData['status'] }) {
  const tone = statusTone(status);
  const base = `w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${TONE_PILL[tone]}`;
  if (status === 'running') return <span className={base}><Loader2 size={11} className="animate-spin" /></span>;
  if (status === 'passed') return <span className={base}><Check size={11} /></span>;
  if (status === 'blocked') return <span className={base}><X size={11} /></span>;
  return <span className={base}><Minus size={11} /></span>;
}

function AgentRow({ agent, active, onSelect, connector = true }: { agent: AgentData; active: boolean; onSelect: () => void; connector?: boolean }) {
  const Icon = agentIcon(agent.icon);
  const tone = statusTone(agent.status);
  const pills = agent.metrics.filter((m) => !isModelLabel(m.t));
  return (
    <div className="relative pl-9">
      {connector && <span aria-hidden="true" className="absolute left-[9px] top-0 bottom-0 w-px bg-cw-bdr" />}
      <span className="absolute left-0 top-3"><StatusGlyph status={agent.status} /></span>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`w-full text-left min-h-11 px-3 py-2 rounded-md border transition-colors cursor-pointer grid items-center gap-x-3 grid-cols-[auto_minmax(0,1fr)_auto] ${FOCUS_RING} ${
          active ? 'border-cw-txt3 bg-cw-bg3' : 'border-transparent hover:border-cw-bdr hover:bg-cw-bg3/60'
        }`}
      >
        <Icon size={16} className="text-cw-txt3 shrink-0" />
        <div className="min-w-0 flex flex-col gap-1">
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-[14px] font-medium text-cw-txt truncate">{agent.name}</span>
            <span className="text-[12px] text-cw-txt3 truncate hidden sm:inline">{agent.label}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-1 w-24 bg-cw-bg3 rounded-full overflow-hidden shrink-0">
              <div className={`h-full ${TONE_DOT[tone]}`} style={{ width: `${Math.max(0, Math.min(100, agent.progress))}%` }} />
            </div>
            <span className={`text-[12px] truncate ${agent.status === 'idle' ? 'text-cw-txt3' : `text-cw-txt2`}`}>{agent.statusText}</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 shrink-0 tabular-nums">
          {agent.score != null && (
            <span className={`inline-flex items-center h-5 px-1.5 rounded border font-mono text-[12px] font-semibold ${TONE_PILL[tone]}`}>{agent.score}</span>
          )}
          {pills.slice(0, 2).map((m, i) => (
            <span key={i} className={`inline-flex items-center h-5 px-1.5 rounded border text-[11px] font-medium ${TONE_PILL.neutral}`}>{m.t}</span>
          ))}
        </div>
      </button>
    </div>
  );
}

function Stage({ label, tone, glyph, children, last = false }: { label: string; tone: Tone; glyph: ReactNode; children?: ReactNode; last?: boolean }) {
  return (
    <div className="relative pl-9 pb-5">
      {!last && <span aria-hidden="true" className="absolute left-[9px] top-5 bottom-0 w-px bg-cw-bdr" />}
      <span className={`absolute left-0 top-0 w-5 h-5 rounded-full border flex items-center justify-center ${TONE_PILL[tone]}`}>{glyph}</span>
      <div className={`${EYEBROW} h-5 flex items-center`}>{label}</div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export interface RunTimelineProps {
  agents: AgentData[];
  runInfo: { id: number | string; commitSha?: string; status?: string; score?: number | null; runPolicy?: RunPolicySummary | null };
  stats: { agentsActive: string; criticalIssues: number; linesFixed: number; decision: string };
  activeAgentId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The story of a run, in order: ingestion → dispatch → agents in parallel → decision.
 * Idle agents collapse into one quiet line; only dispatched agents get a lane.
 */
export function RunTimeline({ agents, runInfo, stats, activeAgentId, onSelect }: RunTimelineProps) {
  const orchestrator = agents.find((a) => a.id === 'orchestrator') ?? null;
  const workers = agents.filter((a) => a.id !== 'orchestrator');
  const dispatched = workers.filter((a) => a.status !== 'idle');
  const idle = workers.filter((a) => a.status === 'idle');
  const running = agents.some((a) => a.status === 'running');

  const decision = stats.decision;
  const decisionTone: Tone = decision === 'BLOCKED' ? 'red' : decision === 'RUNNING' ? 'purple' : 'green';
  const orchTone: Tone = orchestrator ? statusTone(orchestrator.status) : 'neutral';
  const models = Array.from(new Set(dispatched.map((a) => a.model).filter(Boolean)));

  return (
    <div className="flex flex-col gap-1 p-4 sm:p-5">
      <Stage
        label="Ingestion"
        tone={orchTone}
        glyph={orchestrator?.status === 'running' ? <Loader2 size={11} className="animate-spin" /> : orchestrator && orchestrator.status !== 'idle' ? <Check size={11} /> : <Minus size={11} />}
      >
        {orchestrator ? (
          <AgentRow agent={orchestrator} active={activeAgentId === orchestrator.id} onSelect={() => onSelect(orchestrator.id)} connector={false} />
        ) : (
          <div className="text-[13px] text-cw-txt3">Waiting for a pipeline event.</div>
        )}
      </Stage>

      <Stage label={`Agents · ${dispatched.length} dispatched`} tone={dispatched.length > 0 ? (running ? 'purple' : 'green') : 'neutral'} glyph={running ? <Loader2 size={11} className="animate-spin" /> : dispatched.length > 0 ? <Check size={11} /> : <Minus size={11} />}>
        <div className="flex flex-col gap-1">
          {dispatched.map((a) => (
            <AgentRow key={a.id} agent={a} active={activeAgentId === a.id} onSelect={() => onSelect(a.id)} connector={false} />
          ))}
          {dispatched.length === 0 && <div className="text-[13px] text-cw-txt3 pl-1">No agents dispatched for this run yet.</div>}
          {idle.length > 0 && (
            <details className="group mt-1">
              <summary className={`list-none cursor-pointer inline-flex items-center gap-2 h-8 px-2 rounded-md text-[13px] text-cw-txt3 hover:text-cw-txt hover:bg-cw-bg3/60 [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}>
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                {idle.length} agent{idle.length === 1 ? '' : 's'} not dispatched for this run
              </summary>
              <div className="flex flex-col gap-1 mt-1">
                {idle.map((a) => (
                  <AgentRow key={a.id} agent={a} active={activeAgentId === a.id} onSelect={() => onSelect(a.id)} connector={false} />
                ))}
              </div>
            </details>
          )}
        </div>
      </Stage>

      <Stage label="Decision" tone={decisionTone} glyph={decision === 'RUNNING' ? <Loader2 size={11} className="animate-spin" /> : decision === 'BLOCKED' ? <X size={11} /> : <Check size={11} />} last>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center h-7 px-2.5 rounded-md border font-mono text-[13px] font-semibold ${TONE_PILL[decisionTone]}`}>
            {decision === 'BLOCKED' ? 'BLOCK' : decision}
          </span>
          <UnverifiedEvidenceBadge count={runInfo.runPolicy?.unverifiedEvidenceCount} />
          {orchestrator?.statusText && orchestrator.status !== 'idle' && (
            <span className="text-[13px] text-cw-txt2">{orchestrator.statusText}</span>
          )}
        </div>
      </Stage>

      {/* Run metadata — informative, not decorative */}
      <div className="mt-2 pt-3 border-t border-cw-bdr flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-cw-txt3 font-mono tabular-nums">
        <span>run #{runInfo.id}</span>
        {runInfo.commitSha && <span>{runInfo.commitSha}</span>}
        {runInfo.score != null && <span>score {runInfo.score}/100</span>}
        <span>{stats.criticalIssues} critical</span>
        <span>{stats.linesFixed} lines auto-fixed</span>
        {models.length > 0 && <span className="truncate max-w-full">models: {models.join(', ')}</span>}
      </div>
    </div>
  );
}
