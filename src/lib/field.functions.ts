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
    };
  }>;
};

export async function getFieldMe(): Promise<FieldMe> {
  try {
    const data = await apiRequest<FieldMe>("/field/me");
    try { await idbPut("cache", { key: FIELD_ME_CACHE_KEY, at: Date.now(), data }); } catch {}
    return data;
  } catch (e) {
    try {
      const cached = await idbGet<{ key: string; at: number; data: FieldMe }>("cache", FIELD_ME_CACHE_KEY);
      if (cached?.data) return cached.data;
    } catch {}
    throw e;
  }
}

export function submitEvaluation(input: {
  targetUserId: string; companyId: string;
  ratedAt: string; rating: number;
  category?: string; title?: string; notes?: string;
}) {
  const { targetUserId, ...body } = input;
  return submit(`/people/${targetUserId}/evaluations`, body, `Avaliação — nota ${input.rating}`);
}

export type Coords = { latitude: number; longitude: number; accuracyM?: number };

export function captureLocation(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: timeoutMs },
    );
  });
}

/** Enfileira ou envia direto se estiver online. */
async function submit(path: string, body: any, label: string) {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (!online) {
    await enqueueMutation({ path, method: "POST", body, label });
    return { queued: true as const };
  }
  try {
    const res = await apiRequest<any>(path, { method: "POST", body: JSON.stringify(body) });
    return { queued: false as const, data: res };
  } catch (e) {
    // Falha de rede/servidor → cai pra fila
    await enqueueMutation({ path, method: "POST", body, label });
    return { queued: true as const };
  } finally {
    // Tenta drenar fila em background
    void flushOutbox().catch(() => undefined);
  }
}

export function submitCheckin(input: {
  companyId: string; farmId?: string; plotId?: string; taskId?: string;
  latitude?: number; longitude?: number; accuracyM?: number; notes?: string;
}) {
  return submit("/field/checkin", input, "Check-in de campo");
}

export function submitTapping(input: {
  companyId: string; farmId?: string; plotId?: string;
  date: string; sangradorName: string;
  liters?: number | null; drcPercent?: number | null; adherencePct?: number | null;
  treesTapped?: number | null; notes?: string;
}) {
  return submit("/tapping-records", input, `Sangria — ${input.sangradorName}`);
}

export function submitDelivery(input: {
  companyId: string; farmId?: string;
  deliveryDate: string; grossWeightKg?: number | null; netWeightKg?: number | null;
  drcAvgPercent?: number | null; latexType?: string; coagulant?: string; notes?: string;
}) {
  return submit("/deliveries", input, "Entrega de produção");
}

export function submitOccurrence(input: {
  companyId: string; farmId?: string;
  date: string; type: string; severity: string; status: string;
  title: string; description?: string; responsible?: string;
}) {
  return submit("/occurrences", input, `Ocorrência — ${input.title}`);
}

export function submitOperationLog(input: {
  companyId: string; farmId?: string; plotId?: string;
  machineId: string; implementId?: string; operatorId?: string; operationTypeId?: string;
  startedAt: string; finishedAt?: string;
  hourmeterStart?: number; hourmeterEnd?: number;
  fuelConsumed?: number; areaWorked?: number; distanceKm?: number;
  latitude?: number; longitude?: number; notes?: string; status?: string;
}) {
  return submit("/operation-logs", input, "Apontamento de máquina");
}

export function submitFuelMovement(input: {
  companyId: string; tankId: string; kind: "entrada" | "saida" | "ajuste";
  liters: number; occurredAt?: string;
  machineId?: string; operatorId?: string; hourmeter?: number;
  unitCost?: number; supplier?: string; invoiceNumber?: string; notes?: string;
}) {
  return submit("/fuel-movements", input, `Abastecimento — ${input.liters} L`);
}

export function submitChecklist(input: {
  companyId: string; machineId: string; operatorId?: string;
  kind?: string; performedAt?: string; hourmeter?: number;
  overallStatus?: string; notes?: string;
  items: Array<{ label: string; status: "ok" | "nok" | "na"; notes?: string }>;
}) {
  return submit("/machine-checklists", input, "Checklist de máquina");
}

export function submitInventoryMovement(input: {
  companyId: string; itemId: string; kind: "entrada" | "saida" | "ajuste";
  quantity: number; occurredAt?: string;
  reason?: string; machineId?: string; supplier?: string;
  invoiceNumber?: string; unitCost?: number; notes?: string;
}) {
  return submit("/inventory-movements", input, `Insumo — ${input.kind} ${input.quantity}`);
}
