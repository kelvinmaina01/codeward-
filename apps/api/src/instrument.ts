import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://698b121fce17c5fa06d9c78985380861@o4511559899348992.ingest.us.sentry.io/4511559899611136",
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 1.0,
});

export { Sentry };
