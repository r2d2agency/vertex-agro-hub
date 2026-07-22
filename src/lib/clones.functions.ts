import { apiRequest } from "@/lib/api";

export type Clone = {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  origin?: string | null;
  productivity?: string | null;
  vigor?: string | null;
  diseaseResistance?: string | null;
  recommendedRegion?: string | null;
  notes?: string | null;
};

export type CloneInput = {
  name: string;
  code?: string;
  origin?: string;
  productivity?: string;
  vigor?: string;
  diseaseResistance?: string;
  recommendedRegion?: string;
  notes?: string;
};

export function listClones(companyId: string) {
  return apiRequest<Clone[]>(`/clones?companyId=${encodeURIComponent(companyId)}`);
}
export function createClone(companyId: string, v: CloneInput) {
  return apiRequest<Clone>("/clones", {
    method: "POST",
    body: JSON.stringify({ companyId, ...cleanup(v) }),
  });
}
export function updateClone(id: string, v: CloneInput) {
  return apiRequest<Clone>(`/clones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanup(v)),
  });
}
export function deleteClone(id: string) {
  return apiRequest<{ ok: true }>(`/clones/${id}`, { method: "DELETE" });
}

function cleanup(v: CloneInput) {
  return {
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    origin: v.origin?.trim() || undefined,
    productivity: v.productivity?.trim() || undefined,
    vigor: v.vigor?.trim() || undefined,
    diseaseResistance: v.diseaseResistance?.trim() || undefined,
    recommendedRegion: v.recommendedRegion?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}
