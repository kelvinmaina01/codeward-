import { Trash2, Scissors, ArrowRight, Zap, Code, FileDigit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const bundleData = [
  { repo: 'payments-service', current: 4.2, after: 3.1 },
  { repo: 'frontend-monorepo', current: 12.5, after: 9.8 },
  { repo: 'checkout-api', current: 2.1, after: 1.5 },
  { repo: 'user-service', current: 3.8, after: 3.2 },
];

const mockItems = [
  { id: 1, type: 'Duplicate Function', repo: 'frontend-monorepo', desc: 'formatCurrency() defined in 4 files', lines: 142, diff: 'Easy', fix: 'Yes', status: 'Open' },
  { id: 2, type: 'Unused Import', repo: 'payments-service', desc: 'lodash imported for single _.get()', lines: 7200, diff: 'Easy', fix: 'Yes', status: 'In Review' },
  { id: 3, type: 'Dead Code', repo: 'checkout-api', desc: 'Legacy v1 payment routing (unreachable)', lines: 840, diff: 'Hard', fix: 'No', status: 'Open' },
  { id: 4, type: 'Vibe Rewrite', repo: 'auth-gateway', desc: 'Custom base64 encoder vs stdlib', lines: 120, diff: 'Medium', fix: 'Yes', status: 'Fixed' },
];

export function AdminBloat() {
  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <Kpi title="Duplicate Functions" value="142" />
        <Kpi title="Dead Code Removed" value="18,400" suffix=" lines" />
        <Kpi title="Avg Size Reduced" value="8.3%" />
        <Kpi title="Bundle Savings" value="2.1" suffix=" MB" color="text-cw-purple" />
        <Kpi title="Vibe Rewrites Caught" value="4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bloat Items Table */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col h-[350px]">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><Trash2 size={16} className="text-cw-purple"/> Top Bloat Items to Fix</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {mockItems.map(item => (
              <div key={item.id} className="p-3 border border-cw-bdr rounded-lg mb-2 bg-cw-bg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase bg-cw-purple/10 text-cw-purple px-1.5 py-0.5 rounded border border-cw-purple/20">{item.type}</span>
                    <span className="text-[12px] font-semibold text-cw-txt">{item.repo}</span>
                  </div>
                  <div className="text-[13px] text-cw-txt">{item.desc}</div>
                  <div className="text-[11px] text-cw-txt3 mt-1.5">{item.lines} lines affected · {item.diff} complexity</div>
                </div>
                {item.fix === 'Yes' && (
                  <button className="px-3 py-1.5 bg-cw-purple text-white text-[11px] font-bold rounded flex items-center gap-1.5 hover:bg-cw-purple/90 transition-colors">
                    <Zap size={12}/> Auto-Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Duplicate Function Finder */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm flex flex-col h-[350px]">
          <div className="p-4 border-b border-cw-bdr flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-cw-txt flex items-center gap-2"><Scissors size={16}/> Duplicate Function Detected</h3>
            <span className="text-[11px] bg-cw-amber/10 text-cw-amber px-2 py-0.5 rounded font-bold border border-cw-amber/20">98% match</span>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="border border-cw-red/30 rounded bg-cw-bg overflow-hidden flex flex-col">
                <div className="text-[10px] bg-cw-red/10 text-cw-red p-1.5 font-mono border-b border-cw-red/20 truncate">utils/format.ts</div>
                <pre className="p-2 text-[10px] text-cw-txt2 font-mono flex-1 overflow-auto opacity-70">
                  {`export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}`}
                </pre>
              </div>
              <div className="border border-cw-red/30 rounded bg-cw-bg overflow-hidden flex flex-col">
                <div className="text-[10px] bg-cw-red/10 text-cw-red p-1.5 font-mono border-b border-cw-red/20 truncate">helpers/display.ts</div>
                <pre className="p-2 text-[10px] text-cw-txt2 font-mono flex-1 overflow-auto opacity-70">
                  {`export const formatCurr = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(val);
}`}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 border border-cw-purple text-cw-purple rounded-md text-[12px] font-bold hover:bg-cw-purple hover:text-white transition-colors flex items-center gap-2">
                View suggested merge <ArrowRight size={14}/>
              </button>
            </div>
          </div>
        </div>

        {/* Bundle Savings Chart */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[280px]">
          <h3 className="text-[14px] font-bold text-cw-txt mb-4 flex items-center gap-2"><FileDigit size={16}/> Projected Bundle Size Savings (MB)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bundleData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cw-bdr)" />
              <XAxis dataKey="repo" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cw-txt3)' }} />
              <Tooltip cursor={{ fill: 'var(--cw-bg3)' }} contentStyle={{ backgroundColor: 'var(--cw-bg2)', borderColor: 'var(--cw-bdr)' }} />
              <Bar dataKey="current" fill="var(--cw-txt3)" name="Current Size" radius={[4, 4, 0, 0]} />
              <Bar dataKey="after" fill="var(--cw-purple)" name="Projected Size" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dead Code Explorer */}
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl shadow-sm p-4 h-[280px] overflow-y-auto">
          <h3 className="text-[14px] font-bold text-cw-txt mb-4 flex items-center gap-2"><Code size={16}/> Dead Code Map</h3>
          <div className="space-y-3">
            {[
              { file: 'src/legacy/api_v1.ts', percent: 94, size: '24kb' },
              { file: 'src/components/OldNav.tsx', percent: 100, size: '12kb' },
              { file: 'src/utils/mathHelpers.js', percent: 60, size: '8kb' },
              { file: 'scripts/deploy_aws.sh', percent: 85, size: '4kb' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-[12px] p-2 hover:bg-cw-bg rounded border border-transparent hover:border-cw-bdr cursor-pointer transition-colors">
                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold ${f.percent > 90 ? 'bg-cw-red/10 text-cw-red border border-cw-red/20' : 'bg-cw-amber/10 text-cw-amber border border-cw-amber/20'}`}>
                  {f.percent}%
                </div>
                <div className="flex-1">
                  <div className="font-mono text-cw-txt">{f.file}</div>
                  <div className="text-cw-txt3 mt-0.5">{f.size} of unused bytes</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, suffix = '', color = 'text-cw-txt' }: { title: string, value: string, suffix?: string, color?: string }) {
  return (
    <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 shadow-sm">
      <div className="text-[10px] text-cw-txt3 uppercase tracking-wider mb-1">{title}</div>
      <div className={`text-[24px] font-bold ${color}`}>{value}<span className="text-[14px] text-cw-txt3 font-medium ml-1">{suffix}</span></div>
    </div>
  );
}
