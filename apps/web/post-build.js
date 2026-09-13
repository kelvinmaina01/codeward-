import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html does not exist! Run vite build first.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Copy index.html -> 404.html for SPA fallback
fs.writeFileSync(path.join(distDir, '404.html'), indexHtml, 'utf8');
console.log('✓ Created dist/404.html SPA fallback');

// 2. Comprehensive route list for static generation
const routes = [
  'login',
  'signup',
  'pricing',
  'docs',
  'terms',
  'privacy',
  'trust',
  'connect',
  'dashboard',
  'dashboard/commits',
  'dashboard/alerts',
  'dashboard/livefeed',
  'dashboard/security',
  'dashboard/settings',
  'dashboard/integrations',
  'admin',
  'admin/feed',
  'admin/runs',
  'admin/repos',
  'admin/security',
  'admin/bloat',
  'admin/broken',
  'admin/architecture',
  'admin/compliance',
  'admin/agents',
  'admin/revenue',
  'admin/customers',
  'admin/growth',
  'admin/billing',
  'admin/sandbox',
  'admin/alerts',
  'admin/settings',
  'blogs',
  'book-demo',
];

const competitors = [
  'coderabbit', 'greptile', 'copilot', 'cursor', 'sonarqube',
  'snyk', 'deepsource', 'codeclimate', 'codacy', 'fallow'
];

const agents = [
  'security', 'bloat', 'broken-code', 'architecture', 'ai-era', 'orchestrator'
];

const solutions = [
  'ci-cd-shield', 'tech-debt', 'compliance', 'secrets', 'flaky-tests', 'enterprise'
];

const docs = ['intro', 'setup', 'agents', 'security'];

competitors.forEach(c => routes.push(`compare/${c}`));
agents.forEach(a => routes.push(`agents/${a}`));
solutions.forEach(s => routes.push(`solutions/${s}`));
docs.forEach(d => routes.push(`docs/${d}`));

// Read blogs from blogs.ts if possible
try {
  const blogsContent = fs.readFileSync(path.join(__dirname, 'src/app/data/blogs.ts'), 'utf8');
  const slugRegex = /slug:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = slugRegex.exec(blogsContent)) !== null) {
    routes.push(`blogs/${match[1]}`);
  }
} catch (e) {
  const fallbackBlogs = [
    'eliminate-technical-debt-production',
    'specialized-ai-agents-code-reviews',
    'catching-zero-day-vulnerabilities',
    'orchestrator-agent-gatekeeper',
    'firecracker-microvms-for-secure-testing',
    'measuring-engineering-velocity',
    'refactoring-legacy-monoliths',
    'the-future-of-compliance-as-code',
    'building-resilient-webhooks'
  ];
  fallbackBlogs.forEach(b => routes.push(`blogs/${b}`));
}

// 3. Write index.html to each route subfolder
let generatedCount = 0;
for (const route of routes) {
  const targetDir = path.join(distDir, route);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml, 'utf8');
  generatedCount++;
}

console.log(`✓ Statically pre-rendered ${generatedCount} routes with index.html in dist/`);
