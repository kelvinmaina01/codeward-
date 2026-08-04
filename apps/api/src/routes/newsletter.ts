import { Hono } from 'hono';

export const newsletterRouter = new Hono();

newsletterRouter.post('/subscribe', async (c) => {
  try {
    const body = await c.req.json();
    const { email, acceptedTerms } = body;

    // 1. Check required fields & terms acceptance
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return c.json({ success: false, error: 'Please enter a valid email address.' }, 400);
    }

    if (!acceptedTerms) {
      return c.json({ success: false, error: 'You must accept the Terms of Service and Privacy Policy before joining.' }, 400);
    }

    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
      try {
        // 2. Call Brevo Contacts API to register subscriber
        const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            email,
            updateEnabled: true,
            attributes: {
              SOURCE: 'Codeward Footer Newsletter',
              TERMS_ACCEPTED: true,
            },
          }),
        });

        if (!brevoRes.ok) {
          const errText = await brevoRes.text();
          console.log('[Brevo Newsletter] API response:', errText);
          // If contact already exists or Brevo returns non-200, still handle gracefully
        }
      } catch (err) {
        console.error('[Brevo Newsletter] Failed to contact Brevo API:', err);
      }
    }

    return c.json({
      success: true,
      message: "🎉 Success! You're subscribed to Codeward engineering updates.",
    });
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return c.json({ success: false, error: 'Failed to process subscription. Please try again.' }, 500);
  }
});
