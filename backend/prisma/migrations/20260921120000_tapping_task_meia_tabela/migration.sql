-- Catálogo de tarefas de sangria: acrescenta "Meia tabela" e reposiciona a
-- reposição para o fim da lista. Idempotente: só insere o que falta.
INSERT INTO "tapping_tasks" ("id", "company_id", "code", "label", "position", "updated_at")
SELECT gen_random_uuid(), c."id", v.code, v.label, v.position, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (VALUES
  ('M', 'Meia tabela (M)', 2)
) AS v(code, label, position)
WHERE c."is_deleted" = false
  AND NOT EXISTS (
    SELECT 1 FROM "tapping_tasks" t
    WHERE t."company_id" = c."id" AND t."code" = v.code
  );

-- A reposição (código "1") era a posição 2; com a meia tabela entrando, ela
-- passa para a posição 3 para manter a ordem completa/adiantada/meia/reposição.
UPDATE "tapping_tasks" t
SET "position" = 3, "updated_at" = CURRENT_TIMESTAMP
FROM "companies" c
WHERE t."company_id" = c."id" AND t."code" = '1' AND t."position" = 2;
