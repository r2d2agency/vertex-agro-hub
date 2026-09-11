-- Corrige um gap antigo: schema.prisma já declarava status/quality/
-- table_condition em TappingRecord, mas nenhuma migration chegou a criar
-- essas colunas no banco — todo prisma.tappingRecord.create() (que retorna
-- todas as colunas por padrão) quebrava com "column ... does not exist".
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "quality" TEXT;
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "table_condition" TEXT;
