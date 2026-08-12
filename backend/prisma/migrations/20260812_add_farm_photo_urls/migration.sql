-- AlterTable
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
