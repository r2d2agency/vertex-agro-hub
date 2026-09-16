-- A migration 20260916100000 foi publicada inicialmente com owner_id/regime
-- diretamente em farms e depois passou a criar farm_owners. Bancos que
-- aplicaram a primeira versao nao executam novamente o arquivo alterado.
-- Esta migration reconcilia os dois estados sem depender de qual versao rodou.
CREATE TABLE IF NOT EXISTS "farm_owners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "regime" "FarmRegime",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_owners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "farm_owners_farm_id_owner_id_key"
  ON "farm_owners"("farm_id", "owner_id");
CREATE INDEX IF NOT EXISTS "farm_owners_farm_id_idx" ON "farm_owners"("farm_id");
CREATE INDEX IF NOT EXISTS "farm_owners_owner_id_idx" ON "farm_owners"("owner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'farm_owners_farm_id_fkey'
  ) THEN
    ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_farm_id_fkey"
      FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'farm_owners_owner_id_fkey'
  ) THEN
    ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Preserva os vinculos criados pela primeira versao da migration, caso as
-- colunas legadas ainda existam. O SQL dinamico evita referenciar colunas que
-- nunca existiram nos bancos que receberam diretamente o modelo N:N.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'owner_id'
  ) THEN
    EXECUTE $backfill$
      INSERT INTO "farm_owners" ("farm_id", "owner_id", "company_id", "regime")
      SELECT "id", "owner_id", "company_id", "regime"
      FROM "farms"
      WHERE "owner_id" IS NOT NULL
      ON CONFLICT ("farm_id", "owner_id") DO UPDATE
        SET "regime" = COALESCE(EXCLUDED."regime", "farm_owners"."regime")
    $backfill$;
  END IF;
END $$;
