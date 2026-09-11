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

// ===== Fluxo do app de campo (monitor) =====
export type TapperLookup = {
  found: boolean;
  sameCompany: boolean;
  cpf: string;
  tapper: (Omit<Tapper, "id"> & { id: string | null }) | null;
  currentFarm: { id: string; name: string } | null;
};

export type PreRegistrationRole = "sangrador" | "monitor" | "operador";

export type TapperPreRegistration = {
  id: string;
  companyId: string;
  role: PreRegistrationRole;
  farmId: string | null;
  farmName: string | null;
  requestedById: string | null;
  requestedByName: string | null;
  reviewedById: string | null;
  personId: string | null;
  fullName: string;
  cpf: string;
  rg: string | null;
  birthDate: string | null;
  phone: string | null;
  addressCity: string | null;
  addressState: string | null;
  contractType: string | null;
  dailyRate: number | null;
  treesAssigned: number | null;
  taskPercent: number | null;
  tappingTableId: string | null;
  rgPhotoUrl: string | null;
  cpfPhotoUrl: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function lookupTapperByCpf(companyId: string, cpf: string) {
  return apiRequest<TapperLookup>(
    `/tappers/lookup?companyId=${encodeURIComponent(companyId)}&cpf=${encodeURIComponent(cpf)}`,
  );
}

export function upsertTapperByCpf(input: TapperInput & {
  companyId: string; cpf: string; farmId?: string; stintStartAt?: string;
}) {
  const { companyId, cpf, farmId, stintStartAt, ...rest } = input;
  return apiRequest<{ tapper: Tapper; created: boolean }>(`/tappers/upsert`, {
    method: "POST",
    body: JSON.stringify({ companyId, cpf, farmId, stintStartAt, ...clean(rest) }),
  });
}

export function listTapperPreRegistrations(
  companyId: string,
  opts: { status?: string; role?: PreRegistrationRole } = {},
) {
  const { status = "pending", role } = opts;
  const params = new URLSearchParams({ companyId, status });
  if (role) params.set("role", role);
  return apiRequest<TapperPreRegistration[]>(`/tappers/pre-registrations?${params.toString()}`);
}

export function createTapperPreRegistration(input: {
  companyId: string;
  farmId: string;
  role?: PreRegistrationRole;
  fullName: string;
  cpf: string;
  rg?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  contractType?: string | null;
  dailyRate?: number | null;
  treesAssigned?: number | null;
  taskPercent?: number | null;
  tappingTableId?: string | null;
  rgPhotoUrl: string;
  cpfPhotoUrl: string;
  notes?: string | null;
}) {
  return apiRequest<TapperPreRegistration>(`/tappers/pre-registrations`, {
    method: "POST",
    body: JSON.stringify(clean(input)),
  });
}

export function reviewTapperPreRegistration(
  id: string,
  input: { companyId: string; status: "approved" | "rejected"; personId?: string; reviewNotes?: string | null },
) {
  return apiRequest<TapperPreRegistration>(`/tappers/pre-registrations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(input)),
  });
}

// ===== Tabelas vinculadas ao sangrador =====
// tapperKey é o id "unificado" do sangrador: o UUID da ficha legada (Tapper)
// ou "rh:<userId>" pra um vínculo só de RH (sem ficha Tapper) — mesmo padrão
// usado no app de campo.
export type TapperTableLink = {
  id: string;
  companyId: string;
  tapperId: string | null;
  userId: string | null;
  tappingTableId: string;
  treeCount: number | null;
  active: boolean;
  notes: string | null;
  tappingTable: { id: string; name: string; notation: string | null; frequencyDays: number | null } | null;
};

export function listTapperTableLinks(companyId: string, tapperKey: string) {
  const qs = new URLSearchParams({ companyId, tapperKey });
  return apiRequest<TapperTableLink[]>(`/tappers/table-links?${qs.toString()}`);
}

export function createTapperTableLink(input: {
  companyId: string; tapperKey: string; tappingTableId: string; treeCount?: number; notes?: string;
}) {
  return apiRequest<TapperTableLink>(`/tappers/table-links`, {
    method: "POST",
    body: JSON.stringify(clean(input)),
  });
}

export function updateTapperTableLink(
  linkId: string,
  input: { companyId: string; treeCount?: number; active?: boolean; notes?: string },
) {
  return apiRequest<TapperTableLink>(`/tappers/table-links/${linkId}`, {
    method: "PATCH",
    body: JSON.stringify(clean(input)),
  });
}

export function deleteTapperTableLink(linkId: string, companyId: string) {
  return apiRequest<{ ok: true }>(`/tappers/table-links/${linkId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export function onlyDigits(v: string) {
  return (v ?? "").replace(/\D+/g, "");
}

export function maskCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
