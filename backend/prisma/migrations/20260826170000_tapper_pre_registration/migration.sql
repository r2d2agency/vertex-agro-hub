CREATE TABLE "tapper_pre_registration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "farm_id" UUID,
  "farm_name" TEXT,
  "requested_by" UUID,
  "requested_by_name" TEXT,
  "reviewed_by" UUID,
  "person_id" UUID,
  "full_name" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "rg" TEXT,
  "birth_date" DATE,
  "phone" TEXT,
  "address_city" TEXT,
  "address_state" TEXT,
  "contract_type" TEXT,
  "daily_rate" DOUBLE PRECISION,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "review_notes" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tapper_pre_registration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tapper_pre_registration_company_fk"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX "tapper_pre_registration_company_status_created_idx"
  ON "tapper_pre_registration"("company_id", "status", "created_at" DESC);

CREATE INDEX "tapper_pre_registration_company_cpf_idx"
  ON "tapper_pre_registration"("company_id", "cpf");

CREATE UNIQUE INDEX "tapper_pre_registration_company_cpf_pending_key"
  ON "tapper_pre_registration"("company_id", "cpf")
  WHERE "status" = 'pending';
