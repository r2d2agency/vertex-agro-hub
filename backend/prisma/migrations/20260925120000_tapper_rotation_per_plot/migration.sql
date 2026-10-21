-- A rotação de tabelas passa a ser por talhão: o mesmo sangrador pode ter mais
-- de um talhão e cada um tem o seu próprio percurso de sangria.
ALTER TABLE "tapper_rotations" ADD COLUMN "plot_id" UUID;

-- Rotação antiga (global por sangrador): recupera o talhão da tabela âncora.
WITH recovered AS (
  SELECT r."id" AS rotation_id, l."plot_id"
  FROM "tapper_rotations" r
  JOIN LATERAL (
    SELECT "plot_id" FROM "tapper_plot_table_links" l
    WHERE l."tapping_table_id" = r."anchor_table_id"
      AND l."active" = true
      AND (
        (r."tapper_id" IS NOT NULL AND l."tapper_id" = r."tapper_id")
        OR (r."user_id" IS NOT NULL AND l."user_id" = r."user_id")
      )
    ORDER BY l."position" ASC, l."created_at" ASC
    LIMIT 1
  ) l ON true
)
UPDATE "tapper_rotations" r
SET "plot_id" = rec."plot_id"
FROM recovered rec
WHERE r."id" = rec.rotation_id;

-- Rotações sem talhão recuperável não valem mais: serão recriadas por talhão
-- assim que o sangrador definir o ponto de partida no app de campo.
DELETE FROM "tapper_rotations" WHERE "plot_id" IS NULL;

ALTER TABLE "tapper_rotations" ALTER COLUMN "plot_id" SET NOT NULL;

DROP INDEX IF EXISTS "tapper_rotations_tapper_id_key";
DROP INDEX IF EXISTS "tapper_rotations_user_id_key";

CREATE UNIQUE INDEX "tapper_rotations_tapper_id_plot_id_key" ON "tapper_rotations"("tapper_id", "plot_id");
CREATE UNIQUE INDEX "tapper_rotations_user_id_plot_id_key" ON "tapper_rotations"("user_id", "plot_id");
CREATE INDEX "tapper_rotations_plot_id_idx" ON "tapper_rotations"("plot_id");

ALTER TABLE "tapper_rotations"
  ADD CONSTRAINT "tapper_rotations_plot_id_fkey"
  FOREIGN KEY ("plot_id") REFERENCES "plots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
