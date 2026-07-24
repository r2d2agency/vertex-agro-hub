import { apiRequest } from "@/lib/api";

export const STIM_METHODS = [
  { value: "pincel", label: "Pincel" },
  { value: "spray", label: "Spray" },
  { value: "gas", label: "Gás (ETG)" },
  { value: "outro", label: "Outro" },
] as const;

export type Stimulation = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  date: string;
  product: string;
  concentration?: string | null;
  method?: string | null;
  applicator?: string | null;
  treesStimulated?: number | null;
  doseMlPerTree?: number | null;
  areaHa?: number | null;
  weather?: string | null;
  notes?: string | null;
};

export type StimulationInput = {
  farmId?: string;
  plotId?: string;
  date: string;
  product: string;
  concentration?: string;
  method?: string;
  applicator?: string;
  treesStimulated?: number | null;
  doseMlPerTree?: number | null;
  areaHa?: number | null;
  weather?: string;
  notes?: string;
};

export function listStimulations(companyId: string, opts: { farmId?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<Stimulation[]>(`/stimulations?${qs.toString()}`);
}
export function createStimulation(companyId: string, v: StimulationInput) {
  return apiRequest<Stimulation>("/stimulations", { method: "POST", body: JSON.stringify({ companyId, ...clean(v) }) });
}
export function updateStimulation(id: string, v: StimulationInput) {
  return apiRequest<Stimulation>(`/stimulations/${id}`, { method: "PATCH", body: JSON.stringify(clean(v)) });
}
export function deleteStimulation(id: string) {
  return apiRequest<{ ok: true }>(`/stimulations/${id}`, { method: "DELETE" });
}

function clean(v: StimulationInput) {
  return {
    farmId: v.farmId || undefined,
    plotId: v.plotId || undefined,
    date: v.date,
    product: v.product.trim(),
    concentration: v.concentration?.trim() || undefined,
    method: v.method || undefined,
    applicator: v.applicator?.trim() || undefined,
    treesStimulated: v.treesStimulated ?? undefined,
    doseMlPerTree: v.doseMlPerTree ?? undefined,
    areaHa: v.areaHa ?? undefined,
    weather: v.weather?.trim() || undefined,
    notes: v.notes?.trim() || undefined,
  };
}
