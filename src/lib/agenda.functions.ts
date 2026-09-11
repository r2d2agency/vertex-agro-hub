import { apiRequest } from "@/lib/api";

export const TASK_CATEGORIES = [
  { value: "sangria", label: "Sangria" },
  { value: "estimulacao", label: "Estimulação" },
  { value: "inspecao", label: "Inspeção" },
  { value: "manutencao", label: "Manutenção" },
  { value: "visita", label: "Visita técnica" },
  { value: "outro", label: "Outro" },
] as const;

export const TASK_PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

export const TASK_STATUS = [
  { value: "planejada", label: "Planejada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export type ScheduledTask = {
  id: string;
  companyId: string;
  farmId?: string | null;
  plotId?: string | null;
  teamId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  scheduledAt: string;
  dueAt?: string | null;
  completedAt?: string | null;
  responsible?: string | null;
  meta?: Record<string, any> | null;
};

// Parâmetros de uma estimulação agendada (category: "estimulacao"),
// guardados em ScheduledTask.meta — definidos por quem agenda (consultor/
// admin); o monitor só confirma a execução, não escolhe.
export type StimulationTaskMeta = {
  tapperId?: string | null;
  tapperName?: string | null;
  tappingTableId?: string | null;
  tappingTableName?: string | null;
  product: string;
  concentration?: string | null;
  doseMlPerTree?: number | null;
  reason?: string | null;
};

export type TaskInput = {
  farmId?: string;
  plotId?: string;
  teamId?: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  scheduledAt: string;
  dueAt?: string;
  responsible?: string;
  meta?: Record<string, any>;
};

export function listTasks(companyId: string, opts: { farmId?: string; teamId?: string; status?: string; from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ companyId });
  Object.entries(opts).forEach(([k, v]) => v && qs.set(k, v));
  return apiRequest<ScheduledTask[]>(`/scheduled-tasks?${qs.toString()}`);
}
export function createTask(companyId: string, v: TaskInput) {
  return apiRequest<ScheduledTask>("/scheduled-tasks", { method: "POST", body: JSON.stringify({ companyId, ...clean(v) }) });
}
export function updateTask(id: string, v: TaskInput) {
  return apiRequest<ScheduledTask>(`/scheduled-tasks/${id}`, { method: "PATCH", body: JSON.stringify(clean(v)) });
}
export function deleteTask(id: string) {
  return apiRequest<{ ok: true }>(`/scheduled-tasks/${id}`, { method: "DELETE" });
}

function clean(v: TaskInput) {
  return {
    farmId: v.farmId || undefined,
    plotId: v.plotId || undefined,
    teamId: v.teamId || undefined,
    title: v.title.trim(),
    description: v.description?.trim() || undefined,
    category: v.category,
    priority: v.priority,
    status: v.status,
    scheduledAt: new Date(v.scheduledAt).toISOString(),
    dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : undefined,
    responsible: v.responsible?.trim() || undefined,
    meta: v.meta && Object.keys(v.meta).length ? v.meta : undefined,
  };
}
