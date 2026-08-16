import { apiRequest } from "@/lib/api";
import { enqueueMutation, flushOutbox } from "@/lib/offline/queue";
import { idbGet, idbPut } from "@/lib/offline/idb";
import { toast } from "sonner";

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
    const data = await apiRequest<FieldMe>("/auth/me");
    await idbPut(FIELD_ME_CACHE_KEY, data);
    return data;
  } catch (e) {
    const cached = await idbGet<FieldMe>(FIELD_ME_CACHE_KEY);
    if (cached) return cached;
    throw e;
  }
}

export async function captureLocation(): Promise<Coords | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracyM: p.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function submit(path: string, input: any, description: string) {
  return enqueueMutation({
    path,
    method: "POST",
    body: input,
    description,
  });
}

export function submitTapping(input: {
  companyId: string; farmId?: string; plotId?: string;
  tappingTableId?: string; date: string; sangradorName: string;
  treesTapped?: number; liters?: number; drcPercent?: number;
  dryKg?: number; adherencePct?: number; notes?: string;
  status?: string; quality?: string; tableCondition?: string;
}) {
  return submit("/tapping-records", input, `Sangria — ${input.sangradorName}`);
}

export function submitProduction(input: {
  companyId: string; farmId?: string; plotId?: string;
  date: string; vehiclePlate?: string; grossWeight?: number;
  tareWeight?: number; netWeight?: number; drcPercent?: number;
  dryKg?: number; bagCount?: number; notes?: string;
}) {
  return submit("/production-deliveries", input, `Produção — ${input.netWeight} kg`);
}

export function submitOccurrence(input: {
  companyId: string; farmId?: string; plotId?: string;
  date: string; type: string; severity: string; status: 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada';
  title: string; description?: string; responsible?: string;
}) {
  return submit("/occurrences", input, `Ocorrência — ${input.title}`);
}

export function submitEvaluation(input: {
  companyId: string; targetUserId: string; evaluatorId: string;
  date: string; score: number; feedback?: string;
  criteria: Record<string, number>;
}) {
  return submit(`/people/${input.targetUserId}/evaluations`, input, "Avaliação de equipe");
}

export function submitCheckin(input: {
  companyId: string; farmId?: string; plotId?: string;
  taskId?: string; latitude?: number; longitude?: number;
  accuracyM?: number; notes?: string;
}) {
  return submit("/activities/checkin", { ...input, type: 'checkin', status: 'concluida' }, "Check-in GPS");
}

export function submitMachineOperation(input: {
  companyId: string; machineId: string; operatorId: string;
  farmId?: string; plotId?: string; operationTypeId: string;
  startAt: string; endAt?: string; startHourmeter: number;
  endHourmeter?: number; fuelConsumption?: number; notes?: string;
}) {
  const desc = input.endAt ? "Finalizar Operação" : "Iniciar Operação";
  return submit("/machine-operations", input, desc);
}

export function submitFuelMovement(input: {
  companyId: string; tankId: string; kind: "saida" | "entrada" | "ajuste";
  liters: number; occurredAt?: string; machineId?: string;
  operatorId?: string; hourmeter?: number; unitCost?: number;
  supplier?: string; notes?: string;
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

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function isOffline() {
  const raw = localStorage.getItem("vertex:offline");
  return !!raw;
}