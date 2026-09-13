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

// 3. Helper to format competitor and blog names
const competitorNames = {
  coderabbit: 'CodeRabbit',
  greptile: 'Greptile',
  copilot: 'GitHub Copilot',
  cursor: 'Cursor',
  sonarqube: 'SonarQube',
  snyk: 'Snyk',
  deepsource: 'DeepSource',
  codeclimate: 'CodeClimate',
  codacy: 'Codacy',
  fallow: 'Fallow',
};

const formatTitle = (slug) => {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// 4. Write customized index.html to each route subfolder
let generatedCount = 0;
for (const route of routes) {
  const targetDir = path.join(distDir, route);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let routeHtml = indexHtml;
  let pageTitle = 'Codeward — Open Source AI Code Review & Autonomous Refactoring';
  let pageDesc = 'Codeward is the open-source autonomous AI code review platform. Connect your repo for automated security and refactoring checks.';

  if (route === 'pricing') {
    pageTitle = 'Pricing | Codeward — Open Source AI Code Review Plans & Free Tier';
    pageDesc = 'Transparent developer pricing. Start free with 10 PR scans every month. Pro tier at $29/mo with unlimited reviews. 100% open-core.';
  } else if (route.startsWith('compare/')) {
    const compSlug = route.replace('compare/', '');
    const compName = competitorNames[compSlug] || formatTitle(compSlug);
    pageTitle = `Best Open Source ${compName} Alternative (2026) | Codeward vs ${compName}`;
    pageDesc = `Looking for the best open-source ${compName} alternative? Compare Codeward vs ${compName}. Autonomous AI code reviews, 100+ debt checks, and auto-fixing commits.`;
  } else if (route.startsWith('blogs/')) {
    const blogSlug = route.replace('blogs/', '');
    pageTitle = `${formatTitle(blogSlug)} | Codeward Engineering Blog`;
    pageDesc = `Read ${formatTitle(blogSlug)} on the Codeward Engineering Blog. Deep dive into autonomous code review, security, and refactoring architecture.`;
  } else if (route === 'docs' || route.startsWith('docs/')) {
    pageTitle = 'Documentation | Codeward — Open Source AI Code Quality Platform';
    pageDesc = 'Learn how to set up and run Codeward automated code reviews, multi-agent pipelines, and microVM sandboxes.';
  } else if (route === 'login') {
    pageTitle = 'Sign In | Codeward';
    pageDesc = 'Sign in to your Codeward account with GitHub or Google.';
  } else if (route === 'signup') {
    pageTitle = 'Create Your Free Account | Codeward';
    pageDesc = 'Get started free with 10 pull request scans every month. No credit card required.';
  }

  // Replace Title & Description in HTML
  routeHtml = routeHtml.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
  routeHtml = routeHtml.replace(/<meta name="title" content=".*?" \/>/, `<meta name="title" content="${pageTitle}" />`);
  routeHtml = routeHtml.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${pageDesc}" />`);
  routeHtml = routeHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${pageTitle}" />`);
  routeHtml = routeHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${pageDesc}" />`);
  routeHtml = routeHtml.replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="https://codeward.cloud/${route}" />`);
  routeHtml = routeHtml.replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="https://codeward.cloud/${route}" />`);

  fs.writeFileSync(path.join(targetDir, 'index.html'), routeHtml, 'utf8');
  generatedCount++;
}

console.log(`✓ Statically pre-rendered ${generatedCount} routes with dedicated SEO tags in dist/`);

