import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import {
  getFieldMe, captureLocation, submitCheckin, submitStimulation, listFieldTapperTables,
  type FieldMe, type FieldTapperTable,
} from "@/lib/field.functions";
import { listTasks, updateTask, categoryStyle, categoryLabel, type ScheduledTask, type StimulationTaskMeta } from "@/lib/agenda.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLocalIsoDate } from "@/lib/date-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/campo/agenda")({ component: AgendaPage });

type TabKey = "hoje" | "semana" | "proximos";

function AgendaPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("hoje");

  // Confirmação de execução de estimulação agendada (monitor só confirma —
  // não escolhe os parâmetros, que vêm de t.meta definidos pelo consultor).
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmTables, setConfirmTables] = useState<FieldTapperTable[]>([]);
  const [confirmTableId, setConfirmTableId] = useState("");
  const [confirmTablesLoading, setConfirmTablesLoading] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [confirmPhotos, setConfirmPhotos] = useState<string[]>([]);
  const [confirmUploading, setConfirmUploading] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await getFieldMe();
      setMe(m);
      const today = getLocalIsoDate();
      const in30 = getLocalIsoDate(new Date(Date.now() + 30 * 86400000));
      const companyIds = m.isAdmin
        ? m.companies.map((c) => c.id)
        : Array.from(new Set(m.assignments.map((a) => a.farm.companyId)));
      const all: ScheduledTask[] = [];
      for (const cid of companyIds) {
        try { all.push(...(await listTasks(cid, { from: today, to: in30 }))); } catch { /* ignore */ }
      }
      setTasks(all.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      setLoading(false);
    })();
  }, []);

  const farmById = useMemo(() => {
    const map = new Map<string, string>();
    me?.assignments.forEach((a) => map.set(a.farm.id, a.farm.name));
    return map;
  }, [me]);

  const filtered = useMemo(() => {
    const today = getLocalIsoDate();
    const in7 = getLocalIsoDate(new Date(Date.now() + 7 * 86400000));
    if (tab === "hoje") return tasks.filter((t) => t.scheduledAt.slice(0, 10) === today);
    if (tab === "semana") return tasks.filter((t) => t.scheduledAt.slice(0, 10) <= in7);
    return tasks.filter((t) => t.scheduledAt.slice(0, 10) > in7);
  }, [tasks, tab]);

  async function conclude(t: ScheduledTask) {
    if (me?.primaryRole === "monitor" && t.category === "visita") {
      toast.info("Apenas o consultor pode concluir visitas técnicas.");
      return;
    }
    setBusy(t.id);
    const loc = await captureLocation();
    const res = await submitCheckin({
      companyId: t.companyId,
      farmId: t.farmId ?? undefined,
      taskId: t.id,
      notes: `Conclusão de: ${t.title}`,
      ...loc,
    });
    setBusy(null);
    setTasks((cur) => cur.map((x) => x.id === t.id ? { ...x, status: "concluida" } : x));
    toast.success(res.queued ? "Conclusão em fila" : "Tarefa concluída");
  }

  function openConfirm(t: ScheduledTask) {
    const opening = confirmingId !== t.id;
    setConfirmingId((cur) => cur === t.id ? null : t.id);
    setConfirmTables([]); setConfirmTableId(""); setConfirmNotes(""); setConfirmPhotos([]);
    if (!opening) return;
    const meta = (t.meta ?? {}) as StimulationTaskMeta;
    setConfirmTableId(meta.tappingTableId ?? "");
    if (!meta.tapperId) return;
    setConfirmTablesLoading(true);
    listFieldTapperTables(t.companyId, meta.tapperId)
      .then(setConfirmTables)
      .catch(() => setConfirmTables([]))
      .finally(() => setConfirmTablesLoading(false));
  }

  async function onConfirmPhoto(f: File | null) {
    if (!f) return;
    setConfirmUploading(true);
    try { const r = await uploadFile(f); setConfirmPhotos((c) => [...c, r.url]); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload da foto"); }
    finally { setConfirmUploading(false); }
  }

  async function confirmStimulation(t: ScheduledTask) {
    const meta = (t.meta ?? {}) as StimulationTaskMeta;
    if (!meta.product) { toast.error("Agendamento sem parâmetros de estimulação"); return; }
    setConfirmSaving(true);
    try {
      await submitStimulation({
        companyId: t.companyId, farmId: t.farmId ?? undefined,
        date: getLocalIsoDate(),
        product: meta.product,
        concentration: meta.concentration ?? undefined,
        tapperId: meta.tapperId ?? undefined,
        tappingTableId: confirmTableId || meta.tappingTableId || undefined,
        reason: meta.reason ?? undefined,
        doseMlPerTree: meta.doseMlPerTree ?? undefined,
        sangradorPercent: meta.sangradorPercent ?? undefined,
        notes: [
          confirmNotes.trim() || undefined,
          confirmPhotos.length ? `Fotos: ${confirmPhotos.join(", ")}` : undefined,
        ].filter(Boolean).join("\n") || undefined,
      });
      await updateTask(t.id, {
        farmId: t.farmId ?? undefined,
        plotId: t.plotId ?? undefined,
        teamId: t.teamId ?? undefined,
        title: t.title,
        description: t.description ?? undefined,
        category: t.category,
        priority: t.priority,
        status: "concluida",
        scheduledAt: t.scheduledAt,
        dueAt: t.dueAt ?? undefined,
        responsible: t.responsible ?? undefined,
      });
      setTasks((cur) => cur.map((x) => x.id === t.id ? { ...x, status: "concluida" } : x));
      setConfirmingId(null);
      toast.success("Estimulação confirmada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao confirmar");
    } finally {
      setConfirmSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Agenda</h1>
      <div className="flex rounded-xl border border-border/60 bg-card p-1">
        {([
          ["hoje", "Hoje"], ["semana", "Semana"], ["proximos", "Próximos"],
        ] as [TabKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sem atividades neste período.</p>}

      <ul className="space-y-2">
        {filtered.map((t) => {
          const done = t.status === "concluida";
          const overdue = !done && new Date(t.scheduledAt).getTime() < Date.now();
          const farmName = t.farmId ? farmById.get(t.farmId) : null;
          const time = new Date(t.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const isScheduledStim = t.category === "estimulacao" && !!t.meta?.product;
          const meta = (t.meta ?? {}) as StimulationTaskMeta;
          return (
            <li key={t.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-foreground">{time}</div>
                <div className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryStyle(t.category)}`}>
                  {categoryLabel(t.category)}
                </div>
                <div className="flex-1" />
                {done ? (
                  <span className="text-xs font-medium text-primary">Concluída</span>
                ) : overdue ? (
                  <span className="text-xs font-medium text-destructive">Atrasada</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Pendente</span>
                )}
              </div>
              <div className="mt-2 font-semibold">{farmName ?? t.title}</div>
              <div className="text-xs text-muted-foreground">{t.title}</div>

              {isScheduledStim && !done && (
                <div className="mt-2 rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <p>Produto: <span className="font-medium text-foreground">{meta.product}</span>{meta.concentration ? ` · ${meta.concentration}` : ""}</p>
                  {meta.tappingTableName && <p>Tabela sugerida: <span className="font-medium text-foreground">{meta.tappingTableName}</span></p>}
                  {meta.doseMlPerTree != null && <p>Dose: {meta.doseMlPerTree} ml/árvore</p>}
                  {meta.sangradorPercent != null && <p>% do sangrador: {meta.sangradorPercent}%</p>}
                  {meta.reason && <p>Motivo: {meta.reason}</p>}
                </div>
              )}

              {!done && (
                <>
                  {me?.primaryRole === "monitor" && t.category === "visita" ? (
                    <div className="mt-3 rounded-xl bg-muted/30 py-2 text-center text-[10px] text-muted-foreground">
                      Visita técnica do consultor vinculada
                    </div>
                  ) : isScheduledStim ? (
                    <button
                      onClick={() => openConfirm(t)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmar execução
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => conclude(t)}
                      disabled={busy === t.id}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                    >
                      {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Concluir
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}

              {confirmingId === t.id && (
                <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tabela estimulada</Label>
                    {confirmTablesLoading ? (
                      <div className="flex h-10 items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando tabelas...</div>
                    ) : confirmTables.length ? (
                      <Select value={confirmTableId} onValueChange={setConfirmTableId}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                        <SelectContent>
                          {confirmTables.map((tb) => (
                            <SelectItem key={tb.id} value={tb.id}>
                              {tb.name}{tb.notation ? ` — ${tb.notation}` : ""}{tb.treeCount != null ? ` (${tb.treeCount} árvores)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Sangrador sem tabelas vinculadas.</p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Observações</Label>
                    <Textarea rows={2} className="rounded-xl" value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fotos (opcional)</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {confirmPhotos.map((u, i) => <img key={i} src={u} alt="" className="h-16 w-full rounded-lg object-cover" />)}
                      <label className="grid h-16 w-full cursor-pointer place-items-center rounded-lg border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                        {confirmUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onConfirmPhoto(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>Cancelar</Button>
                    <Button type="button" size="sm" onClick={() => confirmStimulation(t)} disabled={confirmSaving}>
                      {confirmSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
