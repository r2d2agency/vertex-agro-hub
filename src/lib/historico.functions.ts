import { apiRequest } from "@/lib/api";

export type HistoryEvent = {
  id: string;
  kind: "sangria" | "producao" | "ocorrencia" | "agenda" | "estimulacao" | "fotografia";
  date: string;
  title: string;
  subtitle?: string;
  farmId?: string | null;
  meta?: Record<string, any>;
};

export function listHistory(companyId: string, opts: { farmId?: string; from?: string; to?: string; limit?: number } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v != null && v !== "" && qs.set(k, String(v)));
  return apiRequest<HistoryEvent[]>(`/history?${qs.toString()}`);
}
