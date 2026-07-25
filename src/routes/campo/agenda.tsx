import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin } from "@/lib/field.functions";
import { listTasks, type ScheduledTask } from "@/lib/agenda.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/campo/agenda")({ component: AgendaPage });

const CAT_STYLE: Record<string, string> = {
  sangria:     "bg-primary/15 text-primary",
  estimulacao: "bg-chart-3/20 text-chart-3",
  producao:    "bg-chart-2/20 text-chart-2",
  ocorrencia:  "bg-destructive/15 text-destructive",
  visita:      "bg-warning/20 text-warning",
  outros:      "bg-muted text-muted-foreground",
};

type TabKey = "hoje" | "semana" | "proximos";

function AgendaPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("hoje");

  useEffect(() => {
    (async () => {
      const m = await getFieldMe();
      setMe(m);
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
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
    const today = new Date().toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    if (tab === "hoje") return tasks.filter((t) => t.scheduledAt.slice(0, 10) === today);
    if (tab === "semana") return tasks.filter((t) => t.scheduledAt.slice(0, 10) <= in7);
    return tasks.filter((t) => t.scheduledAt.slice(0, 10) > in7);
  }, [tasks, tab]);

  async function conclude(t: ScheduledTask) {
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
          return (
            <li key={t.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-foreground">{time}</div>
                <div className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CAT_STYLE[t.category] ?? CAT_STYLE.outros}`}>
                  {t.category}
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
              {!done && (
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
