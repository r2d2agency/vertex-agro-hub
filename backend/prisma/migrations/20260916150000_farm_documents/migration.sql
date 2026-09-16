CREATE TABLE "farm_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "number" TEXT,
  "file_url" TEXT,
  "issued_at" DATE,
  "expires_at" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "farm_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "farm_documents_farm_id_idx" ON "farm_documents"("farm_id");
CREATE INDEX "farm_documents_company_id_idx" ON "farm_documents"("company_id");
ALTER TABLE "farm_documents" ADD CONSTRAINT "farm_documents_farm_id_fkey"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "farm_documents" ADD CONSTRAINT "farm_documents_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
