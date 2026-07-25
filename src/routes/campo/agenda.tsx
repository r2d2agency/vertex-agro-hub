import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin } from "@/lib/field.functions";
import { listTasks, type ScheduledTask } from "@/lib/agenda.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/campo/agenda")({ component: AgendaPage });

function AgendaPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const m = await getFieldMe();
      setMe(m);
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const companyIds = m.isAdmin
        ? m.companies.map((c) => c.id)
        : Array.from(new Set(m.assignments.map((a) => a.farm.companyId)));
      const all: ScheduledTask[] = [];
      for (const cid of companyIds) {
        try { all.push(...(await listTasks(cid, { from: today, to: tomorrow }))); } catch { /* ignore */ }
      }
      setTasks(all.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      setLoading(false);
    })();
  }, []);

  const farmById = useMemo(() => {
    const map = new Map<string, { name: string; companyId: string }>();
    me?.assignments.forEach((a) => map.set(a.farm.id, { name: a.farm.name, companyId: a.farm.companyId }));
    return map;
  }, [me]);

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

  if (loading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Agenda de hoje</h1>
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas para hoje.</p>}
      <ul className="space-y-2">
        {tasks.map((t) => {
          const farm = t.farmId ? farmById.get(t.farmId) : null;
          const done = t.status === "concluida";
          return (
            <li key={t.id} className={`rounded-lg border p-3 ${done ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(t.scheduledAt).toLocaleString("pt-BR")} · {t.category} · {t.priority}
                  </div>
                  {farm && <div className="text-[11px] text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{farm.name}</div>}
                </div>
                {!done && (
                  <Button size="sm" disabled={busy === t.id} onClick={() => conclude(t)}>
                    {busy === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    <span className="ml-1">Concluir</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
