-- AlterTable
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "tapper_id" UUID;
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "task_extent" TEXT;
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "end_period" TEXT;

-- AlterTable
ALTER TABLE "stimulations" ADD COLUMN IF NOT EXISTS "tapper_id" UUID;
ALTER TABLE "stimulations" ADD COLUMN IF NOT EXISTS "tapping_table_id" UUID;
ALTER TABLE "stimulations" ADD COLUMN IF NOT EXISTS "reason" TEXT;
