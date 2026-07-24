import { apiRequest } from "@/lib/api";

export type Integration = {
  id: string; companyId: string; provider: string; name: string;
  config?: any; secret?: string | null; active: boolean; createdAt: string; updatedAt: string;
};
export type WebhookDelivery = {
  id: string; integrationId: string; event: string; payload: any;
  status: string; statusCode?: number | null; responseBody?: string | null; attemptedAt: string;
};

export const listIntegrations = (companyId: string) =>
  apiRequest<Integration[]>(`/integrations?companyId=${companyId}`);
export const createIntegration = (dto: Partial<Integration> & { companyId: string; provider: string; name: string }) =>
  apiRequest<Integration>(`/integrations`, { method: "POST", body: JSON.stringify(dto) });
export const updateIntegration = (id: string, dto: Partial<Integration>) =>
  apiRequest<Integration>(`/integrations/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteIntegration = (id: string) =>
  apiRequest<{ ok: boolean }>(`/integrations/${id}`, { method: "DELETE" });
export const listDeliveries = (id: string) =>
  apiRequest<WebhookDelivery[]>(`/integrations/${id}/deliveries`);
export const testIntegration = (id: string) =>
  apiRequest<WebhookDelivery>(`/integrations/${id}/test`, { method: "POST" });
