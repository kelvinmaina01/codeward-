import { ShieldCheck, Lock, Cpu, EyeOff, Server, FileCheck, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export const trustContent = [
  {
    id: 'trust-at-a-glance',
    title: 'Trust & Security at a Glance',
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cw-bg2 border border-cw-bdr rounded-xl p-6">
          <div className="flex gap-4">
            <ShieldCheck size={32} className="text-cw-blue shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">ISO 27001 & SOC 2 Frameworks</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                Built on ISO/IEC 27001:2022 security controls and SOC 2 Type II compliance principles to safeguard developer code and infrastructure.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Cpu size={32} className="text-cw-purple shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">Ephemeral MicroVM Isolation</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                Code builds run inside isolated Firecracker microVM sandboxes destroyed within 60 seconds of completion.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <EyeOff size={32} className="text-cw-green shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">Zero AI Training Guarantee</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                Your proprietary source code is never used to train, tune, or improve LLM models — ours or any third party provider.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Lock size={32} className="text-cw-amber shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">256-bit End-to-End Encryption</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                All data is encrypted in transit using TLS 1.3 and at rest using AES-256 bit encryption keys managed securely.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <Server size={32} className="text-cw-blue shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">Zero Egress Eavesdropping</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                Sandbox environments operate behind strict VPC rules with zero external outbound network egress unless explicitly required.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <FileCheck size={32} className="text-cw-purple shrink-0" />
            <div>
              <h4 className="font-bold text-cw-txt text-[14px] mb-1">Global Compliance</h4>
              <p className="text-cw-txt2 text-[13px] leading-relaxed">
                Compliant with EU GDPR, UK DPA, and Kenya Data Protection Act 2019. Audit reports available for enterprise clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'architecture-security',
    title: '1. Architecture & Sandbox Security',
    content: (
      <div className="space-y-4 text-cw-txt2 text-[14px] leading-relaxed">
        <p>
          Codeward is architected around absolute isolation. Every code review, security audit, and sandbox test execution runs in an isolated, single-tenant Firecracker microVM.
        </p>
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-cw-green shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cw-txt">Ephemeral Workspaces:</span> MicroVMs are spawned dynamically per job, executed in RAM-backed storage, and wiped clean within 60 seconds of job completion.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-cw-green shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cw-txt">Kernel Isolation:</span> Built on KVM hypervisor technology preventing cross-tenant memory inspection, side-channel attacks, or container breakout vulnerabilities.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-cw-green shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cw-txt">Network Hardening:</span> MicroVMs have no inbound open ports and operate under strict egress filtering preventing unauthorized outbound connections.
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'data-protection-encryption',
    title: '2. Encryption & Key Management',
    content: (
      <div className="space-y-4 text-cw-txt2 text-[14px] leading-relaxed">
        <p>
          We enforce strong cryptographic controls across all data lifecycles to protect repository tokens and analytical reports.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong className="text-cw-txt">Encryption in Transit:</strong> All HTTP API traffic, WebSockets, and database syncs utilize TLS 1.3 with modern cipher suites.</li>
          <li><strong className="text-cw-txt">Encryption at Rest:</strong> Database backups, secrets, and run metadata are encrypted using AES-256 bit encryption keys.</li>
          <li><strong className="text-cw-txt">GitHub Access Tokens:</strong> Repository tokens are encrypted via hardware-level key vaults and scope-restricted to pull requests.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'compliance-audits',
    title: '3. Compliance, Certifications & Standards',
    content: (
      <div className="space-y-4 text-cw-txt2 text-[14px] leading-relaxed">
        <p>
          Codeward maintains continuous monitoring to comply with international security frameworks:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 text-center">
            <div className="font-bold text-cw-txt text-[16px] mb-1">ISO 27001</div>
            <div className="text-xs text-cw-txt3">Information Security Management</div>
          </div>
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 text-center">
            <div className="font-bold text-cw-txt text-[16px] mb-1">GDPR & CCPA</div>
            <div className="text-xs text-cw-txt3">Privacy & Data Rights Compliant</div>
          </div>
          <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-4 text-center">
            <div className="font-bold text-cw-txt text-[16px] mb-1">HIPAA Ready</div>
            <div className="text-xs text-cw-txt3">Business Associate Agreement (BAA) for Enterprise</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'vulnerability-disclosure',
    title: '4. Responsible Disclosure & Security Contact',
    content: (
      <div className="space-y-4 text-cw-txt2 text-[14px] leading-relaxed">
        <p>
          We welcome security researchers and developers to audit our platform and report vulnerabilities responsibly.
        </p>
        <div className="bg-cw-bg2 border border-cw-bdr rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-cw-txt font-bold">
            <Key size={16} className="text-cw-purple" />
            Security Email: <a href="mailto:security@codeward.cloud" className="text-cw-blue underline">security@codeward.cloud</a>
          </div>
          <p className="text-xs text-cw-txt3">
            SLA Response Commitment: Critical vulnerability reports are acknowledged within 4 hours and triaged within 24 hours.
          </p>
        </div>
      </div>
    ),
  },
];
