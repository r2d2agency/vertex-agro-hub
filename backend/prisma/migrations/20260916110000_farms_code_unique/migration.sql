-- Farm.code hoje é texto livre sem validação de duplicidade. Antes de criar o
-- índice único, zera o código das duplicatas (mantém a mais antiga por
-- company_id+code) — reversível, e a fazenda afetada só deixa de casar
-- automaticamente na próxima importação até alguém reconferir o código.
-- Postgres trata múltiplos NULL como não-conflitantes, então fazendas sem
-- código não são afetadas.
WITH ranked AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "company_id", "code" ORDER BY "created_at" ASC
  ) AS rn
  FROM "farms"
  WHERE "code" IS NOT NULL
)
UPDATE "farms" SET "code" = NULL WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "farms_company_id_code_key" ON "farms"("company_id", "code");
