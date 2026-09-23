ALTER TABLE "tapping_records" ADD COLUMN "recorded_at" TIMESTAMPTZ(6);
UPDATE "tapping_records" SET "recorded_at" = "date"::timestamptz WHERE "recorded_at" IS NULL;
