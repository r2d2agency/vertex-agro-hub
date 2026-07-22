import { apiRequest } from "@/lib/api";

export type TappingRecord = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  tappingTableId?: string | null;
  date: string;
  sangradorName: string;
  treesTapped?: number | null;
  liters?: number | null;
  drcPercent?: number | null;
  dryKg?: number | null;
  adherencePct?: number | null;
  notes?: string | null;
};

export type TappingInput = {
  farmId?: string;
  plotId?: string;
  tappingTableId?: string;
  date: string;
  sangradorName: string;
  treesTapped?: number | null;
  liters?: number | null;
  drcPercent?: number | null;
  dryKg?: number | null;
  adherencePct?: number | null;
  notes?: string;
};

export function listTappingRecords(
  companyId: string,
  opts: { farmId?: string; plotId?: string; from?: string; to?: string } = {},
) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<TappingRecord[]>(`/tapping-records?${qs.toString()}`);
}

export function createTappingRecord(companyId: string, v: TappingInput) {
  return apiRequest<TappingRecord>("/tapping-records", {
    method: "POST",
    body: JSON.stringify({ companyId, ...clean(v) }),
  });
}

export function updateTappingRecord(id: string, v: TappingInput) {
  return apiRequest<TappingRecord>(`/tapping-records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(v)),
  });
}

export function deleteTappingRecord(id: string) {
  return apiRequest<{ ok: true }>(`/tapping-records/${id}`, { method: "DELETE" });
}

function clean(v: TappingInput) {
  return {
    farmId: v.farmId || undefined,
    plotId: v.plotId || undefined,
    tappingTableId: v.tappingTableId || undefined,
    date: v.date,
    sangradorName: v.sangradorName.trim(),
    treesTapped: v.treesTapped ?? undefined,
    liters: v.liters ?? undefined,
    drcPercent: v.drcPercent ?? undefined,
    dryKg: v.dryKg ?? undefined,
    adherencePct: v.adherencePct ?? undefined,
    notes: v.notes?.trim() || undefined,
  };
}
