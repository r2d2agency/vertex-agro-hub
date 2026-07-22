-- Regionals
CREATE TABLE "regionals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "manager" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "regionals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "regionals_company_deleted_idx" ON "regionals"("company_id","is_deleted");
ALTER TABLE "regionals" ADD CONSTRAINT "regionals_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Farms
CREATE TABLE "farms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "regional_id" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "city" TEXT,
  "state" TEXT,
  "total_area_ha" DOUBLE PRECISION,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "owner" TEXT,
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
  CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "farms_company_deleted_idx" ON "farms"("company_id","is_deleted");
CREATE INDEX "farms_regional_idx" ON "farms"("regional_id");
ALTER TABLE "farms" ADD CONSTRAINT "farms_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "farms" ADD CONSTRAINT "farms_regional_fkey"
  FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL;

-- Plots
CREATE TABLE "plots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "area_ha" DOUBLE PRECISION,
  "clone_name" TEXT,
  "planting_year" INTEGER,
  "tree_count" INTEGER,
  "tapping_system" TEXT,
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
  CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "plots_company_deleted_idx" ON "plots"("company_id","is_deleted");
CREATE INDEX "plots_farm_idx" ON "plots"("farm_id");
ALTER TABLE "plots" ADD CONSTRAINT "plots_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "plots" ADD CONSTRAINT "plots_farm_fkey"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
