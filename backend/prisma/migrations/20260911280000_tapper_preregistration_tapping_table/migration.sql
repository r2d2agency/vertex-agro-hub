-- Sistema de sangria (tabela) informado no pré-cadastro do sangrador.
ALTER TABLE "tapper_pre_registration" ADD COLUMN IF NOT EXISTS "tapping_table_id" UUID;
