export async function verifyEmailRealTime(email: string): Promise<{ isValid: boolean; message: string }> {
  const apiKey = process.env.QUICKEMAILVERIFICATION_API_KEY || process.env.EMAIL_VERIFICATION_API_KEY;
  
  if (!apiKey) {
    console.warn('[EmailVerifier] No API key configured. Bypassing verification.');
    return { isValid: true, message: 'Bypassed verification (no API key)' };
  }

  try {
    const response = await fetch(`https://api.quickemailverification.com/v1/verify?email=${encodeURIComponent(email)}&apikey=${apiKey}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[EmailVerifier] API error:', response.statusText);
      return { isValid: true, message: 'Verification service unavailable, defaulting to valid' };
    }

    const data = await response.json();
    
    // QuickEmailVerification typically returns 'result' as 'valid', 'invalid', 'unknown'
    if (data.result === 'invalid') {
      return { isValid: false, message: 'Email address appears to be invalid or undeliverable.' };
    }

    return { isValid: true, message: 'Email is valid' };
  } catch (err) {
    console.error('[EmailVerifier] Network error:', err);
    // Fail open if the service is down
    return { isValid: true, message: 'Verification service error, defaulting to valid' };
  }
}
