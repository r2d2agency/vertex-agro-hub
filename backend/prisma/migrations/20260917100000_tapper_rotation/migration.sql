-- Ordem explícita das tabelas por sangrador.
ALTER TABLE "tapper_table_links" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Mantém a ordem histórica de inclusão como ordem inicial da rotação.
WITH ranked AS (
  SELECT "id", row_number() OVER (
    PARTITION BY COALESCE("tapper_id"::text, 'rh:' || "user_id"::text)
    ORDER BY "created_at" ASC, "id" ASC
  ) - 1 AS pos
  FROM "tapper_table_links"
)
UPDATE "tapper_table_links" t
SET "position" = r.pos
FROM ranked r
WHERE t."id" = r."id";

CREATE INDEX "tapper_table_links_tapper_id_position_idx" ON "tapper_table_links"("tapper_id", "position");
CREATE INDEX "tapper_table_links_user_id_position_idx" ON "tapper_table_links"("user_id", "position");

CREATE TABLE "tapper_rotations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "tapper_id" UUID,
  "user_id" UUID,
  "anchor_table_id" UUID NOT NULL,
  "anchor_date" DATE NOT NULL,
  "last_table_id" UUID NOT NULL,
  "last_record_id" UUID,
  "link_stamp" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tapper_rotations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tapper_rotations_tapper_id_key" ON "tapper_rotations"("tapper_id");
CREATE UNIQUE INDEX "tapper_rotations_user_id_key" ON "tapper_rotations"("user_id");
CREATE INDEX "tapper_rotations_company_id_idx" ON "tapper_rotations"("company_id");

ALTER TABLE "tapping_records" ADD COLUMN "expected_table_id" UUID;
ALTER TABLE "tapping_records" ADD COLUMN "divergent" BOOLEAN NOT NULL DEFAULT false;
