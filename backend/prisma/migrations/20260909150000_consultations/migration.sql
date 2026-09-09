-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "farm_id" UUID,
    "plot_id" UUID,
    "consultant_id" UUID,
    "conducted_at" TIMESTAMP(3) NOT NULL,
    "sanitary_state" TEXT,
    "tapping_quality" INTEGER,
    "sanitary_inspector" TEXT,
    "is_third_party_inspector" BOOLEAN,
    "recommendations" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
    "device_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultations_company_id_is_deleted_idx" ON "consultations"("company_id", "is_deleted");

-- CreateIndex
CREATE INDEX "consultations_company_id_conducted_at_idx" ON "consultations"("company_id", "conducted_at");

-- CreateIndex
CREATE INDEX "consultations_farm_id_idx" ON "consultations"("farm_id");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
