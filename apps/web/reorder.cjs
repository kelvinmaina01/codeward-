const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/components/Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const quickLinks = `      {/* Quick Links Section */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold tracking-wider text-cw-txt3 flex items-center gap-1.5">
          Jump to &rarr;
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>🔍</span> Run full audit
          </button>
          <button onClick={() => navigate('/connect')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>➕</span> Connect new repo
          </button>
          <button onClick={() => navigate('/dashboard/agent')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>💬</span> Ask Codeward AI
          </button>
          <button onClick={() => navigate('/dashboard/debt')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>📄</span> View debt report
          </button>
          <button onClick={() => navigate('/dashboard/cert')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>🏅</span> Share certificate
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 bg-cw-bg2 border border-cw-bdr rounded-lg text-[12px] font-medium text-cw-txt hover:bg-cw-bg3 transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
            <span>📤</span> Export to Jira
          </button>
        </div>
      </div>
`;

// Extract sections using index of
const getSection = (startMarker, endMarker) => {
    const start = content.indexOf(startMarker);
    if (start === -1) throw new Error("Could not find start marker: " + startMarker);
    
    // We want to capture up to the start of the next section, so endMarker is usually the start of the next section
    // Or we find the end marker and include up to just before the next section
    const end = content.indexOf(endMarker, start);
    if (end === -1) throw new Error("Could not find end marker: " + endMarker);
    
    return content.slice(start, end);
};

const header = getSection("      {/* Header with Repo Filter Selector */}", "      {/* Row 1: 4 Top KPI Stat Cards");
const row1 = getSection("      {/* Row 1: 4 Top KPI Stat Cards", "      {/* Row 2: SCREENSHOT CARDS SIDE-BY-SIDE");
const row2 = getSection("      {/* Row 2: SCREENSHOT CARDS SIDE-BY-SIDE", "      {/* Row 3: DEDICATED AGENT ACTIVITY LIVE FEED CARD */}");
const row3 = getSection("      {/* Row 3: DEDICATED AGENT ACTIVITY LIVE FEED CARD */}", "      {/* Row 4: 2 Original 30-Day Area Charts */}");
const row4 = getSection("      {/* Row 4: 2 Original 30-Day Area Charts */}", "      {/* Row 5: Recent Sandbox Activity Table */}");
const row5 = getSection("      {/* Row 5: Recent Sandbox Activity Table */}", "      {/* Row 6: 2 Bottom Cards — Active Runs & Pending Approvals */}");
const row6AndBeyond = content.slice(content.indexOf("      {/* Row 6: 2 Bottom Cards — Active Runs & Pending Approvals */}"));
const beforeReturn = content.slice(0, content.indexOf("      {/* Header with Repo Filter Selector */}"));

const newLayout = beforeReturn + 
  header + 
  quickLinks + "\n\n" +
  row4 + 
  row5 + 
  row1 + 
  row2 + 
  row3 + 
  row6AndBeyond;

fs.writeFileSync(filePath, newLayout, 'utf8');
console.log("Dashboard reordered successfully.");
