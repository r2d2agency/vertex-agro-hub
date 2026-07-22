import { apiRequest } from "@/lib/api";

export type Regional = {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  manager?: string | null;
};

export type RegionalInput = {
  name: string;
  code?: string;
  description?: string;
  manager?: string;
};

export function listRegionals(companyId: string) {
  return apiRequest<Regional[]>(`/regionals?companyId=${encodeURIComponent(companyId)}`);
}

export function createRegional(companyId: string, values: RegionalInput) {
  return apiRequest<Regional>("/regionals", {
    method: "POST",
    body: JSON.stringify({ companyId, ...cleanup(values) }),
  });
}

export function updateRegional(id: string, values: RegionalInput) {
  return apiRequest<Regional>(`/regionals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanup(values)),
  });
}

export function deleteRegional(id: string) {
  return apiRequest<{ ok: true }>(`/regionals/${id}`, { method: "DELETE" });
}

function cleanup(v: RegionalInput) {
  return {
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    description: v.description?.trim() || undefined,
    manager: v.manager?.trim() || undefined,
  };
}
