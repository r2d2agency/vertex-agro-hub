import { apiRequest } from "./api";
import { enqueueMutation } from "./offline/queue";

export type ConsultationForm = {
  id: string;
  farmId: string;
  consultantId: string;
  conductedAt: string;
  recommendations: string;
  sanitaryState: string;
  tappingQuality: number; // 1-5
  notes?: string;
  photos?: string[];
};

export async function listConsultations(companyId: string, opts: { farmId?: string; consultantId?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<ConsultationForm[]>(`/consultations?${qs.toString()}`);
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
