import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, AlertTriangle, RefreshCw, Wifi, WifiOff, ShieldCheck, PlusCircle } from "lucide-react";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin } from "@/lib/field.functions";
import { toast } from "sonner";
import { listTasks, type ScheduledTask } from "@/lib/agenda.functions";
import { flushOutbox, subscribeOutbox } from "@/lib/offline/queue";

export const Route = createFileRoute("/campo/")({ component: FieldHome });

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  sangria:      { label: "Sangria",      className: "bg-primary/15 text-primary" },
  estimulacao:  { label: "Estimulação",  className: "bg-chart-3/20 text-chart-3" },
  producao:     { label: "Produção",     className: "bg-chart-2/20 text-chart-2" },
  ocorrencia:   { label: "Ocorrência",   className: "bg-destructive/15 text-destructive" },
  visita:       { label: "Visita",       className: "bg-warning/20 text-warning" },
  outros:       { label: "Tarefa",       className: "bg-muted text-muted-foreground" },
};

function FieldHome() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string>("—");
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);

  useEffect(() => {
    const CHECKIN_KEY = "vertex.field.checkin.v1";
    const raw = sessionStorage.getItem(CHECKIN_KEY);
    if (raw) {
      const stamp = JSON.parse(raw);
      if (Date.now() - stamp.at < 12 * 60 * 60 * 1000) {
        setActiveCheckin(stamp);
      }
    }
  }, []);

  const handleNewCheckin = async (fId?: string, pId?: string) => {
    const loc = await captureLocation();
    if (!loc) {
      toast.error("GPS não detectado");
      return;
    }
    
    const companyId = me?.companies[0]?.id || "";
    try {
      await submitCheckin({
        companyId,
        farmId: fId || undefined,
        plotId: pId || undefined,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyM: loc.accuracyM
      });
      
      const stamp = { farmId: fId || undefined, plotId: pId || undefined, at: Date.now() };
      sessionStorage.setItem("vertex.field.checkin.v1", JSON.stringify(stamp));
      setActiveCheckin(stamp);
      
      const farmName = me?.assignments.find(a => a.farm.id === fId)?.farm.name;
      toast.success(`Check-in realizado em ${farmName || 'Fazenda'}`);
    } catch (e) {
      toast.error("Erro ao registrar check-in");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const m = await getFieldMe();
        setMe(m);
        const today = new Date().toISOString().slice(0, 10);
        const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        const cids = m.isAdmin ? m.companies.map((c) => c.id) : Array.from(new Set(m.assignments.map((a) => a.farm.companyId)));
        const all: ScheduledTask[] = [];
        for (const cid of cids) {
          try { all.push(...(await listTasks(cid, { from: today, to: in7 }))); } catch { /* ignore */ }
        }
        setTasks(all.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const un = subscribeOutbox((s) => { setPending(s.pending); if (!s.running && s.pending === 0) setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); });
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); un(); };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todays = tasks.filter((t) => t.scheduledAt.slice(0, 10) === today);
    const now = Date.now();
    return {
      total: todays.length,
      done: todays.filter((t) => t.status === "concluida").length,
      pending: todays.filter((t) => t.status !== "concluida" && new Date(t.scheduledAt).getTime() >= now).length,
      overdue: todays.filter((t) => t.status !== "concluida" && new Date(t.scheduledAt).getTime() < now).length,
    };
  }, [tasks]);

  const nextTask = useMemo(() => {
    const now = Date.now();
    return tasks.find((t) => t.status !== "concluida" && new Date(t.scheduledAt).getTime() >= now - 60_000);
  }, [tasks]);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const farmName = (farmId?: string | null) => me?.assignments.find((a) => a.farm.id === farmId)?.farm.name ?? "";

  if (loading || !me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-xs capitalize text-muted-foreground">{today}</div>
          {activeCheckin ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-0.5">
              <ShieldCheck className="h-3 w-3" />
              <div className="flex flex-col">
                <span className="leading-tight">
                  {me.assignments.find(a => a.farm.id === activeCheckin.farmId)?.farm.name || "Fazenda"}
                </span>
                {activeCheckin.plotId && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Talhão: {activeCheckin.plotId}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-warning mt-0.5">Aguardando Check-in</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCheckin && (
            <button 
              onClick={() => handleNewCheckin(activeCheckin.farmId)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
              title="Trocar Talhão / Novo Check-in"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            {online ? <Wifi className="h-3.5 w-3.5 text-primary" /> : <WifiOff className="h-3.5 w-3.5 text-warning" />}
            Conexão
          </div>
          <div className={`text-lg font-semibold ${online ? "text-primary" : "text-warning"}`}>{online ? "Online" : "Offline"}</div>
        </div>
        <button
          onClick={() => flushOutbox()}
          className="rounded-2xl border border-border/60 bg-card p-4 text-left transition hover:border-primary/50"
        >
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronização
          </div>
          <div className="text-lg font-semibold text-foreground">
            {pending > 0 ? `${pending} pend.` : `Hoje, ${lastSync}`}
          </div>
        </button>
      </div>

      {/* Resumo do dia */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Resumo do dia</h2>
        <div className="grid grid-cols-4 gap-2">
          <SummaryCell value={stats.total} label="Programadas" tone="muted" />
          <SummaryCell value={stats.done} label="Concluídas" tone="primary" />
          <SummaryCell value={stats.pending} label="Pendentes" tone="warning" />
          <SummaryCell value={stats.overdue} label="Atrasadas" tone="destructive" />
        </div>
      </section>

      {/* Próxima atividade */}
      {nextTask && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Próxima atividade</h2>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary">
                {new Date(nextTask.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_LABELS[nextTask.category]?.className ?? STATUS_LABELS.outros.className}`}>
                {STATUS_LABELS[nextTask.category]?.label ?? nextTask.category}
              </div>
            </div>
            <div className="mt-3 font-semibold">{farmName(nextTask.farmId) || nextTask.title}</div>
            <div className="text-xs text-muted-foreground">{nextTask.title}</div>
            <Link to="/campo/agenda">
              <button className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                Iniciar atividade
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Alertas */}
      {stats.overdue > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Alertas</h2>
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="flex-1">
              <div className="font-medium text-foreground">{stats.overdue} atividade{stats.overdue > 1 ? "s" : ""} atrasada{stats.overdue > 1 ? "s" : ""}</div>
              <div className="text-xs text-muted-foreground">Verifique na agenda</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </section>
      )}

      {me.assignments.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Minhas fazendas</h2>
          <ul className="space-y-2">
            {me.assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.farm.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {[a.farm.city, a.farm.state].filter(Boolean).join(" / ") || "—"} · {a.role}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SummaryCell({ value, label, tone }: { value: number; label: string; tone: "muted" | "primary" | "warning" | "destructive" }) {
  const cls =
    tone === "primary" ? "text-primary" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-2 py-3 text-center">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
