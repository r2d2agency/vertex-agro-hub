-- Cadastro de sangradores (ficha RH simplificada) e histórico de fazendas
CREATE TABLE "tappers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "nickname" TEXT,
  "code" TEXT,
  "cpf" TEXT,
  "rg" TEXT,
  "birth_date" DATE,
  "phone" TEXT,
  "photo_url" TEXT,
  "address_city" TEXT,
  "address_state" TEXT,
  "contract_type" TEXT,
  "admission_date" DATE,
  "termination_date" DATE,
  "daily_rate" DOUBLE PRECISION,
  "pis_number" TEXT,
  "bank_pix_key" TEXT,
  "emergency_contact_name" TEXT,
  "emergency_contact_phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tappers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tappers_company_idx" ON "tappers"("company_id", "is_deleted");
ALTER TABLE "tappers" ADD CONSTRAINT "tappers_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tapper_stints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tapper_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "plot_id" UUID,
  "start_at" DATE NOT NULL,
  "end_at" DATE,
  "end_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tapper_stints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tapper_stints_tapper_idx" ON "tapper_stints"("tapper_id");
CREATE INDEX "tapper_stints_company_farm_idx" ON "tapper_stints"("company_id", "farm_id");
ALTER TABLE "tapper_stints" ADD CONSTRAINT "tapper_stints_tapper_fkey"
  FOREIGN KEY ("tapper_id") REFERENCES "tappers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
