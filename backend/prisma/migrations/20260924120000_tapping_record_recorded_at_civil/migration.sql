-- A migração 20260923120000 gravou `recorded_at = date::timestamptz`, ou seja,
-- meia-noite UTC. Formatar esse instante em America/Sao_Paulo desloca -3h e o
-- dia renderiza como o ANTERIOR (21:00). O `date` em si está correto (dia
-- civil), então o conserto é pontual: re-ancorar só os `recorded_at` que estão
-- em meia-noite UTC para 15:00 UTC do mesmo dia civil. Registros com hora real
-- (com hora/minuto) não batem no predicado e ficam intocados.
UPDATE "tapping_records"
SET "recorded_at" = make_timestamptz(
  extract(year  from "date")::int,
  extract(month from "date")::int,
  extract(day   from "date")::int,
  15, 0, 0, '+00'
)
WHERE "recorded_at" IS NOT NULL
  AND "recorded_at" = date_trunc('day', "recorded_at");
