import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, AlertTriangle, RefreshCw, Wifi, WifiOff, ShieldCheck, PlusCircle } from "lucide-react";
import { getFieldMe, type FieldMe, type Coords, captureLocation } from "@/lib/field.functions";
import { toast } from "sonner";
import { listTasks, categoryLabel, categoryStyle, categoryDot, type ScheduledTask } from "@/lib/agenda.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";
import { flushOutbox, subscribeOutbox } from "@/lib/offline/queue";
import { getLocalIsoDate } from "@/lib/date-utils";
import { CheckinSheet } from "@/components/vertex/field/checkin-sheet";

const HISTORY_KIND_LABEL: Record<string, string> = {
  sangria: "Sangria", producao: "Produção", estimulacao: "Estimulação",
  ocorrencia: "Ocorrência", agenda: "Agenda", fotografia: "Foto",
};
const HISTORY_KIND_STYLE: Record<string, string> = {
  sangria: "bg-primary/15 text-primary",
  producao: "bg-chart-2/20 text-chart-2",
  estimulacao: "bg-chart-3/20 text-chart-3",
  ocorrencia: "bg-destructive/15 text-destructive",
  agenda: "bg-warning/20 text-warning",
  fotografia: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/campo/")({ component: FieldHome });

function FieldHome() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string>("—");
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);
  const [checkinSheetOpen, setCheckinSheetOpen] = useState(false);
  const [checkinCoords, setCheckinCoords] = useState<Coords | null>(null);
  const [todayActivity, setTodayActivity] = useState<HistoryEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

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

  async function openCheckinSheet() {
    const requireGeo = me?.companies?.[0]?.requireGeolocation ?? true;
    const loc = await captureLocation();
    if (!loc && requireGeo) {
      toast.error("GPS não detectado");
      return;
    }
    setCheckinCoords(loc);
    setCheckinSheetOpen(true);
  }

  useEffect(() => {
    (async () => {
      try {
        const m = await getFieldMe();
        setMe(m);
        const today = getLocalIsoDate();
        const in7 = getLocalIsoDate(new Date(Date.now() + 7 * 86400000));
        const cids = m.isAdmin ? (m.companies || []).map((c) => c.id) : Array.from(new Set((m.assignments || []).map((a) => a.farm.companyId)));
        const all: ScheduledTask[] = [];
        for (const cid of cids) {
          try { all.push(...(await listTasks(cid, { from: today, to: in7 }))); } catch { /* ignore */ }
        }
        setTasks(all.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));

        const cidsForHistory = m.isAdmin ? (m.companies || []).map((c) => c.id) : Array.from(new Set((m.assignments || []).map((a) => a.farm.companyId)));
        const activity: HistoryEvent[] = [];
        for (const cid of cidsForHistory) {
          try { activity.push(...(await listHistory(cid, { from: today, to: today, limit: 50 }))); } catch { /* ignore */ }
        }
        activity.sort((a, b) => (a.date < b.date ? 1 : -1));
        setTodayActivity(activity);
      } finally { setLoading(false); setLoadingActivity(false); }
    })();
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const un = subscribeOutbox((s) => { setPending(s.pending); if (!s.running && s.pending === 0) setLastSync(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); });
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); un(); };
  }, []);

  const stats = useMemo(() => {
    const today = getLocalIsoDate();
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

  // Solicitações do consultor/admin ainda não confirmadas pelo monitor —
  // mostradas na tela inicial, coloridas por tipo, pra chamar atenção.
  const pendingRequests = useMemo(() => {
    return tasks
      .filter((t) => t.status === "planejada" || t.status === "em_andamento")
      .slice(0, 6);
  }, [tasks]);

  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }));
  }, []);
  const farmName = (farmId?: string | null) => (me?.assignments || []).find((a) => a.farm.id === farmId)?.farm.name ?? "";

  if (loading || !me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-xs capitalize text-muted-foreground">{todayLabel}</div>
          {activeCheckin ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-0.5">
              <ShieldCheck className="h-3 w-3" />
              <span className="leading-tight">
                {(me.assignments || []).find(a => a.farm.id === activeCheckin.farmId)?.farm.name || "Fazenda"}
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-warning mt-0.5">Aguardando Check-in</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCheckin && (
            <button
              onClick={openCheckinSheet}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
              title="Trocar Fazenda / Novo Check-in"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Status cards & Offline Warning */}
      <div className="space-y-3">
        {pending > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning animate-in slide-in-from-top-2 duration-300">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20">
              <RefreshCw className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Sincronização pendente</div>
              <div className="text-[11px] opacity-90 truncate">
                {pending} registro(s) salvos no dispositivo aguardando internet.
              </div>
            </div>
            <button
              onClick={() => flushOutbox()}
              className="rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-bold active:scale-95 transition-transform"
            >
              Enviar
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              {online ? <Wifi className="h-3.5 w-3.5 text-primary" /> : <WifiOff className="h-3.5 w-3.5 text-warning" />}
              Conexão
            </div>
            <div className={`text-lg font-semibold ${online ? "text-primary" : "text-warning"}`}>{online ? "Online" : "Offline"}</div>
          </div>
          <Link
            to="/campo/mais"
            className="rounded-2xl border border-border/60 bg-card p-4 text-left transition hover:border-primary/50"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronização
            </div>
            <div className="text-lg font-semibold text-foreground">
              {pending > 0 ? `${pending} pend.` : `Hoje, ${lastSync}`}
            </div>
          </Link>
        </div>
      </div>

      {/* Solicitações agendadas (consultor/admin) — alerta colorido por tipo */}
      {me.primaryRole === "monitor" && pendingRequests.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Solicitações</h2>
            <Link to="/campo/agenda" className="flex items-center gap-0.5 text-xs font-medium text-primary">
              Ver agenda <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="space-y-2">
            {pendingRequests.map((t) => {
              const overdue = new Date(t.scheduledAt).getTime() < Date.now();
              return (
                <li key={t.id}>
                  <Link
                    to="/campo/agenda"
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:bg-muted/50"
                  >
                    <span className={`h-9 w-1.5 shrink-0 rounded-full ${categoryDot(t.category)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryStyle(t.category)}`}>
                          {categoryLabel(t.category)}
                        </span>
                        {overdue && <span className="text-[10px] font-medium text-destructive">Atrasada</span>}
                      </div>
                      <div className="truncate text-sm font-medium">{farmName(t.farmId) || t.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{t.title}</div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      {new Date(t.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
              <div className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryStyle(nextTask.category)}`}>
                {categoryLabel(nextTask.category)}
              </div>
            </div>
            <div className="mt-3 font-semibold">{farmName(nextTask.farmId) || nextTask.title}</div>
            <div className="text-xs text-muted-foreground">{nextTask.title}</div>
            
            {/* Monitor não pode abrir visita técnica do consultor */}
            {!(me.primaryRole === "monitor" && nextTask.category === "visita") ? (
              <Link to="/campo/agenda">
                <button className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                  Iniciar atividade
                </button>
              </Link>
            ) : (
              <div className="mt-4 rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                Agendado com consultor. Acompanhe a realização.
              </div>
            )}
          </div>
        </section>
      )}

      {/* O que eu fiz hoje */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">O que eu fiz hoje</h2>
          <Link to="/campo/historico" className="flex items-center gap-0.5 text-xs font-medium text-primary">
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loadingActivity ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : todayActivity.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-card p-4 text-center text-xs text-muted-foreground">
            Nenhum registro hoje ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayActivity.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${HISTORY_KIND_STYLE[e.kind] ?? "bg-muted text-muted-foreground"}`}>
                  {HISTORY_KIND_LABEL[e.kind] ?? e.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  {e.subtitle && <div className="truncate text-[11px] text-muted-foreground">{e.subtitle}</div>}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(e.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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

      {(me.assignments || []).length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Minhas fazendas</h2>
          <ul className="space-y-2">
            {me.assignments.map((a) => (
              <li key={a.id}>
                <Link
                  to="/campo/fazenda/$id"
                  params={{ id: a.farm.id }}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.farm.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[a.farm.city, a.farm.state].filter(Boolean).join(" / ") || "—"} · {a.role}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CheckinSheet
        open={checkinSheetOpen}
        onOpenChange={setCheckinSheetOpen}
        companyId={me.companies?.[0]?.id || ""}
        farmId={activeCheckin?.farmId}
        farmName={farmName(activeCheckin?.farmId)}
        farmLat={(me.assignments || []).find((a) => a.farm.id === activeCheckin?.farmId)?.farm.latitude}
        farmLng={(me.assignments || []).find((a) => a.farm.id === activeCheckin?.farmId)?.farm.longitude}
        checkinRadiusM={(me.assignments || []).find((a) => a.farm.id === activeCheckin?.farmId)?.farm.checkinRadiusM}
        plotId={activeCheckin?.plotId}
        coords={checkinCoords}
        requireGeolocation={me.companies?.[0]?.requireGeolocation ?? true}
        onDone={(stamp) => setActiveCheckin(stamp)}
      />
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
