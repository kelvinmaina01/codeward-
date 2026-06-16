import React from 'react';
import { Delete01Icon, Cancel01Icon, BotIcon, Analytics01Icon, Globe01Icon, Mail01Icon, ViewIcon, Edit01Icon, PauseIcon, PackageIcon, Notification01Icon, Tick01Icon, Alert01Icon, InformationIcon } from 'hugeicons-react';

export const privacyContent = [
  {
    id: 'quick-summary',
    title: 'Privacy at a Glance  Key Facts',
    content: (
      <div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cw-bg2 border border-cw-bdr rounded-xl p-6">
    <div className="flex gap-4">
      <Delete01Icon size={32} className="text-cw-blue shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">Source Code Deleted in 60 Seconds</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">Your cloned repository is destroyed within 60 seconds of every Agent run completing. We never store your source code long-term.</p>
      </div>
    </div>
    <div className="flex gap-4">
      <Cancel01Icon size={32} className="text-cw-red shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">No AI Training on Your Code</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">Your source code is never used to train, fine-tune, or improve any AI model — ours or our providers'.</p>
      </div>
    </div>
    <div className="flex gap-4">
      <BotIcon size={32} className="text-cw-purple shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">Code Snippets Sent to OpenAI</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">Small, relevant code excerpts are sent to OpenAI for inference only. OpenAI is contractually prohibited from training on this data.</p>
      </div>
    </div>
    <div className="flex gap-4">
      <Analytics01Icon size={32} className="text-cw-green shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">We Keep Run Metadata</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">Agent findings, scores, and run metadata are retained for your dashboard history for the duration of your subscription.</p>
      </div>
    </div>
    <div className="flex gap-4">
      <Globe01Icon size={32} className="text-cw-blue shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">Multi-Jurisdiction Compliance</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">We comply with Kenya DPA 2019, EU GDPR, and UK GDPR. You have enforceable rights regardless of where you are located.</p>
      </div>
    </div>
    <div className="flex gap-4">
      <Mail01Icon size={32} className="text-cw-amber shrink-0" />
      <div>
        <h4 className="font-bold text-cw-txt text-[14px] mb-1">Contact Us Anytime</h4>
        <p className="text-cw-txt2 text-[13px] leading-relaxed">For data requests, questions, or complaints: privacy@codeward.dev. We respond within 30 days.</p>
      </div>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'who-we-are-how-to-contact-us',
    title: '1. Who We Are & How to Contact Us',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">1.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Data Controller.</strong> The data controller responsible for your personal data is <span class="defined-term">Codeward Limited</span>, a company incorporated under the laws of [JURISDICTION], with its registered office at [REGISTERED ADDRESS] ("Codeward", "we", "us", "our").</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">1.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Data Protection Contact.</strong> For all privacy-related enquiries, data subject requests, or complaints, please contact our Privacy Team at: <strong>privacy@codeward.dev</strong>. We aim to respond to all requests within 30 calendar days.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">1.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Data Protection Officer.</strong> [If required by applicable law] Codeward has appointed a Data Protection Officer (DPO) who can be reached at dpo@codeward.dev.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">1.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>EU/UK Representative.</strong> For users in the European Economic Area or United Kingdom, Codeward's designated representative for GDPR purposes is [EU REPRESENTATIVE NAME AND ADDRESS].</div>
  </div>
</div>
    )
  },
  {
    id: 'scope-of-this-policy',
    title: '2. Scope of This Policy',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">2.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">This Policy applies to all personal data processed by Codeward in connection with your use of the Platform, including the Codeward web dashboard, REST API, webhook integrations, and associated Agent infrastructure.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">2.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">This Policy applies to: (a) individual users who register for a Codeward account; (b) Authorized Users of organisational accounts; (c) visitors to codeward.dev and its subdomains; (d) developers whose GitHub usernames or commit data appear in connected Repositories.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">2.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">This Policy does not apply to third-party services linked from the Platform (e.g., GitHub, GitLab, OpenAI). Those services have their own privacy policies which you should review independently.</div>
  </div>
  <div className="bg-cw-blue/10 border border-cw-blue/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">
    <InformationIcon size={28} className="text-cw-blue shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-cw-blue mb-1 text-base">Developer Usernames in Git History.</h4>
      <p className="text-cw-blue/80 text-sm leading-relaxed">When a Repository is connected, Git commit history may contain the names and email addresses of developers who contributed to that codebase. Codeward processes this data as metadata for run attribution and does not use it for any other purpose. It is deleted with the Ephemeral Sandbox within 60 seconds of run completion.</p>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'what-data-we-collect',
    title: '3. What Data We Collect',
    content: (
      <div className="space-y-4">
  <div className="mt-6 mb-4 border border-cw-bdr rounded-xl overflow-hidden">
    <div className="bg-cw-bg2 px-4 py-3 border-b border-cw-bdr text-xs font-bold tracking-wider uppercase text-cw-txt">Categories of Personal Data Collected</div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-cw-bg">
          <tr>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Category</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Specific Data Points</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Source</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Required?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cw-bdr">
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Account Identity Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Full name, email address, username, profile photo (if provided via OAuth)</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">You / GitHub OAuth</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Authentication Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Hashed passwords, OAuth tokens, API keys (hashed), session tokens</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">You / OAuth provider</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Billing &amp; Payment Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Billing name, billing address, last 4 digits of card, invoice history. Full card details are processed by Stripe and never stored by Codeward.</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">You / Stripe</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Paid plans only</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Repository Metadata</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Repository name, connected Git provider, branch names, commit SHAs, pull request IDs, file path structure</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Git provider API</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Source Code (Transient)</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Full repository contents cloned into Ephemeral Sandbox. <strong>Destroyed within 60 seconds of run completion.</strong> Never written to persistent storage.</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Git provider</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Agent Run Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Gate Decision (PASS/BLOCK), quality score, findings JSON, run timestamp, run duration, model used, agent types invoked</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Platform-generated</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Usage &amp; Telemetry Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Feature usage events, API call logs, dashboard page views, error logs, run trigger types</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Platform-generated</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Communication Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Support ticket content, email correspondence, in-app feedback submissions</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">You</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-red/10 text-cw-red font-bold text-[10px] rounded-full uppercase tracking-wider">NO</span></td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Device &amp; Browser Data</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">IP address, browser type and version, operating system, device type, referring URL</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Automatically collected</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">3.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Special Categories.</strong> Codeward does not intentionally collect special category personal data (e.g., health, biometric, racial, or political data). If such data appears incidentally in source code or support communications, it is processed solely to provide the requested service and deleted per the standard retention schedule.</div>
  </div>
</div>
    )
  },
  {
    id: 'how-we-collect-data',
    title: '4. How We Collect Data',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">4.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Directly from You:</strong> When you register an account, connect a Repository, configure Agent settings, contact support, or respond to surveys.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">4.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Via OAuth Integration:</strong> When you authenticate via GitHub, GitLab, or Bitbucket OAuth, we receive your public profile, email address, and the repository access permissions you grant.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">4.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Automatically via the Platform:</strong> Usage telemetry, API logs, error reports, and device/browser data are collected automatically when you interact with the Platform.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">4.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>From Third-Party Providers:</strong> Payment data from Stripe; authentication events from your OAuth provider; optionally, organisation and team data from your Git provider's API.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">4.5</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>From the AI Pipeline:</strong> Agent run metadata, Gate Decisions, and findings are generated by Codeward's AI Agent infrastructure during each Run and stored as described in Section 10.</div>
  </div>
</div>
    )
  },
  {
    id: 'why-we-process-data-legal-bases',
    title: '5. Why We Process Data — Legal Bases',
    content: (
      <div className="space-y-4">
  <p className="leading-relaxed text-[14px] text-cw-txt2">We process your personal data only where we have a valid legal basis. The table below sets out our processing purposes and corresponding legal bases under GDPR and the Kenya Data Protection Act 2019.</p>
  <div className="mt-6 mb-4 border border-cw-bdr rounded-xl overflow-hidden">
    <div className="bg-cw-bg2 px-4 py-3 border-b border-cw-bdr text-xs font-bold tracking-wider uppercase text-cw-txt">Processing Purposes & Legal Bases</div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-cw-bg">
          <tr>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Purpose</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Data Used</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Legal Basis (GDPR)</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Legal Basis (Kenya DPA)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cw-bdr">
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Account creation and authentication</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Identity, authentication data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Contract (Art. 6(1)(b))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Necessary for performance of contract</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Providing the AI code analysis service</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Source code (transient), repository metadata, run data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Contract (Art. 6(1)(b))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Necessary for performance of contract</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Processing subscription payments</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Billing data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Contract (Art. 6(1)(b))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Necessary for performance of contract</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Sending transactional emails (receipts, alerts)</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Email address, run data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Contract (Art. 6(1)(b))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Necessary for performance of contract</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Platform security, fraud prevention, abuse detection</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Usage data, device data, IP address</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legitimate Interests (Art. 6(1)(f))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legitimate interests of the controller</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Platform analytics and performance improvement</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Anonymised usage telemetry</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legitimate Interests (Art. 6(1)(f))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legitimate interests of the controller</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Responding to support requests</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Communication data, account data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Contract / Legitimate Interests</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Necessary for performance of contract</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Sending marketing and product update emails</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Email address, usage data</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Consent (Art. 6(1)(a))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Consent of the data subject</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 ">Compliance with legal obligations</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">As required by law</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legal Obligation (Art. 6(1)(c))</td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Legal obligation</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div className="bg-cw-blue/10 border border-cw-blue/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">
    <InformationIcon size={28} className="text-cw-blue shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-cw-blue mb-1 text-base">Legitimate Interests Assessment.</h4>
      <p className="text-cw-blue/80 text-sm leading-relaxed">Where we rely on legitimate interests, we have conducted a balancing test confirming that our interests do not override your fundamental rights. You may request a copy of our legitimate interests assessment by emailing privacy@codeward.dev.</p>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'the-ai-pipeline-your-source-code',
    title: '6. The AI Pipeline & Your Source Code',
    content: (
      <div className="space-y-4">
  <p className="leading-relaxed text-[14px] text-cw-txt2">Given the nature of Codeward's service, this section provides specific transparency about how your source code interacts with our AI infrastructure.</p>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Ephemeral Cloning.</strong> When a Run is triggered, the Orchestrator Agent clones your Repository in full into a network-isolated Ephemeral Sandbox — a microVM with no outbound internet access and no persistent storage layer. The clone exists solely within the RAM and ephemeral disk of that microVM for the duration of the Run.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>60-Second Destruction Guarantee.</strong> Upon Run completion (whether PASS, BLOCK, or error), the Ephemeral Sandbox and all contents — including the full clone of your source code — are cryptographically wiped and the microVM is destroyed within 60 seconds. This is enforced at the infrastructure level, not merely policy.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>What Is Sent to OpenAI.</strong> During a Run, Analyzer Agents extract targeted code excerpts (typically 10–200 lines of code relevant to a specific finding) and transmit these to OpenAI's API for inference. We do not transmit entire files or entire repositories to OpenAI. The following data is sent per inference call:</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(a)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">The relevant code excerpt under analysis;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(b)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">The Agent's system prompt (contains no personal data);</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(c)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">Contextual metadata (file path, line numbers, language type).</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>OpenAI Data Processing Agreement.</strong> Codeward has a Data Processing Agreement with OpenAI, Inc. under which OpenAI is contractually prohibited from: (a) using your code or prompts to train or fine-tune any model; (b) retaining API inputs for longer than 30 days except for abuse monitoring; (c) sharing your data with any third party other than as required by law.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.5</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>No Codeward Training on User Code.</strong> Codeward does not use your source code, Agent findings, or any User Data to train, fine-tune, evaluate, or improve any AI model operated by Codeward. This is an absolute prohibition with no exceptions.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.6</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>What Is Retained Post-Run.</strong> After Sandbox destruction, Codeward retains only the following structured data: Gate Decision (PASS/BLOCK), quality score (0–100), structured findings JSON (category, severity, file path, line number, description — no actual code content), run timestamp, run duration, and model version used.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">6.7</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Enterprise On-Premises Option.</strong> Enterprise customers with compliance requirements that prevent cloud-based code transmission may request an on-premises or VPC-isolated deployment. In this configuration, no source code or code excerpts leave the customer's own infrastructure. Contact sales@codeward.dev for details.</div>
  </div>
  <div className="bg-cw-green/10 border border-cw-green/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">
    <Tick01Icon size={28} className="text-cw-green shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-cw-green mb-1 text-base">Your Code Is Not Our Product.</h4>
      <p className="text-cw-green/80 text-sm leading-relaxed">Codeward's business model is subscription fees, not data monetisation. We have no commercial incentive to retain, analyse, or exploit your source code beyond what is strictly necessary to run the Agent pipeline. Our architecture is designed to minimise, not maximise, data retention.</p>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'how-we-use-your-data',
    title: '7. How We Use Your Data',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Service Delivery.</strong> To operate the Platform, execute Agent Runs, generate Gate Decisions, post findings to your Git provider, and maintain your run history dashboard.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Account Management.</strong> To manage your account, authenticate you, process subscription payments, issue invoices, and communicate billing-related information.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Security &amp; Integrity.</strong> To detect, investigate, and prevent fraud, abuse, prompt injection attempts, and security threats to the Platform and other users.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Platform Improvement.</strong> To analyse anonymised, aggregated usage patterns (never individual source code or business logic) to improve Agent accuracy, scoring algorithms, and Platform performance.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.5</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Customer Support.</strong> To respond to your enquiries, troubleshoot issues, and provide technical assistance.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.6</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Legal Compliance.</strong> To comply with applicable laws, respond to lawful requests from authorities, and enforce our Terms of Service.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">7.7</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Marketing (with consent).</strong> To send you product updates, feature announcements, and newsletters where you have opted in. You may withdraw consent at any time by clicking "Unsubscribe" in any marketing email or by emailing privacy@codeward.dev.</div>
  </div>
  <div className="bg-cw-amber/10 border border-cw-amber/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">
    <Alert01Icon size={28} className="text-cw-amber shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-cw-amber mb-1 text-base">No Selling of Personal Data.</h4>
      <p className="text-cw-amber/80 text-sm leading-relaxed">Codeward does not sell, rent, or trade your personal data to third parties for their own marketing or commercial purposes. This prohibition applies without exception.</p>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'who-we-share-data-with',
    title: '8. Who We Share Data With',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Sub-Processors.</strong> We share data with the sub-processors listed in Schedule A. All sub-processors are bound by data processing agreements requiring GDPR-equivalent protections. We conduct due diligence on all sub-processors before engagement and review them annually.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Your Git Provider.</strong> We post Agent findings (Gate Decisions, inline comments) back to your connected Git provider (GitHub, GitLab, Bitbucket) on your behalf. This is the core output of the service. Only findings metadata — never source code — is transmitted back.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Legal Authorities.</strong> We may disclose data to law enforcement, regulators, or courts where required by applicable law, valid legal process, or to protect the rights, property, or safety of Codeward, our users, or the public. Where permitted by law, we will notify you of such requests before complying.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Business Transfers.</strong> In the event of a merger, acquisition, or sale of substantially all of Codeward's assets, your data may be transferred to the successor entity. You will be notified by email at least 30 days before such a transfer, and the successor entity will be required to honour this Policy.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.5</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Aggregated Analytics.</strong> We may share anonymised, aggregated, non-personally-identifiable statistics (e.g., "the average quality score across all Codeward runs in Q3 2026 was 74/100") with the public, investors, or partners. Such data cannot be used to identify you or your Organisation.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">8.6</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>No Other Sharing.</strong> We do not share your personal data with any other third party except as explicitly described in this Section 8.</div>
  </div>
</div>
    )
  },
  {
    id: 'international-data-transfers',
    title: '9. International Data Transfers',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">9.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Transfer Destinations.</strong> Your data may be transferred to and processed in countries outside your country of residence, including the United States (OpenAI, Inc.) and [CLOUD PROVIDER REGION]. These countries may not have data protection laws equivalent to those in your jurisdiction.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">9.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Transfer Safeguards.</strong> For transfers from the EEA, UK, or Switzerland to the United States, we rely on the EU Standard Contractual Clauses (SCCs) (Commission Decision 2021/914) as the legal transfer mechanism. For transfers from Kenya, we implement equivalent contractual protections consistent with the Kenya DPA 2019 cross-border transfer requirements.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">9.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Obtaining SCC Copies.</strong> You may request a copy of the Standard Contractual Clauses in place with our sub-processors by emailing privacy@codeward.dev.</div>
  </div>
</div>
    )
  },
  {
    id: 'data-retention-deletion',
    title: '10. Data Retention & Deletion',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">10.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">We retain personal data only for as long as necessary to fulfil the purpose for which it was collected, or as required by law. The full retention schedule is set out in Schedule B.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">10.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Account Closure.</strong> When you close your account, we begin deletion of your personal data within 30 days. Run history and findings metadata are deleted within 90 days of account closure. Anonymised aggregate analytics derived from your usage are retained indefinitely as they cannot identify you.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">10.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Legal Hold.</strong> Where we are required by law to retain certain data (e.g., financial records under applicable tax law, evidence preservation under litigation hold), that data will be retained for the legally required period, isolated from active processing systems, and deleted promptly once the legal hold expires.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">10.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Backup Deletion.</strong> Data deleted from live systems is removed from encrypted backups within 90 days of deletion from primary systems, consistent with our backup rotation schedule.</div>
  </div>
</div>
    )
  },
  {
    id: 'security-measures',
    title: '11. Security Measures',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">11.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">Codeward implements technical and organisational security measures appropriate to the risk, including:</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(a)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Encryption at rest:</strong> AES-256 encryption for all persistent data stores;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(b)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Encryption in transit:</strong> TLS 1.3 for all API and dashboard communications;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(c)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Sandbox isolation:</strong> Network-isolated microVMs with no outbound internet access during Agent Runs;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(d)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Access controls:</strong> Role-based access control (RBAC) for all internal infrastructure, with least-privilege principles enforced;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(e)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Audit logging:</strong> Immutable audit logs for all administrative access to production systems;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(f)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Penetration testing:</strong> Annual third-party penetration tests with findings remediated within defined SLAs;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(g)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Employee training:</strong> Annual security awareness training for all staff with access to personal data;</div>
  </div>
  <div className="flex gap-4 pl-12">
    <div className="text-cw-txt3 shrink-0 pt-0.5 w-6">(h)</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Vulnerability disclosure:</strong> A public responsible disclosure programme at codeward.dev/security.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">11.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Breach Response.</strong> In the event of a personal data breach, Codeward will: (a) contain and assess the breach within 24 hours of discovery; (b) notify affected users and relevant supervisory authorities within 72 hours of confirming the breach, where required by applicable law; (c) provide a full incident report within 30 days.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">11.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Your Responsibility.</strong> You are responsible for maintaining the security of your account credentials, API keys, and OAuth tokens. You should use strong, unique passwords and enable multi-factor authentication where available.</div>
  </div>
</div>
    )
  },
  {
    id: 'your-rights',
    title: '12. Your Rights',
    content: (
      <div className="space-y-4">
  <p className="leading-relaxed text-[14px] text-cw-txt2">Depending on your jurisdiction, you have the following rights regarding your personal data. To exercise any right, email privacy@codeward.dev. We will respond within 30 days and will not charge a fee for reasonable requests.</p>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-4">
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      👁️ Right to Access
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Request a copy of all personal data we hold about you, the purposes for which it is processed, and who it has been shared with.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      ✏️ Right to Rectification
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Request correction of inaccurate or incomplete personal data. You can update most account data directly in the dashboard.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      🗑️ Right to Erasure
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Request deletion of your personal data ("right to be forgotten"), subject to our legal retention obligations and legitimate interests.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      ⏸️ Right to Restriction
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Request that we restrict processing of your data in certain circumstances, e.g., while you contest its accuracy or our right to process it.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      📦 Right to Portability
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Receive your personal data in a structured, machine-readable format (JSON or CSV) and transfer it to another service. Applies to data you provided to us under contract or consent.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      🚫 Right to Object
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Object to processing based on our legitimate interests, including profiling. You may also opt out of marketing at any time without affecting service access.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      🤖 Automated Decision Rights
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Gate Decisions are automated. You have the right to request human review of any Gate Decision that significantly affects you, and to contest automated outcomes.</div>
  </div>
  <div className="border border-cw-bdr rounded-xl p-5 bg-cw-bg2 hover:bg-cw-bg3 transition-colors">
    <div className="flex items-center gap-3 font-bold text-cw-txt text-[14px] mb-2">
      <InformationIcon size={24} className="text-cw-blue shrink-0" />
      📣 Right to Complain
    </div>
    <div className="text-cw-txt2 text-[13px] leading-relaxed">Lodge a complaint with your local data protection authority. Kenya: Office of the Data Protection Commissioner. EU: Your national supervisory authority. UK: ICO.</div>
  </div>
</div>
  <div className="bg-cw-blue/10 border border-cw-blue/30 rounded-xl p-5 flex gap-4 mt-6 mb-2">
    <InformationIcon size={28} className="text-cw-blue shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-cw-blue mb-1 text-base">Automated Decision-Making & Gate Decisions.</h4>
      <p className="text-cw-blue/80 text-sm leading-relaxed">Codeward's Gate Decisions (PASS/BLOCK on Pull Requests) are produced by automated AI processing with no human in the loop by default. Under GDPR Article 22 and equivalent provisions, you have the right to request human review of any Gate Decision, obtain an explanation of the factors that led to it, and contest the decision. Contact support@codeward.dev with your Run ID to exercise this right.</p>
    </div>
  </div>
</div>
    )
  },
  {
    id: 'cookies-tracking-technologies',
    title: '13. Cookies & Tracking Technologies',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">13.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">Codeward uses cookies and similar tracking technologies on the codeward.dev website and dashboard. The following categories are used:</div>
  </div>
  <div className="mt-6 mb-4 border border-cw-bdr rounded-xl overflow-hidden">
    <div className="bg-cw-bg2 px-4 py-3 border-b border-cw-bdr text-xs font-bold tracking-wider uppercase text-cw-txt">Cookie Categories</div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-cw-bg">
          <tr>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Category</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Purpose</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Consent Required?</th>
            <th className="px-4 py-3 font-semibold border-b border-cw-bdr text-cw-txt2">Retention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cw-bdr">
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Strictly Necessary</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Session management, authentication, CSRF protection. Cannot be disabled without breaking the Platform.</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-red/10 text-cw-red font-bold text-[10px] rounded-full uppercase tracking-wider">NO</span></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Session / 7 days</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Functional</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Remembering your preferences (theme, dashboard layout, notification settings).</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-red/10 text-cw-red font-bold text-[10px] rounded-full uppercase tracking-wider">NO</span></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">1 year</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Analytics</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Understanding how users navigate the dashboard to improve UX. Anonymised before storage.</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">90 days</td>
          </tr>
          <tr className="hover:bg-cw-bg2/50 transition-colors">
            <td className="px-4 py-3 align-top text-cw-txt2 "><strong>Marketing</strong></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">Measuring conversion from marketing campaigns. Only on codeward.dev, not the dashboard.</td>
            <td className="px-4 py-3 align-top text-cw-txt2 "><span className="px-2 py-1 bg-cw-green/10 text-cw-green font-bold text-[10px] rounded-full uppercase tracking-wider">YES</span></td>
            <td className="px-4 py-3 align-top text-cw-txt2 ">90 days</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">13.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">You can manage cookie preferences via the Cookie Preferences Centre accessible from the footer of codeward.dev. Withdrawing consent for non-essential cookies does not affect your ability to use the Platform.</div>
  </div>
</div>
    )
  },
  {
    id: 'children-s-privacy',
    title: '14. Children\'s Privacy',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">14.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">The Platform is not directed at persons under the age of 18. Codeward does not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact privacy@codeward.dev and we will delete that data promptly.</div>
  </div>
</div>
    )
  },
  {
    id: 'ai-specific-disclosures-eu-ai-act-2024-compliance',
    title: '15. AI-Specific Disclosures — EU AI Act (2024) Compliance',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">15.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>AI System Classification.</strong> Codeward's Agent pipeline constitutes an AI system under the EU AI Act (Regulation 2024/1689). Codeward classifies the Gate Decision system as a <strong>limited-risk AI system</strong> (not high-risk) under Annex III, as it assists professional developers in a non-safety-critical context with the output being a recommendation that humans remain free to override.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">15.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Transparency Obligation.</strong> You are hereby informed that Gate Decisions are produced by an automated AI system. This disclosure satisfies Article 50 of the EU AI Act.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">15.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Human Oversight.</strong> Codeward's Platform is designed to augment, not replace, human engineering judgment. Gate Decisions are advisory outputs. All final merge decisions remain with the Repository owner. This architectural choice ensures meaningful human oversight as required by Article 14 of the EU AI Act.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">15.4</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Model Cards &amp; System Documentation.</strong> Technical documentation describing the Agent architecture, data inputs, outputs, performance metrics, and known limitations is available to Enterprise customers and regulators upon request. Email compliance@codeward.dev.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">15.5</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2"><strong>Bias &amp; Accuracy.</strong> Codeward tests Agent accuracy across diverse programming languages, frameworks, and coding styles. Known limitations include reduced accuracy on: proprietary domain-specific languages, codebases with unconventional architecture patterns, and very large monorepos exceeding [X]M lines of code. These limitations are documented in our system documentation.</div>
  </div>
</div>
    )
  },
  {
    id: 'changes-to-this-policy',
    title: '16. Changes to This Policy',
    content: (
      <div className="space-y-4">
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">16.1</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">We may update this Privacy Policy from time to time. For material changes (changes that significantly affect how we process your personal data or your rights), we will provide at least 30 days' notice via email to your registered address and/or a prominent in-app banner before the changes take effect.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">16.2</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">The current version of this Policy is always available at codeward.dev/legal/privacy, with the version number and effective date displayed prominently. A version history is maintained at codeward.dev/legal/privacy/history.</div>
  </div>
  <div className="flex gap-4">
    <div className="font-semibold text-cw-blue shrink-0 pt-0.5 w-8">16.3</div>
    <div className="leading-relaxed text-[14px] text-cw-txt2">Your continued use of the Platform after the effective date of any revised Policy constitutes your acceptance of the changes. If you object to a material change, you may close your account before the change takes effect.</div>
  </div>
</div>
    )
  },
];
