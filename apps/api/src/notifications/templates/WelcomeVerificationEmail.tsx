import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';
import { TerminalLogBox } from './components/TerminalLogBox.js';

interface WelcomeVerificationEmailProps {
  userName: string;
  verificationLink: string;
  isOAuth?: boolean;
}

export const WelcomeVerificationEmail: React.FC<WelcomeVerificationEmailProps> = ({
  userName,
  verificationLink,
  isOAuth = false,
}) => {
  const terminalDemo = `> codeward analyze --commit 4f2a8c1
[✓] Firecracker microVM booted (125ms)
[✓] 8 Autonomous Agents running in parallel...
[!] Security Agent caught 1 Critical SQL Injection
[✓] Gate decision: BLOCKED. Auto-remediation PR dispatched.`;

  return (
    <BrandEmailLayout previewText={`Welcome to Codeward, ${userName}!`}>
      {/* 1. Header with Logo and Headline */}
      <BrandHeader
        headline="Welcome to Codeward"
        subtitle="Your Autonomous AI Principal Engineer is ready"
        heroStat={{
          value: '8 Agents',
          label: 'Autonomous Code Review Pipeline',
          valueColor: brandColors.textPrimary,
          labelColor: brandColors.purpleAccent,
        }}
      />

      {/* 2. Personalized Welcome Message */}
      <div style={messageContainer}>
        <p style={leadParagraph}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{userName}</strong>,
        </p>
        <p style={bodyParagraph}>
          You are seconds away from unleashing a multi-agent review engine on your pull requests. Codeward isn't a simple linter — it's an end-to-end testing and runtime security engine executing directly on your commits.
        </p>
      </div>

      {/* 3. Feature Highlights Matrix */}
      <div style={featuresContainer}>
        <div style={featureRow}>
          <span style={featureIcon}>🛡️</span>
          <div style={featureContent}>
            <strong style={featureTitle}>Runtime Security Guard</strong>
            <p style={featureDesc}>Catches 18+ critical vulnerability classes, prompt injections, and database RLS leaks.</p>
          </div>
        </div>

        <div style={featureRow}>
          <span style={featureIcon}>🧹</span>
          <div style={featureContent}>
            <strong style={featureTitle}>Zero Tech Debt & Bloat</strong>
            <p style={featureDesc}>Deep AST scanning eliminates dead code, God files, and duplicated business logic.</p>
          </div>
        </div>

        <div style={featureRow}>
          <span style={featureIcon}>⚡</span>
          <div style={featureContent}>
            <strong style={featureTitle}>Firecracker Sandbox Execution</strong>
            <p style={featureDesc}>Runs verification tests inside isolated microVMs before risky code ever merges.</p>
          </div>
        </div>
      </div>

      {/* 4. Terminal Snapshot */}
      <TerminalLogBox
        logs={terminalDemo}
        title="Codeward Runtime Simulation"
        maxLines={5}
      />

      {/* 5. Primary Action Button (#FCE2BA Pill) */}
      <BrandButton href={verificationLink}>
        {isOAuth ? 'Connect Your First Repository →' : 'Verify Email Address →'}
      </BrandButton>

      {/* 6. Dynamic Footer */}
      <BrandFooter
        recipientName={userName}
        purposeText="This is an essential account security notification from Codeward."
        isMandatoryTransactional={true}
      />
    </BrandEmailLayout>
  );
};

const messageContainer: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
};

const leadParagraph: React.CSSProperties = {
  fontSize: '15px',
  color: brandColors.textPrimary,
  margin: '0 0 8px 0',
};

const bodyParagraph: React.CSSProperties = {
  fontSize: '13px',
  color: brandColors.textSecondary,
  lineHeight: '1.6',
  margin: '0',
};

const featuresContainer: React.CSSProperties = {
  margin: '24px 0',
  padding: '16px 20px',
  backgroundColor: '#F9FAFB',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '8px',
  textAlign: 'left',
};

const featureRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const featureIcon: React.CSSProperties = {
  fontSize: '18px',
  marginRight: '12px',
  lineHeight: '1.2',
};

const featureContent: React.CSSProperties = {
  flex: 1,
};

const featureTitle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: brandColors.textPrimary,
  marginBottom: '2px',
};

const featureDesc: React.CSSProperties = {
  fontSize: '12px',
  color: brandColors.textSecondary,
  lineHeight: '1.4',
  margin: '0',
};

export default WelcomeVerificationEmail;
