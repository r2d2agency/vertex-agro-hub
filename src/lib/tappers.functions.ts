import { apiRequest } from "@/lib/api";

export type Tapper = {
  id: string;
  companyId: string;
  fullName: string;
  nickname: string | null;
  code: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  phone: string | null;
  photoUrl: string | null;
  addressCity: string | null;
  addressState: string | null;
  contractType: string | null;
  admissionDate: string | null;
  terminationDate: string | null;
  dailyRate: number | null;
  pisNumber: string | null;
  bankPixKey: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type TapperStint = {
  id: string;
  tapperId: string;
  companyId: string;
  farmId: string;
  plotId: string | null;
  startAt: string;
  endAt: string | null;
  endReason: string | null;
  notes: string | null;
  farm: { id: string; name: string; code: string | null } | null;
};

export type TapperStats = { records: number; liters: number; dryKg: number; lastDate: string | null };

export type TapperListItem = Tapper & { stints: TapperStint[]; stats: TapperStats };

export type TapperActivity = {
  id: string;
  date: string;
  sangradorName: string;
  liters: number | null;
  dryKg: number | null;
  drcPercent: number | null;
  treesTapped: number | null;
  adherencePct: number | null;
  notes: string | null;
  farm: { id: string; name: string; code: string | null } | null;
};

export type TapperDetail = Tapper & {
  stints: TapperStint[];
  activity: TapperActivity[];
  totals: { records: number; liters: number; dryKg: number; trees: number };
};

export type TapperInput = Partial<Omit<Tapper, "id" | "companyId" | "createdAt">> & { fullName?: string };

export const TAPPER_CONTRACT_TYPES = [
  "CLT", "Diarista", "Meeiro", "Empreiteiro", "Autônomo", "Temporário",
] as const;

export const TAPPER_STATUS = [
  { value: "ativo", label: "Ativo" },
  { value: "afastado", label: "Afastado" },
  { value: "inativo", label: "Inativo" },
] as const;

export function listTappers(companyId: string) {
  return apiRequest<TapperListItem[]>(`/tappers?companyId=${encodeURIComponent(companyId)}`);
}

export function getTapper(id: string, companyId: string) {
  return apiRequest<TapperDetail>(`/tappers/${id}?companyId=${encodeURIComponent(companyId)}`);
}

export function createTapper(companyId: string, data: TapperInput) {
  return apiRequest<Tapper>(`/tappers`, {
    method: "POST",
    body: JSON.stringify({ companyId, ...clean(data) }),
  });
}

export function updateTapper(id: string, data: TapperInput) {
  return apiRequest<Tapper>(`/tappers/${id}`, { method: "PATCH", body: JSON.stringify(clean(data)) });
}

export function deleteTapper(id: string) {
  return apiRequest<{ ok: true }>(`/tappers/${id}`, { method: "DELETE" });
}

export function addTapperStint(id: string, input: {
  companyId: string; farmId: string; plotId?: string; startAt: string; notes?: string;
}) {
  return apiRequest<TapperStint>(`/tappers/${id}/stints`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function endTapperStint(id: string, stintId: string, companyId: string, endAt?: string, endReason?: string) {
  return apiRequest(`/tappers/${id}/stints/${stintId}/end`, {
    method: "PATCH",
    body: JSON.stringify({ companyId, endAt, endReason }),
  });
}

export function deleteTapperStint(id: string, stintId: string, companyId: string) {
  return apiRequest(`/tappers/${id}/stints/${stintId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

function clean(v: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === "" || val === undefined) continue;
    out[k] = val;
  }
  return out;
}
