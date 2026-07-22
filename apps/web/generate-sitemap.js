import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://codeward.cloud';
const currentDate = new Date().toISOString().split('T')[0];

const staticRoutes = [
  '/',
  '/pricing',
  '/blogs',
  '/book-demo',
  '/docs',
];

const competitors = [
  'coderabbit',
  'greptile',
  'copilot',
  'cursor',
  'sonarqube',
  'snyk',
  'deepsource',
  'codeclimate',
  'codacy',
  'fallow'
];

const agents = [
  'security',
  'bloat',
  'broken-code',
  'architecture',
  'ai-era',
  'orchestrator'
];

const solutions = [
  'ci-cd-shield',
  'tech-debt',
  'compliance',
  'secrets',
  'flaky-tests',
  'enterprise'
];

const docs = [
  'intro',
  'setup',
  'agents',
  'security'
];

let blogs = [];
try {
  const blogsContent = fs.readFileSync(path.join(__dirname, 'src/app/data/blogs.ts'), 'utf8');
  const slugRegex = /slug:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = slugRegex.exec(blogsContent)) !== null) {
    blogs.push(match[1]);
  }
} catch (e) {
  console.error("Could not read blogs.ts, using fallback blogs:", e);
  blogs = [
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
}

const urls = [];

const addUrl = (route, priority = '0.5', changefreq = 'weekly') => {
  urls.push(`  <url>
    <loc>${DOMAIN}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
};

// Add static routes
staticRoutes.forEach(r => {
  const priority = r === '/' ? '1.0' : '0.8';
  addUrl(r, priority, 'daily');
});

// Add blogs
blogs.forEach(b => {
  addUrl(`/blogs/${b}`, '0.7', 'weekly');
});

// Add comparisons
competitors.forEach(c => {
  addUrl(`/compare/${c}`, '0.7', 'weekly');
});

// Add agents
agents.forEach(a => {
  addUrl(`/agents/${a}`, '0.6', 'monthly');
});

// Add solutions
solutions.forEach(s => {
  addUrl(`/solutions/${s}`, '0.6', 'monthly');
});

// Add docs
docs.forEach(d => {
  addUrl(`/docs/${d}`, '0.6', 'weekly');
});

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent.trim());
console.log('Sitemap generated successfully in public/sitemap.xml');
