import { format, toZonedTime } from "date-fns-tz";

/**
 * Retorna a data atual no fuso horário de Brasília (UTC-3) formatada para o backend (YYYY-MM-DD).
 * Resolve o problema de registros sendo salvos com a data do dia anterior devido ao UTC.
 */
export function getLocalIsoDate(date: Date = new Date(), timeZone = "America/Sao_Paulo"): string {
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, "yyyy-MM-dd", { timeZone });
}

/**
 * Retorna o intervalo (YYYY-MM-DD) de um mês civil no fuso de Brasília.
 * `offset` negativo anda para meses anteriores: -1 = mês passado, 0 = mês atual.
 * O fim é o último dia do mês, evitando o off-by-one de "30 dias" em fevereiro.
 */
export function monthRange(offset = 0, timeZone = "America/Sao_Paulo"): { from: string; to: string } {
  const zoned = toZonedTime(new Date(), timeZone);
  const first = new Date(zoned.getFullYear(), zoned.getMonth() + offset, 1);
  const last = new Date(zoned.getFullYear(), zoned.getMonth() + offset + 1, 0);
  return {
    from: format(first, "yyyy-MM-dd"),
    to: format(last, "yyyy-MM-dd"),
  };
}

/** Rótulo do mês para o seletor de período ("outubro de 2025", "mês atual"). */
export function monthLabel(offset = 0, timeZone = "America/Sao_Paulo"): string {
  const zoned = toZonedTime(new Date(), timeZone);
  const ref = new Date(zoned.getFullYear(), zoned.getMonth() + offset, 1);
  if (offset === 0) return "Mês atual";
  const name = ref.toLocaleDateString("pt-BR", { month: "long", timeZone });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${ref.getFullYear()}`;
}

/**
 * Retorna a data e hora atual no fuso horário de Brasília no formato ISO 8601.
 */
export function getLocalIsoString(date: Date = new Date()): string {
  const timeZone = "America/Sao_Paulo";
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", { timeZone });
}

/**
 * Retorna a data e hora formatada para inputs do tipo datetime-local (YYYY-MM-DDTHH:mm).
 */
export function getLocalDatetimeInputValue(date: Date = new Date()): string {
  const timeZone = "America/Sao_Paulo";
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm", { timeZone });
}
