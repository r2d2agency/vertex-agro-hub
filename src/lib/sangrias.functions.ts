import { apiRequest } from "@/lib/api";

export type TappingTask = {
  id: string;
  companyId: string;
  code: string;
  label: string;
  description?: string | null;
  position: number;
  active: boolean;
};

// Fallback apenas para compatibilidade enquanto o catálogo é carregado.
export const TASK_EXTENTS = [
  { value: "X", label: "Tabela completa (X)" },
  { value: "/", label: "Tabela adiantada (/)" },
  { value: "1", label: "Reposição (1)" },
] as const;

export function listTappingTasks(companyId: string) {
  return apiRequest<TappingTask[]>(`/field/tapping-tasks?companyId=${encodeURIComponent(companyId)}`);
}

export function createTappingTask(input: Omit<TappingTask, "id" | "companyId" | "active"> & { companyId: string; active?: boolean }) {
  return apiRequest<TappingTask>("/tapping-tasks", { method: "POST", body: JSON.stringify(input) });
}

export function updateTappingTask(id: string, input: Partial<Omit<TappingTask, "id" | "companyId">>) {
  return apiRequest<TappingTask>(`/tapping-tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTappingTask(id: string) {
  return apiRequest(`/tapping-tasks/${id}`, { method: "DELETE" });
}

export const END_PERIODS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
] as const;

export type TappingRecord = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  tappingTableId?: string | null;
  expectedTableId?: string | null;
  divergent?: boolean;
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
