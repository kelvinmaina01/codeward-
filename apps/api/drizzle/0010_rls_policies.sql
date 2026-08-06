-- ─────────────────────────────────────────────────────────────────────────────
-- 0010_rls_policies
-- Strict Row Level Security on every user-data table.
--
-- Access model:
--   * Direct owner  -> user_id = auth.uid()
--   * Org member    -> user is a member of the row's org_id
--   * Everything else -> denied (RLS deny-by-default).
--
-- The Node API connects as the `postgres` table owner and bypasses RLS (it must,
-- since it enforces the same ownership rules in the query layer). These policies
-- guarantee that ANY access via the Supabase Data API / anon & authenticated roles
-- (e.g. a leaked key or an accidental table grant) can never see another user's rows.
-- ─────────────────────────────────────────────────────────────────────────────

--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organization_member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "repositories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "run_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "merge_approvals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_memory" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "gordon_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "agent_integration_access" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "connector_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mcp_servers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_invite" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workspace_audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "run_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ─── auth helpers (org membership check used across policies) ─────────────────
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.cw_user_is_org_member(org integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_member om
    WHERE om.org_id = org
      AND om.user_id = (select auth.uid())::text
  );
$$;
--> statement-breakpoint

-- ─── organization: members can read their orgs ────────────────────────────────
--> statement-breakpoint
CREATE POLICY "org_select_members" ON "organization" FOR SELECT
  TO authenticated
  USING (public.cw_user_is_org_member(id));
--> statement-breakpoint

-- ─── organization_member: own rows + rows of orgs you belong to ───────────────
--> statement-breakpoint
CREATE POLICY "org_member_select_own" ON "organization_member" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "org_member_select_org" ON "organization_member" FOR SELECT
  TO authenticated
  USING (public.cw_user_is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "org_member_insert_own" ON "organization_member" FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint

-- ─── repositories: owner full access, org members read-only ───────────────────
--> statement-breakpoint
CREATE POLICY "repos_owner_select" ON "repositories" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "repos_org_select" ON "repositories" FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND public.cw_user_is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "repos_owner_insert" ON "repositories" FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "repos_owner_update" ON "repositories" FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "repos_owner_delete" ON "repositories" FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint

-- ─── runs / run_results / agent_tasks / merge_approvals / run_logs:
--     visible through repository ownership (owner or org member) ───────────────
--> statement-breakpoint
CREATE POLICY "runs_repo_select" ON "runs" FOR SELECT
  TO authenticated
  USING (
    repo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = runs.repo_id
        AND (r.user_id = (select auth.uid())::text
             OR (r.org_id IS NOT NULL AND public.cw_user_is_org_member(r.org_id)))
    )
  );
--> statement-breakpoint
CREATE POLICY "run_results_run_select" ON "run_results" FOR SELECT
  TO authenticated
  USING (
    run_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.runs ru
      WHERE ru.id = run_results.run_id
        AND ru.repo_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.repositories r
          WHERE r.id = ru.repo_id
            AND (r.user_id = (select auth.uid())::text
                 OR (r.org_id IS NOT NULL AND public.cw_user_is_org_member(r.org_id)))
        )
    )
  );
--> statement-breakpoint
CREATE POLICY "agent_tasks_run_select" ON "agent_tasks" FOR SELECT
  TO authenticated
  USING (
    run_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.runs ru
      WHERE ru.id = agent_tasks.run_id
        AND ru.repo_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.repositories r
          WHERE r.id = ru.repo_id
            AND (r.user_id = (select auth.uid())::text
                 OR (r.org_id IS NOT NULL AND public.cw_user_is_org_member(r.org_id)))
        )
    )
  );
--> statement-breakpoint
CREATE POLICY "merge_approvals_repo_select" ON "merge_approvals" FOR SELECT
  TO authenticated
  USING (
    repo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = merge_approvals.repo_id
        AND (r.user_id = (select auth.uid())::text
             OR (r.org_id IS NOT NULL AND public.cw_user_is_org_member(r.org_id)))
    )
  );
