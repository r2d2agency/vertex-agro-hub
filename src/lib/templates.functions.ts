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

type TappingTableTemplateResponse = Omit<TappingTableTemplate, "tableIds"> & {
  tableIds?: string[];
  items?: Array<{ tappingTableId: string; position?: number }>;
};

export async function listTappingTableTemplates(companyId: string) {
  const templates = await apiRequest<TappingTableTemplateResponse[]>(
    `/tapping-table-templates?companyId=${encodeURIComponent(companyId)}`,
  );
  return templates.map(normalizeTemplate);
}

export async function createTappingTableTemplate(input: TappingTableTemplateInput) {
  const template = await apiRequest<TappingTableTemplateResponse>("/tapping-table-templates", {
    method: "POST",
    body: JSON.stringify(clean(input)),
  });
  return normalizeTemplate(template);
}

export async function updateTappingTableTemplate(
  id: string,
  input: Partial<Omit<TappingTableTemplateInput, "companyId">> & { companyId?: string },
) {
  const template = await apiRequest<TappingTableTemplateResponse>(
    `/tapping-table-templates/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(clean(input)),
    },
  );
  return normalizeTemplate(template);
}

export function applyTappingTableTemplate(input: {
  companyId: string;
  tapperKey: string;
  farmId?: string;
  plotId?: string;
  templateId: string;
}) {
  return apiRequest<unknown[]>(`/tappers/table-links/apply-template`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteTappingTableTemplate(id: string, companyId?: string) {
  const suffix = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  return apiRequest<{ ok: true }>(`/tapping-table-templates/${id}${suffix}`, { method: "DELETE" });
}

function clean<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeTemplate(template: TappingTableTemplateResponse): TappingTableTemplate {
  const { items, ...data } = template;
  const tableIds = Array.isArray(template.tableIds)
    ? template.tableIds
    : [...(items ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((item) => item.tappingTableId);

  return { ...data, tableIds };
}
