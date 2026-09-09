-- AlterTable
ALTER TABLE "fuel_movements" ADD COLUMN IF NOT EXISTS "farm_id" UUID;
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "farm_id" UUID;
ALTER TABLE "machine_checklists" ADD COLUMN IF NOT EXISTS "farm_id" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fuel_movements_farm_id_idx" ON "fuel_movements"("farm_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_farm_id_idx" ON "inventory_movements"("farm_id");
CREATE INDEX IF NOT EXISTS "machine_checklists_farm_id_idx" ON "machine_checklists"("farm_id");

-- Backfill: preenche o farmId dos registros existentes a partir do
-- tanque/item vinculado primeiro e, se ainda vazio, da máquina vinculada.
-- (Duas UPDATEs sequenciais em vez de JOIN: o PostgreSQL não permite
-- referenciar a própria tabela alvo do UPDATE dentro da condição de um
-- JOIN em FROM.)
UPDATE "fuel_movements" fm
SET "farm_id" = t."farm_id"
FROM "fuel_tanks" t
WHERE t."id" = fm."tank_id" AND fm."farm_id" IS NULL AND t."farm_id" IS NOT NULL;

UPDATE "fuel_movements" fm
SET "farm_id" = m."farm_id"
FROM "machines" m
WHERE m."id" = fm."machine_id" AND fm."farm_id" IS NULL AND m."farm_id" IS NOT NULL;

UPDATE "inventory_movements" im
SET "farm_id" = i."farm_id"
FROM "inventory_items" i
WHERE i."id" = im."item_id" AND im."farm_id" IS NULL AND i."farm_id" IS NOT NULL;

UPDATE "inventory_movements" im
SET "farm_id" = m."farm_id"
FROM "machines" m
WHERE m."id" = im."machine_id" AND im."farm_id" IS NULL AND m."farm_id" IS NOT NULL;

UPDATE "machine_checklists" mc
SET "farm_id" = m."farm_id"
FROM "machines" m
WHERE m."id" = mc."machine_id" AND mc."farm_id" IS NULL AND m."farm_id" IS NOT NULL;
