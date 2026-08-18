import { apiRequest } from "@/lib/api";
import { enqueueMutation, flushOutbox } from "@/lib/offline/queue";
import { idbGet, idbPut } from "@/lib/offline/idb";

const FIELD_ME_CACHE_KEY = "field:me";

export type FieldMe = {
  user: { id: string; email: string; fullName?: string | null };
  roles: string[];
  primaryRole: string;
  isAdmin: boolean;
  companies: Array<{ id: string; name: string; legalName?: string | null }>;
  assignments: Array<{
    id: string;
    role: string;
    startAt: string;
    endAt: string | null;
    farm: {
      id: string;
      name: string;
      companyId: string;
      city?: string | null;
      state?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      photoUrls: string[];
      plots: Array<{ id: string; name: string }>;
    };
  }>;
};

export type Coords = { latitude: number; longitude: number; accuracyM?: number };

export async function getFieldMe(): Promise<FieldMe> {
  try {
    const data = await apiRequest<FieldMe>("/field/me");
    await idbPut("cache", { key: FIELD_ME_CACHE_KEY, ...data });
    return data;
  } catch (e) {
    const cached = await idbGet<FieldMe & { key: string }>("cache", FIELD_ME_CACHE_KEY);
    if (cached) return cached;
    throw e;
  }
}

export async function captureLocation(timeout = 10000): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracyM: p.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout }
    );
  });
}

function submit(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body: any, label: string) {
  return enqueueMutation({
    path,
    method,
    body,
    label,
  }).then(key => ({ queued: true, key }));
}

export function submitTapping(input: {
  companyId: string; farmId?: string; plotId?: string;
  tappingTableId?: string; date: string; sangradorName: string;
  treesTapped?: number | null; liters?: number | null; drcPercent?: number | null;
  dryKg?: number | null; adherencePct?: number | null; notes?: string;
  status?: string; quality?: string; tableCondition?: string;
}) {
  const data = { ...input };
  if (data.treesTapped === null) delete data.treesTapped;
  if (data.liters === null) delete data.liters;
  if (data.drcPercent === null) delete data.drcPercent;
  if (data.dryKg === null) delete data.dryKg;
  if (data.adherencePct === null) delete data.adherencePct;
  return submit("/tapping-records", "POST", data, `Sangria — ${input.sangradorName}`);
}

export function submitDelivery(input: {
  companyId: string; farmId?: string; plotId?: string;
  deliveryDate: string; vehiclePlate?: string; netWeightKg?: number | null;
  drcAvgPercent?: number | null; latexType?: string; notes?: string;
}) {
  const data = { ...input };
  if (data.netWeightKg === null) delete data.netWeightKg;
  if (data.drcAvgPercent === null) delete data.drcAvgPercent;
  return submit("/production-deliveries", "POST", data, `Produção — ${input.netWeightKg} kg`);
}

export function submitOccurrence(input: {
  companyId: string; farmId?: string; plotId?: string;
  date: string; type: string; severity: string; status: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada';
  title: string; description?: string; responsible?: string;
}) {
  return submit("/occurrences", "POST", input, `Ocorrência — ${input.title}`);
}

export function submitEvaluation(input: {
  companyId: string; targetUserId: string;
  ratedAt: string; rating: number; category: string;
  title?: string; notes?: string;
}) {
  return submit(`/people/${input.targetUserId}/evaluations`, "POST", input, "Avaliação de equipe");
}

export async function submitCheckin(input: {
  companyId: string; farmId?: string; plotId?: string;
  taskId?: string; latitude?: number; longitude?: number;
  accuracyM?: number; notes?: string;
}) {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await apiRequest("/field/checkin", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { queued: false };
  }
  return submit("/field/checkin", "POST", input, "Check-in GPS");
}

export function submitOperationLog(input: any) {
  const desc = input.finishedAt ? "Finalizar Operação" : "Iniciar Operação";
  const path = input.id ? `/machine-operations/${input.id}` : "/machine-operations";
  const method = input.id ? "PATCH" : "POST";
  return submit(path, method, input, desc);
}

export function submitFuelMovement(input: {
  companyId: string; tankId: string; kind: "saida" | "entrada" | "ajuste";
  liters: number; occurredAt?: string; machineId?: string;
  operatorId?: string; hourmeter?: number; unitCost?: number;
  supplier?: string; notes?: string;
}) {
  return submit("/fuel-movements", "POST", input, `Abastecimento — ${input.liters} L`);
}

export function submitChecklist(input: {
  companyId: string; machineId: string; operatorId?: string;
  kind?: string; performedAt?: string; hourmeter?: number;
  overallStatus?: string; notes?: string;
  items: Array<{ label: string; status: "ok" | "nok" | "na"; notes?: string }>;
}) {
  return submit("/machine-checklists", "POST", input, "Checklist de máquina");
}

export function submitInventoryMovement(input: {
  companyId: string; itemId: string; kind: "entrada" | "saida" | "ajuste";
  quantity: number; occurredAt?: string;
  reason?: string; machineId?: string; supplier?: string;
  invoiceNumber?: string; unitCost?: number; notes?: string;
}) {
  return submit("/inventory-movements", "POST", input, `Insumo — ${input.kind} ${input.quantity}`);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function isOffline() {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem("vertex:offline");
  return !!raw;
}