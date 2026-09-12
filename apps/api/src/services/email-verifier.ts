import * as dns from 'node:dns/promises';

// Curated blocklist of high-volume disposable and temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
  'getairmail.com',
  'dispostable.com',
  'yopmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'inboxkitten.com',
  'burnermail.io',
  'temp-mail.org',
]);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailVerificationResult {
  isValid: boolean;
  reason?: 'invalid_syntax' | 'disposable_domain' | 'no_mx_records' | 'external_invalid';
  message: string;
}

/**
 * Multi-layer dynamic email verification engine:
 * Layer 1: RFC 5322 Syntax Regex
 * Layer 2: Disposable/Burner Domain In-Memory Filter
 * Layer 3: Native DNS MX Record Validation
 * Layer 4: QuickEmailVerification API (if configured)
 */
export async function verifyEmailRealTime(email: string): Promise<EmailVerificationResult> {
  const trimmed = email ? email.trim().toLowerCase() : '';

  // 1. Syntax Check
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      reason: 'invalid_syntax',
      message: 'Email address format is invalid.',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      reason: 'invalid_syntax',
      message: 'Email must contain exactly one @ symbol.',
    };
  }

  const [, domain] = parts;

  // 2. Disposable Email Filter
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      reason: 'disposable_domain',
      message: 'Disposable or temporary email addresses are not supported.',
    };
  }

  // 3. DNS MX Record Check
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        isValid: false,
        reason: 'no_mx_records',
        message: `The domain ${domain} has no valid MX records to receive mail.`,
      };
    }
  } catch (dnsErr: any) {
    // If the domain doesn't exist (ENOTFOUND / ENODATA)
    if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA' || dnsErr.code === 'ESERVFAIL') {
      return {
        isValid: false,
        reason: 'no_mx_records',
        message: `The domain ${domain} does not appear to exist or has no mail servers.`,
      };
    }
    // Transient network error on DNS — fail-open to not block legitimate users
    console.warn(`[EmailVerifier] DNS lookup hitch for ${domain}:`, dnsErr.message);
  }

  // 4. External Verification API Check (Optional layer)
  const apiKey = process.env.QUICKEMAILVERIFICATION_API_KEY || process.env.EMAIL_VERIFICATION_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://api.quickemailverification.com/v1/verify?email=${encodeURIComponent(trimmed)}&apikey=${apiKey}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.result === 'invalid') {
          return {
            isValid: false,
            reason: 'external_invalid',
            message: 'Email address appears to be invalid or undeliverable.',
          };
        }
      }
    } catch (err) {
      console.warn('[EmailVerifier] External verification API failed open:', err);
    }
  }

  return { isValid: true, message: 'Email passed deliverability verification.' };
}
