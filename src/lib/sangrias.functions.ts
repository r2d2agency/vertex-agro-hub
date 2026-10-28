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

// 6 formas de sangria, dispostas em matriz 3x2:
// Linha 1: Tabela completa, Adiantamento Completo, Reposição Completa
// Linha 2: Meia Tabela, Meio Adiantamento, Meia Reposição
export const TASK_EXTENTS = [
  { value: "TC", label: "Tabela completa", color: "complete" },
  { value: "AC", label: "Adiantamento Completo", color: "advance" },
  { value: "RC", label: "Reposição Completa", color: "replenish" },
  { value: "MT", label: "Meia Tabela", color: "complete" },
  { value: "MA", label: "Meio Adiantamento", color: "advance" },
  { value: "MR", label: "Meia Reposição", color: "replenish" },
] as const;

// Tarefas que cobrem apenas parte da tabela.
export const PARTIAL_TASKS = ["MT", "MA", "MR"] as const;

export function isPartialTask(code?: string | null) {
  return !!code && (PARTIAL_TASKS as readonly string[]).includes(code);
}

// Cores por categoria: adiantamentos (completo e meio) uma cor; reposições outra.
export function taskColorClass(code?: string | null): string {
  const item = TASK_EXTENTS.find((t) => t.value === code);
  if (!item) return "bg-muted text-muted-foreground";
  if (item.color === "advance") return "bg-amber-500 text-white hover:bg-amber-600";
  if (item.color === "replenish") return "bg-violet-500 text-white hover:bg-violet-600";
  return "bg-emerald-600 text-white hover:bg-emerald-700";
}

export type DailyTreeAllocation = { date: string; plotTreeCount: number | null; tableCount: number; tapperCount: number; baseTrees: number | null; treesExpected: number | null; taskExtent: string };

export function getDailyTreeAllocation(input: { companyId: string; farmId: string; plotId: string; tapperId?: string; userId?: string; tableId: string; taskExtent: string; date: string }) {
  const qs = new URLSearchParams(Object.entries(input).filter(([, value]) => value != null) as [string, string][]);
  return apiRequest<DailyTreeAllocation>(`/tapping-daily-allocation?${qs.toString()}`);
}

export function upsertTappingDailyAllocation(input: { companyId: string; farmId: string; plotId: string; workDate: string; tapperId?: string; userId?: string; tappingTableId: string; taskExtent: string }) {
  return apiRequest(`/tapping-daily-allocations`, { method: "POST", body: JSON.stringify(input) });
}

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

// Relatório de árvores por talhão: feitas, do talhão, da fazenda, do
// sangrador e quantas sangrias foram realizadas.
export type TappingSummaryTapper = {
  id: string;
  name: string;
  treeCount: number;
  treesDone: number;
  treesExpected: number;
  records: number;
};

export type TappingSummary = {
  plotId: string;
  plotName: string;
  farmId: string;
  farmName: string;
  plotTreeCount: number;
  farmTreeCount: number;
  plannedTreeCount: number;
  treesDone: number;
  treesRealized: number;
  tappers: TappingSummaryTapper[];
};

export function listTappingSummary(input: { companyId: string; farmId?: string; plotId?: string; tapperId?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams(Object.entries(input).filter(([, value]) => value != null) as [string, string][]);
  return apiRequest<TappingSummary[]>(`/tapping-summary?${qs.toString()}`);
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
  recordedAt?: string | null;
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
  recordedAt?: string;
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
  allowDuplicate?: boolean;
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
    allowDuplicate: v.allowDuplicate || undefined,
  };
}
