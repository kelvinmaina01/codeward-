export interface BlogPost {
  slug: string;
  category: string;
  title: string;
  gradient: string;
  overlayText: string;
  date: string;
  readTime: string;
  author: string;
  authorAvatar: string;
  heroImage?: string;
  seoDescription: string;
  content: string;
}

export const blogs: BlogPost[] = [
  {
    slug: 'eliminate-technical-debt-production',
    category: 'PRODUCT ENGINEERING',
    title: 'How to eliminate technical debt before it reaches production',
    gradient: 'from-[#00b4db] to-[#0083b0]',
    overlayText: 'TECHNICAL DEBT',
    date: 'May 24, 2026',
    readTime: '5 min read',
    author: 'Codeward Team',
    authorAvatar: 'Codeward+Team',
    seoDescription: 'Discover how Codeward helps engineering teams eliminate technical debt by catching it early in the PR phase.',
    content: `
      <p>Technical debt is the silent killer of engineering velocity. Every team accumulates it, but the best teams manage it proactively rather than reactively.</p>
      
      <h2>The True Cost of Bad Code</h2>
      <p>When bad code reaches production, the cost to fix it grows exponentially. A bug that takes 5 minutes to fix during a code review can take days to resolve once deployed, especially if it causes data corruption or downtime.</p>
      
      <blockquote>"If you don't schedule time for maintenance, your equipment will schedule it for you."</blockquote>
      
      <h2>Shift Left with Automation</h2>
      <p>The solution is not just better code reviews—it's automated, intelligent code reviews. By shifting the detection of technical debt to the CI/CD pipeline, teams can ensure that every merge request improves the codebase rather than degrading it.</p>
      
      <p>This is where autonomous platforms shine. They don't just point out the problem; they write the fix. They don't just fail a build; they explain why.</p>
    `,
  },
  {
    slug: 'specialized-ai-agents-code-reviews',
    category: 'AI',
    title: 'The role of specialized AI agents in automated code reviews',
    gradient: 'from-[#8E2DE2] to-[#4A00E0]',
    overlayText: 'AI AGENTS',
    date: 'May 18, 2026',
    readTime: '6 min read',
    author: 'Alex TypeScript',
    authorAvatar: 'Alex+TypeScript',
    seoDescription: 'Learn how specialized AI agents out-perform generic LLMs in automated code reviews and technical debt management.',
    content: `
      <p>Generic language models are impressive, but when it comes to enterprise-grade code reviews, you need specialists.</p>
      
      <h2>The Problem with Generalists</h2>
      <p>A general LLM might catch a syntax error or suggest a cleaner way to write a function, but it lacks the deep, specialized context required to understand the nuances of security, performance, and architecture.</p>
      
      <h2>Enter the Specialists</h2>
      <p>Specialized agents, each trained and prompted for a specific domain, work in parallel to provide a comprehensive review:</p>
      <ul>
        <li><strong>Security Agent:</strong> Focuses exclusively on vulnerabilities, secrets, and OWASP top 10.</li>
        <li><strong>Performance Agent:</strong> Looks for N+1 queries, memory leaks, and inefficient algorithms.</li>
        <li><strong>Bloat Agent:</strong> Identifies dead code, duplication, and over-engineered abstractions.</li>
      </ul>
      
      <p>By coordinating these agents through an Orchestrator, teams get the speed of automation with the depth of a Principal Engineer.</p>
    `,
  },
  {
    slug: 'catching-zero-day-vulnerabilities',
    category: 'SECURITY',
    title: 'Catching zero-day vulnerabilities directly in pull requests',
    gradient: 'from-[#cb2d3e] to-[#ef473a]',
    overlayText: 'SECURITY SHIELD',
    date: 'May 12, 2026',
    readTime: '4 min read',
    author: 'Sam Hacker',
    authorAvatar: 'Sam+Hacker',
    seoDescription: 'Prevent zero-day vulnerabilities from reaching production by scanning pull requests directly.',
    content: `
      <p>Security cannot be an afterthought. In a world where zero-day vulnerabilities are increasingly common, relying on periodic penetration testing is no longer sufficient.</p>
      
      <h2>The CI/CD Security Bottleneck</h2>
      <p>Many organizations run security scans in their CI/CD pipelines, but these scans are often slow and produce massive amounts of noise (false positives). Developers learn to ignore them or, worse, bypass them entirely to meet deadlines.</p>
      
      <h2>Context-Aware Scanning</h2>
      <p>Modern security agents don't just run static analysis; they understand the context of the code. They know the difference between a hardcoded API key used in a test file and one exposed in a production service.</p>
      
      <p>By providing immediate, accurate feedback directly in the pull request, developers can fix vulnerabilities before the code is even merged. This is the true definition of "shifting left".</p>
    `,
  },
  {
    slug: 'orchestrator-agent-gatekeeper',
    category: 'ARCHITECTURE',
    title: 'How the Orchestrator Agent acts as the ultimate gatekeeper',
    gradient: 'from-[#11998e] to-[#38ef7d]',
    overlayText: 'ORCHESTRATOR',
    date: 'April 30, 2026',
    readTime: '7 min read',
    author: 'Elena Systems',
    authorAvatar: 'Elena+Systems',
    seoDescription: 'Deep dive into how the Orchestrator agent manages multiple specialized agents to provide a unified review.',
    content: `
      <p>Managing multiple AI agents can quickly become chaotic. If the Security Agent flags a risk, but the Performance Agent suggests a change that exacerbates that risk, how do you resolve the conflict?</p>
      
      <h2>The Role of the Orchestrator</h2>
      <p>The Orchestrator Agent is the brain of the operation. It doesn't review code directly; instead, it coordinates the specialists.</p>
      
      <ol>
        <li>It analyzes the PR to determine which agents are needed.</li>
        <li>It dispatches tasks to the agents in parallel.</li>
        <li>It aggregates their findings, resolving conflicts and prioritizing the most critical issues.</li>
        <li>It presents a unified, coherent review to the developer.</li>
      </ol>
      
      <p>This architecture ensures that developers get clear, actionable feedback without being overwhelmed by conflicting advice from different AI models.</p>
    `,
  },
  {
    slug: 'firecracker-microvms-for-secure-testing',
    category: 'INFRASTRUCTURE',
    title: 'Running untrusted code safely with Firecracker microVMs',
    gradient: 'from-[#ff9966] to-[#ff5e62]',
    overlayText: 'FIRECRACKER',
    date: 'April 15, 2026',
    readTime: '5 min read',
    author: 'Mark Infra',
    authorAvatar: 'Mark+Infra',
    seoDescription: 'Why Firecracker microVMs are the perfect infrastructure for running untrusted code during automated testing.',
    content: `
      <p>When you build an automated code quality platform, you inevitably have to run untrusted code. Doing this securely at scale is one of the hardest infrastructure challenges in modern engineering.</p>
      
      <h2>Containers Aren't Enough</h2>
      <p>Docker containers provide isolation, but they share the host kernel. If a malicious piece of code exploits a kernel vulnerability, it can break out of the container and compromise the entire host.</p>
      
      <h2>The Firecracker Advantage</h2>
      <p>Firecracker, developed by AWS, provides the security of hardware virtualization with the speed and resource efficiency of containers. It can spin up a microVM in under 125 milliseconds.</p>
      
      <p>By running every test suite and code execution in its own ephemeral Firecracker microVM, platforms can guarantee strict isolation without sacrificing the speed necessary for continuous integration.</p>
    `,
  },
  {
    slug: 'measuring-engineering-velocity',
    category: 'PRODUCTIVITY',
    title: 'Metrics that matter: Measuring true engineering velocity',
    gradient: 'from-[#8A2387] via-[#E94057] to-[#F27121]',
    overlayText: 'METRICS',
    date: 'April 02, 2026',
    readTime: '6 min read',
    author: 'Sarah Data',
    authorAvatar: 'Sarah+Data',
    seoDescription: 'Move beyond lines of code and story points. Discover the metrics that actually measure engineering productivity.',
    content: `
      <p>Lines of code written is a terrible metric. Story points completed is only marginally better. How do you actually measure if an engineering team is moving fast and building things of value?</p>
      
      <h2>DORA Metrics</h2>
      <p>The DevOps Research and Assessment (DORA) metrics remain the gold standard:</p>
      <ul>
        <li><strong>Deployment Frequency:</strong> How often do you ship?</li>
        <li><strong>Lead Time for Changes:</strong> How long does it take to go from commit to production?</li>
        <li><strong>Mean Time to Recovery (MTTR):</strong> How fast can you fix a failure?</li>
        <li><strong>Change Failure Rate:</strong> What percentage of deployments cause problems?</li>
      </ul>
      
      <h2>The Impact of Automated Reviews</h2>
      <p>Implementing an autonomous code quality platform directly impacts these metrics. Lead time decreases because PRs don't sit in review queues. Change failure rate drops because bugs are caught before merge.</p>
    `,
  },
  {
    slug: 'refactoring-legacy-monoliths',
    category: 'ARCHITECTURE',
    title: 'Strategies for safely refactoring legacy monoliths',
    gradient: 'from-[#4B79A1] to-[#283E51]',
    overlayText: 'REFACTORING',
    date: 'March 20, 2026',
    readTime: '8 min read',
    author: 'Codeward Team',
    authorAvatar: 'Codeward+Team',
    seoDescription: 'A step-by-step guide to safely refactoring monolithic applications into modern architectures.',
    content: `
      <p>No one sets out to build a "legacy monolith." They happen naturally as successful products grow over time. But eventually, the sheer weight of the codebase slows down development.</p>
      
      <h2>The Strangler Fig Pattern</h2>
      <p>The most effective strategy is the Strangler Fig pattern. Instead of a massive, risky rewrite, you incrementally extract functionality into new services.</p>
      
      <h2>Automated Refactoring</h2>
      <p>Refactoring is inherently risky. Automated tools that understand the Abstract Syntax Tree (AST) of your code can perform complex refactorings—like extracting a service or renaming a widely-used variable—with mathematical certainty, eliminating human error.</p>
    `,
  },
  {
    slug: 'the-future-of-compliance-as-code',
    category: 'COMPLIANCE',
    title: 'The future of compliance: From checklists to code',
    gradient: 'from-[#000000] to-[#434343]',
    overlayText: 'COMPLIANCE',
    date: 'March 05, 2026',
    readTime: '4 min read',
    author: 'Jane Legal',
    authorAvatar: 'Jane+Legal',
    seoDescription: 'How "Compliance as Code" is revolutionizing how organizations meet regulatory requirements like GDPR and HIPAA.',
    content: `
      <p>Compliance used to mean endless spreadsheets, manual audits, and weeks of preparation. Not anymore.</p>
      
      <h2>Compliance as Code</h2>
      <p>By defining compliance rules as code, organizations can continuously monitor their systems against frameworks like GDPR, HIPAA, or SOC2.</p>
      
      <p>When a developer opens a PR that would violate a compliance rule—for example, logging Personally Identifiable Information (PII) without masking—an automated compliance agent can block the merge immediately. This shifts compliance from a post-deployment audit to a pre-merge requirement.</p>
    `,
  },
  {
    slug: 'building-resilient-webhooks',
    category: 'ENGINEERING',
    title: 'Building a resilient webhook delivery system at scale',
    gradient: 'from-[#f12711] to-[#f5af19]',
    overlayText: 'WEBHOOKS',
    date: 'February 18, 2026',
    readTime: '6 min read',
    author: 'Alex TypeScript',
    authorAvatar: 'Alex+TypeScript',
    seoDescription: 'Technical deep dive into building a high-throughput, resilient webhook delivery system.',
    content: `
      <p>Webhooks are the glue of the modern internet, but delivering them reliably at scale is surprisingly difficult. Endpoints go down, networks timeout, and sudden spikes in traffic can overwhelm your system.</p>
      
      <h2>Exponential Backoff and Retries</h2>
      <p>A naive retry system will hammer a struggling endpoint until it completely collapses. Implementing exponential backoff with jitter ensures that your system gives the receiving endpoint time to recover.</p>
      
      <h2>Queueing Architecture</h2>
      <p>Using robust queueing systems like BullMQ or Apache Kafka allows you to decouple the generation of an event from its delivery. This ensures that a failure in delivery doesn't impact the core application's performance.</p>
    `,
  }
];
