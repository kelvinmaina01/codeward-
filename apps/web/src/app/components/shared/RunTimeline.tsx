import { useState, useEffect, type ReactNode, type ComponentType } from 'react';
import {
  Tick01Icon,
  Cancel01Icon,
  MinusSignIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
} from 'hugeicons-react';
import {
  Loader2, ShieldQuestion,
  Cpu, ShieldCheck, Shield, Trash2, FileCode2, Zap, Brain, ListChecks, Database, MessageSquare, Bot,
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

export type TimelineIcon = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;

/**
 * Backend icon names → Lucide, rendered at strokeWidth 1.5.
 * Lucide's 24px-grid geometry stays crisp when scaled down and its stroke weight is tunable,
 * which is what the smaller agent glyphs were missing — they read as soft at 14px.
 * Keys are the identifiers the API actually sends (see AgentCanvasData).
 */
const AGENT_ICON: Record<string, TimelineIcon> = {
  CpuIcon: Cpu,                    // orchestrator
  Shield01Icon: ShieldCheck,       // security
  Shield02Icon: Shield,            // guardian
  Delete01Icon: Trash2,            // bloat
  Bug02Icon: FileCode2,            // broken code
  Structure01Icon: Zap,            // architecture
  BrainIcon: Brain,                // ai-era
  TickDouble01Icon: ListChecks,    // compliance
  Database01Icon: Database,        // data & dx
  Message01Icon: MessageSquare,    // chat
};

export function agentIcon(name: string): TimelineIcon {
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
  const base = `w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${TONE_PILL[tone]}`;
  if (status === 'running') return <span className={base}><Loader2 size={10} className="animate-spin" /></span>;
  if (status === 'passed') return <span className={base}><Tick01Icon size={10} /></span>;
  if (status === 'blocked') return <span className={base}><Cancel01Icon size={10} /></span>;
  return <span className={base}><MinusSignIcon size={10} /></span>;
}

function AgentRow({ agent, active, onSelect, connector = true }: { agent: AgentData; active: boolean; onSelect: () => void; connector?: boolean }) {
  const Icon = agentIcon(agent.icon);
  const tone = statusTone(agent.status);
  const pills = agent.metrics.filter((m) => !isModelLabel(m.t));
  const isIdle = agent.status === 'idle';

  return (
    <div className="relative pl-7">
      {connector && <span aria-hidden="true" className="absolute left-[7px] top-0 bottom-0 w-px bg-cw-bdr" />}
      <span className="absolute left-0 top-2"><StatusGlyph status={agent.status} /></span>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`w-full text-left min-h-9 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer grid items-center gap-x-2.5 grid-cols-[auto_minmax(0,1fr)_auto] ${FOCUS_RING} ${
          active
            ? 'border-cw-txt3 bg-cw-bg3'
            : 'border-cw-bdr/40 bg-cw-bg2/30 hover:border-cw-bdr hover:bg-cw-bg3/70'
        }`}
      >
        <Icon size={18} strokeWidth={1.5} className={`self-center shrink-0 ${isIdle ? 'text-cw-txt3' : 'text-cw-txt2'}`} />
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-cw-txt truncate">{agent.name}</span>
            <span className="text-[11px] text-cw-txt3 truncate hidden sm:inline">{agent.label}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {!isIdle && (
              <div className="h-1 w-16 bg-cw-bg3 rounded-full overflow-hidden shrink-0">
                <div className={`h-full ${TONE_DOT[tone]}`} style={{ width: `${Math.max(0, Math.min(100, agent.progress))}%` }} />
              </div>
            )}
            <span className={`text-[11px] truncate ${isIdle ? 'text-cw-txt3' : 'text-cw-txt2 font-medium'}`}>{agent.statusText}</span>
          </div>
        </div>
        {/*
          The decision pill lives here, in the centred right-hand cluster — not nested in the
          stacked column above. Inside that column its flex parent only spans the first line, so
          it top-aligned against a two-line row and no self-center could reach the row's midline.
          Sitting beside the score under `items-center`, it is now centred with the rest of the row.
        */}
        <div className="flex items-center gap-1.5 shrink-0 text-cw-txt3">
          {isIdle ? (
            <span className="text-[9.5px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-cw-bg3 text-cw-txt3 border border-cw-bdr/50 shrink-0">
              Standby
            </span>
          ) : (
            <span className={`text-[9.5px] uppercase font-mono tracking-wider font-semibold px-1.5 py-0.5 rounded border shrink-0 ${TONE_PILL[tone]}`}>
              {agent.status}
            </span>
          )}
          {agent.score != null && (
            <span className={`hidden md:inline-flex items-center h-4.5 px-1 rounded border font-mono text-[11px] font-semibold ${TONE_PILL[tone]}`}>{agent.score}</span>
          )}
          {pills.slice(0, 1).map((m, i) => (
            <span key={i} className={`hidden lg:inline-flex items-center h-4.5 px-1 rounded border text-[10px] font-medium ${TONE_PILL.neutral}`}>{m.t}</span>
          ))}
          <ArrowRight01Icon size={13} className="text-cw-txt3 shrink-0" />
        </div>
      </button>
    </div>
  );
}

