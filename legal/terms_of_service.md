<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Codeward — Terms of Service</title>
<style>
:root {
  --primary:       #0f2744;
  --primary-light: #1e4080;
  --accent:        #2563eb;
  --accent-light:  #dbeafe;
  --danger:        #b91c1c;
  --success:       #15803d;
  --neutral-50:    #f8fafc;
  --neutral-100:   #f1f5f9;
  --neutral-200:   #e2e8f0;
  --neutral-700:   #334155;
  --neutral-900:   #0f172a;
  --border:        #cbd5e1;
  --font-serif:    'Georgia', serif;
  --font-sans:     'Helvetica Neue', Arial, sans-serif;
  --font-mono:     'Courier New', monospace;
  --page-padding:  52px;
  --section-gap:   36px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-serif);
  font-size: 12.5pt;
  line-height: 1.85;
  color: var(--neutral-900);
  background: #fff;
  max-width: 900px;
  margin: 0 auto;
  padding: var(--page-padding);
}

/* ── HEADER ── */
.doc-header {
  border-top: 5px solid var(--primary);
  border-bottom: 1px solid var(--border);
  padding: 28px 0 22px;
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.brand-block { display: flex; flex-direction: column; gap: 4px; }
.brand-logo {
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: -0.04em;
}
.brand-logo span { color: var(--accent); }
.brand-tagline {
  font-family: var(--font-sans);
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.doc-meta {
  font-family: var(--font-sans);
  font-size: 10px;
  color: #64748b;
  text-align: right;
  line-height: 1.8;
}
.version-badge {
  display: inline-block;
  background: var(--primary);
  color: #fff;
  font-family: var(--font-sans);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 9px;
  border-radius: 3px;
  margin-bottom: 4px;
}

/* ── TITLE BLOCK ── */
.doc-title-block {
  text-align: center;
  margin-bottom: var(--section-gap);
  padding-bottom: var(--section-gap);
  border-bottom: 2px solid var(--primary);
}
.doc-type-label {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}
.doc-title {
  font-family: var(--font-sans);
  font-size: 32pt;
  font-weight: 900;
  color: var(--primary);
  line-height: 1.1;
  margin-bottom: 14px;
  letter-spacing: -0.02em;
}
.doc-subtitle {
  font-family: var(--font-sans);
  font-size: 11px;
  color: #64748b;
  margin-bottom: 16px;
  line-height: 1.7;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
.effective-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-light);
  color: var(--primary);
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid #93c5fd;
}

/* ── TOC ── */
.toc-block {
  background: var(--neutral-50);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: 0 8px 8px 0;
  padding: 24px 28px;
  margin-bottom: var(--section-gap);
}
.toc-title {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 16px;
}
.toc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}
.toc-item {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--neutral-700);
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 3px 0;
}
.toc-num {
  font-weight: 700;
  color: var(--accent);
  min-width: 20px;
}

/* ── CLAUSE SECTIONS ── */
.clause-section { margin-bottom: 32px; }
.clause-header {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1.5px solid var(--border);
}
.clause-number {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: var(--primary);
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
  letter-spacing: 0.05em;
}
.clause-title {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
}
.sub-clause {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  margin-bottom: 12px;
  padding-left: 12px;
}
.sub-clause-num {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--accent);
  font-weight: 700;
  padding-top: 3px;
}
.sub-sub-clause {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 6px;
  margin-bottom: 8px;
  padding-left: 52px;
}
.sub-sub-label {
  font-family: var(--font-sans);
  font-size: 11px;
  color: #94a3b8;
  padding-top: 3px;
}

/* ── DEFINED TERMS ── */
.defined-term {
  font-weight: 700;
  color: var(--primary);
  border-bottom: 1px dotted var(--primary-light);
}

