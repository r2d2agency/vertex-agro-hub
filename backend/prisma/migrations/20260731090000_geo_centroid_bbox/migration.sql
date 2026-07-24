-- Adiciona centroide e bounding box para geofencing/check-in nos apps
ALTER TABLE "farms"
  ADD COLUMN IF NOT EXISTS "centroid_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "centroid_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "bbox" JSONB;

ALTER TABLE "plots"
  ADD COLUMN IF NOT EXISTS "centroid_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "centroid_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "bbox" JSONB;
