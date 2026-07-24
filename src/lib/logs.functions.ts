import { apiRequest } from "@/lib/api";

export type SystemLog = {
  id: string; level: string; source: string; message: string; meta?: any; createdAt: string;
};

export function listLogs(companyId: string, opts: { level?: string; source?: string; q?: string; from?: string; to?: string; limit?: number } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v != null && v !== "" && qs.set(k, String(v)));
  return apiRequest<SystemLog[]>(`/logs?${qs.toString()}`);
}
