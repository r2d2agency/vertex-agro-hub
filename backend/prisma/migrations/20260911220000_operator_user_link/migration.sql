-- Liga um Operator (registro da frota) a um User quando o vínculo vem do RH
-- (FarmAssignment role='operador'), permitindo auto-provisionar o registro de
-- frota a partir do cadastro do RH em vez de manter as duas listas separadas.
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "user_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "operators_company_id_user_id_key" ON "operators"("company_id", "user_id");
