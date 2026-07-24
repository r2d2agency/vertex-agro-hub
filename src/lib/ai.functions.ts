import { apiRequest } from "@/lib/api";

export type AiInsight = {
  id: string; companyId: string; farmId?: string | null;
  kind: string; severity: "info" | "warning" | "critical";
  title: string; summary?: string | null; details?: any;
  acknowledged: boolean; createdAt: string; model?: string | null;
};

export type AiForecast = {
  id: string; companyId: string; horizonDays: number;
  predictedDryKg: number; baselineDryKg: number;
  confidence?: number | null; method: string;
  series?: Array<{ date: string; kg: number }> | null;
  notes?: string | null; createdAt: string;
};

export type ActionPlan = {
  id: string; companyId: string; farmId?: string | null; insightId?: string | null;
  title: string; description?: string | null;
  priority: "baixa" | "media" | "alta";
  status: "aberto" | "andamento" | "concluido" | "cancelado";
  dueDate?: string | null; assignee?: string | null;
  steps?: string[] | null; createdAt: string; updatedAt: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const listInsights = (companyId: string) =>
  apiRequest<AiInsight[]>(`/ai/insights?companyId=${companyId}`);
export const generateInsights = (companyId: string) =>
  apiRequest<{ generated: number; insights: AiInsight[] }>(`/ai/insights/generate`, {
    method: "POST", body: JSON.stringify({ companyId }),
  });
export const ackInsight = (id: string) =>
  apiRequest<AiInsight>(`/ai/insights/${id}/ack`, { method: "PATCH" });

export const chatAssistant = (companyId: string, messages: ChatMessage[]) =>
  apiRequest<{ role: "assistant"; content: string }>(`/ai/chat`, {
    method: "POST", body: JSON.stringify({ companyId, messages }),
  });

export const runForecast = (companyId: string, horizonDays = 30) =>
  apiRequest<AiForecast>(`/ai/forecast`, {
    method: "POST", body: JSON.stringify({ companyId, horizonDays }),
  });
export const listForecasts = (companyId: string) =>
  apiRequest<AiForecast[]>(`/ai/forecast?companyId=${companyId}`);

export const listActionPlans = (companyId: string) =>
  apiRequest<ActionPlan[]>(`/action-plans?companyId=${companyId}`);
export const createActionPlan = (dto: Partial<ActionPlan> & { companyId: string; title: string }) =>
  apiRequest<ActionPlan>(`/action-plans`, { method: "POST", body: JSON.stringify(dto) });
export const updateActionPlan = (id: string, dto: Partial<ActionPlan>) =>
  apiRequest<ActionPlan>(`/action-plans/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteActionPlan = (id: string) =>
  apiRequest<{ ok: boolean }>(`/action-plans/${id}`, { method: "DELETE" });
export const planFromInsight = (insightId: string) =>
  apiRequest<ActionPlan>(`/action-plans/from-insight/${insightId}`, { method: "POST" });

export const analyzePhoto = (photoId: string) =>
  apiRequest<{ id: string; aiTags?: string[]; aiSummary?: string; aiAnalyzedAt?: string }>(
    `/ai/photos/${photoId}/analyze`, { method: "POST" });

// ---------------- Config do provedor ----------------
export type AiProvider = "lovable" | "openai" | "gemini";
export type AiConfig = {
  provider: AiProvider;
  model?: string | null;
  apiKey?: string | null;
  useEnvKey?: boolean;
  hasKey?: boolean;
  envKeyAvailable?: boolean;
};

export const getAiConfig = (companyId: string) =>
  apiRequest<AiConfig>(`/ai/config?companyId=${companyId}`);
export const updateAiConfig = (companyId: string, dto: Partial<AiConfig>) =>
  apiRequest<AiConfig>(`/ai/config?companyId=${companyId}`, {
    method: "PATCH", body: JSON.stringify(dto),
  });
export const testAiConfig = (dto: { companyId: string } & Partial<AiConfig>) =>
  apiRequest<{ ok: boolean; provider: string; model: string; sample?: string; error?: string }>(
    `/ai/config/test`, { method: "POST", body: JSON.stringify(dto) });

