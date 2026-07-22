-- Clones
CREATE TABLE "clones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "origin" TEXT,
  "productivity" TEXT,
  "vigor" TEXT,
  "disease_resistance" TEXT,
  "recommended_region" TEXT,
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clones_company_deleted_idx" ON "clones"("company_id","is_deleted");
ALTER TABLE "clones" ADD CONSTRAINT "clones_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Tapping tables
CREATE TABLE "tapping_tables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "notation" TEXT,
  "cut_type" TEXT,
  "frequency_days" INTEGER,
  "rest_days" INTEGER,
  "work_days_cycle" INTEGER,
  "stimulation" TEXT,
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
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tapping_tables_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tapping_tables_company_deleted_idx" ON "tapping_tables"("company_id","is_deleted");
ALTER TABLE "tapping_tables" ADD CONSTRAINT "tapping_tables_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
