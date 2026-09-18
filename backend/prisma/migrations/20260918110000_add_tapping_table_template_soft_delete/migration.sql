-- Keep the original template migration immutable: it may already be recorded as
-- applied in production. Add the soft-delete fields in a separate migration.
ALTER TABLE "tapping_table_templates"
  ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "tapping_table_templates_company_id_is_deleted_idx"
  ON "tapping_table_templates"("company_id", "is_deleted");