function Stage({ label, tone, glyph, children, last = false }: { label: string; tone: Tone; glyph: ReactNode; children?: ReactNode; last?: boolean }) {
  return (
    <div className="relative pl-7 pb-3">
      {!last && <span aria-hidden="true" className="absolute left-[7px] top-4.5 bottom-0 w-px bg-cw-bdr" />}
      <span className={`absolute left-0 top-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center ${TONE_PILL[tone]}`}>{glyph}</span>
      <div className={`${EYEBROW} h-4.5 flex items-center text-[10px]`}>{label}</div>
      {children && <div className="mt-1">{children}</div>}
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
 * Dispatched agents are visible; standby agents are neatly collapsed with a seeable toggle.
 */
export function RunTimeline({ agents, runInfo, stats, activeAgentId, onSelect }: RunTimelineProps) {
  const orchestrator = agents.find((a) => a.id === 'orchestrator') ?? null;
  const workers = agents.filter((a) => a.id !== 'orchestrator');
  const dispatched = workers.filter((a) => a.status !== 'idle');
  const idle = workers.filter((a) => a.status === 'idle');
  const running = agents.some((a) => a.status === 'running');

  // Collapsed by default — user can easily expand and collapse
  const [showIdleAgents, setShowIdleAgents] = useState(false);

  const decision = stats.decision;
  const decisionTone: Tone = decision === 'BLOCKED' ? 'red' : decision === 'RUNNING' ? 'purple' : 'green';
  const orchTone: Tone = orchestrator ? statusTone(orchestrator.status) : 'neutral';
  const models = Array.from(new Set(dispatched.map((a) => a.model).filter(Boolean)));

  return (
    <div className="flex flex-col gap-0.5 p-2.5 sm:p-3.5">
      <Stage
        label="Ingestion"
        tone={orchTone}
        glyph={orchestrator?.status === 'running' ? <Loader2 size={10} className="animate-spin" /> : orchestrator && orchestrator.status !== 'idle' ? <Tick01Icon size={10} /> : <MinusSignIcon size={10} />}
      >
        {orchestrator ? (
          <AgentRow agent={orchestrator} active={activeAgentId === orchestrator.id} onSelect={() => onSelect(orchestrator.id)} connector={false} />
        ) : (
          <div className="text-[12px] text-cw-txt3">Waiting for a pipeline event.</div>
        )}
      </Stage>

      <Stage 
        label={`Agents · ${dispatched.length} dispatched`} 
        tone={dispatched.length > 0 ? (running ? 'purple' : 'green') : 'neutral'} 
        glyph={running ? <Loader2 size={10} className="animate-spin" /> : dispatched.length > 0 ? <Tick01Icon size={10} /> : <MinusSignIcon size={10} />}
      >
        <div className="flex flex-col gap-1">
          {/* Active Dispatched Agents */}
          {dispatched.map((a) => (
            <AgentRow key={a.id} agent={a} active={activeAgentId === a.id} onSelect={() => onSelect(a.id)} connector={false} />
          ))}

          {dispatched.length === 0 && (
            <div className="text-[12px] text-cw-txt3 pl-1">No agents dispatched for this run yet.</div>
          )}

          {/* Clean, clearly seeable collapsible trigger for standby agents */}
          {idle.length > 0 && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setShowIdleAgents((prev) => !prev)}
                className={`inline-flex items-center gap-2 h-7.5 px-2.5 rounded-md border border-cw-bdr bg-cw-bg2 hover:bg-cw-bg3 hover:border-cw-txt3 text-cw-txt text-[12px] font-medium transition-colors cursor-pointer ${FOCUS_RING}`}
              >
                <ArrowDown01Icon
                  size={13}
                  className={`text-cw-txt2 transition-transform duration-200 ${showIdleAgents ? 'rotate-180' : ''}`}
                />
                <span>
                  {idle.length} agent{idle.length === 1 ? '' : 's'} not dispatched for this run
                </span>
                <span className={`text-[11px] ml-0.5 ${showIdleAgents ? 'text-cw-txt3 font-normal' : 'text-cw-green font-semibold'}`}>
                  ({showIdleAgents ? 'click to collapse' : 'click to expand'})
                </span>
              </button>

              {showIdleAgents && (
                <div className="flex flex-col gap-1 mt-1.5 animate-fadeIn">
                  {idle.map((a) => (
                    <AgentRow key={a.id} agent={a} active={activeAgentId === a.id} onSelect={() => onSelect(a.id)} connector={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Stage>

      <Stage label="Decision" tone={decisionTone} glyph={decision === 'RUNNING' ? <Loader2 size={10} className="animate-spin" /> : decision === 'BLOCKED' ? <Cancel01Icon size={10} /> : <Tick01Icon size={10} />} last>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center h-6 px-2 rounded-md border font-mono text-[12px] font-semibold ${TONE_PILL[decisionTone]}`}>
            {decision === 'BLOCKED' ? 'BLOCK' : decision}
          </span>
          <UnverifiedEvidenceBadge count={runInfo.runPolicy?.unverifiedEvidenceCount} />
          {orchestrator?.statusText && orchestrator.status !== 'idle' && (
            <span className="text-[12px] text-cw-txt2">{orchestrator.statusText}</span>
          )}
        </div>
      </Stage>

      {/* Run metadata — informative, not decorative */}
      <div className="mt-1 pt-2 border-t border-cw-bdr flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-cw-txt3 font-mono tabular-nums">
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
