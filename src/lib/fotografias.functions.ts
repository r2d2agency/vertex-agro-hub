import { apiRequest } from "@/lib/api";

export const PHOTO_CATEGORIES = [
  { value: "painel", label: "Painel de sangria" },
  { value: "praga", label: "Praga / doença" },
  { value: "equipamento", label: "Equipamento" },
  { value: "campo", label: "Vista de campo" },
  { value: "colheita", label: "Colheita / entrega" },
  { value: "outro", label: "Outro" },
] as const;

export type Photo = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  takenAt: string;
  url: string;
  thumbUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  category?: string | null;
  caption?: string | null;
  author?: string | null;
};

export type PhotoInput = {
  farmId?: string;
  plotId?: string;
  takenAt?: string;
  url: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
  caption?: string;
  author?: string;
};

export function listPhotos(companyId: string, opts: { farmId?: string; category?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<Photo[]>(`/photos?${qs.toString()}`);
}
export function createPhoto(companyId: string, v: PhotoInput) {
  return apiRequest<Photo>("/photos", { method: "POST", body: JSON.stringify({ companyId, ...clean(v) }) });
}
export function deletePhoto(id: string) {
  return apiRequest<{ ok: true }>(`/photos/${id}`, { method: "DELETE" });
}

function clean(v: PhotoInput) {
  return {
    farmId: v.farmId || undefined,
    plotId: v.plotId || undefined,
    takenAt: v.takenAt || undefined,
    url: v.url,
    latitude: v.latitude ?? undefined,
    longitude: v.longitude ?? undefined,
    category: v.category || undefined,
    caption: v.caption?.trim() || undefined,
    author: v.author?.trim() || undefined,
  };
}
