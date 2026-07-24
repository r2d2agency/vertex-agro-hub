-- Ativação de acesso do usuário (para desligar mantendo histórico)
ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deactivation_reason" TEXT;

-- Vínculos de pessoas às fazendas (histórico preservado por start/end)
CREATE TABLE "farm_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "farm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "consultor_user_id" UUID,
  "start_at" DATE NOT NULL,
  "end_at" DATE,
  "end_reason" TEXT,
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "farm_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "farm_assignments_user_idx" ON "farm_assignments"("user_id");
CREATE INDEX "farm_assignments_farm_idx" ON "farm_assignments"("farm_id");
CREATE INDEX "farm_assignments_company_role_idx" ON "farm_assignments"("company_id", "role");
CREATE INDEX "farm_assignments_active_idx" ON "farm_assignments"("farm_id", "end_at");

ALTER TABLE "farm_assignments" ADD CONSTRAINT "farm_assignments_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "farm_assignments" ADD CONSTRAINT "farm_assignments_farm_fkey"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "farm_assignments" ADD CONSTRAINT "farm_assignments_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "farm_assignments" ADD CONSTRAINT "farm_assignments_consultor_fkey"
  FOREIGN KEY ("consultor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Avaliações de desempenho por pessoa
CREATE TABLE "person_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "evaluator_user_id" UUID,
  "rated_at" DATE NOT NULL,
  "rating" INTEGER NOT NULL,
  "category" TEXT,
  "title" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_evaluations_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE INDEX "person_evaluations_user_idx" ON "person_evaluations"("user_id");
CREATE INDEX "person_evaluations_company_idx" ON "person_evaluations"("company_id");

ALTER TABLE "person_evaluations" ADD CONSTRAINT "person_evaluations_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "person_evaluations" ADD CONSTRAINT "person_evaluations_company_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "person_evaluations" ADD CONSTRAINT "person_evaluations_evaluator_fkey"
  FOREIGN KEY ("evaluator_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
