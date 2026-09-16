CREATE TABLE "owner_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
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
  CONSTRAINT "owner_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "owner_documents_owner_id_idx" ON "owner_documents"("owner_id");
CREATE INDEX "owner_documents_company_id_idx" ON "owner_documents"("company_id");
ALTER TABLE "owner_documents" ADD CONSTRAINT "owner_documents_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE;
ALTER TABLE "owner_documents" ADD CONSTRAINT "owner_documents_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
