import { apiRequest } from "@/lib/api";
import type { GeoPolygon } from "@/lib/geo";

export type Farm = {
  id: string;
  companyId: string;
  regionalId?: string | null;
  regional?: { id: string; name: string } | null;
  name: string;
  code?: string | null;
  city?: string | null;
  state?: string | null;
  totalAreaHa?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  owner?: string | null;
  notes?: string | null;
  boundary?: GeoPolygon | null;
};

export type FarmInput = {
  regionalId?: string | null;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  totalAreaHa?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  owner?: string;
  notes?: string;
  boundary?: GeoPolygon | null;
};

export function listFarms(companyId: string, regionalId?: string) {
  const qs = new URLSearchParams({ companyId });
  if (regionalId) qs.set("regionalId", regionalId);
  return apiRequest<Farm[]>(`/farms?${qs.toString()}`);
}

export function createFarm(companyId: string, values: FarmInput) {
  return apiRequest<Farm>("/farms", {
    method: "POST",
    body: JSON.stringify({ companyId, ...clean(values) }),
  });
}

export function updateFarm(id: string, values: FarmInput) {
  return apiRequest<Farm>(`/farms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(values)),
  });
}

export function deleteFarm(id: string) {
  return apiRequest<{ ok: true }>(`/farms/${id}`, { method: "DELETE" });
}

function clean(v: FarmInput) {
  return {
    regionalId: v.regionalId || undefined,
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    city: v.city?.trim() || undefined,
    state: v.state?.trim().toUpperCase() || undefined,
    totalAreaHa: v.totalAreaHa ?? undefined,
    latitude: v.latitude ?? undefined,
    longitude: v.longitude ?? undefined,
    owner: v.owner?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
    boundary: v.boundary ?? undefined,
  };
}