/* ── NOTICE BOXES ── */
.notice-box {
  border-radius: 6px;
  padding: 14px 18px;
  margin: 18px 0;
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  font-size: 11pt;
}
.notice-box.warning { background: #fefce8; border: 1px solid #fde047; border-left: 4px solid #ca8a04; color: #713f12; }
.notice-box.danger  { background: #fff1f2; border: 1px solid #fca5a5; border-left: 4px solid var(--danger); color: #7f1d1d; }
.notice-box.info    { background: var(--accent-light); border: 1px solid #93c5fd; border-left: 4px solid var(--accent); color: #1e3a5f; }
.notice-icon { font-size: 15px; line-height: 1.8; }

/* ── TABLES ── */
.legal-table-wrapper { margin: 18px 0 26px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.legal-table-caption {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  padding: 10px 16px 8px;
  background: var(--neutral-100);
  border-bottom: 1px solid var(--border);
}
table.legal-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
table.legal-table thead tr { background: var(--primary); color: #fff; }
table.legal-table thead th { font-family: var(--font-sans); font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; padding: 11px 16px; text-align: left; }
table.legal-table tbody tr:nth-child(even) { background: var(--neutral-50); }
table.legal-table td { padding: 11px 16px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.6; }
table.legal-table td.num-cell { font-family: var(--font-sans); font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; }

/* ── SCHEDULE ── */
.schedule-block { margin-top: 52px; border-top: 3px double var(--primary); padding-top: 36px; }
.schedule-header { text-align: center; margin-bottom: 28px; }
.schedule-label { font-family: var(--font-sans); font-size: 9px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
.schedule-title { font-size: 18pt; font-weight: 800; color: var(--primary); font-family: var(--font-sans); }

/* ── FOOTER ── */
.doc-footer { margin-top: 52px; padding-top: 22px; border-top: 1px solid var(--border); }
.disclaimer-box {
  background: #fff8f1;
  border: 1px solid #fed7aa;
  border-left: 4px solid #ea580c;
  border-radius: 0 6px 6px 0;
  padding: 14px 18px;
  font-family: var(--font-sans);
  font-size: 9px;
  line-height: 1.8;
  color: #7c2d12;
  margin-bottom: 12px;
}
.page-number {
  font-family: var(--font-sans);
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  margin-top: 10px;
}
</style>
</head>
<body>

<!-- HEADER -->
<div class="doc-header">
  <div class="brand-block">
    <div class="brand-logo">Code<span>ward</span></div>
    <div class="brand-tagline">AI-Native Code Quality Platform</div>
  </div>
  <div class="doc-meta">
    <div class="version-badge">VERSION 2.0</div><br/>
    Document Type: Terms of Service<br/>
    Effective Date: 1 October 2026<br/>
    Supersedes: Version 1.0 (March 2025)
  </div>
</div>

<!-- TITLE -->
<div class="doc-title-block">
  <div class="doc-type-label">Legal Agreement</div>
  <div class="doc-title">Terms of Service</div>
  <div class="doc-subtitle">
    These Terms of Service ("Terms") constitute a binding legal agreement between you ("User") and
    Codeward Limited ("Codeward", "we", "us") governing all access to and use of the Codeward platform,
    autonomous AI agents, APIs, and related services. Read every clause carefully.
  </div>
  <div class="effective-badge">⚡ Effective 1 October 2026 &nbsp;·&nbsp; Governs all active and new accounts</div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc-block">
  <div class="toc-title">Table of Contents</div>
  <div class="toc-grid">
    <div class="toc-item"><span class="toc-num">1.</span> Acceptance &amp; Binding Effect</div>
    <div class="toc-item"><span class="toc-num">2.</span> Definitions</div>
    <div class="toc-item"><span class="toc-num">3.</span> Account Registration &amp; Access</div>
    <div class="toc-item"><span class="toc-num">4.</span> Permitted Use &amp; Restrictions</div>
    <div class="toc-item"><span class="toc-num">5.</span> AI Agent Operations &amp; Code Modifications</div>
    <div class="toc-item"><span class="toc-num">6.</span> Data Processing, Privacy &amp; Security</div>
    <div class="toc-item"><span class="toc-num">7.</span> Intellectual Property</div>
    <div class="toc-item"><span class="toc-num">8.</span> Subscription, Billing &amp; Payments</div>
    <div class="toc-item"><span class="toc-num">9.</span> Service Levels &amp; Availability</div>
    <div class="toc-item"><span class="toc-num">10.</span> Confidentiality</div>
    <div class="toc-item"><span class="toc-num">11.</span> Representations &amp; Warranties</div>
    <div class="toc-item"><span class="toc-num">12.</span> Indemnification</div>
    <div class="toc-item"><span class="toc-num">13.</span> Limitation of Liability</div>
    <div class="toc-item"><span class="toc-num">14.</span> Suspension &amp; Termination</div>
    <div class="toc-item"><span class="toc-num">15.</span> Dispute Resolution &amp; Governing Law</div>
    <div class="toc-item"><span class="toc-num">16.</span> Changes to Terms</div>
    <div class="toc-item"><span class="toc-num">17.</span> General Provisions</div>
    <div class="toc-item"><span class="toc-num">Sch. A</span> Prohibited Repository Categories</div>
    <div class="toc-item"><span class="toc-num">Sch. B</span> Data Processing Addendum Summary</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 1 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">1</span>
    <span class="clause-title">Acceptance &amp; Binding Effect</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.1</div>
    <div>By creating an account, connecting a Repository, initiating an Agent run, or otherwise accessing any part of the Platform, you confirm that you have read, understood, and agree to be legally bound by these Terms in their entirety.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.2</div>
    <div>If you are accepting on behalf of a company, partnership, or other legal entity ("Organization"), you represent and warrant that you have full legal authority to bind that Organization to these Terms. In such case, "you" and "User" refer to that Organization and all its Authorized Users.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.3</div>
    <div>If you do not agree with any provision of these Terms, you must immediately cease all use of the Platform and close your account. Continued use after the Effective Date of any updated Terms constitutes acceptance of those updates.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.4</div>
    <div>These Terms apply in addition to any Order Form, Statement of Work, Enterprise Agreement, or Data Processing Agreement executed between the parties. In the event of conflict, the Order Form or Enterprise Agreement shall prevail to the extent of that conflict.</div>
  </div>
  <div class="notice-box warning">
    <div class="notice-icon">⚠️</div>
    <div><strong>Minimum Age Requirement.</strong> You must be at least 18 years of age and legally capable of entering into binding contracts in your jurisdiction. Use of the Platform by persons under 18 is strictly prohibited.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 2 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">2</span>
    <span class="clause-title">Definitions</span>
  </div>
  <p style="margin-bottom:14px;">In these Terms, the following capitalised terms have the meanings set out below:</p>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Defined Terms</div>
    <table class="legal-table">
      <thead><tr><th>Term</th><th>Meaning</th></tr></thead>
      <tbody>
        <tr><td><strong>"Agent"</strong></td><td>Any autonomous or semi-autonomous AI system operated by Codeward that reads, analyses, modifies, or comments on code, including the Orchestrator, Guardian, and Analyzer Agents.</td></tr>
        <tr><td><strong>"Agent Output"</strong></td><td>Any Pull Request, inline comment, code suggestion, security report, score, decision, or other artefact generated by an Agent.</td></tr>
        <tr><td><strong>"Authorized User"</strong></td><td>An individual employee, contractor, or representative permitted by the User to access the Platform under the User's account credentials.</td></tr>
        <tr><td><strong>"Confidential Information"</strong></td><td>Source code, architecture diagrams, credentials, business logic, and any non-public technical or commercial information disclosed by either party.</td></tr>
        <tr><td><strong>"Ephemeral Sandbox"</strong></td><td>An isolated, short-lived virtual machine environment created solely for a single Agent run and destroyed immediately upon completion.</td></tr>
        <tr><td><strong>"Foundational Model"</strong></td><td>Third-party large language models (e.g., GPT-4o, Claude) used by Agents to perform analysis and generate outputs.</td></tr>
        <tr><td><strong>"Gate Decision"</strong></td><td>The Orchestrator Agent's final PASS or BLOCK verdict on a Pull Request, based on aggregated Analyzer Agent reports.</td></tr>
        <tr><td><strong>"Platform"</strong></td><td>The Codeward web dashboard, REST and webhook APIs, Agent infrastructure, CI/CD integrations, and all associated services.</td></tr>
        <tr><td><strong>"Repository"</strong></td><td>A version-controlled codebase connected to the Platform by the User via GitHub, GitLab, Bitbucket, or other supported Git providers.</td></tr>
        <tr><td><strong>"Run"</strong></td><td>A single execution cycle initiated by a commit, Pull Request event, or manual trigger, resulting in Agent analysis and a Gate Decision.</td></tr>
        <tr><td><strong>"Subscription"</strong></td><td>The paid or free-tier access plan selected by the User, as described on Codeward's pricing page.</td></tr>
        <tr><td><strong>"User Data"</strong></td><td>Source code, commit history, configuration files, and any other data submitted by the User to the Platform during a Run.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 3 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">3</span>
    <span class="clause-title">Account Registration &amp; Access</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">3.1</div>
    <div><strong>Eligibility.</strong> To register, you must provide accurate, current, and complete information. You must notify Codeward immediately of any change to that information. Codeward may suspend accounts where registration details are found to be false or misleading.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">3.2</div>
    <div><strong>Credential Security.</strong> You are solely responsible for maintaining the confidentiality of your account credentials, API keys, and OAuth tokens. You must not share credentials between Authorized Users. Any activity conducted under your credentials is your sole responsibility, whether authorised by you or not.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">3.3</div>
    <div><strong>Repository Permissions.</strong> By connecting a Repository, you represent that you hold or have been granted sufficient permissions (including repository admin rights) to authorise Codeward to clone, read, analyse, and post comments and Pull Request reviews to that Repository.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">3.4</div>
    <div><strong>Authorized Users.</strong> You may grant access to Authorized Users up to the limit specified in your Subscription plan. You are responsible for ensuring all Authorized Users comply with these Terms. Any breach by an Authorized User is treated as a breach by the User.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">3.5</div>
    <div><strong>Account Integrity.</strong> You must not create multiple accounts to circumvent usage limits, access suspended features, or obtain free-tier benefits beyond their intended scope.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 4 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">4</span>
    <span class="clause-title">Permitted Use &amp; Restrictions</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.1</div>
    <div><strong>Permitted Use.</strong> Subject to these Terms and your Subscription, Codeward grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for your internal software development and quality assurance purposes.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.2</div>
    <div><strong>Prohibited Conduct.</strong> You must not, and must ensure your Authorized Users do not:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>Attempt to reverse-engineer, decompile, disassemble, or derive source code from the Platform or any Agent;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>Use the Platform to analyse, train on, or benchmark third-party codebases without the right to do so;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Inject malicious code, prompt injection payloads, adversarial inputs, or any data designed to manipulate, confuse, or compromise Agent behaviour;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div>Resell, sublicense, or make the Platform available to third parties as a standalone service without a written white-label agreement with Codeward;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(e)</div><div>Use the Platform to process Repositories containing malware, ransomware, exploit code, or any software designed to cause harm to third-party systems;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(f)</div><div>Circumvent, disable, or interfere with any rate limits, security controls, sandbox boundaries, or access controls;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(g)</div><div>Use the Platform in violation of any applicable law, regulation, or export control regime, including the EU AI Act (2024), Kenya's Data Protection Act (2019), or equivalent legislation in your jurisdiction.</div></div>
  <div class="notice-box danger">
    <div class="notice-icon">🚫</div>
    <div><strong>Zero Tolerance.</strong> Any attempt to manipulate Agent decisions through adversarial inputs, prompt injection, or Repository tampering will result in immediate account termination and may be referred to law enforcement authorities.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 5 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">5</span>
    <span class="clause-title">AI Agent Operations &amp; Code Modifications</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.1</div>
    <div><strong>Nature of Agent Operations.</strong> The Platform operates a multi-agent pipeline. Upon a trigger event (e.g., a Pull Request), the Orchestrator Agent clones the Repository into an Ephemeral Sandbox, dispatches Analyzer Agents (covering security, architecture, performance, bloat, testing, documentation, dependencies, and code style), aggregates their findings, and issues a Gate Decision. The Guardian Agent then communicates findings to your development team via GitHub comments and Pull Request reviews.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.2</div>
    <div><strong>Gate Decisions.</strong> A BLOCK Gate Decision will cause the Platform to formally request changes on the Pull Request via your connected Git provider. A PASS decision will trigger a formal approval. These actions are automated and are taken on behalf of the Authorized User who configured the integration.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.3</div>
    <div><strong>User Responsibility for Merges.</strong> Notwithstanding any Gate Decision, you are solely and entirely responsible for all code merged into your Repository. A PASS Gate Decision is an automated quality signal, not a guarantee of correctness, security, or fitness for purpose. You must maintain human review processes appropriate to your risk profile. Codeward's Gate Decision does not relieve you of your engineering obligations.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.4</div>
    <div><strong>AI Inherent Limitations.</strong> You acknowledge that:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>Agent Outputs are generated by probabilistic Foundational Models and may contain errors, false positives, false negatives, or incomplete analysis;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>Agents do not have full semantic understanding of your business logic, domain context, or deployment environment;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Security findings issued by the Security Analyzer Agent are indicative, not exhaustive, and do not constitute a penetration test or formal security audit;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div>Agent behaviour may vary across Runs due to the non-deterministic nature of Foundational Models.</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.5</div>
    <div><strong>No Training on User Data.</strong> Codeward does not use your source code, Agent Outputs, or any User Data to fine-tune, retrain, or otherwise improve any Foundational Model. This prohibition applies to both first-party models and any third-party model providers engaged by Codeward.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">5.6</div>
    <div><strong>Agent Configuration.</strong> Users on eligible Subscription tiers may configure Agent sensitivity thresholds, blocked file patterns, and custom rulesets. Codeward is not liable for Gate Decisions that result from misconfigured user-defined rules.</div>
  </div>
  <div class="notice-box info">
    <div class="notice-icon">ℹ️</div>
    <div><strong>Human Oversight Requirement.</strong> In regulated industries (financial services, healthcare, critical infrastructure, government systems), you are required by applicable law and these Terms to maintain mandatory human review of all Agent Outputs before acting on them. Codeward's platform is a tool, not a replacement for professional engineering judgment.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 6 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">6</span>
    <span class="clause-title">Data Processing, Privacy &amp; Security</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.1</div>
    <div><strong>Ephemeral Sandbox Architecture.</strong> All code analysis is performed inside isolated Ephemeral Sandboxes. Each Sandbox is a single-use microVM created for one Run. Upon completion of the Agent loop, the Sandbox and all cloned source code are cryptographically wiped and destroyed within 60 seconds of Run completion. No source code persists on Codeward infrastructure beyond the duration of a Run.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.2</div>
    <div><strong>Data Retained.</strong> Codeward retains only the following post-Run data, stored in encrypted form:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>Agent findings and Gate Decision results (structured JSON), for your dashboard history;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>Run metadata (timestamp, repository name, commit SHA, duration, score);</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Anonymised aggregate metrics used for Platform performance monitoring (no source code or business logic).</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.3</div>
    <div><strong>Third-Party Model Providers.</strong> Source code excerpts (code snippets relevant to a specific finding, not full files) may be transmitted to third-party Foundational Model providers (currently OpenAI, Inc.) for inference purposes. These providers are bound by data processing agreements prohibiting training on customer data. You consent to this transmission by using the Platform.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.4</div>
    <div><strong>Personal Data.</strong> To the extent User Data contains personal data as defined under applicable data protection law (including Kenya's Data Protection Act 2019, the EU GDPR, or equivalent), Codeward processes such data as a data processor acting on your instructions. The Data Processing Addendum at Schedule B governs such processing.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.5</div>
    <div><strong>Security Standards.</strong> Codeward implements the following technical and organisational security measures:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>AES-256 encryption for all data at rest;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>TLS 1.3 for all data in transit;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Network-isolated Sandbox environments with no outbound internet access during Runs;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div>Role-based access controls and audit logging for all Platform infrastructure access;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(e)</div><div>Vulnerability disclosure programme and regular third-party penetration testing (annual minimum).</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.6</div>
    <div><strong>Incident Notification.</strong> In the event of a confirmed security incident affecting your User Data, Codeward will notify you within 72 hours of becoming aware of the incident, consistent with applicable data breach notification obligations.</div>
  </div>
  <div class="notice-box warning">
    <div class="notice-icon">⚠️</div>
    <div><strong>Third-Party Model Transmission.</strong> If your Repository contains classified, export-controlled, or government-classified source code, you must not connect it to the Platform without first obtaining a written waiver from Codeward confirming an on-premises or air-gapped deployment arrangement.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 7 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">7</span>
    <span class="clause-title">Intellectual Property</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.1</div>
    <div><strong>User Ownership.</strong> You retain all intellectual property rights in your source code, Repositories, and User Data. Nothing in these Terms transfers any ownership of your code to Codeward.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.2</div>
    <div><strong>Licence to Codeward.</strong> You grant Codeward a limited, non-exclusive, royalty-free licence to access, clone, process, and transmit your User Data solely to the extent necessary to provide the Platform services during the term of your Subscription. This licence terminates upon account closure.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.3</div>
    <div><strong>Agent Output Ownership.</strong> Agent Outputs (Pull Request comments, findings reports, Gate Decisions) are generated on your behalf. You own the Agent Outputs associated with your Runs. Codeward retains no proprietary claim over the substance of those outputs.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.4</div>
    <div><strong>Platform IP.</strong> All rights in the Platform, including the multi-agent orchestration architecture, scoring algorithms, Agent prompts, and the Codeward brand, are owned exclusively by Codeward or its licensors. These Terms grant no ownership rights in Platform IP.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.5</div>
    <div><strong>Feedback.</strong> If you provide suggestions, bug reports, or feature requests ("Feedback"), you grant Codeward a perpetual, irrevocable, royalty-free licence to use that Feedback to improve the Platform without any obligation or compensation to you.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 8 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">8</span>
    <span class="clause-title">Subscription, Billing &amp; Payments</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.1</div>
    <div><strong>Subscription Tiers.</strong> Codeward offers tiered Subscription plans (including a free Developer tier and paid Team, Business, and Enterprise tiers). Features, Run limits, Authorized User counts, and SLA commitments vary by tier as published on the pricing page.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.2</div>
    <div><strong>Billing Cycle.</strong> Paid Subscriptions are billed monthly or annually in advance. All fees are stated in USD unless an Order Form specifies otherwise. Fees are non-refundable except as expressly stated in clause 8.5.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.3</div>
    <div><strong>Automatic Renewal.</strong> Subscriptions renew automatically at the end of each billing period unless cancelled at least 5 business days before the renewal date via the account dashboard. You authorise Codeward to charge the payment method on file for each renewal.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.4</div>
    <div><strong>Failed Payments.</strong> If a payment fails, Codeward will attempt to re-charge the payment method up to three times over 7 days. If payment remains outstanding after 7 days, the account will be downgraded to the free tier and Run history will be placed in read-only mode pending settlement.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.5</div>
    <div><strong>Refunds.</strong> Codeward will issue a pro-rata refund for the unused portion of a paid annual Subscription if you cancel within 30 days of the initial purchase or annual renewal date. No refunds are issued for monthly Subscriptions or for accounts suspended due to Terms violations.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.6</div>
    <div><strong>Price Changes.</strong> Codeward may revise Subscription pricing with 60 days' written notice to existing subscribers. Price changes do not apply to the current billing period and take effect at the next renewal date after the notice period.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.7</div>
    <div><strong>Taxes.</strong> All fees are exclusive of applicable taxes, levies, and duties. You are responsible for all taxes applicable to your Subscription in your jurisdiction. Where Codeward is required by law to collect such taxes, they will be added to the invoice.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 9 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">9</span>
    <span class="clause-title">Service Levels &amp; Availability</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.1</div>
    <div><strong>Uptime Target.</strong> Codeward targets 99.5% monthly Platform availability for paid Subscription tiers. Availability is measured excluding Scheduled Maintenance windows and Force Majeure events.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.2</div>
    <div><strong>Scheduled Maintenance.</strong> Codeward will provide at least 48 hours' notice of Scheduled Maintenance windows. Maintenance will be conducted during low-traffic periods (weekends, 00:00–06:00 UTC where possible).</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.3</div>
    <div><strong>Service Credits.</strong> If monthly availability falls below 99.5% in any calendar month (excluding events in 9.2), Business and Enterprise tier subscribers may claim a service credit equal to 10% of their monthly fee for each full percentage point below the target. Total credits shall not exceed 30% of monthly fees. Credits are the sole remedy for availability failures.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.4</div>
    <div><strong>Third-Party Dependencies.</strong> Platform availability may be affected by third-party services including GitHub, GitLab, OpenAI API, and cloud infrastructure providers. Downtime attributable to these third parties does not constitute a breach of Codeward's availability obligations.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.5</div>
    <div><strong>Free Tier.</strong> The free Developer tier is provided on a best-efforts basis with no uptime commitment and no service credits.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 10 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">10</span>
    <span class="clause-title">Confidentiality</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.1</div>
    <div><strong>Mutual Obligation.</strong> Each party agrees to hold the other party's Confidential Information in strict confidence, using at least the same degree of care it uses to protect its own confidential information, but in no case less than reasonable care.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.2</div>
    <div><strong>Permitted Disclosures.</strong> Confidential Information may be disclosed only to employees, contractors, and agents who have a need to know for the purposes of these Terms and who are bound by confidentiality obligations no less protective than those herein.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.3</div>
    <div><strong>Exclusions.</strong> Confidentiality obligations do not apply to information that: (a) is or becomes publicly known through no breach of these Terms; (b) was independently developed without reference to Confidential Information; (c) is required to be disclosed by law, court order, or regulatory authority, provided the disclosing party gives prompt written notice to the other party where legally permissible.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.4</div>
    <div><strong>Survival.</strong> Confidentiality obligations survive termination of these Terms for a period of 5 years, except with respect to trade secrets, which shall be protected for as long as they remain trade secrets under applicable law.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 11 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">11</span>
    <span class="clause-title">Representations &amp; Warranties</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.1</div>
    <div><strong>User Warranties.</strong> You represent and warrant that:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>You have the legal right, authority, and all necessary permissions to connect each Repository to the Platform;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>Your use of the Platform will comply with all applicable laws and regulations;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Your User Data does not infringe the intellectual property rights of any third party;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div>You will not introduce data into the Platform designed to cause harm to Codeward's infrastructure or other users.</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.2</div>
    <div><strong>Codeward Warranties.</strong> Codeward warrants that it will provide the Platform with reasonable skill and care consistent with generally accepted industry standards for AI-assisted developer tooling.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.3</div>
    <div><strong>Disclaimer.</strong> Except as expressly stated in clause 11.2, the Platform and all Agent Outputs are provided "AS IS" and "AS AVAILABLE". Codeward expressly disclaims all implied warranties, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. Codeward does not warrant that Agent Outputs will be error-free or that the Platform will meet your specific requirements.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 12 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">12</span>
    <span class="clause-title">Indemnification</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">12.1</div>
    <div><strong>User Indemnity.</strong> You agree to defend, indemnify, and hold harmless Codeward, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising out of or relating to:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>Your breach of any provision of these Terms;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>Your use of the Platform in violation of applicable law;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Any claim that your User Data or source code infringes a third party's intellectual property rights;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div>Any production incident, data breach, or system failure resulting from code merged by you after a PASS Gate Decision.</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">12.2</div>
    <div><strong>Codeward Indemnity.</strong> Codeward will defend you against any third-party claim that the Platform (excluding User Data) directly infringes a valid patent, copyright, or trade secret, provided you promptly notify Codeward in writing and grant Codeward sole control of the defence.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 13 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">13</span>
    <span class="clause-title">Limitation of Liability</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">13.1</div>
    <div><strong>Exclusion of Consequential Loss.</strong> To the maximum extent permitted by applicable law, Codeward shall not be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to: loss of profits, loss of revenue, loss of data, loss of business opportunity, production outages, or reputational harm — regardless of whether such damages were foreseeable or Codeward had been advised of their possibility.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">13.2</div>
    <div><strong>Aggregate Cap.</strong> Codeward's total aggregate liability to you under or in connection with these Terms, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall not exceed the greater of: (a) the total fees paid by you to Codeward in the 12 months immediately preceding the event giving rise to the claim; or (b) USD 500.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">13.3</div>
    <div><strong>Essential Basis.</strong> You acknowledge that the limitations in clauses 13.1 and 13.2 reflect a reasonable allocation of risk between the parties and are an essential basis of the bargain between the parties. Codeward would not have entered into these Terms without these limitations.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">13.4</div>
    <div><strong>Exceptions.</strong> Nothing in these Terms limits either party's liability for: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; (c) any liability that cannot be limited or excluded by applicable law.</div>
  </div>
  <div class="notice-box danger">
    <div class="notice-icon">⚠️</div>
    <div><strong>Critical Production Systems.</strong> You must not rely solely on Agent Gate Decisions as the final approval mechanism for code deployments to safety-critical, life-critical, or mission-critical production systems. In such environments, mandatory human senior engineering review is required prior to any merge. Codeward accepts no liability for harms arising from deployment of Agent-reviewed code to such systems.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 14 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">14</span>
    <span class="clause-title">Suspension &amp; Termination</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.1</div>
    <div><strong>Termination by User.</strong> You may terminate your Subscription at any time via the account dashboard. Termination takes effect at the end of the current billing period. You remain responsible for all fees accrued prior to termination.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.2</div>
    <div><strong>Termination by Codeward for Cause.</strong> Codeward may terminate your account immediately upon written notice if: (a) you materially breach these Terms and fail to remedy the breach within 14 days of notice; (b) you engage in any conduct described in clause 4.2; (c) you become insolvent or make an assignment for the benefit of creditors.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.3</div>
    <div><strong>Suspension.</strong> Codeward may suspend access to the Platform without notice where: (a) there is a credible security threat; (b) your usage is causing material harm to Platform infrastructure or other users; (c) a payment is more than 14 days overdue.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.4</div>
    <div><strong>Effect of Termination.</strong> Upon termination, your licence to use the Platform ceases immediately. Codeward will delete your Run history and retained Agent findings within 90 days of termination, subject to any legal hold obligations. Clauses 7, 10, 12, 13, and 15 survive termination.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.5</div>
    <div><strong>Data Export.</strong> Prior to account closure, you may export your Run history and findings via the dashboard export feature. Codeward is not obligated to retain or provide your data after the 90-day deletion window.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 15 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">15</span>
    <span class="clause-title">Dispute Resolution &amp; Governing Law</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.1</div>
    <div><strong>Governing Law.</strong> These Terms shall be governed by and construed in accordance with the laws of [JURISDICTION — e.g., Kenya / England &amp; Wales / Delaware], without regard to its conflict of law provisions.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.2</div>
    <div><strong>Escalation Process.</strong> Before initiating formal proceedings, the parties agree to attempt good-faith resolution by escalating the dispute to senior management of each party. The escalation period is 30 days from written notice of the dispute.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.3</div>
    <div><strong>Arbitration.</strong> If the dispute is not resolved within the escalation period, it shall be finally resolved by binding arbitration under the rules of [NAIROBI CENTRE FOR INTERNATIONAL ARBITRATION / ICC / LCIA], with proceedings conducted in [CITY] in the English language. The arbitral award shall be final and enforceable in any competent court.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.4</div>
    <div><strong>Injunctive Relief.</strong> Nothing in this clause prevents either party from seeking urgent injunctive or other equitable relief from a court of competent jurisdiction to prevent irreparable harm pending arbitration.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.5</div>
    <div><strong>Class Action Waiver.</strong> All disputes must be brought in an individual capacity. Neither party may participate in a class action, collective arbitration, or representative proceeding in connection with these Terms.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 16 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">16</span>
    <span class="clause-title">Changes to Terms</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">16.1</div>
    <div>Codeward may update these Terms at any time. For material changes, Codeward will provide at least 30 days' notice by email to your registered address and/or a prominent in-app notification. The updated Terms will be posted at codeward.dev/legal/terms with the revised Effective Date.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">16.2</div>
    <div>Your continued use of the Platform after the effective date of any revision constitutes your acceptance of the revised Terms. If you object to a material change, your sole remedy is to terminate your Subscription before the change takes effect.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- CLAUSE 17 -->
<!-- ═══════════════════════════════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">17</span>
    <span class="clause-title">General Provisions</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.1</div>
    <div><strong>Entire Agreement.</strong> These Terms, together with any applicable Order Form, Schedule, or Enterprise Agreement, constitute the entire agreement between the parties regarding the Platform and supersede all prior representations, negotiations, and agreements.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.2</div>
    <div><strong>Severability.</strong> If any provision of these Terms is held to be invalid or unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.3</div>
    <div><strong>Waiver.</strong> No failure or delay by either party to exercise any right under these Terms operates as a waiver. A waiver of any specific breach does not constitute a waiver of future breaches.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.4</div>
    <div><strong>Assignment.</strong> You may not assign or transfer any rights or obligations under these Terms without Codeward's prior written consent. Codeward may assign these Terms in connection with a merger, acquisition, or sale of substantially all of its assets, upon 30 days' notice to you.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.5</div>
    <div><strong>Force Majeure.</strong> Neither party shall be liable for failure to perform obligations under these Terms to the extent caused by events beyond reasonable control, including natural disasters, acts of government, internet infrastructure failures, cyberattacks on third-party providers, or pandemics — provided the affected party gives prompt written notice and uses reasonable efforts to mitigate the impact.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.6</div>
    <div><strong>Notices.</strong> Legal notices under these Terms must be in writing and delivered by email with read receipt to legal@codeward.dev (for Codeward) or to the email address on your registered account (for you). Notices are effective upon confirmed delivery.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.7</div>
    <div><strong>Independent Contractors.</strong> The parties are independent contractors. Nothing in these Terms creates any partnership, joint venture, agency, franchise, or employment relationship.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">17.8</div>
    <div><strong>Export Controls.</strong> You must not access or use the Platform in violation of any applicable export control or trade sanctions laws, including those administered by OFAC, BIS, or equivalent regulatory bodies in your jurisdiction.</div>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- SCHEDULE A -->
<!-- ═══════════════════════════════════════ -->
<div class="schedule-block">
  <div class="schedule-header">
    <div class="schedule-label">Schedule A</div>
    <div class="schedule-title">Prohibited Repository Categories</div>
  </div>
  <p style="margin-bottom:16px;">The following Repository types are prohibited from connection to the Platform. Connecting a prohibited Repository constitutes a material breach and grounds for immediate termination under clause 14.2.</p>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Prohibited Categories</div>
    <table class="legal-table">
      <thead><tr><th>#</th><th>Category</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td class="num-cell">1</td><td>Malware &amp; Exploit Code</td><td>Repositories containing ransomware, trojans, keyloggers, rootkits, or exploit frameworks intended for offensive use.</td></tr>
        <tr><td class="num-cell">2</td><td>Weapons Systems</td><td>Software components for autonomous weapons, guidance systems, or dual-use military technology without applicable export licences.</td></tr>
        <tr><td class="num-cell">3</td><td>Child Exploitation Material</td><td>Any software that facilitates, distributes, or generates CSAM or related content.</td></tr>
        <tr><td class="num-cell">4</td><td>Classified Government Systems</td><td>Source code classified at any government security classification level, without a prior written air-gapped deployment agreement.</td></tr>
        <tr><td class="num-cell">5</td><td>Sanctioned Entity Code</td><td>Repositories owned by or developed on behalf of entities on applicable sanctions lists (OFAC SDN, UN, EU, UK HMT).</td></tr>
        <tr><td class="num-cell">6</td><td>Non-consensual Surveillance</td><td>Stalkerware, covert tracking software, or tools designed to surveil individuals without their knowledge or consent.</td></tr>
        <tr><td class="num-cell">7</td><td>Disinformation Infrastructure</td><td>Systems designed to generate, amplify, or distribute political disinformation, deepfakes, or coordinated inauthentic behaviour at scale.</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ═══════════════════════════════════════ -->
<!-- SCHEDULE B -->
<!-- ═══════════════════════════════════════ -->
<div class="schedule-block">
  <div class="schedule-header">
    <div class="schedule-label">Schedule B</div>
    <div class="schedule-title">Data Processing Addendum — Summary</div>
  </div>
  <p style="margin-bottom:16px;">This Schedule summarises the key data processing arrangements. Enterprise customers may request the full Data Processing Agreement (DPA) from legal@codeward.dev.</p>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Data Processing Summary</div>
    <table class="legal-table">
      <thead><tr><th>Parameter</th><th>Detail</th></tr></thead>
      <tbody>
        <tr><td><strong>Data Controller</strong></td><td>The User (you)</td></tr>
        <tr><td><strong>Data Processor</strong></td><td>Codeward Limited</td></tr>
        <tr><td><strong>Sub-processors</strong></td><td>OpenAI, Inc. (inference); [CLOUD PROVIDER] (infrastructure); [MONITORING TOOL] (observability)</td></tr>
        <tr><td><strong>Processing Purpose</strong></td><td>Automated code analysis and quality gating services as described in these Terms</td></tr>
        <tr><td><strong>Data Categories</strong></td><td>Source code, commit metadata, developer usernames (from Git history), configuration files</td></tr>
        <tr><td><strong>Retention</strong></td><td>Source code: destroyed within 60 seconds of Run completion. Findings metadata: retained for duration of Subscription + 90 days post-termination.</td></tr>
        <tr><td><strong>Transfer Mechanism</strong></td><td>Standard Contractual Clauses (SCCs) for transfers to OpenAI (USA). Data remains in [REGION] for storage.</td></tr>
        <tr><td><strong>Data Subject Rights</strong></td><td>Requests to be forwarded to Codeward at privacy@codeward.dev within 30 days</td></tr>
        <tr><td><strong>Security Measures</strong></td><td>AES-256 at rest, TLS 1.3 in transit, network-isolated sandboxes, annual pen testing</td></tr>
        <tr><td><strong>Breach Notification</strong></td><td>Within 72 hours of confirmed incident</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  <div class="disclaimer-box">
    <strong>Legal Notice.</strong> These Terms of Service were drafted for Codeward Limited. They do not constitute legal advice. You are strongly encouraged to have a qualified legal practitioner in your jurisdiction review these Terms before deploying them as your binding user agreement. Jurisdiction-specific requirements (e.g., EU AI Act compliance, GDPR Article 13 disclosures, Kenya DPA registration) may require additional provisions not reflected herein.
  </div>
  <div class="page-number">Codeward Limited &nbsp;·&nbsp; Terms of Service v2.0 &nbsp;·&nbsp; Effective 1 October 2026 &nbsp;·&nbsp; codeward.dev/legal/terms</div>
</div>

</body>
</html>