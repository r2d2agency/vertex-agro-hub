DO $$
BEGIN
  ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'sangrador';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'operador';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
