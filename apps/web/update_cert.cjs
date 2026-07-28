const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/components/Certificate.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update React imports
content = content.replace(
  "import { useState } from 'react';",
  "import { useState, useEffect } from 'react';"
);

// 2. Add API and RepoSelector imports
const lucideImportMatch = content.match(/import \{[\s\S]*?\} from 'lucide-react';/);
if (lucideImportMatch) {
  content = content.replace(
    lucideImportMatch[0],
    `${lucideImportMatch[0]}\nimport { API_URL } from '../../lib/api';\nimport { RepoSelector } from './RepoSelector';`
  );
}

// 3. Add states and useEffect inside Certificate
const compStart = "export function Certificate() {";
const statesToAdd = `
  const [repoFilter, setRepoFilter] = useState<string>('All');
  const [repoList, setRepoList] = useState<{ id: number; fullName: string }[]>([]);

  useEffect(() => {
    fetch(\`\${API_URL}/api/chat/repos\`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { repos: [] })
      .then((d) => setRepoList(d.repos ?? []))
      .catch(() => {});
  }, []);
`;
content = content.replace(compStart, `${compStart}\n${statesToAdd}`);

// 4. Replace the old Header strip and the banner with a new structure
const oldHeaderAndBannerRegex = /\{\/\* Header \*\/\}.*?\{\/\* Gradient Overlay for text readability \*\/\}/s;

const newHeaderAndBanner = `{/* Floating Top Bar (Repo Selector + Action Buttons) */}
        <div className="p-6 w-full max-w-[920px] mx-auto pb-0 flex justify-between items-end relative z-20 -mb-4">
          <div className="w-[280px]">
             <RepoSelector
                options={repoList}
                value={repoFilter}
                onChange={(val, name) => setRepoFilter(val === 'All' ? 'All' : name)}
                showAllOption={true}
                allOptionLabel="All connected repositories"
             />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setActiveAgent(null); setSidePanel('share'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-bg2 rounded-md border border-cw-bdr text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors shadow-sm">
              <Printer size={14} /> Print / Export
            </button>
            <button onClick={() => { setActiveAgent(null); setSidePanel('share'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-cw-blue hover:brightness-110 rounded-md text-[12px] font-medium text-white transition-colors shadow-sm">
              <Share2 size={14} /> Share link
            </button>
          </div>
        </div>

        <div className="p-6 w-full max-w-[920px] mx-auto pt-4">
          {/* Main Hero Banner */}
          <div className="relative w-full h-[220px] rounded-2xl overflow-hidden mb-8 border border-cw-bdr/50 shadow-lg group cursor-pointer">
            {/* Background Image */}
            <img 
              src="/certificate_banner.png" 
              alt="Health Certificate" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay for text readability */}`;

content = content.replace(oldHeaderAndBannerRegex, newHeaderAndBanner);

// 5. Upgrade the "How you compare" block
const oldCompareRegex = /\{\/\* Comparisons \*\/\}.*?\{\/\* ── Agents Section ── \*\/\}/s;

const newCompare = `{/* Comparisons */}
          <div className="bg-cw-bg2 border border-cw-bdr rounded-2xl p-8 mb-8 shadow-sm">
            <div className="text-[13px] font-bold text-cw-txt3 uppercase tracking-wider mb-14">How you compare</div>
            <div className="relative w-[calc(100%-100px)] mx-auto h-3 mb-14">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2.5 bg-cw-bg4 rounded-full" />
              {[
                { label: 'Lovable avg', val: 58, color: 'bg-cw-amber', pos: 'bottom' },
                { label: 'Codeward (median)', val: 67, color: 'bg-cw-txt3', pos: 'top' },
                { label: 'Cursor avg', val: 71, color: 'bg-cw-blue', pos: 'bottom' },
                { label: 'Your score (Top 8%)', val: 91, color: 'bg-cw-green', pos: 'top' },
              ].map(m => (
                <div key={m.label} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: \`\${m.val}%\` }}>
                  {m.pos === 'top' && (
                    <div className="absolute bottom-full mb-3 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <span className="text-[12px] font-medium text-cw-txt2 mb-1">{m.label}</span>
                      <span className="text-[20px] font-bold text-cw-txt">{m.val}</span>
                      <div className="w-[2px] h-4 bg-cw-bdr mt-2" />
                    </div>
                  )}
                  <div className={\`w-5 h-5 rounded-full \${m.color} ring-[6px] ring-cw-bg2 z-10 shadow-sm\`} />
                  {m.pos === 'bottom' && (
                    <div className="absolute top-full mt-3 whitespace-nowrap flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                      <div className="w-[2px] h-4 bg-cw-bdr mb-2" />
                      <span className="text-[20px] font-bold text-cw-txt mb-1">{m.val}</span>
                      <span className="text-[12px] font-medium text-cw-txt2">{m.label}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="absolute left-0 top-full mt-4 text-[12px] text-cw-txt3 font-semibold -ml-1">0</div>
              <div className="absolute right-0 top-full mt-4 text-[12px] text-cw-txt3 font-semibold -mr-3">100</div>
            </div>
          </div>

          {/* ── Agents Section ── */}`;

content = content.replace(oldCompareRegex, newCompare);

fs.writeFileSync(file, content, 'utf8');
console.log("Certificate.tsx updated successfully.");
