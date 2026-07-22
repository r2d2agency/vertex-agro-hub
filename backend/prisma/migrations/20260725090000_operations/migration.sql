-- CreateTable
CREATE TABLE "tapping_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "plot_id" UUID,
  "tapping_table_id" UUID,
  "date" DATE NOT NULL,
  "sangrador_name" TEXT NOT NULL,
  "trees_tapped" INTEGER,
  "liters" DOUBLE PRECISION,
  "drc_percent" DOUBLE PRECISION,
  "dry_kg" DOUBLE PRECISION,
  "adherence_pct" DOUBLE PRECISION,
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

  CONSTRAINT "tapping_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tapping_records_company_id_is_deleted_idx" ON "tapping_records"("company_id", "is_deleted");
CREATE INDEX "tapping_records_company_id_date_idx" ON "tapping_records"("company_id", "date");
CREATE INDEX "tapping_records_farm_id_idx" ON "tapping_records"("farm_id");
CREATE INDEX "tapping_records_plot_id_idx" ON "tapping_records"("plot_id");

ALTER TABLE "tapping_records" ADD CONSTRAINT "tapping_records_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "production_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "season" TEXT,
  "delivery_date" DATE NOT NULL,
  "turn_day" INTEGER,
  "property_name" TEXT,
  "owner_name" TEXT,
  "status" TEXT,
  "consultant_name" TEXT,
  "monitor_name" TEXT,
  "coagulant" TEXT,
  "latex_type" TEXT,
  "gross_weight_kg" DOUBLE PRECISION,
  "net_weight_kg" DOUBLE PRECISION,
  "drc_avg_percent" DOUBLE PRECISION,
  "dry_kg" DOUBLE PRECISION,
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

  CONSTRAINT "production_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "production_deliveries_company_id_is_deleted_idx" ON "production_deliveries"("company_id", "is_deleted");
CREATE INDEX "production_deliveries_company_id_delivery_date_idx" ON "production_deliveries"("company_id", "delivery_date");
CREATE INDEX "production_deliveries_farm_id_idx" ON "production_deliveries"("farm_id");

ALTER TABLE "production_deliveries" ADD CONSTRAINT "production_deliveries_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
