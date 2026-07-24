-- Ficha cadastral: dados pessoais no user, vínculo profissional por empresa e documentos
ALTER TABLE "users"
  ADD COLUMN "cpf" TEXT,
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "marital_status" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "phone_alt" TEXT,
  ADD COLUMN "address_cep" TEXT,
  ADD COLUMN "address_street" TEXT,
  ADD COLUMN "address_number" TEXT,
  ADD COLUMN "address_complement" TEXT,
  ADD COLUMN "address_district" TEXT,
  ADD COLUMN "address_city" TEXT,
  ADD COLUMN "address_state" TEXT,
  ADD COLUMN "emergency_contact_name" TEXT,
  ADD COLUMN "emergency_contact_phone" TEXT,
  ADD COLUMN "notes" TEXT;

CREATE UNIQUE INDEX "users_cpf_unique" ON "users"("cpf") WHERE "cpf" IS NOT NULL;

CREATE TABLE "person_employments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "position" TEXT,
  "employee_code" TEXT,
  "admission_date" DATE,
  "termination_date" DATE,
  "contract_type" TEXT,
  "salary" DECIMAL(12,2),
  "pis_number" TEXT,
  "ctps_number" TEXT,
  "bank_name" TEXT,
  "bank_agency" TEXT,
  "bank_account" TEXT,
  "bank_pix_key" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_employments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "person_employments_user_company_key" ON "person_employments"("user_id","company_id");
CREATE INDEX "person_employments_company_idx" ON "person_employments"("company_id");
ALTER TABLE "person_employments" ADD CONSTRAINT "person_employments_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_employments" ADD CONSTRAINT "person_employments_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "person_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "company_id" UUID,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "number" TEXT,
  "file_url" TEXT,
  "issued_at" DATE,
  "expires_at" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "person_documents_user_idx" ON "person_documents"("user_id");
CREATE INDEX "person_documents_company_idx" ON "person_documents"("company_id");
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_documents" ADD CONSTRAINT "person_documents_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
