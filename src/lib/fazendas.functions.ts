import { apiRequest } from "@/lib/api";
import type { GeoBoundary } from "@/lib/geo";
import { toBoundary } from "@/lib/geo";

export type FarmRegime = "propria" | "arrendada";

// Proprietário e comprador são N:N com a fazenda (uma propriedade pode ter
// vários CNPJs/proprietários — ex.: co-titularidade ou parceiro arrendatário
// — e vários compradores). Só são escritos pela importação em massa; o
// formulário manual de fazenda os mostra em modo leitura.
export type OwnerRef = {
  id: string;
  name: string;
  code?: string | null;
  alternateCode?: string | null;
  cpf?: string | null;
  cnpjCpf?: string | null;
  stateRegistration?: string | null;
  notes?: string | null;
};
export type FarmOwnerRef = OwnerRef & { regime?: FarmRegime | null };
export type BuyerRef = { id: string; name: string; code: string };
export type FarmBuyerRef = BuyerRef & { slot: number };

export type OwnerDocument = {
  id: string;
  ownerId: string;
  companyId: string;
  kind: string;
  name: string;
  number?: string | null;
  fileUrl?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

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
  owners?: FarmOwnerRef[];
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

export function getOwner(id: string, companyId: string) {
  return apiRequest<OwnerRef>(`/owners/${id}?companyId=${encodeURIComponent(companyId)}`);
}

export function updateOwner(id: string, companyId: string, values: Omit<OwnerRef, "id">) {
  return apiRequest<OwnerRef>(`/owners/${id}?companyId=${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function listOwnerDocuments(ownerId: string, companyId: string) {
  return apiRequest<OwnerDocument[]>(`/owners/${ownerId}/documents?companyId=${encodeURIComponent(companyId)}`);
}

export function createOwnerDocument(ownerId: string, data: Omit<OwnerDocument, "id" | "ownerId" | "createdAt">) {
  return apiRequest<OwnerDocument>(`/owners/${ownerId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteOwnerDocument(ownerId: string, documentId: string, companyId: string) {
  return apiRequest<{ ok: true }>(`/owners/${ownerId}/documents/${documentId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
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
    photoUrls: v.photoUrls ?? undefined,
    checkinRadiusM: v.checkinRadiusM ?? undefined,
  };
}
