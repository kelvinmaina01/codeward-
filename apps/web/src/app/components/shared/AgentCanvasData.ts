export interface AgentLog {
  t: string;
  type: 'info' | 'tool' | 'pass' | 'fail' | 'warn';
  msg: string;
}

export interface AgentFinding {
  sev: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  desc: string;
}

export interface SandboxOp {
  icon: string;
  active: boolean;
  done: boolean;
  name: string;
  status: string;
}

export interface AgentSummary {
  criticals: number;
  highs: number;
  mediums: number;
  fixed: number;
  linesRemoved: number;
  duration: string;
}

export interface AgentData {
  id: string;
  name: string;
  icon: string;
  model: string;
  status: 'passed' | 'blocked' | 'running' | 'idle';
  score: number | null;
  label: string;
  statusText: string;
  progress: number;
  color: string;
  metrics: { t: string; c: string }[];
  logs: AgentLog[];
  config: Record<string, string>;
  findings: AgentFinding[];
  sandbox: SandboxOp[];
  summary: AgentSummary;
}

export const agentCanvasData: AgentData[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: 'CpuIcon',
    model: 'gpt-4o',
    status: 'passed',
    score: null,
    label: 'CEO Agent',
    statusText: 'Pipeline Standby',
    progress: 100,
    color: '#8B5CF6',
    metrics: [{ t: 'Orchestrator', c: 'purple' }, { t: 'gpt-4o', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Orchestrator ready on standby. Waiting for pipeline events.' },
    ],
    config: { model: 'gpt-4o', trigger: 'webhook/push', mode: 'parallel-dispatch' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'security',
    name: 'Security Agent',
    icon: 'Shield01Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Security scan',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#dc2626',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Security Agent standby. Ready to inspect dependencies and secrets.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'trufflehog,trivy,owasp-zap,auth-probe' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'bloat',
    name: 'Bloat Agent',
    icon: 'Delete01Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Bloat & Duplicates',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#d97706',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Bloat Agent standby. Ready to scan dead code and AST clone families.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'fallow-cli,tree-sitter,bundle-analyser' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'broken_code',
    name: 'Broken Code Agent',
    icon: 'Bug02Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Syntax & Runtime',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#16a34a',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Broken Code Agent standby. Ready to run test suites and AST scans.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'jest,heap-profiler,async-ast-scan' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'architecture',
    name: 'Architecture Agent',
    icon: 'Structure01Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Architecture & N+1',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#2563eb',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Architecture Agent standby. Ready to check boundaries and query patterns.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'k6,pg-explain,import-tracer' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'ai_era',
    name: 'AI-Era Agent',
    icon: 'BrainIcon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'AI-Era Code',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#7c3aed',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'AI-Era Agent standby. Ready to audit prompt security and embeddings.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'ai-pattern-detector,llm-injection-audit' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'guardian',
    name: 'Guardian Agent',
    icon: 'Shield02Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Merge Gatekeeper',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#059669',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Guardian Agent standby. Monitoring pipeline runs and PR statuses.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'github-checks,pr-reviewer,auto-merge' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    icon: 'TickDouble01Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Policy & License',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#4f46e5',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Compliance Agent standby. Ready for license and security audits.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'license-checker,soc2-audit,gdpr-probe' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'data_dx',
    name: 'Data & DX Agent',
    icon: 'Database01Icon',
    model: 'gpt-4o-mini',
    status: 'idle',
    score: null,
    label: 'Data contracts & CI',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#06b6d4',
    metrics: [{ t: 'Standby', c: '' }, { t: 'gpt-4o-mini', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Data & DX Agent standby. Ready to verify schema contracts and CI stability.' },
    ],
    config: { model: 'gpt-4o-mini', tools: 'data-pipeline-analyzer,schema-contract-checker' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  },
  {
    id: 'chat',
    name: 'Chat Agent',
    icon: 'Message01Icon',
    model: 'gpt-4o',
    status: 'idle',
    score: null,
    label: 'Always-on sidebar',
    statusText: 'Ready · Standby',
    progress: 0,
    color: '#ec4899',
    metrics: [{ t: 'Always on', c: 'purple' }, { t: 'gpt-4o', c: 'purple' }],
    logs: [
      { t: '--', type: 'info', msg: 'Chat Agent ready on standby. Ask anything about your repositories.' },
    ],
    config: { model: 'gpt-4o', trigger: 'always-on', tools: 'query_history,spawn_agent' },
    findings: [],
    sandbox: [],
    summary: { criticals: 0, highs: 0, mediums: 0, fixed: 0, linesRemoved: 0, duration: '0s' },
  }
];
