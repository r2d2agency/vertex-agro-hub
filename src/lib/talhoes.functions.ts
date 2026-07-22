import { apiRequest } from "@/lib/api";

export type Plot = {
  id: string;
  companyId: string;
  farmId: string;
  farm?: { id: string; name: string } | null;
  name: string;
  code?: string | null;
  areaHa?: number | null;
  cloneName?: string | null;
  plantingYear?: number | null;
  treeCount?: number | null;
  tappingSystem?: string | null;
  notes?: string | null;
};

export type PlotInput = {
  farmId: string;
  name: string;
  code?: string;
  areaHa?: number | null;
  cloneName?: string;
  plantingYear?: number | null;
  treeCount?: number | null;
  tappingSystem?: string;
  notes?: string;
};

export function listPlots(companyId: string, farmId?: string) {
  const qs = new URLSearchParams({ companyId });
  if (farmId) qs.set("farmId", farmId);
  return apiRequest<Plot[]>(`/plots?${qs.toString()}`);
}

export function createPlot(companyId: string, values: PlotInput) {
  return apiRequest<Plot>("/plots", {
    method: "POST",
    body: JSON.stringify({ companyId, ...clean(values) }),
  });
}

export function updatePlot(id: string, values: PlotInput) {
  return apiRequest<Plot>(`/plots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(values)),
  });
}

export function deletePlot(id: string) {
  return apiRequest<{ ok: true }>(`/plots/${id}`, { method: "DELETE" });
}

function clean(v: PlotInput) {
  return {
    farmId: v.farmId,
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    areaHa: v.areaHa ?? undefined,
    cloneName: v.cloneName?.trim() || undefined,
    plantingYear: v.plantingYear ?? undefined,
    treeCount: v.treeCount ?? undefined,
    tappingSystem: v.tappingSystem?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}
