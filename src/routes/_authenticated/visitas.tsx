import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, CheckCircle2, Plus, Navigation } from "lucide-react";
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
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { createTask, listTasks, updateTask, type ScheduledTask } from "@/lib/agenda.functions";
import { createOccurrence } from "@/lib/ocorrencias.functions";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: () => ({ meta: [
    { title: "Visitas técnicas — Vertex Agro" },
    { name: "description", content: "Planejamento e execução de visitas técnicas de consultores com check-in por GPS." },
    { name: "robots", content: "noindex" },
  ]}),
  component: () => <TaskCategoryPage category="visita" title="Visitas técnicas" description="Agende visitas de consultores e registre check-in por GPS." emptyLabel="Nenhuma visita agendada." />,
});

export function TaskCategoryPage({ category, title, description, emptyLabel }: { category: "visita" | "inspecao"; title: string; description: string; emptyLabel: string }) {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", companyId, category],
    queryFn: () => listTasks(companyId!),
    enabled: !!companyId,
  });

  const list = useMemo(
    () => tasks.filter((t) => t.category === category)
                .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [tasks, category]
  );

  const [form, setForm] = useState({ farmId: "", title: "", description: "", responsible: "", scheduledAt: nowLocal() });

  const create = useMutation({
    mutationFn: () => createTask(companyId!, {
      farmId: form.farmId || undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      responsible: form.responsible.trim() || undefined,
      category,
      priority: "media",
      status: "planejada",
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    }),
    onSuccess: () => {
      toast.success(category === "visita" ? "Visita agendada" : "Inspeção agendada");
      setOpen(false);
      setForm({ farmId: "", title: "", description: "", responsible: "", scheduledAt: nowLocal() });
      qc.invalidateQueries({ queryKey: ["tasks", companyId, category] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkIn = useMutation({
    mutationFn: async (task: ScheduledTask) => {
      const pos = await getGps();
      await updateTask(task.id, {
        farmId: task.farmId ?? undefined,
        plotId: task.plotId ?? undefined,
        teamId: task.teamId ?? undefined,
        title: task.title,
        description: task.description ?? undefined,
        category: task.category,
        priority: task.priority,
        status: "concluida",
        scheduledAt: task.scheduledAt,
        dueAt: task.dueAt ?? undefined,
        responsible: task.responsible ?? undefined,
      });
      // Registrar ocorrência de rastreamento
      try {
        await createOccurrence(companyId!, {
          farmId: task.farmId ?? undefined,
          date: new Date().toISOString().slice(0, 10),
          type: "processo",
          severity: "baixa",
          status: "resolvida",
          title: `${category === "visita" ? "Check-in visita" : "Check-in inspeção"}: ${task.title}`,
          description: pos
            ? `Coordenadas: ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)} (±${Math.round(pos.accuracy ?? 0)}m)`
            : "Check-in registrado sem GPS.",
          responsible: task.responsible ?? undefined,
        });
      } catch { /* opcional */ }
      return true;
    },
    onSuccess: () => {
      toast.success("Check-in registrado");
      qc.invalidateQueries({ queryKey: ["tasks", companyId, category] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha no check-in"),
  });

  return (
    <div className="grid gap-6">
      <PageHeader title={title} description={description}
        actions={<Button onClick={() => setOpen(true)} disabled={!companyId}><Plus className="h-4 w-4 mr-2" />Nova</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="p-0">
            {list.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            ) : (
              <ul className="divide-y">
                {list.map((t) => {
                  const farm = farms.find((f) => f.id === t.farmId);
                  const when = new Date(t.scheduledAt);
                  const done = t.status === "concluida";
                  return (
                    <li key={t.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{t.title}</span>
                          <Badge variant={done ? "default" : "outline"} className={done ? "bg-emerald-600" : ""}>
                            {done ? "Concluída" : "Planejada"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{when.toLocaleString("pt-BR")}</span>
                          {farm && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{farm.name}</span>}
                          {t.responsible && <span>Responsável: {t.responsible}</span>}
                        </div>
                        {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={done || checkIn.isPending} onClick={() => checkIn.mutate(t)}>
                          <Navigation className="h-4 w-4 mr-1" />Check-in GPS
                        </Button>
                        {done && <CheckCircle2 className="h-5 w-5 text-emerald-500 self-center" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{category === "visita" ? "Nova visita" : "Nova inspeção"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={category === "visita" ? "Visita mensal — clone RRIM 600" : "Inspeção sanitária"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Fazenda</Label>
                <Select value={form.farmId} onValueChange={(v) => setForm({ ...form, farmId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Agendada para</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1">
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do consultor / técnico" />
            </div>
            <div className="grid gap-1">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => create.mutate()} disabled={!form.title.trim() || create.isPending}>
              {create.isPending ? "Salvando…" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function nowLocal() {
  const d = new Date(); d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function getGps(): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
