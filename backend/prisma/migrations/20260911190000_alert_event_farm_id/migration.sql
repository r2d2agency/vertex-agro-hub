-- AlterTable
ALTER TABLE "alert_event" ADD COLUMN IF NOT EXISTS "farm_id" UUID;

CREATE INDEX IF NOT EXISTS "alert_event_company_farm_created_idx"
  ON "alert_event"("company_id", "farm_id", "created_at");
