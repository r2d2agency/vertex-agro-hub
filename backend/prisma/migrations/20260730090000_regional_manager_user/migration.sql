-- Adiciona vínculo do responsável da Regional a um usuário pré-cadastrado
ALTER TABLE "regionals" ADD COLUMN IF NOT EXISTS "manager_user_id" UUID;

ALTER TABLE "regionals"
  ADD CONSTRAINT "regionals_manager_user_id_fkey"
  FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "regionals_manager_user_id_idx" ON "regionals"("manager_user_id");
