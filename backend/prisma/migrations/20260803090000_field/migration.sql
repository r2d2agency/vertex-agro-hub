-- Stimulations
CREATE TABLE "stimulations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "date" DATE NOT NULL,
  "product" TEXT NOT NULL,
  "concentration" TEXT,
  "method" TEXT,
  "applicator" TEXT,
  "trees_stimulated" INTEGER,
  "dose_ml_per_tree" DOUBLE PRECISION,
  "area_ha" DOUBLE PRECISION,
  "weather" TEXT,
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stimulations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stimulations_company_deleted_idx" ON "stimulations"("company_id","is_deleted");
CREATE INDEX "stimulations_company_date_idx" ON "stimulations"("company_id","date");
CREATE INDEX "stimulations_farm_idx" ON "stimulations"("farm_id");
ALTER TABLE "stimulations" ADD CONSTRAINT "stimulations_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Photos
CREATE TABLE "photos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "taken_at" TIMESTAMP(3) NOT NULL,
  "url" TEXT NOT NULL,
  "thumb_url" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracy_m" DOUBLE PRECISION,
  "category" TEXT,
  "caption" TEXT,
  "author" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "photos_company_deleted_idx" ON "photos"("company_id","is_deleted");
CREATE INDEX "photos_company_taken_idx" ON "photos"("company_id","taken_at");
CREATE INDEX "photos_farm_idx" ON "photos"("farm_id");
ALTER TABLE "photos" ADD CONSTRAINT "photos_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
