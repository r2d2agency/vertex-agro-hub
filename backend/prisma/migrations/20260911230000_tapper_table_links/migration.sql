-- Vincula sangradores (ficha legada Tapper ou vínculo só de RH via userId) a
-- tabelas de sangria, com a quantidade de árvores prevista para cada um.
CREATE TABLE IF NOT EXISTS "tapper_table_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "tapper_id" UUID,
    "user_id" UUID,
    "tapping_table_id" UUID NOT NULL,
    "tree_count" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tapper_table_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tapper_table_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
    CONSTRAINT "tapper_table_links_tapper_id_fkey" FOREIGN KEY ("tapper_id") REFERENCES "tappers"("id") ON DELETE CASCADE,
    CONSTRAINT "tapper_table_links_tapping_table_id_fkey" FOREIGN KEY ("tapping_table_id") REFERENCES "tapping_tables"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "tapper_table_links_company_id_idx" ON "tapper_table_links"("company_id");
CREATE INDEX IF NOT EXISTS "tapper_table_links_tapper_id_idx" ON "tapper_table_links"("tapper_id");
CREATE INDEX IF NOT EXISTS "tapper_table_links_user_id_idx" ON "tapper_table_links"("user_id");
CREATE INDEX IF NOT EXISTS "tapper_table_links_tapping_table_id_idx" ON "tapper_table_links"("tapping_table_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tapper_table_links_tapper_id_tapping_table_id_key" ON "tapper_table_links"("tapper_id", "tapping_table_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tapper_table_links_user_id_tapping_table_id_key" ON "tapper_table_links"("user_id", "tapping_table_id");
