import { apiRequest } from "@/lib/api";
import { enqueueMutation, flushOutbox } from "@/lib/offline/queue";

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

export function getFieldMe() {
  return apiRequest<FieldMe>("/field/me");
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
