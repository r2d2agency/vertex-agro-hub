CREATE TYPE "FarmRegime" AS ENUM ('propria', 'arrendada');

-- Owners
CREATE TABLE "owners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "code" TEXT,
  "alternate_code" TEXT,
  "name" TEXT NOT NULL,
  "cpf" TEXT,
  "cnpj_cpf" TEXT,
  "state_registration" TEXT,
  "notes" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "owners_company_id_alternate_code_key" ON "owners"("company_id", "alternate_code");
CREATE INDEX "owners_company_id_code_idx" ON "owners"("company_id", "code");
CREATE INDEX "owners_company_id_is_deleted_idx" ON "owners"("company_id", "is_deleted");
ALTER TABLE "owners" ADD CONSTRAINT "owners_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Buyers
CREATE TABLE "buyers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buyers_company_id_code_key" ON "buyers"("company_id", "code");
CREATE INDEX "buyers_company_id_is_deleted_idx" ON "buyers"("company_id", "is_deleted");
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Farm <-> Buyer (slot 1/2)
CREATE TABLE "farm_buyers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "buyer_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "slot" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_buyers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "farm_buyers_farm_id_buyer_id_key" ON "farm_buyers"("farm_id", "buyer_id");
CREATE INDEX "farm_buyers_farm_id_idx" ON "farm_buyers"("farm_id");
CREATE INDEX "farm_buyers_buyer_id_idx" ON "farm_buyers"("buyer_id");
ALTER TABLE "farm_buyers" ADD CONSTRAINT "farm_buyers_farm_id_fkey"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "farm_buyers" ADD CONSTRAINT "farm_buyers_buyer_id_fkey"
  FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE CASCADE;

-- Farm <-> Owner (N:N — uma fazenda pode ter vários proprietários/CNPJs, e
-- um mesmo proprietário pode estar em várias fazendas). regime (própria/
-- arrendada) é do vínculo, não da fazenda: a mesma propriedade pode ter um
-- dono "próprio" e um "parceiro" arrendado ao mesmo tempo.
CREATE TABLE "farm_owners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "regime" "FarmRegime",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_owners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "farm_owners_farm_id_owner_id_key" ON "farm_owners"("farm_id", "owner_id");
CREATE INDEX "farm_owners_farm_id_idx" ON "farm_owners"("farm_id");
CREATE INDEX "farm_owners_owner_id_idx" ON "farm_owners"("owner_id");
ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_farm_id_fkey"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE;
