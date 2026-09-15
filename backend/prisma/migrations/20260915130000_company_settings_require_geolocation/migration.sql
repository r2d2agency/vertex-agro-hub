-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "require_geolocation" BOOLEAN NOT NULL DEFAULT true;
