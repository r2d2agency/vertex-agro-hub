ALTER TABLE "users"
ALTER COLUMN "email" DROP NOT NULL;

CREATE TABLE "user_companies" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "created_by" UUID,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_companies_user_id_company_id_key"
ON "user_companies"("user_id", "company_id");

CREATE INDEX "user_companies_company_id_idx"
ON "user_companies"("company_id");

CREATE INDEX "user_companies_user_id_idx"
ON "user_companies"("user_id");

ALTER TABLE "user_companies"
ADD CONSTRAINT "user_companies_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_companies"
ADD CONSTRAINT "user_companies_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_companies" (
  "id",
  "user_id",
  "company_id",
  "created_by",
  "active",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  src.user_id,
  src.company_id,
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "user_id", "company_id"
  FROM "user_roles"
  WHERE "company_id" IS NOT NULL

  UNION

  SELECT DISTINCT "user_id", "company_id"
  FROM "person_employments"

  UNION

  SELECT DISTINCT "user_id", "company_id"
  FROM "farm_assignments"
) AS src
ON CONFLICT ("user_id", "company_id") DO NOTHING;
