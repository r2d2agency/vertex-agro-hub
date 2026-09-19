CREATE TABLE "tapping_tasks" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sync_status" "SyncStatus" NOT NULL DEFAULT 'synced',
  "device_id" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tapping_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tapping_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tapping_tasks_company_id_code_key" ON "tapping_tasks"("company_id", "code");
CREATE INDEX "tapping_tasks_company_id_active_is_deleted_position_idx" ON "tapping_tasks"("company_id", "active", "is_deleted", "position");

INSERT INTO "tapping_tasks" ("id", "company_id", "code", "label", "position", "updated_at")
SELECT gen_random_uuid(), c."id", v.code, v.label, v.position, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (VALUES
  ('X', 'Tabela completa (X)', 0),
  ('/', 'Tabela adiantada (/)', 1),
  ('1', 'Reposição (1)', 2)
) AS v(code, label, position)
WHERE c."is_deleted" = false
  AND NOT EXISTS (
    SELECT 1 FROM "tapping_tasks" t
    WHERE t."company_id" = c."id" AND t."code" = v.code
  );
