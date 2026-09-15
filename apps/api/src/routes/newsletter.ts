import { Hono } from 'hono';
import { z } from 'zod';
import { validateBody, getValidatedBody } from '../middleware/zod-validator.js';

export const newsletterRouter = new Hono();

const subscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy before joining.' })
  }),
});

newsletterRouter.post('/subscribe', validateBody(subscribeSchema), async (c) => {
  try {
    const { email } = getValidatedBody<z.infer<typeof subscribeSchema>>(c);
    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
      try {
        // Call Brevo Contacts API to register subscriber
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
