-- Teams
CREATE TABLE "teams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "teams_company_id_is_deleted_idx" ON "teams"("company_id", "is_deleted");
ALTER TABLE "teams" ADD CONSTRAINT "teams_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Team members
CREATE TABLE "team_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "team_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
