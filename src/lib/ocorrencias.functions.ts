import { apiRequest } from "@/lib/api";

export const OCC_TYPES = [
  { value: "praga", label: "Praga" },
  { value: "doenca", label: "Doença" },
  { value: "clima", label: "Clima" },
  { value: "equipamento", label: "Equipamento" },
  { value: "seguranca", label: "Segurança" },
  { value: "processo", label: "Processo" },
  { value: "equipe", label: "Equipe / Pessoal" },
  { value: "outro", label: "Outro" },
] as const;

export const OCC_SEVERITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
] as const;

export const OCC_STATUS = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvida", label: "Resolvida" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export type Occurrence = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  date: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description?: string | null;
  responsible?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
};

export type OccurrenceInput = {
  farmId?: string;
  plotId?: string;
  date: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description?: string;
  responsible?: string;
};

export function occurrenceTitle(occurrence: Occurrence) {
  if (occurrence.type !== "clima" || /\bmm\b/i.test(occurrence.title)) return occurrence.title;
  const rainfall = /Milímetros de chuva:\s*([\d.,]+)\s*mm/i.exec(occurrence.description ?? "")?.[1];
  return rainfall ? `Chuva ${rainfall} mm` : occurrence.title;
}

export function occurrenceSeverityLabel(occurrence: Pick<Occurrence, "type" | "severity">) {
  if (occurrence.type !== "clima") return OCC_SEVERITIES.find((item) => item.value === occurrence.severity)?.label ?? occurrence.severity;
  const ranges: Record<string, string> = {
    baixa: "Baixa (<15 mm)",
    media: "Média (15 a 49,9 mm)",
    alta: "Alta (50 mm ou mais)",
  };
  return ranges[occurrence.severity] ?? OCC_SEVERITIES.find((item) => item.value === occurrence.severity)?.label ?? occurrence.severity;
}

export function occurrenceStatusLabel(occurrence: Pick<Occurrence, "type" | "status">) {
  if (occurrence.type === "clima" && occurrence.status === "aberta") return "Em aberto";
  return OCC_STATUS.find((item) => item.value === occurrence.status)?.label ?? occurrence.status;
}

export function occurrenceReportedAfter(occurrence: Pick<Occurrence, "date" | "createdAt">) {
  if (!occurrence.createdAt) return false;
  const date = occurrence.date.slice(0, 10);
  const enteredDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(occurrence.createdAt));
  return enteredDate > date;
}

export function listOccurrences(companyId: string, opts: { farmId?: string; status?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<Occurrence[]>(`/occurrences?${qs.toString()}`);
}

export function createOccurrence(companyId: string, v: OccurrenceInput) {
  return apiRequest<Occurrence>("/occurrences", { method: "POST", body: JSON.stringify({ companyId, ...clean(v) }) });
}
export function updateOccurrence(id: string, v: OccurrenceInput) {
  return apiRequest<Occurrence>(`/occurrences/${id}`, { method: "PATCH", body: JSON.stringify(clean(v)) });
}
export function deleteOccurrence(id: string) {
  return apiRequest<{ ok: true }>(`/occurrences/${id}`, { method: "DELETE" });
}

function clean(v: OccurrenceInput) {
  return {
    farmId: v.farmId || undefined,
    plotId: v.plotId || undefined,
    date: v.date,
    type: v.type,
    severity: v.severity,
    status: v.status,
    title: v.title.trim(),
    description: v.description?.trim() || undefined,
    responsible: v.responsible?.trim() || undefined,
  };
}
