import * as Sentry from "@sentry/node";

// No DSN fallback on purpose: the project DSN must never be baked into a public repo.
// `dsn` is typed `string | undefined`, and Sentry disables itself when it is absent — so a
// deployment without SENTRY_DSN degrades to a silent no-op rather than reporting to someone
// else's project or throwing at boot.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
  tracesSampleRate: 1.0,
});

export { Sentry };
