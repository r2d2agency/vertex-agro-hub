import { apiRequest } from "@/lib/api";

export type SyncSession = {
  id: string; companyId: string; userId?: string | null; deviceId: string;
  startedAt: string; finishedAt?: string | null;
  pulled: number; pushed: number; conflicts: number; note?: string | null;
};
export type SyncHealth = {
  last24h: { sessions: number; conflicts: number };
  activeDevices: Array<{ deviceId: string; lastSync: string; userId?: string | null }>;
};

export function listSessions(companyId: string, opts: { deviceId?: string; limit?: number } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v != null && v !== "" && qs.set(k, String(v)));
  return apiRequest<SyncSession[]>(`/sync/sessions?${qs.toString()}`);
}
export function syncHealth(companyId: string) {
  return apiRequest<SyncHealth>(`/sync/health?companyId=${companyId}`);
}
