import { apiRequest } from "@/lib/api";

// Tarefa: o que o sangrador executou na tabela — não é single-select, ele
// pode marcar mais de uma opção (ex.: tabela completa + reposição).
export const TASK_EXTENTS = [
  { value: "X", label: "Tabela completa (X)" },
  { value: "/", label: "Tabela adiantada (/)" },
  { value: "1", label: "Reposição (1)" },
] as const;

export const END_PERIODS = [
  { value: "periodo_1", label: "1º período" },
  { value: "periodo_2", label: "2º período" },
  { value: "periodo_3", label: "3º período" },
] as const;

export type TappingRecord = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  tappingTableId?: string | null;
  date: string;
  sangradorName: string;
  tapperId?: string | null;
  taskExtent?: string | null;
  endPeriod?: string | null;
  treesExpected?: number | null;
  treesTapped?: number | null;
  liters?: number | null;
  drcPercent?: number | null;
  dryKg?: number | null;
  adherencePct?: number | null;
  notes?: string | null;
  status?: string | null;
  quality?: string | null;
  tableCondition?: string | null;
  photoUrls?: string[] | null;
  audioUrl?: string | null;
};

export type TappingInput = {
  farmId?: string;
  plotId?: string;
  tappingTableId?: string;
  date: string;
  sangradorName: string;
  tapperId?: string | null;
  taskExtent?: string | null;
  endPeriod?: string | null;
  treesExpected?: number | null;
  treesTapped?: number | null;
  liters?: number | null;
  drcPercent?: number | null;
  dryKg?: number | null;
  adherencePct?: number | null;
  notes?: string;
  status?: string;
  quality?: string;
  tableCondition?: string;
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
    tapperId: v.tapperId || undefined,
    taskExtent: v.taskExtent || undefined,
    endPeriod: v.endPeriod || undefined,
    treesExpected: v.treesExpected ?? undefined,
    treesTapped: v.treesTapped ?? undefined,
    liters: v.liters ?? undefined,
    drcPercent: v.drcPercent ?? undefined,
    dryKg: v.dryKg ?? undefined,
    adherencePct: v.adherencePct ?? undefined,
    notes: v.notes?.trim() || undefined,
    status: v.status || undefined,
    quality: v.quality || undefined,
    tableCondition: v.tableCondition || undefined,
  };
}
