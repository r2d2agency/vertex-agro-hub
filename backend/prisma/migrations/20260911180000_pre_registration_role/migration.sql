-- AlterTable
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'sangrador';

-- Pré-cadastros de papéis diferentes (sangrador/monitor/operador) para o mesmo CPF
-- não devem bloquear uns aos outros: refaz a unicidade parcial incluindo "role".
DROP INDEX IF EXISTS "tapper_pre_registration_company_cpf_pending_key";

CREATE UNIQUE INDEX IF NOT EXISTS "tapper_pre_registration_company_cpf_role_pending_key"
  ON "tapper_pre_registration"("company_id", "cpf", "role")
  WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "tapper_pre_registration_company_role_status_idx"
  ON "tapper_pre_registration"("company_id", "role", "status");
