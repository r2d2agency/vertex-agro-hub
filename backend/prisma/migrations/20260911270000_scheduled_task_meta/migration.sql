-- Parâmetros específicos da tarefa agendada (ex.: produto/dose/tabela de
-- uma estimulação planejada pelo consultor/admin, que o monitor só confirma).
ALTER TABLE "scheduled_tasks" ADD COLUMN IF NOT EXISTS "meta" JSONB;
