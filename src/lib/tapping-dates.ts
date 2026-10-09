/**
 * Ponto de formatação único para a data de um registro de sangria.
 *
 * `date` é uma coluna @db.Date: o Prisma devolve o dia civil como meia-noite UTC.
 * Formatar esse instante em America/Sao_Paulo desloca -3h e o dia vira o ANTERIOR
 * (com hora 21:00) — por isso o fallback re-ancora o dia civil em 15:00 UTC.
 *
 * `recordedAt` é @db.Timestamptz(6): instante real de gravação, já com fuso correto.
 * Quando existe, é a fonte certa para data E hora.
 */
export function tappingRecordMoment(
  record: { recordedAt?: string | null; date?: string | null },
  _timeZone = "America/Sao_Paulo",
): Date {
  if (record.recordedAt) return new Date(record.recordedAt);
  const raw = record.date ? String(record.date).slice(0, 10) : "";
  if (!raw) return new Date(NaN);
  // Meio-dia de Brasília (15:00 UTC) preserva o dia civil em qualquer fuso ocidental.
  return new Date(`${raw}T15:00:00.000Z`);
}
