import { apiRequest } from "@/lib/api";

export type AuditLog = {
  id: string; companyId?: string | null; userId?: string | null;
  action: string; entity: string; entityId?: string | null;
  diff?: any; ip?: string | null; userAgent?: string | null; createdAt: string;
};

export function listAudit(companyId: string, opts: { entity?: string; action?: string; userId?: string; from?: string; to?: string; limit?: number } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v != null && v !== "" && qs.set(k, String(v)));
  return apiRequest<AuditLog[]>(`/audit?${qs.toString()}`);
}