--> statement-breakpoint
CREATE POLICY "run_logs_repo_select" ON "run_logs" FOR SELECT
  TO authenticated
  USING (
    repo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = run_logs.repo_id
        AND (r.user_id = (select auth.uid())::text
             OR (r.org_id IS NOT NULL AND public.cw_user_is_org_member(r.org_id)))
    )
  );
--> statement-breakpoint

-- ─── chat_sessions / chat_messages / gordon_events: strict user scoping ───────
--> statement-breakpoint
CREATE POLICY "chat_sessions_owner" ON "chat_sessions" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "chat_sessions_owner_insert" ON "chat_sessions" FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "chat_sessions_owner_update" ON "chat_sessions" FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "chat_sessions_owner_delete" ON "chat_sessions" FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "chat_messages_session_owner" ON "chat_messages" FOR SELECT
  TO authenticated
  USING (
    session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.user_id = (select auth.uid())::text
    )
  );
--> statement-breakpoint
CREATE POLICY "gordon_events_owner" ON "gordon_events" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "gordon_events_owner_insert" ON "gordon_events" FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint

-- ─── integrations: owner or org member ────────────────────────────────────────
--> statement-breakpoint
CREATE POLICY "integrations_owner_select" ON "integrations" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "integrations_org_select" ON "integrations" FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND public.cw_user_is_org_member(org_id));
--> statement-breakpoint
CREATE POLICY "integrations_owner_insert" ON "integrations" FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "integrations_owner_update" ON "integrations" FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "integrations_owner_delete" ON "integrations" FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint

-- ─── connector_requests: requester or org member ──────────────────────────────
--> statement-breakpoint
CREATE POLICY "connector_requests_requester" ON "connector_requests" FOR SELECT
  TO authenticated
  USING (requested_by = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "connector_requests_org" ON "connector_requests" FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND public.cw_user_is_org_member(org_id));
--> statement-breakpoint

-- ─── mcp_servers: creator or org member ───────────────────────────────────────
--> statement-breakpoint
CREATE POLICY "mcp_servers_creator" ON "mcp_servers" FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "mcp_servers_org" ON "mcp_servers" FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND public.cw_user_is_org_member(org_id));
--> statement-breakpoint

-- ─── workspace: owner full access, members read ───────────────────────────────
--> statement-breakpoint
CREATE POLICY "workspace_owner_select" ON "workspace" FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "workspace_member_select" ON "workspace" FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_member wm
    WHERE wm.workspace_id = workspace.id
      AND wm.user_id = (select auth.uid())::text
  ));
--> statement-breakpoint
CREATE POLICY "workspace_owner_insert" ON "workspace" FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "workspace_owner_update" ON "workspace" FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid())::text)
  WITH CHECK (owner_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "workspace_owner_delete" ON "workspace" FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "workspace_member_self_select" ON "workspace_member" FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
--> statement-breakpoint
CREATE POLICY "workspace_member_select" ON "workspace_member" FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_member wm
    WHERE wm.workspace_id = workspace_member.workspace_id
      AND wm.user_id = (select auth.uid())::text
  ));
--> statement-breakpoint
CREATE POLICY "workspace_invite_workspace" ON "workspace_invite" FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_member wm
    WHERE wm.workspace_id = workspace_invite.workspace_id
      AND wm.user_id = (select auth.uid())::text
  ));
--> statement-breakpoint
CREATE POLICY "workspace_audit_log_workspace" ON "workspace_audit_log" FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_member wm
    WHERE wm.workspace_id = workspace_audit_log.workspace_id
      AND wm.user_id = (select auth.uid())::text
  ));
--> statement-breakpoint

-- ─── Tables with no owner column: deny-by-default for anon/authenticated.
--     Only the service/postgres role (the API) can read them. ──────────────────
-- (agent_memory, agent_reports, user, session, account, verification, demo_leads,
--  agent_integration_access intentionally have NO authenticated policies.)
