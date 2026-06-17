import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/Maxkryie Networks/Desktop/codeward project/apps/api/src/agents/analyzers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.agent.ts'));

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf-8');
  
  // Remove `import { tool } from "ai";`
  content = content.replace(/import\s*\{\s*tool\s*\}\s*from\s*['"]ai['"];\n?/, '');
  
  // Replace `const submitReport = tool({` with `const submitReport = {`
  content = content.replace(/=\s*tool\(\s*\{/g, '= {');
  
  // Replace the closing `});` of that tool before `const SYSTEM_PROMPT`
  content = content.replace(/\}\)\s*;\s*const\s*SYSTEM_PROMPT/g, '};\n\nconst SYSTEM_PROMPT');
  
  fs.writeFileSync(p, content);
}

console.log('Removed tool() wrapper');
