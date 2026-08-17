import { format, toZonedTime } from "date-fns-tz";

/**
 * Retorna a data atual no fuso horário de Brasília (UTC-3) formatada para o backend (YYYY-MM-DD).
 * Resolve o problema de registros sendo salvos com a data do dia anterior devido ao UTC.
 */
export function getLocalIsoDate(date: Date = new Date()): string {
  const timeZone = "America/Sao_Paulo";
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, "yyyy-MM-dd", { timeZone });
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
