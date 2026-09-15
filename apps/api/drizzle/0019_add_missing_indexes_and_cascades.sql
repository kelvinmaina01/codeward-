-- Create missing critical indexes on runs
CREATE INDEX IF NOT EXISTS "runs_repo_id_idx" ON "runs" USING btree ("repo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "runs_repo_id_created_at_idx" ON "runs" USING btree ("repo_id", "created_at");
--> statement-breakpoint

-- Update foreign keys to cascade delete for GDPR data wipe
DO $$ BEGIN
  ALTER TABLE "repositories" DROP CONSTRAINT IF EXISTS "repositories_user_id_user_id_fk";
  ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "runs" DROP CONSTRAINT IF EXISTS "runs_repo_id_repositories_id_fk";
  ALTER TABLE "runs" ADD CONSTRAINT "runs_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
