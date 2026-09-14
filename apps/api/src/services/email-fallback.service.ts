/**
 * ============================================================================
 * Email Fallback Service (Eusend Provider)
 * ============================================================================
 *
 * Provides a production-grade fallback when primary email delivery (Resend)
 * hits daily rate limits (e.g., 300 emails/day on free tier), monthly quotas,
 * or experiences downtime.
 *
 * Eusend uses standard EU-compliant REST delivery at https://api.eusend.dev/emails.
 * ============================================================================
 */

export interface FallbackEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  id?: string;
  provider: 'resend' | 'eusend' | 'mock';
  error?: string;
}

/**
 * Checks whether an error from Resend indicates rate limiting, daily/monthly quota exhaustion,
 * or provider downtime suitable for failover.
 */
export function isResendQuotaOrFailoverError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err?.error || err || '').toLowerCase();
  const status = Number(err?.status || err?.statusCode || err?.response?.status || 0);

  return (
    status === 429 ||
    status === 402 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes('429') ||
    msg.includes('rate') ||
    msg.includes('daily') ||
    msg.includes('monthly') ||
    msg.includes('quota') ||
    msg.includes('limit') ||
    msg.includes('exceeded') ||
    msg.includes('too many requests') ||
    msg.includes('300') ||
    msg.includes('credit') ||
    msg.includes('payment') ||
    msg.includes('resend service failure') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout')
  );
}

/**
 * Dispatches an email via Eusend API (https://api.eusend.dev/emails).
 */
export async function sendEmailViaEusend(
  options: FallbackEmailOptions
): Promise<SendResult> {
  const apiKey = process.env.EUSEND_API_KEY;
  if (!apiKey) {
    console.warn('[EusendFallback] No EUSEND_API_KEY configured. Fallback unavailable.');
    return {
      success: false,
      provider: 'eusend',
      error: 'EUSEND_API_KEY is not configured',
    };
  }

  const from = options.from || process.env.EUSEND_FROM_ADDRESS || 'Codeward <notifications@app.codeward.cloud>';
  const toList = Array.isArray(options.to) ? options.to : [options.to];

  const payload: Record<string, any> = {
    from,
    to: toList,
    subject: options.subject,
    html: options.html,
  };

  if (options.text) {
    payload.text = options.text;
  }
  if (options.replyTo) {
    payload.replyTo = options.replyTo;
  }
  if (options.headers) {
    payload.headers = options.headers;
  }

  try {
    const res = await fetch('https://api.eusend.dev/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`;
      console.error('[EusendFallback] Delivery failed:', errMsg);
      return {
        success: false,
        provider: 'eusend',
        error: errMsg,
      };
    }

    const emailId = data?.id || data?.data?.id || `eusend-${Date.now()}`;
    console.log(`[EusendFallback] ✅ Email successfully dispatched via Eusend fallback (ID: ${emailId}) to: ${toList.join(', ')}`);
    return {
      success: true,
      provider: 'eusend',
      id: emailId,
    };
  } catch (err: any) {
    console.error('[EusendFallback] Network exception calling Eusend API:', err.message);
    return {
      success: false,
      provider: 'eusend',
      error: err.message || 'Eusend network failure',
    };
  }
}
