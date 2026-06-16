<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Codeward — Privacy Policy</title>
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
.brand-logo { font-family: var(--font-sans); font-size: 22px; font-weight: 800; color: var(--primary); letter-spacing: -0.04em; }
.brand-logo span { color: var(--accent); }
.brand-tagline { font-family: var(--font-sans); font-size: 10px; color: #64748b; letter-spacing: 0.12em; text-transform: uppercase; }
.doc-meta { font-family: var(--font-sans); font-size: 10px; color: #64748b; text-align: right; line-height: 1.8; }
.version-badge { display: inline-block; background: var(--primary); color: #fff; font-family: var(--font-sans); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 9px; border-radius: 3px; margin-bottom: 4px; }

/* ── TITLE ── */
.doc-title-block { text-align: center; margin-bottom: var(--section-gap); padding-bottom: var(--section-gap); border-bottom: 2px solid var(--primary); }
.doc-type-label { font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
.doc-title { font-family: var(--font-sans); font-size: 32pt; font-weight: 900; color: var(--primary); line-height: 1.1; margin-bottom: 14px; letter-spacing: -0.02em; }
.doc-subtitle { font-family: var(--font-sans); font-size: 11px; color: #64748b; margin-bottom: 16px; line-height: 1.7; max-width: 620px; margin-left: auto; margin-right: auto; }
.effective-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--accent-light); color: var(--primary); font-family: var(--font-sans); font-size: 10px; font-weight: 700; padding: 6px 16px; border-radius: 20px; border: 1px solid #93c5fd; }

/* ── QUICK SUMMARY CARD ── */
.summary-card {
  background: var(--neutral-50);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 28px 32px;
  margin-bottom: var(--section-gap);
}
.summary-card-title {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 32px;
}
.summary-item { display: flex; gap: 10px; align-items: flex-start; }
.summary-icon { font-size: 16px; line-height: 1.6; flex-shrink: 0; }
.summary-text { font-family: var(--font-sans); font-size: 11px; line-height: 1.6; color: var(--neutral-700); }
.summary-text strong { color: var(--primary); display: block; font-size: 11px; margin-bottom: 2px; }

/* ── TOC ── */
.toc-block { background: var(--neutral-50); border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 0 8px 8px 0; padding: 24px 28px; margin-bottom: var(--section-gap); }
.toc-title { font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--primary); margin-bottom: 16px; }
.toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
.toc-item { font-family: var(--font-sans); font-size: 11px; color: var(--neutral-700); display: flex; gap: 8px; align-items: baseline; padding: 3px 0; }
.toc-num { font-weight: 700; color: var(--accent); min-width: 20px; }

/* ── CLAUSES ── */
.clause-section { margin-bottom: 32px; }
.clause-header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5px solid var(--border); }
.clause-number { font-family: var(--font-sans); font-size: 10px; font-weight: 800; color: #fff; background: var(--primary); padding: 4px 10px; border-radius: 4px; white-space: nowrap; }
.clause-title { font-family: var(--font-sans); font-size: 13px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--primary); }
.sub-clause { display: grid; grid-template-columns: 56px 1fr; gap: 8px; margin-bottom: 12px; padding-left: 12px; }
.sub-clause-num { font-family: var(--font-sans); font-size: 11px; color: var(--accent); font-weight: 700; padding-top: 3px; }
.sub-sub-clause { display: grid; grid-template-columns: 40px 1fr; gap: 6px; margin-bottom: 8px; padding-left: 52px; }
.sub-sub-label { font-family: var(--font-sans); font-size: 11px; color: #94a3b8; padding-top: 3px; }
.defined-term { font-weight: 700; color: var(--primary); border-bottom: 1px dotted var(--primary-light); }

/* ── NOTICE BOXES ── */
.notice-box { border-radius: 6px; padding: 14px 18px; margin: 18px 0; display: grid; grid-template-columns: 24px 1fr; gap: 12px; font-size: 11pt; }
.notice-box.warning { background: #fefce8; border: 1px solid #fde047; border-left: 4px solid #ca8a04; color: #713f12; }
.notice-box.danger  { background: #fff1f2; border: 1px solid #fca5a5; border-left: 4px solid var(--danger); color: #7f1d1d; }
.notice-box.info    { background: var(--accent-light); border: 1px solid #93c5fd; border-left: 4px solid var(--accent); color: #1e3a5f; }
.notice-box.success { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid var(--success); color: #14532d; }
.notice-icon { font-size: 15px; line-height: 1.8; }

/* ── TABLES ── */
.legal-table-wrapper { margin: 18px 0 26px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.legal-table-caption { font-family: var(--font-sans); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); padding: 10px 16px 8px; background: var(--neutral-100); border-bottom: 1px solid var(--border); }
table.legal-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
table.legal-table thead tr { background: var(--primary); color: #fff; }
table.legal-table thead th { font-family: var(--font-sans); font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; padding: 11px 16px; text-align: left; }
table.legal-table tbody tr:nth-child(even) { background: var(--neutral-50); }
table.legal-table td { padding: 11px 16px; border-bottom: 1px solid var(--border); vertical-align: top; line-height: 1.6; font-size: 11pt; }
table.legal-table td.num-cell { font-family: var(--font-sans); font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; }
.tag-yes { display:inline-block; background:#dcfce7; color:#14532d; font-family:var(--font-sans); font-size:9px; font-weight:700; padding:2px 7px; border-radius:10px; }
.tag-no  { display:inline-block; background:#fee2e2; color:#7f1d1d; font-family:var(--font-sans); font-size:9px; font-weight:700; padding:2px 7px; border-radius:10px; }

/* ── RIGHTS GRID ── */
.rights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 18px 0; }
.right-card { border: 1px solid var(--border); border-radius: 8px; padding: 16px 18px; background: var(--neutral-50); }
.right-card-title { font-family: var(--font-sans); font-size: 11px; font-weight: 800; color: var(--primary); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.right-card-body { font-family: var(--font-sans); font-size: 10.5px; color: var(--neutral-700); line-height: 1.6; }

/* ── SCHEDULE ── */
.schedule-block { margin-top: 52px; border-top: 3px double var(--primary); padding-top: 36px; }
.schedule-header { text-align: center; margin-bottom: 28px; }
.schedule-label { font-family: var(--font-sans); font-size: 9px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
.schedule-title { font-size: 18pt; font-weight: 800; color: var(--primary); font-family: var(--font-sans); }

/* ── FOOTER ── */
.doc-footer { margin-top: 52px; padding-top: 22px; border-top: 1px solid var(--border); }
.disclaimer-box { background: #fff8f1; border: 1px solid #fed7aa; border-left: 4px solid #ea580c; border-radius: 0 6px 6px 0; padding: 14px 18px; font-family: var(--font-sans); font-size: 9px; line-height: 1.8; color: #7c2d12; margin-bottom: 12px; }
.disclaimer-box strong { display: block; font-size: 10px; margin-bottom: 4px; letter-spacing: 0.06em; text-transform: uppercase; }
.page-number { font-family: var(--font-sans); font-size: 9px; color: #94a3b8; text-align: center; margin-top: 10px; }
p { margin-bottom: 12px; }
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
    <div class="version-badge">VERSION 1.0</div><br/>
    Document Type: Privacy Policy<br/>
    Effective Date: 1 October 2026<br/>
    Contact: privacy@codeward.dev
  </div>
</div>

<!-- TITLE -->
<div class="doc-title-block">
  <div class="doc-type-label">Data &amp; Privacy</div>
  <div class="doc-title">Privacy Policy</div>
  <div class="doc-subtitle">
    This Privacy Policy explains what personal data Codeward Limited collects, why we collect it,
    how we use and protect it, who we share it with, and what rights you have over it.
    We are committed to transparency about our AI pipeline's interaction with your data.
  </div>
  <div class="effective-badge">🔒 Effective 1 October 2026 &nbsp;·&nbsp; Applies to all Codeward users worldwide</div>
</div>

<!-- QUICK SUMMARY -->
<div class="summary-card">
  <div class="summary-card-title">🔍 Privacy at a Glance — Key Facts</div>
  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-icon">🗑️</div>
      <div class="summary-text"><strong>Source Code Deleted in 60 Seconds</strong>Your cloned repository is destroyed within 60 seconds of every Agent run completing. We never store your source code long-term.</div>
    </div>
    <div class="summary-item">
      <div class="summary-icon">🚫</div>
      <div class="summary-text"><strong>No AI Training on Your Code</strong>Your source code is never used to train, fine-tune, or improve any AI model — ours or our providers'.</div>
    </div>
    <div class="summary-item">
      <div class="summary-icon">🤖</div>
      <div class="summary-text"><strong>Code Snippets Sent to OpenAI</strong>Small, relevant code excerpts are sent to OpenAI for inference only. OpenAI is contractually prohibited from training on this data.</div>
    </div>
    <div class="summary-item">
      <div class="summary-icon">📊</div>
      <div class="summary-text"><strong>We Keep Run Metadata</strong>Agent findings, scores, and run metadata are retained for your dashboard history for the duration of your subscription.</div>
    </div>
    <div class="summary-item">
      <div class="summary-icon">🌍</div>
      <div class="summary-text"><strong>Multi-Jurisdiction Compliance</strong>We comply with Kenya DPA 2019, EU GDPR, and UK GDPR. You have enforceable rights regardless of where you are located.</div>
    </div>
    <div class="summary-item">
      <div class="summary-icon">✉️</div>
      <div class="summary-text"><strong>Contact Us Anytime</strong>For data requests, questions, or complaints: privacy@codeward.dev. We respond within 30 days.</div>
    </div>
  </div>
</div>

<!-- TOC -->
<div class="toc-block">
  <div class="toc-title">Table of Contents</div>
  <div class="toc-grid">
    <div class="toc-item"><span class="toc-num">1.</span> Who We Are &amp; How to Contact Us</div>
    <div class="toc-item"><span class="toc-num">2.</span> Scope of This Policy</div>
    <div class="toc-item"><span class="toc-num">3.</span> What Data We Collect</div>
    <div class="toc-item"><span class="toc-num">4.</span> How We Collect Data</div>
    <div class="toc-item"><span class="toc-num">5.</span> Why We Process Data (Legal Bases)</div>
    <div class="toc-item"><span class="toc-num">6.</span> The AI Pipeline &amp; Your Source Code</div>
    <div class="toc-item"><span class="toc-num">7.</span> How We Use Your Data</div>
    <div class="toc-item"><span class="toc-num">8.</span> Who We Share Data With</div>
    <div class="toc-item"><span class="toc-num">9.</span> International Data Transfers</div>
    <div class="toc-item"><span class="toc-num">10.</span> Data Retention &amp; Deletion</div>
    <div class="toc-item"><span class="toc-num">11.</span> Security Measures</div>
    <div class="toc-item"><span class="toc-num">12.</span> Your Rights</div>
    <div class="toc-item"><span class="toc-num">13.</span> Cookies &amp; Tracking</div>
    <div class="toc-item"><span class="toc-num">14.</span> Children's Privacy</div>
    <div class="toc-item"><span class="toc-num">15.</span> AI-Specific Disclosures (EU AI Act)</div>
    <div class="toc-item"><span class="toc-num">16.</span> Changes to This Policy</div>
    <div class="toc-item"><span class="toc-num">Sch. A</span> Sub-Processor Register</div>
    <div class="toc-item"><span class="toc-num">Sch. B</span> Retention Schedule</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 1 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">1</span>
    <span class="clause-title">Who We Are &amp; How to Contact Us</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.1</div>
    <div><strong>Data Controller.</strong> The data controller responsible for your personal data is <span class="defined-term">Codeward Limited</span>, a company incorporated under the laws of [JURISDICTION], with its registered office at [REGISTERED ADDRESS] ("Codeward", "we", "us", "our").</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.2</div>
    <div><strong>Data Protection Contact.</strong> For all privacy-related enquiries, data subject requests, or complaints, please contact our Privacy Team at: <strong>privacy@codeward.dev</strong>. We aim to respond to all requests within 30 calendar days.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.3</div>
    <div><strong>Data Protection Officer.</strong> [If required by applicable law] Codeward has appointed a Data Protection Officer (DPO) who can be reached at dpo@codeward.dev.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">1.4</div>
    <div><strong>EU/UK Representative.</strong> For users in the European Economic Area or United Kingdom, Codeward's designated representative for GDPR purposes is [EU REPRESENTATIVE NAME AND ADDRESS].</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 2 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">2</span>
    <span class="clause-title">Scope of This Policy</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">2.1</div>
    <div>This Policy applies to all personal data processed by Codeward in connection with your use of the Platform, including the Codeward web dashboard, REST API, webhook integrations, and associated Agent infrastructure.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">2.2</div>
    <div>This Policy applies to: (a) individual users who register for a Codeward account; (b) Authorized Users of organisational accounts; (c) visitors to codeward.dev and its subdomains; (d) developers whose GitHub usernames or commit data appear in connected Repositories.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">2.3</div>
    <div>This Policy does not apply to third-party services linked from the Platform (e.g., GitHub, GitLab, OpenAI). Those services have their own privacy policies which you should review independently.</div>
  </div>
  <div class="notice-box info">
    <div class="notice-icon">ℹ️</div>
    <div><strong>Developer Usernames in Git History.</strong> When a Repository is connected, Git commit history may contain the names and email addresses of developers who contributed to that codebase. Codeward processes this data as metadata for run attribution and does not use it for any other purpose. It is deleted with the Ephemeral Sandbox within 60 seconds of run completion.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 3 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">3</span>
    <span class="clause-title">What Data We Collect</span>
  </div>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Categories of Personal Data Collected</div>
    <table class="legal-table">
      <thead><tr><th>Category</th><th>Specific Data Points</th><th>Source</th><th>Required?</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Account Identity Data</strong></td>
          <td>Full name, email address, username, profile photo (if provided via OAuth)</td>
          <td>You / GitHub OAuth</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Authentication Data</strong></td>
          <td>Hashed passwords, OAuth tokens, API keys (hashed), session tokens</td>
          <td>You / OAuth provider</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Billing &amp; Payment Data</strong></td>
          <td>Billing name, billing address, last 4 digits of card, invoice history. Full card details are processed by Stripe and never stored by Codeward.</td>
          <td>You / Stripe</td>
          <td>Paid plans only</td>
        </tr>
        <tr>
          <td><strong>Repository Metadata</strong></td>
          <td>Repository name, connected Git provider, branch names, commit SHAs, pull request IDs, file path structure</td>
          <td>Git provider API</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Source Code (Transient)</strong></td>
          <td>Full repository contents cloned into Ephemeral Sandbox. <strong>Destroyed within 60 seconds of run completion.</strong> Never written to persistent storage.</td>
          <td>Git provider</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Agent Run Data</strong></td>
          <td>Gate Decision (PASS/BLOCK), quality score, findings JSON, run timestamp, run duration, model used, agent types invoked</td>
          <td>Platform-generated</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Usage &amp; Telemetry Data</strong></td>
          <td>Feature usage events, API call logs, dashboard page views, error logs, run trigger types</td>
          <td>Platform-generated</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
        <tr>
          <td><strong>Communication Data</strong></td>
          <td>Support ticket content, email correspondence, in-app feedback submissions</td>
          <td>You</td>
          <td><span class="tag-no">NO</span></td>
        </tr>
        <tr>
          <td><strong>Device &amp; Browser Data</strong></td>
          <td>IP address, browser type and version, operating system, device type, referring URL</td>
          <td>Automatically collected</td>
          <td><span class="tag-yes">YES</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="sub-clause">
    <div class="sub-clause-num">3.1</div>
    <div><strong>Special Categories.</strong> Codeward does not intentionally collect special category personal data (e.g., health, biometric, racial, or political data). If such data appears incidentally in source code or support communications, it is processed solely to provide the requested service and deleted per the standard retention schedule.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 4 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">4</span>
    <span class="clause-title">How We Collect Data</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.1</div>
    <div><strong>Directly from You:</strong> When you register an account, connect a Repository, configure Agent settings, contact support, or respond to surveys.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.2</div>
    <div><strong>Via OAuth Integration:</strong> When you authenticate via GitHub, GitLab, or Bitbucket OAuth, we receive your public profile, email address, and the repository access permissions you grant.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.3</div>
    <div><strong>Automatically via the Platform:</strong> Usage telemetry, API logs, error reports, and device/browser data are collected automatically when you interact with the Platform.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.4</div>
    <div><strong>From Third-Party Providers:</strong> Payment data from Stripe; authentication events from your OAuth provider; optionally, organisation and team data from your Git provider's API.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">4.5</div>
    <div><strong>From the AI Pipeline:</strong> Agent run metadata, Gate Decisions, and findings are generated by Codeward's AI Agent infrastructure during each Run and stored as described in Section 10.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 5 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">5</span>
    <span class="clause-title">Why We Process Data — Legal Bases</span>
  </div>
  <p>We process your personal data only where we have a valid legal basis. The table below sets out our processing purposes and corresponding legal bases under GDPR and the Kenya Data Protection Act 2019.</p>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Processing Purposes &amp; Legal Bases</div>
    <table class="legal-table">
      <thead><tr><th>Purpose</th><th>Data Used</th><th>Legal Basis (GDPR)</th><th>Legal Basis (Kenya DPA)</th></tr></thead>
      <tbody>
        <tr>
          <td>Account creation and authentication</td>
          <td>Identity, authentication data</td>
          <td>Contract (Art. 6(1)(b))</td>
          <td>Necessary for performance of contract</td>
        </tr>
        <tr>
          <td>Providing the AI code analysis service</td>
          <td>Source code (transient), repository metadata, run data</td>
          <td>Contract (Art. 6(1)(b))</td>
          <td>Necessary for performance of contract</td>
        </tr>
        <tr>
          <td>Processing subscription payments</td>
          <td>Billing data</td>
          <td>Contract (Art. 6(1)(b))</td>
          <td>Necessary for performance of contract</td>
        </tr>
        <tr>
          <td>Sending transactional emails (receipts, alerts)</td>
          <td>Email address, run data</td>
          <td>Contract (Art. 6(1)(b))</td>
          <td>Necessary for performance of contract</td>
        </tr>
        <tr>
          <td>Platform security, fraud prevention, abuse detection</td>
          <td>Usage data, device data, IP address</td>
          <td>Legitimate Interests (Art. 6(1)(f))</td>
          <td>Legitimate interests of the controller</td>
        </tr>
        <tr>
          <td>Platform analytics and performance improvement</td>
          <td>Anonymised usage telemetry</td>
          <td>Legitimate Interests (Art. 6(1)(f))</td>
          <td>Legitimate interests of the controller</td>
        </tr>
        <tr>
          <td>Responding to support requests</td>
          <td>Communication data, account data</td>
          <td>Contract / Legitimate Interests</td>
          <td>Necessary for performance of contract</td>
        </tr>
        <tr>
          <td>Sending marketing and product update emails</td>
          <td>Email address, usage data</td>
          <td>Consent (Art. 6(1)(a))</td>
          <td>Consent of the data subject</td>
        </tr>
        <tr>
          <td>Compliance with legal obligations</td>
          <td>As required by law</td>
          <td>Legal Obligation (Art. 6(1)(c))</td>
          <td>Legal obligation</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="notice-box info">
    <div class="notice-icon">ℹ️</div>
    <div><strong>Legitimate Interests Assessment.</strong> Where we rely on legitimate interests, we have conducted a balancing test confirming that our interests do not override your fundamental rights. You may request a copy of our legitimate interests assessment by emailing privacy@codeward.dev.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 6 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">6</span>
    <span class="clause-title">The AI Pipeline &amp; Your Source Code</span>
  </div>
  <p>Given the nature of Codeward's service, this section provides specific transparency about how your source code interacts with our AI infrastructure.</p>

  <div class="sub-clause">
    <div class="sub-clause-num">6.1</div>
    <div><strong>Ephemeral Cloning.</strong> When a Run is triggered, the Orchestrator Agent clones your Repository in full into a network-isolated Ephemeral Sandbox — a microVM with no outbound internet access and no persistent storage layer. The clone exists solely within the RAM and ephemeral disk of that microVM for the duration of the Run.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.2</div>
    <div><strong>60-Second Destruction Guarantee.</strong> Upon Run completion (whether PASS, BLOCK, or error), the Ephemeral Sandbox and all contents — including the full clone of your source code — are cryptographically wiped and the microVM is destroyed within 60 seconds. This is enforced at the infrastructure level, not merely policy.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.3</div>
    <div><strong>What Is Sent to OpenAI.</strong> During a Run, Analyzer Agents extract targeted code excerpts (typically 10–200 lines of code relevant to a specific finding) and transmit these to OpenAI's API for inference. We do not transmit entire files or entire repositories to OpenAI. The following data is sent per inference call:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div>The relevant code excerpt under analysis;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div>The Agent's system prompt (contains no personal data);</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div>Contextual metadata (file path, line numbers, language type).</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.4</div>
    <div><strong>OpenAI Data Processing Agreement.</strong> Codeward has a Data Processing Agreement with OpenAI, Inc. under which OpenAI is contractually prohibited from: (a) using your code or prompts to train or fine-tune any model; (b) retaining API inputs for longer than 30 days except for abuse monitoring; (c) sharing your data with any third party other than as required by law.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.5</div>
    <div><strong>No Codeward Training on User Code.</strong> Codeward does not use your source code, Agent findings, or any User Data to train, fine-tune, evaluate, or improve any AI model operated by Codeward. This is an absolute prohibition with no exceptions.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.6</div>
    <div><strong>What Is Retained Post-Run.</strong> After Sandbox destruction, Codeward retains only the following structured data: Gate Decision (PASS/BLOCK), quality score (0–100), structured findings JSON (category, severity, file path, line number, description — no actual code content), run timestamp, run duration, and model version used.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">6.7</div>
    <div><strong>Enterprise On-Premises Option.</strong> Enterprise customers with compliance requirements that prevent cloud-based code transmission may request an on-premises or VPC-isolated deployment. In this configuration, no source code or code excerpts leave the customer's own infrastructure. Contact sales@codeward.dev for details.</div>
  </div>
  <div class="notice-box success">
    <div class="notice-icon">✅</div>
    <div><strong>Your Code Is Not Our Product.</strong> Codeward's business model is subscription fees, not data monetisation. We have no commercial incentive to retain, analyse, or exploit your source code beyond what is strictly necessary to run the Agent pipeline. Our architecture is designed to minimise, not maximise, data retention.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 7 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">7</span>
    <span class="clause-title">How We Use Your Data</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.1</div>
    <div><strong>Service Delivery.</strong> To operate the Platform, execute Agent Runs, generate Gate Decisions, post findings to your Git provider, and maintain your run history dashboard.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.2</div>
    <div><strong>Account Management.</strong> To manage your account, authenticate you, process subscription payments, issue invoices, and communicate billing-related information.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.3</div>
    <div><strong>Security &amp; Integrity.</strong> To detect, investigate, and prevent fraud, abuse, prompt injection attempts, and security threats to the Platform and other users.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.4</div>
    <div><strong>Platform Improvement.</strong> To analyse anonymised, aggregated usage patterns (never individual source code or business logic) to improve Agent accuracy, scoring algorithms, and Platform performance.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.5</div>
    <div><strong>Customer Support.</strong> To respond to your enquiries, troubleshoot issues, and provide technical assistance.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.6</div>
    <div><strong>Legal Compliance.</strong> To comply with applicable laws, respond to lawful requests from authorities, and enforce our Terms of Service.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">7.7</div>
    <div><strong>Marketing (with consent).</strong> To send you product updates, feature announcements, and newsletters where you have opted in. You may withdraw consent at any time by clicking "Unsubscribe" in any marketing email or by emailing privacy@codeward.dev.</div>
  </div>
  <div class="notice-box warning">
    <div class="notice-icon">⚠️</div>
    <div><strong>No Selling of Personal Data.</strong> Codeward does not sell, rent, or trade your personal data to third parties for their own marketing or commercial purposes. This prohibition applies without exception.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 8 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">8</span>
    <span class="clause-title">Who We Share Data With</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.1</div>
    <div><strong>Sub-Processors.</strong> We share data with the sub-processors listed in Schedule A. All sub-processors are bound by data processing agreements requiring GDPR-equivalent protections. We conduct due diligence on all sub-processors before engagement and review them annually.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.2</div>
    <div><strong>Your Git Provider.</strong> We post Agent findings (Gate Decisions, inline comments) back to your connected Git provider (GitHub, GitLab, Bitbucket) on your behalf. This is the core output of the service. Only findings metadata — never source code — is transmitted back.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.3</div>
    <div><strong>Legal Authorities.</strong> We may disclose data to law enforcement, regulators, or courts where required by applicable law, valid legal process, or to protect the rights, property, or safety of Codeward, our users, or the public. Where permitted by law, we will notify you of such requests before complying.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.4</div>
    <div><strong>Business Transfers.</strong> In the event of a merger, acquisition, or sale of substantially all of Codeward's assets, your data may be transferred to the successor entity. You will be notified by email at least 30 days before such a transfer, and the successor entity will be required to honour this Policy.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.5</div>
    <div><strong>Aggregated Analytics.</strong> We may share anonymised, aggregated, non-personally-identifiable statistics (e.g., "the average quality score across all Codeward runs in Q3 2026 was 74/100") with the public, investors, or partners. Such data cannot be used to identify you or your Organisation.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">8.6</div>
    <div><strong>No Other Sharing.</strong> We do not share your personal data with any other third party except as explicitly described in this Section 8.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 9 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">9</span>
    <span class="clause-title">International Data Transfers</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.1</div>
    <div><strong>Transfer Destinations.</strong> Your data may be transferred to and processed in countries outside your country of residence, including the United States (OpenAI, Inc.) and [CLOUD PROVIDER REGION]. These countries may not have data protection laws equivalent to those in your jurisdiction.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.2</div>
    <div><strong>Transfer Safeguards.</strong> For transfers from the EEA, UK, or Switzerland to the United States, we rely on the EU Standard Contractual Clauses (SCCs) (Commission Decision 2021/914) as the legal transfer mechanism. For transfers from Kenya, we implement equivalent contractual protections consistent with the Kenya DPA 2019 cross-border transfer requirements.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">9.3</div>
    <div><strong>Obtaining SCC Copies.</strong> You may request a copy of the Standard Contractual Clauses in place with our sub-processors by emailing privacy@codeward.dev.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 10 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">10</span>
    <span class="clause-title">Data Retention &amp; Deletion</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.1</div>
    <div>We retain personal data only for as long as necessary to fulfil the purpose for which it was collected, or as required by law. The full retention schedule is set out in Schedule B.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.2</div>
    <div><strong>Account Closure.</strong> When you close your account, we begin deletion of your personal data within 30 days. Run history and findings metadata are deleted within 90 days of account closure. Anonymised aggregate analytics derived from your usage are retained indefinitely as they cannot identify you.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.3</div>
    <div><strong>Legal Hold.</strong> Where we are required by law to retain certain data (e.g., financial records under applicable tax law, evidence preservation under litigation hold), that data will be retained for the legally required period, isolated from active processing systems, and deleted promptly once the legal hold expires.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">10.4</div>
    <div><strong>Backup Deletion.</strong> Data deleted from live systems is removed from encrypted backups within 90 days of deletion from primary systems, consistent with our backup rotation schedule.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 11 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">11</span>
    <span class="clause-title">Security Measures</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.1</div>
    <div>Codeward implements technical and organisational security measures appropriate to the risk, including:</div>
  </div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(a)</div><div><strong>Encryption at rest:</strong> AES-256 encryption for all persistent data stores;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(b)</div><div><strong>Encryption in transit:</strong> TLS 1.3 for all API and dashboard communications;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(c)</div><div><strong>Sandbox isolation:</strong> Network-isolated microVMs with no outbound internet access during Agent Runs;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(d)</div><div><strong>Access controls:</strong> Role-based access control (RBAC) for all internal infrastructure, with least-privilege principles enforced;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(e)</div><div><strong>Audit logging:</strong> Immutable audit logs for all administrative access to production systems;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(f)</div><div><strong>Penetration testing:</strong> Annual third-party penetration tests with findings remediated within defined SLAs;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(g)</div><div><strong>Employee training:</strong> Annual security awareness training for all staff with access to personal data;</div></div>
  <div class="sub-sub-clause"><div class="sub-sub-label">(h)</div><div><strong>Vulnerability disclosure:</strong> A public responsible disclosure programme at codeward.dev/security.</div></div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.2</div>
    <div><strong>Breach Response.</strong> In the event of a personal data breach, Codeward will: (a) contain and assess the breach within 24 hours of discovery; (b) notify affected users and relevant supervisory authorities within 72 hours of confirming the breach, where required by applicable law; (c) provide a full incident report within 30 days.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">11.3</div>
    <div><strong>Your Responsibility.</strong> You are responsible for maintaining the security of your account credentials, API keys, and OAuth tokens. You should use strong, unique passwords and enable multi-factor authentication where available.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 12 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">12</span>
    <span class="clause-title">Your Rights</span>
  </div>
  <p>Depending on your jurisdiction, you have the following rights regarding your personal data. To exercise any right, email privacy@codeward.dev. We will respond within 30 days and will not charge a fee for reasonable requests.</p>

  <div class="rights-grid">
    <div class="right-card">
      <div class="right-card-title">👁️ Right to Access</div>
      <div class="right-card-body">Request a copy of all personal data we hold about you, the purposes for which it is processed, and who it has been shared with.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">✏️ Right to Rectification</div>
      <div class="right-card-body">Request correction of inaccurate or incomplete personal data. You can update most account data directly in the dashboard.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">🗑️ Right to Erasure</div>
      <div class="right-card-body">Request deletion of your personal data ("right to be forgotten"), subject to our legal retention obligations and legitimate interests.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">⏸️ Right to Restriction</div>
      <div class="right-card-body">Request that we restrict processing of your data in certain circumstances, e.g., while you contest its accuracy or our right to process it.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">📦 Right to Portability</div>
      <div class="right-card-body">Receive your personal data in a structured, machine-readable format (JSON or CSV) and transfer it to another service. Applies to data you provided to us under contract or consent.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">🚫 Right to Object</div>
      <div class="right-card-body">Object to processing based on our legitimate interests, including profiling. You may also opt out of marketing at any time without affecting service access.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">🤖 Automated Decision Rights</div>
      <div class="right-card-body">Gate Decisions are automated. You have the right to request human review of any Gate Decision that significantly affects you, and to contest automated outcomes.</div>
    </div>
    <div class="right-card">
      <div class="right-card-title">📣 Right to Complain</div>
      <div class="right-card-body">Lodge a complaint with your local data protection authority. Kenya: Office of the Data Protection Commissioner. EU: Your national supervisory authority. UK: ICO.</div>
    </div>
  </div>

  <div class="notice-box info">
    <div class="notice-icon">ℹ️</div>
    <div><strong>Automated Decision-Making &amp; Gate Decisions.</strong> Codeward's Gate Decisions (PASS/BLOCK on Pull Requests) are produced by automated AI processing with no human in the loop by default. Under GDPR Article 22 and equivalent provisions, you have the right to request human review of any Gate Decision, obtain an explanation of the factors that led to it, and contest the decision. Contact support@codeward.dev with your Run ID to exercise this right.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 13 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">13</span>
    <span class="clause-title">Cookies &amp; Tracking Technologies</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">13.1</div>
    <div>Codeward uses cookies and similar tracking technologies on the codeward.dev website and dashboard. The following categories are used:</div>
  </div>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Cookie Categories</div>
    <table class="legal-table">
      <thead><tr><th>Category</th><th>Purpose</th><th>Consent Required?</th><th>Retention</th></tr></thead>
      <tbody>
        <tr><td><strong>Strictly Necessary</strong></td><td>Session management, authentication, CSRF protection. Cannot be disabled without breaking the Platform.</td><td><span class="tag-no">NO</span></td><td>Session / 7 days</td></tr>
        <tr><td><strong>Functional</strong></td><td>Remembering your preferences (theme, dashboard layout, notification settings).</td><td><span class="tag-no">NO</span></td><td>1 year</td></tr>
        <tr><td><strong>Analytics</strong></td><td>Understanding how users navigate the dashboard to improve UX. Anonymised before storage.</td><td><span class="tag-yes">YES</span></td><td>90 days</td></tr>
        <tr><td><strong>Marketing</strong></td><td>Measuring conversion from marketing campaigns. Only on codeward.dev, not the dashboard.</td><td><span class="tag-yes">YES</span></td><td>90 days</td></tr>
      </tbody>
    </table>
  </div>

  <div class="sub-clause">
    <div class="sub-clause-num">13.2</div>
    <div>You can manage cookie preferences via the Cookie Preferences Centre accessible from the footer of codeward.dev. Withdrawing consent for non-essential cookies does not affect your ability to use the Platform.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 14 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">14</span>
    <span class="clause-title">Children's Privacy</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">14.1</div>
    <div>The Platform is not directed at persons under the age of 18. Codeward does not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact privacy@codeward.dev and we will delete that data promptly.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 15 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">15</span>
    <span class="clause-title">AI-Specific Disclosures — EU AI Act (2024) Compliance</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.1</div>
    <div><strong>AI System Classification.</strong> Codeward's Agent pipeline constitutes an AI system under the EU AI Act (Regulation 2024/1689). Codeward classifies the Gate Decision system as a <strong>limited-risk AI system</strong> (not high-risk) under Annex III, as it assists professional developers in a non-safety-critical context with the output being a recommendation that humans remain free to override.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.2</div>
    <div><strong>Transparency Obligation.</strong> You are hereby informed that Gate Decisions are produced by an automated AI system. This disclosure satisfies Article 50 of the EU AI Act.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.3</div>
    <div><strong>Human Oversight.</strong> Codeward's Platform is designed to augment, not replace, human engineering judgment. Gate Decisions are advisory outputs. All final merge decisions remain with the Repository owner. This architectural choice ensures meaningful human oversight as required by Article 14 of the EU AI Act.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.4</div>
    <div><strong>Model Cards &amp; System Documentation.</strong> Technical documentation describing the Agent architecture, data inputs, outputs, performance metrics, and known limitations is available to Enterprise customers and regulators upon request. Email compliance@codeward.dev.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">15.5</div>
    <div><strong>Bias &amp; Accuracy.</strong> Codeward tests Agent accuracy across diverse programming languages, frameworks, and coding styles. Known limitations include reduced accuracy on: proprietary domain-specific languages, codebases with unconventional architecture patterns, and very large monorepos exceeding [X]M lines of code. These limitations are documented in our system documentation.</div>
  </div>
</div>

<!-- ═══════════════ CLAUSE 16 ═══════════════ -->
<div class="clause-section">
  <div class="clause-header">
    <span class="clause-number">16</span>
    <span class="clause-title">Changes to This Policy</span>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">16.1</div>
    <div>We may update this Privacy Policy from time to time. For material changes (changes that significantly affect how we process your personal data or your rights), we will provide at least 30 days' notice via email to your registered address and/or a prominent in-app banner before the changes take effect.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">16.2</div>
    <div>The current version of this Policy is always available at codeward.dev/legal/privacy, with the version number and effective date displayed prominently. A version history is maintained at codeward.dev/legal/privacy/history.</div>
  </div>
  <div class="sub-clause">
    <div class="sub-clause-num">16.3</div>
    <div>Your continued use of the Platform after the effective date of any revised Policy constitutes your acceptance of the changes. If you object to a material change, you may close your account before the change takes effect.</div>
  </div>
</div>

<!-- ═══════════════ SCHEDULE A ═══════════════ -->
<div class="schedule-block">
  <div class="schedule-header">
    <div class="schedule-label">Schedule A</div>
    <div class="schedule-title">Sub-Processor Register</div>
  </div>
  <p style="margin-bottom:16px;">Last updated: 1 October 2026. Codeward will notify users of material changes to this register at least 30 days before a new sub-processor is engaged.</p>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Current Sub-Processors</div>
    <table class="legal-table">
      <thead><tr><th>Sub-Processor</th><th>Country</th><th>Purpose</th><th>Data Processed</th><th>Transfer Mechanism</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>OpenAI, Inc.</strong></td>
          <td>USA</td>
          <td>Foundational model inference for Agent analysis</td>
          <td>Code excerpts (10–200 lines), file paths, language metadata</td>
          <td>EU SCCs; OpenAI DPA (no training clause)</td>
        </tr>
        <tr>
          <td><strong>Stripe, Inc.</strong></td>
          <td>USA</td>
          <td>Payment processing and subscription management</td>
          <td>Billing name, billing address, card data (tokenised)</td>
          <td>EU SCCs; Stripe DPA</td>
        </tr>
        <tr>
          <td><strong>[CLOUD PROVIDER]</strong></td>
          <td>[REGION]</td>
          <td>Cloud infrastructure, database hosting, Sandbox compute</td>
          <td>All platform data at rest and in transit</td>
          <td>[SCCs / Adequacy Decision]</td>
        </tr>
        <tr>
          <td><strong>[EMAIL PROVIDER]</strong></td>
          <td>[COUNTRY]</td>
          <td>Transactional email delivery (receipts, alerts, notifications)</td>
          <td>Email address, name, email content</td>
          <td>[SCCs]</td>
        </tr>
        <tr>
          <td><strong>[MONITORING TOOL]</strong></td>
          <td>[COUNTRY]</td>
          <td>Application performance monitoring and error tracking</td>
          <td>Anonymised error logs, stack traces, performance metrics</td>
          <td>[SCCs]</td>
        </tr>
        <tr>
          <td><strong>[SUPPORT PLATFORM]</strong></td>
          <td>[COUNTRY]</td>
          <td>Customer support ticket management</td>
          <td>Name, email address, support communication content</td>
          <td>[SCCs]</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ═══════════════ SCHEDULE B ═══════════════ -->
<div class="schedule-block">
  <div class="schedule-header">
    <div class="schedule-label">Schedule B</div>
    <div class="schedule-title">Data Retention Schedule</div>
  </div>

  <div class="legal-table-wrapper">
    <div class="legal-table-caption">Retention Periods by Data Category</div>
    <table class="legal-table">
      <thead><tr><th>Data Category</th><th>Retention Period</th><th>Basis for Retention</th><th>Deletion Method</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Source code (in Sandbox)</strong></td>
          <td>Max 60 seconds post-Run</td>
          <td>Service delivery</td>
          <td>Cryptographic wipe + microVM destruction</td>
        </tr>
        <tr>
          <td><strong>Code excerpts (at OpenAI)</strong></td>
          <td>Max 30 days (per OpenAI DPA)</td>
          <td>Abuse monitoring (OpenAI)</td>
          <td>Automatic deletion by OpenAI</td>
        </tr>
        <tr>
          <td><strong>Agent findings &amp; Gate Decisions</strong></td>
          <td>Duration of Subscription + 90 days post-termination</td>
          <td>Service delivery / dashboard history</td>
          <td>Secure deletion from all systems</td>
        </tr>
        <tr>
          <td><strong>Account identity data</strong></td>
          <td>Duration of account + 90 days post-closure</td>
          <td>Contract performance</td>
          <td>Secure deletion</td>
        </tr>
        <tr>
          <td><strong>Billing &amp; invoice records</strong></td>
          <td>7 years from invoice date</td>
          <td>Tax and financial law obligation</td>
          <td>Secure deletion after legal hold expires</td>
        </tr>
        <tr>
          <td><strong>Usage telemetry (identifiable)</strong></td>
          <td>13 months rolling</td>
          <td>Legitimate interests (security, analytics)</td>
          <td>Anonymised after 13 months; then retained indefinitely as aggregate</td>
        </tr>
        <tr>
          <td><strong>Support communications</strong></td>
          <td>3 years from ticket closure</td>
          <td>Legitimate interests (quality assurance)</td>
          <td>Secure deletion</td>
        </tr>
        <tr>
          <td><strong>Security audit logs</strong></td>
          <td>2 years</td>
          <td>Legitimate interests (security)</td>
          <td>Secure deletion</td>
        </tr>
        <tr>
          <td><strong>Marketing consent records</strong></td>
          <td>Duration of consent + 3 years</td>
          <td>Legal obligation (consent proof)</td>
          <td>Secure deletion</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  <div class="disclaimer-box">
    <strong>Legal Notice</strong>
    This Privacy Policy was drafted for Codeward Limited. It does not constitute legal advice. Data protection law is jurisdiction-specific and evolving rapidly, particularly regarding AI systems. You are strongly encouraged to have a qualified data protection practitioner review this Policy before publication, particularly to ensure compliance with the EU AI Act (2024), GDPR, Kenya DPA 2019, and any other laws applicable to your user base. Jurisdiction-specific obligations (e.g., ODPC registration in Kenya, Art. 13/14 GDPR notices, UK ICO registration) may require additional measures not fully reflected herein.
  </div>
  <div class="page-number">Codeward Limited &nbsp;·&nbsp; Privacy Policy v1.0 &nbsp;·&nbsp; Effective 1 October 2026 &nbsp;·&nbsp; codeward.dev/legal/privacy</div>
</div>

</body>
</html>