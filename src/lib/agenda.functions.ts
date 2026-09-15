import { apiRequest } from "@/lib/api";

export const TASK_CATEGORIES = [
  { value: "sangria", label: "Sangria" },
  { value: "estimulacao", label: "Estimulação" },
  { value: "inspecao", label: "Inspeção" },
  { value: "manutencao", label: "Manutenção" },
  { value: "visita", label: "Visita técnica" },
  { value: "outro", label: "Outro" },
] as const;

// Cor por tipo de solicitação/tarefa — usada em todo lugar que mostra
// tarefas agendadas (agenda do monitor, alertas na tela inicial, agenda do
// consultor/admin) para o usuário reconhecer o tipo de longe.
export const CATEGORY_STYLE: Record<string, string> = {
  sangria: "bg-primary/15 text-primary",
  estimulacao: "bg-chart-3/20 text-chart-3",
  inspecao: "bg-chart-1/20 text-chart-1",
  manutencao: "bg-chart-4/20 text-chart-4",
  visita: "bg-warning/20 text-warning",
  outro: "bg-muted text-muted-foreground",
};

export function categoryLabel(category: string) {
  return TASK_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function categoryStyle(category: string) {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.outro;
}

// Cor sólida (sem opacidade) para barras/pontos de destaque — o badge acima
// usa bg com opacidade, que fica claro demais para esse uso.
export const CATEGORY_DOT: Record<string, string> = {
  sangria: "bg-primary",
  estimulacao: "bg-chart-3",
  inspecao: "bg-chart-1",
  manutencao: "bg-chart-4",
  visita: "bg-warning",
  outro: "bg-muted-foreground",
};

export function categoryDot(category: string) {
  return CATEGORY_DOT[category] ?? CATEGORY_DOT.outro;
}

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
  // % do sangrador a ser estimulado (ex.: 50% da tarefa dele) — não confundir
  // com o "% da tarefa" do pré-cadastro, que é a fração de plantas que ele
  // sangra no dia a dia; aqui é quanto dessa fração recebe estimulação agora.
  sangradorPercent?: number | null;
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
