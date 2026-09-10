import { getCategoryTaskTemplate } from './prompt-templates.js';
import type { EscalationReason } from '../guardian/github-renderer.js';

export interface CoachingPromptInput {
  category: string;
  severity: string;
  location: string;
  description: string;
  rawEvidence: string;
  reason: EscalationReason;
  reasonDetail?: string | null;
  fixPrUrl?: string | null;
}

const REASON_CONTEXT: Record<EscalationReason, (detail?: string | null, prUrl?: string | null) => string> = {
  NOT_ELIGIBLE: () =>
    `This finding category isn't yet covered by Codeward's automatic-fix support, so it has never been attempted automatically.`,
  AUTOFIX_DISABLED_FOR_REPO: () =>
    `Auto-fix is disabled for this repository's settings, so no automatic attempt was made.`,
  AUTOFIX_ATTEMPTED_FAILED: (detail) =>
    `Codeward attempted to generate an automatic fix but could not complete it.${detail ? ` Details: ${detail}` : ''}`,
  AUTO_FIX_VERIFICATION_FAILED: (detail) =>
    `Codeward generated an automated fix, but verification checks or tests failed.${detail ? ` Details: ${detail}` : ''}`,
  AUTO_FIX_CONFIDENCE_TOO_LOW: (detail) =>
    `Codeward identified a potential fix, but confidence was below the safety threshold.${detail ? ` Details: ${detail}` : ''}`,
  SEVERITY_REQUIRES_MANUAL_REVIEW: (detail) =>
    `This finding impacts critical architecture or security and requires human engineer review.${detail ? ` Details: ${detail}` : ''}`,
  GUARDIAN_REJECTED: (_detail, prUrl) =>
    `Codeward generated an automatic fix, but its own review agent flagged it as risky and did not merge it.${prUrl ? ` The rejected fix is available for reference at: ${prUrl} — review it before proceeding, it may reveal the specific risk that was flagged.` : ''}`,
  APPROVAL_EXPIRED: (_detail, prUrl) =>
    `A fix was generated and reviewed, but the approval window passed without a merge decision.${prUrl ? ` See: ${prUrl}` : ''}`,
};

export function renderCoachingPrompt(input: CoachingPromptInput): string {
  const {
    category, severity, location, description, rawEvidence,
    reason, reasonDetail, fixPrUrl,
  } = input;

  const taskList = getCategoryTaskTemplate(category);
  const reasonText = REASON_CONTEXT[reason] ? REASON_CONTEXT[reason](reasonDetail, fixPrUrl) : 'Manual review required.';
  
  // Sanitize evidence to avoid breaking out of markdown code blocks
  const sanitizedEvidence = (rawEvidence || '').replace(/\`\`\`/g, '\\`\\`\\`');

  return `You are fixing a code quality/security finding reported by an automated
review tool (Codeward). Here is the full context:

FINDING
Category: ${category}
Severity: ${severity}
Location: ${location}

DESCRIPTION
${description}

EVIDENCE (raw tool output)
${sanitizedEvidence}

WHY THIS NEEDS MANUAL WORK
${reasonText}

YOUR TASK
${taskList}

CONSTRAINTS
- Do not change unrelated code.
- Do not modify public API surface without calling it out explicitly.
- Prefer a single focused commit/PR for this fix alone.
- If you're not confident about part of the fix, say so in your summary
  rather than guessing — a flagged uncertainty is more useful than a
  silently wrong fix.`;
}
