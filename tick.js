const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'guidelines/MASTER-PLAN/masterplan.html');
let html = fs.readFileSync(filePath, 'utf8');

// Find Phase 2 section and mark tasks as done
const p2Start = html.indexOf('id="phase-2"');
const p2End = html.indexOf('id="phase-3"');

if (p2Start !== -1) {
  let phase2Html = html.substring(p2Start, p2End !== -1 ? p2End : html.length);
  
  // Mark all tasks in steps 2.1, 2.2, 2.3 as done
  const stepIDs = ['s2-1', 's2-2', 's2-3'];
  for (const step of stepIDs) {
    const stepStart = phase2Html.indexOf(`id="${step}"`);
    const nextStepStart = phase2Html.indexOf('class="step"', stepStart + 10);
    const stepEnd = nextStepStart !== -1 ? nextStepStart : phase2Html.length;
    
    let stepHtml = phase2Html.substring(stepStart, stepEnd);
    stepHtml = stepHtml.replace(/<div class="task"/g, '<div class="task done"');
    
    phase2Html = phase2Html.substring(0, stepStart) + stepHtml + phase2Html.substring(stepEnd);
  }
  
  // For 2.4, we'll mark the first 3 tasks (cloning & npm ci) as done
  const s24Start = phase2Html.indexOf('id="s2-4"');
  if (s24Start !== -1) {
    let s24Html = phase2Html.substring(s24Start);
    let occurrences = 0;
    s24Html = s24Html.replace(/<div class="task"/g, (match) => {
        occurrences++;
        if (occurrences <= 3) return '<div class="task done"';
        return match;
    });
    phase2Html = phase2Html.substring(0, s24Start) + s24Html;
  }
  
  html = html.substring(0, p2Start) + phase2Html;
  fs.writeFileSync(filePath, html, 'utf8');
  console.log("Updated masterplan.html successfully");
} else {
  console.log("Could not find Phase 2");
}
