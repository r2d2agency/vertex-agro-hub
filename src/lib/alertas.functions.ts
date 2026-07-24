import { apiRequest } from "@/lib/api";

export type AlertRule = {
  id: string; companyId: string; kind: string; name: string;
  threshold?: any; channel: string; active: boolean; createdAt: string; updatedAt: string;
};
export type AlertEvent = {
  id: string; ruleId?: string | null; companyId: string;
  level: string; title: string; message?: string | null; meta?: any; createdAt: string;
};

export const listAlertRules = (companyId: string) =>
  apiRequest<AlertRule[]>(`/alerts/rules?companyId=${companyId}`);
export const createAlertRule = (dto: Partial<AlertRule> & { companyId: string; kind: string; name: string }) =>
  apiRequest<AlertRule>(`/alerts/rules`, { method: "POST", body: JSON.stringify(dto) });
export const updateAlertRule = (id: string, dto: Partial<AlertRule>) =>
  apiRequest<AlertRule>(`/alerts/rules/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteAlertRule = (id: string) =>
  apiRequest<{ ok: boolean }>(`/alerts/rules/${id}`, { method: "DELETE" });
export const listAlertEvents = (companyId: string, limit = 100) =>
  apiRequest<AlertEvent[]>(`/alerts/events?companyId=${companyId}&limit=${limit}`);
export const evaluateAlerts = (companyId: string) =>
  apiRequest<{ evaluated: number; created: number }>(`/alerts/evaluate`, {
    method: "POST", body: JSON.stringify({ companyId }),
  });
