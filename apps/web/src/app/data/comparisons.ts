export interface ComparisonData {
  id: string;
  name: string;
  tagline: string;
  heroCodeward: string;
  heroCompetitor: string;
  shortVersion: string;
  numbersVsMoves: {
    heading: string;
    subheading: string;
    competitorFocus: string;
    codewardFocus: string;
  };
  table: {
    feature: string;
    codeward: string;
    competitor: string;
  }[];
  verdict: {
    heading: string;
    p1: string;
    p2: string;
    p3: string;
  };
  faqs: {
    q: string;
    a: string;
  }[];
}

export const comparisons: Record<string, ComparisonData> = {
  coderabbit: {
    id: "coderabbit",
    name: "CodeRabbit",
    tagline: "Both review pull requests, but one just comments while the other fixes and re-architects.",
    heroCodeward: "fixes the code",
    heroCompetitor: "leaves a comment",
    shortVersion: "Use CodeRabbit if you want an AI to summarize PRs and leave line-by-line feedback. Use Codeward's PR Review Agent and Broken Code Agent to automatically spin up ephemeral Firecracker sandboxes, run live tests, eliminate technical debt, and push self-healing commits. Comments vs. Autonomous Action: two different approaches.",
    numbersVsMoves: {
      heading: "review vs. autonomous engineering",
      subheading: "One leaves feedback. The other writes patches.",
      competitorFocus: "Summarize PRs, leave line-level comments, and answer questions about the diff.",
      codewardFocus: "Run 100+ deep checks via the Orchestrator Agent, execute code in Firecracker sandboxes, and push fixing commits automatically."
    },
    table: [
      { feature: "What you want to do", codeward: "Automate engineering", competitor: "Get AI feedback" },
      { feature: "Live sandbox execution", codeward: "✔", competitor: "Static only" },
      { feature: "Auto-commits fixes", codeward: "✔", competitor: "Snippets" },
      { feature: "Legacy debt tracking", codeward: "✔", competitor: "No" },
      { feature: "Line-by-line PR comments", codeward: "✔", competitor: "✔" },
      { feature: "PR summaries", codeward: "✔", competitor: "✔" },
      { feature: "Full repo context", codeward: "Deep analysis", competitor: "Basic context" }
    ],
    verdict: {
      heading: "Honestly? They solve different pain points.",
      p1: "CodeRabbit acts as a hyper-vigilant reviewer. It reads the diff, understands the context, and leaves helpful feedback for a human engineer to address.",
      p2: "Codeward acts as a member of your engineering team. It doesn't just point out that a function is inefficient; its PR Review Agent creates an ephemeral sandbox, refactors the code, tests it, and pushes the fix directly to your branch.",
      p3: "One is the reviewer. The other is the engineer. For true velocity, you want the engineer."
    },
    faqs: [
      { q: "Is Codeward a CodeRabbit replacement?", a: "If your goal is purely to get AI summaries of PRs, CodeRabbit is great. If you want a suite of 8 specialized agents that actually eliminate technical debt, test code in isolated environments, and push fixes, Codeward replaces the manual work entirely." },
      { q: "Do I need to connect my own repository?", a: "Yes. Codeward integrates deeply with GitHub, GitLab, and Bitbucket. We analyze your entire codebase architecture to make decisions, not just isolated PR diffs." },
      { q: "Are both tools secure?", a: "Both tools prioritize security, but Codeward runs its dynamic checks in ephemeral, microVM-based Firecracker sandboxes, ensuring zero bleed between runs." }
    ]
  },
  greptile: {
    id: "greptile",
    name: "Greptile",
    tagline: "Both understand your codebase, but one answers questions while the other takes action.",
    heroCodeward: "takes action",
    heroCompetitor: "answers questions",
    shortVersion: "Use Greptile to chat with your codebase and understand complex dependencies. Use Codeward's Refactor Agent to actively restructure those dependencies, catch zero-day vulnerabilities via the Security Agent, and autonomously resolve tech debt.",
    numbersVsMoves: {
      heading: "search vs. resolve",
      subheading: "One finds the code. The other fixes it.",
      competitorFocus: "Chat with your repos, understand logic, and find where things are defined.",
      codewardFocus: "Detect architectural flaws, run live integration tests, and autonomously apply structural refactors via AST manipulation."
    },
    table: [
      { feature: "What you want to do", codeward: "Fix & Refactor", competitor: "Understand Code" },
      { feature: "Autonomous refactoring", codeward: "✔", competitor: "No" },
      { feature: "Sandbox test execution", codeward: "✔", competitor: "No" },
      { feature: "Security vulnerability patches", codeward: "✔", competitor: "Basic" },
      { feature: "Codebase Q&A chat", codeward: "✔", competitor: "✔" },
      { feature: "Complex logic tracing", codeward: "✔", competitor: "✔" }
    ],
    verdict: {
      heading: "Understand the code, then change it.",
      p1: "Greptile is an excellent tool for onboarding engineers. It acts like a search engine for your codebase, explaining how components connect.",
      p2: "Codeward takes that understanding and operationalizes it. When Codeward sees a complex, legacy dependency, it doesn't just explain it—it offers an automated plan to decouple it and runs tests to prove the fix works.",
      p3: "One is the map. The other is the vehicle."
    },
    faqs: [
      { q: "Is Codeward a Greptile replacement?", a: "Not exactly. While Codeward has chat capabilities via the AI Agent, its primary focus is autonomous engineering—actually executing patches and running tests, whereas Greptile focuses deeply on code search and understanding." }
    ]
  },
  copilot: {
    id: "copilot",
    name: "GitHub Copilot",
    tagline: "Both write code, but one autocompletes lines while the other manages the entire architecture.",
    heroCodeward: "builds the architecture",
    heroCompetitor: "autocompletes the line",
    shortVersion: "Use Copilot while you are actively typing in your IDE to speed up boilerplate. Use Codeward in your CI/CD pipeline, where the Orchestrator Agent coordinates 8 specialized agents to review PRs, eliminate sprawling technical debt, and safely refactor entire directories.",
    numbersVsMoves: {
      heading: "typing vs. engineering",
      subheading: "One types faster. The other thinks bigger.",
      competitorFocus: "Predict the next line of code, generate boilerplate, and answer quick questions in the IDE.",
      codewardFocus: "Monitor global repository health via the Debt Tracker, enforce security policies, and deploy multi-file refactors."
    },
    table: [
      { feature: "What you want to do", codeward: "Automate pipelines", competitor: "Type faster" },
      { feature: "Multi-file refactoring", codeward: "✔", competitor: "Limited" },
      { feature: "CI/CD Pipeline Integration", codeward: "✔", competitor: "No" },
      { feature: "Live Sandbox execution", codeward: "✔", competitor: "No" },
      { feature: "Inline code completion", codeward: "No", competitor: "✔" },
      { feature: "IDE Chat integration", codeward: "Basic", competitor: "✔" }
    ],
    verdict: {
      heading: "Honestly? Use them together.",
      p1: "GitHub Copilot is the undisputed king of inline autocompletion. It keeps engineers in flow by writing the tedious parts of functions.",
      p2: "Codeward operates at a higher altitude. It looks at the PR the engineer submitted, tests it in a sandbox, checks it against global architectural standards, and flags technical debt.",
      p3: "One is your tactical typing assistant. The other is your strategic engineering partner. You want both."
    },
    faqs: [
      { q: "Does Codeward replace Copilot?", a: "No. Copilot lives in your IDE while you type. Codeward lives in your pipeline and architecture to review, test, and manage the broader codebase." }
    ]
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    tagline: "Both edit code intelligently, but one lives in your local editor while the other guards your pipeline.",
    heroCodeward: "guards the pipeline",
    heroCompetitor: "lives in the editor",
    shortVersion: "Use Cursor as your daily IDE to rapidly scaffold features and navigate code. Use Codeward as your centralized brain to review team PRs, test code in sandboxes, and manage organizational technical debt.",
    numbersVsMoves: {
      heading: "local vs. global",
      subheading: "One runs on your machine. The other runs in the cloud.",
      competitorFocus: "Provide the best AI-native local development environment.",
      codewardFocus: "Provide autonomous, cloud-based PR reviews, testing, and debt management."
    },
    table: [
      { feature: "What you want to do", codeward: "Team-wide automation", competitor: "Local development" },
      { feature: "Automated PR reviews", codeward: "✔", competitor: "No" },
      { feature: "Cloud Sandbox testing", codeward: "✔", competitor: "No" },
      { feature: "Global tech debt tracking", codeward: "✔", competitor: "No" },
      { feature: "Inline AI editing", codeward: "No", competitor: "✔" },
      { feature: "Local workspace context", codeward: "No", competitor: "✔" }
    ],
    verdict: {
      heading: "Honestly? Use them together.",
      p1: "Cursor is the ultimate tool for individual developer velocity. It helps you write code at the speed of thought on your local machine.",
      p2: "But when you push that code, Codeward takes over. It ensures your fast code didn't introduce security flaws or tech debt, and tests it in a pristine sandbox before it merges.",
      p3: "One builds the rocket locally. The other acts as mission control."
    },
    faqs: [
      { q: "Can I use Cursor with Codeward?", a: "Absolutely. Write your code in Cursor. When you open a PR, Codeward will automatically review, test, and optimize it." }
    ]
  },
  sonarqube: {
    id: "sonarqube",
    name: "SonarQube",
    tagline: "Both find code smells, but one stops at the warning while the other writes the fix.",
    heroCodeward: "writes the fix",
    heroCompetitor: "throws a warning",
    shortVersion: "Use SonarQube for traditional, rules-based static analysis and compliance metrics. Use Codeward's Style and Bloat Agents to go beyond static rules with deep AST analysis, dynamic Firecracker sandbox testing, and autonomous patch generation.",
    numbersVsMoves: {
      heading: "metrics vs. action",
      subheading: "One builds dashboards. The other pushes commits.",
      competitorFocus: "Track lines of code, test coverage, and strict syntax rules.",
      codewardFocus: "Understand business logic, execute tests, and actively repair the codebase using specialized agents."
    },
    table: [
      { feature: "What you want to do", codeward: "Fix issues automatically", competitor: "Track static metrics" },
      { feature: "Auto-generates fixes", codeward: "✔", competitor: "No" },
      { feature: "Context-aware AI analysis", codeward: "✔", competitor: "No" },
      { feature: "Live Sandbox execution", codeward: "✔", competitor: "No" },
      { feature: "Strict ruleset compliance", codeward: "Basic", competitor: "✔" },
      { feature: "Legacy enterprise support", codeward: "Growing", competitor: "✔" }
    ],
    verdict: {
      heading: "Move from reporting to resolving.",
      p1: "SonarQube is the industry standard for telling you exactly how much technical debt you have.",
      p2: "Codeward is the standard for actually paying that debt off. Instead of just failing a build because of a code smell, Codeward generates the refactored code and submits a patch.",
      p3: "One is the auditor. The other is the contractor."
    },
    faqs: [
      { q: "Do I need both?", a: "Many enterprises use SonarQube for strict compliance reporting, and Codeward to actually empower developers to fix the issues SonarQube finds." }
    ]
  },
  snyk: {
    id: "snyk",
    name: "Snyk",
    tagline: "Both secure your code, but Snyk focuses on dependencies while Codeward focuses on logic and execution.",
    heroCodeward: "tests the execution",
    heroCompetitor: "scans the packages",
    shortVersion: "Use Snyk to track known vulnerabilities (CVEs) in your npm/pip packages. Use Codeward's Security Agent to detect zero-day logic flaws in your custom code by running it securely inside Firecracker microVM sandboxes.",
    numbersVsMoves: {
      heading: "dependencies vs. logic",
      subheading: "One checks the supply chain. The other checks the code.",
      competitorFocus: "Scan manifest files for outdated or vulnerable third-party libraries.",
      codewardFocus: "Analyze proprietary logic, run dynamic penetration tests, and prevent secrets from leaking."
    },
    table: [
      { feature: "What you want to do", codeward: "Secure custom logic", competitor: "Secure dependencies" },
      { feature: "Dynamic sandbox testing", codeward: "✔", competitor: "No" },
      { feature: "Custom logic analysis", codeward: "Deep", competitor: "Basic SAST" },
      { feature: "Autonomous code fixing", codeward: "✔", competitor: "No" },
      { feature: "CVE Database matching", codeward: "Basic", competitor: "✔" },
      { feature: "Container scanning", codeward: "Basic", competitor: "✔" }
    ],
    verdict: {
      heading: "Honestly? Use them together.",
      p1: "Snyk is unbeatable at telling you when you are using an old version of React or Express that has a known vulnerability.",
      p2: "Codeward ensures the code you wrote on top of those frameworks is secure. It catches SQL injections, logic flaws, and tests execution in an isolated environment.",
      p3: "Protect your supply chain with Snyk. Protect your logic with Codeward."
    },
    faqs: [
      { q: "Is Codeward a SAST tool?", a: "Codeward goes beyond SAST. It uses AI to understand context, and dynamic sandboxes (DAST-like) to execute code safely before merging." }
    ]
  },
  deepsource: {
    id: "deepsource",
    name: "DeepSource",
    tagline: "Both run continuous analysis, but one relies on static rules while the other understands context.",
    heroCodeward: "understands context",
    heroCompetitor: "runs static rules",
    shortVersion: "Use DeepSource for fast, rules-based static analysis and formatting. Use Codeward for deep, AI-driven architectural reviews, Firecracker sandbox testing, and autonomous refactoring led by the Refactor Agent.",
    numbersVsMoves: {
      heading: "rules vs. reasoning",
      subheading: "One runs linters. The other reasons about logic.",
      competitorFocus: "Enforce code style, catch syntax errors, and format code quickly.",
      codewardFocus: "Identify structural decay with the Bloat Agent, suggest improvements, and test execution."
    },
    table: [
      { feature: "What you want to do", codeward: "Improve architecture", competitor: "Enforce formatting" },
      { feature: "Live sandbox execution", codeward: "✔", competitor: "No" },
      { feature: "AI logic reasoning", codeward: "✔", competitor: "Limited" },
      { feature: "Automated refactoring", codeward: "✔", competitor: "Simple patches" },
      { feature: "Sub-second linting", codeward: "No", competitor: "✔" },
      { feature: "Language formatters", codeward: "Basic", competitor: "✔" }
    ],
    verdict: {
      heading: "Beyond formatting.",
      p1: "DeepSource is fantastic at keeping your codebase clean from a syntax and formatting perspective. It runs fast and catches simple mistakes.",
      p2: "Codeward focuses on the hard problems: technical debt, complex logic bugs, and architectural scaling. It doesn't just lint; it executes and refactors.",
      p3: "Lint with DeepSource. Engineer with Codeward."
    },
    faqs: [
      { q: "Can Codeward format code?", a: "Yes, but it's overkill to use an AI agent just for formatting. Standard CI linters handle formatting perfectly. Codeward focuses on logic and architecture." }
    ]
  },
  codeclimate: {
    id: "codeclimate",
    name: "Code Climate",
    tagline: "Both measure code health, but one gives you a grade while the other fixes the assignment.",
    heroCodeward: "fixes the code",
    heroCompetitor: "gives a grade",
    shortVersion: "Use Code Climate for engineering velocity metrics and high-level maintainability grades. Use Codeward to actively fix maintainability issues, run tests, and eliminate technical debt.",
    numbersVsMoves: {
      heading: "metrics vs. engineering",
      subheading: "One measures the team. The other joins the team.",
      competitorFocus: "Track cycle time, PR merge rates, and assign GPA scores to code.",
      codewardFocus: "Automatically fix code smells, test changes, and submit PRs to clear debt."
    },
    table: [
      { feature: "What you want to do", codeward: "Fix technical debt", competitor: "Measure velocity" },
      { feature: "Autonomous patches", codeward: "✔", competitor: "No" },
      { feature: "Dynamic sandbox testing", codeward: "✔", competitor: "No" },
      { feature: "AI code reviews", codeward: "✔", competitor: "No" },
      { feature: "Engineering velocity metrics", codeward: "Basic", competitor: "✔" },
      { feature: "Code GPA grading", codeward: "No", competitor: "✔" }
    ],
    verdict: {
      heading: "Honestly? Use them together.",
      p1: "Code Climate Velocity is a great tool for engineering managers to understand how fast the team is moving and where bottlenecks exist.",
      p2: "Codeward is the tool that actually removes those bottlenecks. When Code Climate says a file is too complex (GPA: F), Codeward rewrites it.",
      p3: "Measure with Code Climate. Execute with Codeward."
    },
    faqs: [
      { q: "Does Codeward provide metrics?", a: "Yes, Codeward provides a Debt Tracker and Security Dashboard, but our focus is on actionable insights and automatic fixes, not just team velocity tracking." }
    ]
  },
  codacy: {
    id: "codacy",
    name: "Codacy",
    tagline: "Both review your code, but one aggregates linters while the other acts as an AI developer.",
    heroCodeward: "acts as an AI developer",
    heroCompetitor: "aggregates linters",
    shortVersion: "Use Codacy to centralize your static analysis tools, linters, and security scanners into one dashboard. Use Codeward's Orchestrator Agent to bring dynamic reasoning, autonomous patches, and Firecracker sandbox execution to your pull requests.",
    numbersVsMoves: {
      heading: "aggregation vs. intelligence",
      subheading: "One collects warnings. The other understands them.",
      competitorFocus: "Run dozens of open-source linters and display the results in one place.",
      codewardFocus: "Deploy 8 specialized agents to understand intent, execute code safely, and push fixes."
    },
    table: [
      { feature: "What you want to do", codeward: "Intelligent code review", competitor: "Linter aggregation" },
      { feature: "AI context understanding", codeward: "✔", competitor: "Limited" },
      { feature: "Live sandbox testing", codeward: "✔", competitor: "No" },
      { feature: "Self-healing commits", codeward: "✔", competitor: "No" },
      { feature: "Hundreds of static rules", codeward: "Basic", competitor: "✔" },
      { feature: "Open-source linter engine", codeward: "No", competitor: "✔" }
    ],
    verdict: {
      heading: "Linters aren't enough anymore.",
      p1: "Codacy is a robust platform for standardizing static analysis across hundreds of repositories using traditional linters.",
      p2: "But linters can't catch logical flaws, and they can't test if code actually runs. Codeward uses AI to understand context and Firecracker sandboxes to prove execution.",
      p3: "For syntax, use linters. For logic, use Codeward."
    },
    faqs: [
      { q: "Does Codeward replace Codacy?", a: "If you rely heavily on specific esoteric linters, keep them. But for deep code review, vulnerability patching, and autonomous tech debt removal, Codeward provides much more value." }
    ]
  }
};
