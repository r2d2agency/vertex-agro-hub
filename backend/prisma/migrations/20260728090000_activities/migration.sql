-- Occurrences
CREATE TABLE "occurrences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "date" DATE NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'baixa',
  "status" TEXT NOT NULL DEFAULT 'aberta',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "responsible" TEXT,
  "resolved_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "occurrences_company_id_is_deleted_idx" ON "occurrences"("company_id","is_deleted");
CREATE INDEX "occurrences_company_id_date_idx" ON "occurrences"("company_id","date");
CREATE INDEX "occurrences_farm_id_idx" ON "occurrences"("farm_id");
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Scheduled tasks
CREATE TABLE "scheduled_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "team_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'sangria',
  "priority" TEXT NOT NULL DEFAULT 'media',
  "status" TEXT NOT NULL DEFAULT 'planejada',
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "due_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "responsible" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scheduled_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "scheduled_tasks_company_id_is_deleted_idx" ON "scheduled_tasks"("company_id","is_deleted");
CREATE INDEX "scheduled_tasks_company_id_scheduled_at_idx" ON "scheduled_tasks"("company_id","scheduled_at");
CREATE INDEX "scheduled_tasks_farm_id_idx" ON "scheduled_tasks"("farm_id");
CREATE INDEX "scheduled_tasks_team_id_idx" ON "scheduled_tasks"("team_id");
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
