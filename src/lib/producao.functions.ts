import { apiRequest } from "@/lib/api";

export type Delivery = {
  id: string;
  companyId: string;
  farmId?: string | null;
  season?: string | null;
  deliveryDate: string;
  turnDay?: number | null;
  propertyName?: string | null;
  ownerName?: string | null;
  status?: string | null;
  consultantName?: string | null;
  monitorName?: string | null;
  coagulant?: string | null;
  latexType?: string | null;
  grossWeightKg?: number | null;
  netWeightKg?: number | null;
  drcAvgPercent?: number | null;
  dryKg?: number | null;
  notes?: string | null;
};

export type DeliveryInput = {
  farmId?: string;
  season?: string;
  deliveryDate: string;
  turnDay?: number | null;
  propertyName?: string;
  ownerName?: string;
  status?: string;
  consultantName?: string;
  monitorName?: string;
  coagulant?: string;
  latexType?: string;
  grossWeightKg?: number | null;
  netWeightKg?: number | null;
  drcAvgPercent?: number | null;
  notes?: string;
};

export function listDeliveries(
  companyId: string,
  opts: { farmId?: string; season?: string; from?: string; to?: string } = {},
) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<Delivery[]>(`/deliveries?${qs.toString()}`);
}

export function createDelivery(companyId: string, v: DeliveryInput) {
  return apiRequest<Delivery>("/deliveries", {
    method: "POST",
    body: JSON.stringify({ companyId, ...clean(v) }),
  });
}

export function updateDelivery(id: string, v: DeliveryInput) {
  return apiRequest<Delivery>(`/deliveries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(v)),
  });
}

export function deleteDelivery(id: string) {
  return apiRequest<{ ok: true }>(`/deliveries/${id}`, { method: "DELETE" });
}

function clean(v: DeliveryInput) {
  return {
    farmId: v.farmId || undefined,
    season: v.season?.trim() || undefined,
    deliveryDate: v.deliveryDate,
    turnDay: v.turnDay ?? undefined,
    propertyName: v.propertyName?.trim() || undefined,
    ownerName: v.ownerName?.trim() || undefined,
    status: v.status?.trim() || undefined,
    consultantName: v.consultantName?.trim() || undefined,
    monitorName: v.monitorName?.trim() || undefined,
    coagulant: v.coagulant?.trim() || undefined,
    latexType: v.latexType?.trim() || undefined,
    grossWeightKg: v.grossWeightKg ?? undefined,
    netWeightKg: v.netWeightKg ?? undefined,
    drcAvgPercent: v.drcAvgPercent ?? undefined,
    notes: v.notes?.trim() || undefined,
  };
}
