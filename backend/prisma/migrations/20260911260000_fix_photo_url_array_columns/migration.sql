-- Bug antigo do módulo de frota: o schema.prisma sempre declarou
-- "photoUrls String[]" (lista) nesses 6 modelos, mas a coluna real no banco
-- foi criada como "photo_url" TEXT (texto único) lá na migration original —
-- nunca corrigida. Toda leitura/escrita nessas tabelas sem "select" explícito
-- quebra tentando converter TEXT <-> TEXT[]. Mesma causa raiz do bug já
-- corrigido em tapping_records (status/quality/table_condition ausentes).
-- Idempotente: só converte se a coluna ainda não for array.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['machines','implements','operators','maintenance_orders','operation_logs','machine_checklists']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = t AND column_name = 'photo_url' AND data_type <> 'ARRAY'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN "photo_url" TYPE TEXT[] USING (CASE WHEN "photo_url" IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY["photo_url"] END)',
        t
      );
      EXECUTE format('ALTER TABLE %I ALTER COLUMN "photo_url" SET DEFAULT ARRAY[]::TEXT[]', t);
    END IF;
  END LOOP;
END $$;
