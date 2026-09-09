import { apiRequest } from "./api";
import { enqueueMutation } from "./offline/queue";

export type ConsultationForm = {
  id: string;
  companyId: string;
  farmId: string;
  plotId?: string;
  consultantId: string;
  conductedAt: string;
  recommendations: string;
  sanitaryState: string;
  tappingQuality: number; // 1-5
  notes?: string;
  sanitaryInspector?: string; // NEW: Identification of the inspector (registered or 3rd party)
  isThirdPartyInspector?: boolean; // NEW: To flag if the inspector is from a third party
  photos?: string[];
  consultor?: {
    fullName?: string;
    email: string;
  };
};

export type FarmVisitStatus = {
  assignmentId: string;
  farmId: string;
  farmName: string;
  consultantUserId: string;
  consultantName: string;
  lastVisitAt: string | null;
  daysSinceVisit: number;
  overdue: boolean;
};

export type VisitStatus = {
  frequencyDays: number;
  farms: FarmVisitStatus[];
};

export async function listConsultations(companyId: string, opts: { farmId?: string; consultantId?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<ConsultationForm[]>(`/consultations?${qs.toString()}`);
}

export function getVisitStatus(companyId: string) {
  return apiRequest<VisitStatus>(`/consultations/visit-status?companyId=${encodeURIComponent(companyId)}`);
}

export function justifyMissedVisit(input: { companyId: string; farmId: string; reason: string }) {
  return apiRequest(`/consultations/justify-visit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ConsultorDashboard = {
  totalFarms: number;
  totalMonitors: number;
  totalSangradores: number;
  avgQuality: number | null;
  topFarms: Array<{ farmId: string; farmName: string; avgQuality: number | null }>;
  productivityKgHa: number | null;
};

export function getConsultorDashboard(companyId: string) {
  return apiRequest<ConsultorDashboard>(`/consultations/dashboard?companyId=${encodeURIComponent(companyId)}`);
}

export async function submitConsultation(input: Omit<ConsultationForm, "id">) {
  const online = typeof navigator === "undefined" || navigator.onLine;
  const path = "/consultations";
  const label = "Visita técnica de consultoria";
  
  if (!online) {
    await enqueueMutation({ path, method: "POST", body: input, label });
    return { queued: true };
  }
  
  try {
    const data = await apiRequest(path, { method: "POST", body: JSON.stringify(input) });
    return { queued: false, data };
  } catch (e) {
    await enqueueMutation({ path, method: "POST", body: input, label });
    return { queued: true };
  }
}
