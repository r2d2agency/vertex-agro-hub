-- AlterTable
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "trees_assigned" INTEGER;
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "task_percent" DOUBLE PRECISION;
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "rg_photo_url" TEXT;
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "cpf_photo_url" TEXT;
