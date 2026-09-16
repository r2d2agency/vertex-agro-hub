import { apiRequest } from "@/lib/api";
import type { GeoBoundary } from "@/lib/geo";
import { toBoundary } from "@/lib/geo";

export type FarmRegime = "propria" | "arrendada";

export type OwnerRef = { id: string; name: string; code?: string | null; alternateCode?: string | null };
export type BuyerRef = { id: string; name: string; code: string };
export type FarmBuyerRef = BuyerRef & { slot: number };

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
  ownerId?: string | null;
  ownerRef?: OwnerRef | null;
  regime?: FarmRegime | null;
  buyers?: FarmBuyerRef[];
  notes?: string | null;
  boundary?: GeoBoundary | null;
  photoUrls?: string[];
  checkinRadiusM?: number | null;
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
  ownerId?: string | null;
  regime?: FarmRegime | null;
  notes?: string;
  boundary?: GeoBoundary | null;
  photoUrls?: string[];
  checkinRadiusM?: number | null;
};

export function listFarms(companyId: string, regionalId?: string) {
  if (!companyId || companyId === "null" || companyId === "undefined") return Promise.resolve([]);
  const qs = new URLSearchParams({ companyId });
  if (regionalId) qs.set("regionalId", regionalId);
  return apiRequest<Farm[]>(`/farms?${qs.toString()}`);
}

export function getFarm(id: string) {
  return apiRequest<Farm>(`/farms/${id}`);
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

export function listOwners(companyId: string, q?: string) {
  const qs = new URLSearchParams({ companyId });
  if (q) qs.set("q", q);
  return apiRequest<OwnerRef[]>(`/owners?${qs.toString()}`);
}

export function listBuyers(companyId: string, q?: string) {
  const qs = new URLSearchParams({ companyId });
  if (q) qs.set("q", q);
  return apiRequest<BuyerRef[]>(`/buyers?${qs.toString()}`);
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
    ownerId: v.ownerId === undefined ? undefined : (v.ownerId || null),
    regime: v.regime === undefined ? undefined : (v.regime || null),
    notes: v.notes?.trim() || undefined,
    boundary: v.boundary ?? undefined,
    photoUrls: v.photoUrls ?? undefined,
    checkinRadiusM: v.checkinRadiusM ?? undefined,
  };
}
