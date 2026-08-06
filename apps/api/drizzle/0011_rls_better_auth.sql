-- ─────────────────────────────────────────────────────────────────────────────
-- 0011_rls_better_auth
-- Enable strict RLS on the Better Auth tables (user, session, account,
-- verification) as deny-by-default: the app authenticates through the Node API
-- (postgres role, RLS-bypassed owner), so no Data-API role needs read access.
-- Enabling RLS here means a leaked anon/authenticated key can never dump emails
-- or auth tokens through the Supabase Data API.
-- ─────────────────────────────────────────────────────────────────────────────

--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "demo_leads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ─── Self-scoped read of one's own profile via the Supabase JWT (best effort;
--     the app's Better Auth user ids differ from auth.uid(), so these effectively
--     deny-by-default and never leak another user's row). ───────────────────────
--> statement-breakpoint
CREATE POLICY "user_self_select" ON "user" FOR SELECT
  TO authenticated
  USING (id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "session_self_select" ON "session" FOR SELECT
  TO authenticated
  USING ("userId" = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "account_self_select" ON "account" FOR SELECT
  TO authenticated
  USING ("userId" = (select auth.uid())::text);
