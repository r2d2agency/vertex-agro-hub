-- Foto(s) e áudio opcionais anexados ao registro de sangria.
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tapping_records" ADD COLUMN IF NOT EXISTS "audio_url" TEXT;
