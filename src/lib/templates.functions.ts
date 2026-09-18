import { apiRequest } from "@/lib/api";

export type TappingTableTemplate = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  active: boolean;
  tableIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TappingTableTemplateInput = {
  companyId: string;
  name: string;
  description?: string;
  active?: boolean;
  tableIds: string[];
};

export function listTappingTableTemplates(companyId: string) {
  return apiRequest<TappingTableTemplate[]>(`/tapping-table-templates?companyId=${encodeURIComponent(companyId)}`);
}

export function createTappingTableTemplate(input: TappingTableTemplateInput) {
  return apiRequest<TappingTableTemplate>("/tapping-table-templates", {
    method: "POST",
    body: JSON.stringify(clean(input)),
  });
}

export function updateTappingTableTemplate(id: string, input: Partial<Omit<TappingTableTemplateInput, "companyId">> & { companyId?: string }) {
  return apiRequest<TappingTableTemplate>(`/tapping-table-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(input)),
  });
}

export function applyTappingTableTemplate(input: { companyId: string; tapperKey: string; templateId: string }) {
  return apiRequest(`/tappers/table-links/apply-template`, { method: "POST", body: JSON.stringify(input) });
}

export function deleteTappingTableTemplate(id: string, companyId?: string) {
  const suffix = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  return apiRequest<{ ok: true }>(`/tapping-table-templates/${id}${suffix}`, { method: "DELETE" });
}

function clean<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
