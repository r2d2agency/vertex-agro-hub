import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, CheckCircle2, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listTeams } from "@/lib/teams.functions";
import {
  createTask, deleteTask, listTasks, updateTask,
  TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUS,
  type ScheduledTask, type TaskInput,
} from "@/lib/agenda.functions";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [
    { title: "Agenda Operacional — Vertex Agro" },
    { name: "description", content: "Planejamento e execução de atividades de campo por equipe e fazenda." },
    { name: "robots", content: "noindex" },
  ]}),
  component: AgendaPage,
});

const nowIso = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};
const empty: TaskInput = {
  farmId: "", teamId: "", title: "", description: "",
  category: "sangria", priority: "media", status: "planejada",
  scheduledAt: nowIso(), dueAt: "", responsible: "",
};

const priorityColor: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  alta: "bg-red-500/15 text-red-700 dark:text-red-300",
};
const statusColor: Record<string, string> = {
  planejada: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  em_andamento: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelada: "bg-muted text-muted-foreground",
};
const label = (opts: readonly { value: string; label: string }[], v: string) =>
  opts.find((o) => o.value === v)?.label ?? v;

function AgendaPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("__all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ScheduledTask | null>(null);
  const [toDelete, setToDelete] = useState<ScheduledTask | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", companyId], queryFn: () => listTeams(companyId!), enabled: !!companyId,
  });

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["tasks", companyId, statusFilter],
    queryFn: () => listTasks(companyId!, { status: statusFilter !== "__all" ? statusFilter : undefined }),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { toast.success("Atividade removida"); qc.invalidateQueries({ queryKey: ["tasks", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: (t: ScheduledTask) => updateTask(t.id, {
      farmId: t.farmId ?? undefined, plotId: t.plotId ?? undefined, teamId: t.teamId ?? undefined,
      title: t.title, description: t.description ?? undefined,
      category: t.category, priority: t.priority, status: "concluida",
      scheduledAt: t.scheduledAt, dueAt: t.dueAt ?? undefined, responsible: t.responsible ?? undefined,
    }),
    onSuccess: () => { toast.success("Atividade concluída"); qc.invalidateQueries({ queryKey: ["tasks", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const t of data) {
      const key = t.scheduledAt.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const summary = useMemo(() => ({
    total: data.length,
    planejadas: data.filter((t) => t.status === "planejada").length,
    andamento: data.filter((t) => t.status === "em_andamento").length,
    concluidas: data.filter((t) => t.status === "concluida").length,
  }), [data]);

  const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name;
  const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.name;

  return (
    <div>
      <PageHeader
        title="Agenda Operacional"
        description="Planejamento de atividades por equipe, fazenda e prioridade."
        actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova atividade</Button> : null}
      />

      {!isLoading && companies.length === 0 ? <NoCompanyCard /> : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <SummaryCard label="Total" value={summary.total.toString()} />
            <SummaryCard label="Planejadas" value={summary.planejadas.toString()} />
            <SummaryCard label="Em andamento" value={summary.andamento.toString()} />
            <SummaryCard label="Concluídas" value={summary.concluidas.toString()} />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {TASK_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button variant="outline" onClick={() => {
                const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name ?? "";
                const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.name ?? "";
                downloadCsv(`agenda-${new Date().toISOString().slice(0, 10)}`, data, [
                  { key: "scheduledAt", label: "Início", format: (v) => v ? new Date(v).toLocaleString("pt-BR") : "" },
                  { key: "dueAt", label: "Prazo", format: (v) => v ? new Date(v).toLocaleString("pt-BR") : "" },
                  { key: "title", label: "Título" },
                  { key: "farmId", label: "Fazenda", format: (v) => farmName(v) },
                  { key: "teamId", label: "Equipe", format: (v) => teamName(v) },
                  { key: "category", label: "Categoria", format: (v) => label(TASK_CATEGORIES, v) },
                  { key: "priority", label: "Prioridade", format: (v) => label(TASK_PRIORITIES, v) },
                  { key: "status", label: "Status", format: (v) => label(TASK_STATUS, v) },
                  { key: "responsible", label: "Responsável" },
                  { key: "description", label: "Descrição" },
                ]);
              }} disabled={!data.length}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </div>


          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nenhuma atividade planejada.
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </h3>
                  <div className="grid gap-2">
                    {items.map((t) => (
                      <Card key={t.id}>
                        <CardContent className="flex flex-wrap items-center gap-3 p-4">
                          <div className="flex-1 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{t.title}</p>
                              <Badge className={priorityColor[t.priority]} variant="secondary">{label(TASK_PRIORITIES, t.priority)}</Badge>
                              <Badge className={statusColor[t.status]} variant="secondary">{label(TASK_STATUS, t.status)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(t.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}{label(TASK_CATEGORIES, t.category)}
                              {farmName(t.farmId) ? ` · ${farmName(t.farmId)}` : ""}
                              {teamName(t.teamId) ? ` · ${teamName(t.teamId)}` : ""}
                              {t.responsible ? ` · ${t.responsible}` : ""}
                            </p>
                            {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                          </div>
                          <div className="flex gap-1">
                            {t.status !== "concluida" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => complete.mutate(t)} title="Marcar concluída">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <TaskDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        teams={teams}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tasks", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>A atividade será removida da agenda ativa.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}

function TaskDialog({
  open, onOpenChange, initial, companyId, farms, teams, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ScheduledTask;
  companyId: string | null;
  farms: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<TaskInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId ?? "",
      plotId: initial.plotId ?? "",
      teamId: initial.teamId ?? "",
      title: initial.title,
      description: initial.description ?? "",
      category: initial.category,
      priority: initial.priority,
      status: initial.status,
      scheduledAt: initial.scheduledAt.slice(0, 16),
      dueAt: initial.dueAt ? initial.dueAt.slice(0, 16) : "",
      responsible: initial.responsible ?? "",
    });
    else setValues({ ...empty, scheduledAt: nowIso() });
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => initial ? updateTask(initial.id, values) : createTask(companyId!, values),
    onSuccess: () => { toast.success(initial ? "Atividade atualizada" : "Atividade criada"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar atividade" : "Nova atividade"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.title.trim()) return toast.error("Título obrigatório");
            if (!values.scheduledAt) return toast.error("Data/hora obrigatória");
            mut.mutate();
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <div className="md:col-span-2"><Label>Título *</Label><Input value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} required /></div>
          <div><Label>Início *</Label><Input type="datetime-local" value={values.scheduledAt} onChange={(e) => setValues((v) => ({ ...v, scheduledAt: e.target.value }))} required /></div>
          <div><Label>Prazo</Label><Input type="datetime-local" value={values.dueAt ?? ""} onChange={(e) => setValues((v) => ({ ...v, dueAt: e.target.value }))} /></div>
          <div>
            <Label>Categoria *</Label>
            <Select value={values.category} onValueChange={(v) => setValues((s) => ({ ...s, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_CATEGORIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade *</Label>
            <Select value={values.priority} onValueChange={(v) => setValues((s) => ({ ...s, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_PRIORITIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fazenda</Label>
            <Select value={values.farmId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipe</Label>
            <Select value={values.teamId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, teamId: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Responsável</Label><Input value={values.responsible ?? ""} onChange={(e) => setValues((v) => ({ ...v, responsible: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={3} value={values.description ?? ""} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
