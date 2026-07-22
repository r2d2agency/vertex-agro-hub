import { apiRequest } from "@/lib/api";

export const OCC_TYPES = [
  { value: "praga", label: "Praga" },
  { value: "doenca", label: "Doença" },
  { value: "clima", label: "Clima" },
  { value: "equipamento", label: "Equipamento" },
  { value: "seguranca", label: "Segurança" },
  { value: "processo", label: "Processo" },
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
