import { apiRequest } from "@/lib/api";

export type TappingTable = {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  notation?: string | null;
  cutType?: string | null;
  frequencyDays?: number | null;
  restDays?: number | null;
  workDaysCycle?: number | null;
  stimulation?: string | null;
  description?: string | null;
  active: boolean;
};

export type TappingTableInput = {
  name: string;
  code?: string;
  notation?: string;
  cutType?: string;
  frequencyDays?: number | null;
  restDays?: number | null;
  workDaysCycle?: number | null;
  stimulation?: string;
  description?: string;
  active?: boolean;
};

export function listTappingTables(companyId: string) {
  return apiRequest<TappingTable[]>(`/tapping-tables?companyId=${encodeURIComponent(companyId)}`);
}
export function createTappingTable(companyId: string, v: TappingTableInput) {
  return apiRequest<TappingTable>("/tapping-tables", {
    method: "POST",
    body: JSON.stringify({ companyId, ...cleanup(v) }),
  });
}
export function updateTappingTable(id: string, v: TappingTableInput) {
  return apiRequest<TappingTable>(`/tapping-tables/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanup(v)),
  });
}
export function deleteTappingTable(id: string) {
  return apiRequest<{ ok: true }>(`/tapping-tables/${id}`, { method: "DELETE" });
}

function cleanup(v: TappingTableInput) {
  return {
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    notation: v.notation?.trim() || undefined,
    cutType: v.cutType?.trim() || undefined,
    frequencyDays: numOrUndef(v.frequencyDays),
    restDays: numOrUndef(v.restDays),
    workDaysCycle: numOrUndef(v.workDaysCycle),
    stimulation: v.stimulation?.trim() || undefined,
    description: v.description?.trim() || undefined,
    active: v.active,
  };
}

function numOrUndef(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return undefined;
  return n;
}
