import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, AlertTriangle, ShieldCheck, PlusCircle, Search, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getFieldMe, type FieldMe, type Coords, captureLocation, listFieldTappers, type FieldTapper } from "@/lib/field.functions";
import { toast } from "sonner";
import { listTasks, categoryLabel, categoryStyle, type ScheduledTask } from "@/lib/agenda.functions";
import { listTappingRecords, type TappingRecord } from "@/lib/sangrias.functions";
import { getLocalIsoDate } from "@/lib/date-utils";
import { CheckinSheet } from "@/components/vertex/field/checkin-sheet";

// Atalhos que antes só apareciam no menu do "+" — trazidos pra tela inicial
// pra economizar um clique nas operações mais usadas do monitor.
const QUICK_ACTIONS: Array<{ to: string; label: string; emoji: string; roles?: string[] }> = [
  { to: "/campo/sangria", label: "Registrar sangria", emoji: "💧", roles: ["monitor", "admin"] },
  { to: "/campo/chuva", label: "Informar chuva", emoji: "🌧️" },
  { to: "/campo/abastecimento", label: "Abastecimento", emoji: "⛽" },
  { to: "/campo/operacao-maquina", label: "Operação de máquina", emoji: "🚜" },
];

type DailySangriaCategory = "possible" | "done" | "late" | "ahead";
type DailyTapper = FieldTapper & { farmId: string; companyId: string; records: TappingRecord[] };
type DailySangriaSummary = Record<DailySangriaCategory, DailyTapper[]>;

const CATEGORY_LABEL: Record<DailySangriaCategory, string> = {
  possible: "Sangradores previstos",
  done: "Sangrias concluídas",
  late: "Sangrias atrasadas",
  ahead: "Sangrias antecipadas",
};

const PERIOD_OPTIONS = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "semana", label: "Últimos 7 dias", days: 7 },
  { value: "mes", label: "Últimos 30 dias", days: 30 },
] as const;

export const Route = createFileRoute("/campo/")({ component: FieldHome });

function FieldHome() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);
  const [checkinSheetOpen, setCheckinSheetOpen] = useState(false);
  const [checkinCoords, setCheckinCoords] = useState<Coords | null>(null);
  const [dailySangria, setDailySangria] = useState<DailySangriaSummary>({ possible: [], done: [], late: [], ahead: [] });
  const [sangriaDetail, setSangriaDetail] = useState<DailySangriaCategory | null>(null);
  const [selectedTapper, setSelectedTapper] = useState<DailyTapper | null>(null);

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

      } finally { setLoading(false); }
    })();
  }, []);

  // Resumo do dia: sangrias possíveis (total de sangradores ativos nas
  // fazendas do usuário), concluídas (tabela completa), adiantadas (tabela
  // adiantada) e atrasadas (o restante que ainda não fechou o dia).
  useEffect(() => {
    const farms = me?.assignments ?? [];
    if (farms.length === 0) return;
    const today = getLocalIsoDate();
    (async () => {
      try {
        const [tapperLists, recordLists] = await Promise.all([
          Promise.all(farms.map((a) => listFieldTappers(a.farm.companyId, a.farm.id).catch(() => [] as FieldTapper[]))),
          Promise.all(farms.map((a) => listTappingRecords(a.farm.companyId, { farmId: a.farm.id, from: today, to: today }).catch(() => [] as TappingRecord[]))),
        ]);
        const tappers = farms.flatMap((assignment, index) =>
          (tapperLists[index] ?? []).map((t) => ({ ...t, farmId: assignment.farm.id, companyId: assignment.farm.companyId })),
        );
        const records = recordLists.flat();
        const summary: DailySangriaSummary = { possible: [], done: [], late: [], ahead: [] };
        for (const t of tappers) {
          const own = records.filter((r) => (r.tapperId && r.tapperId === t.id) || r.sangradorName.trim().toLowerCase() === t.fullName.trim().toLowerCase());
          const extents = own.flatMap((r) => (r.taskExtent ?? "").split(",").filter(Boolean));
          const item: DailyTapper = { ...t, records: own };
          summary.possible.push(item);
          if (extents.includes("/")) summary.ahead.push(item);
          else if (extents.includes("X")) summary.done.push(item);
          else summary.late.push(item);
        }
        setDailySangria(summary);
      } catch { /* mantém os valores zerados */ }
    })();
  }, [me]);

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
            <p className="text-[10px] text-warning mt-0.5">{me.primaryRole === "monitor" ? "Escolha uma propriedade" : "Aguardando Check-in"}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCheckin && me.primaryRole !== "monitor" && (
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

      {/* Acessos rápidos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Acessos rápidos</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.filter((qa) => !qa.roles || qa.roles.includes(me.primaryRole)).map((qa) => (
            <Link
              key={qa.to}
              to={qa.to as any}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="text-2xl">{qa.emoji}</span>
              <span className="text-sm font-medium">{qa.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Resumo do dia — sangrias de todos os sangradores das fazendas do usuário */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Resumo de sangrias diárias</h2>
        <div className="grid grid-cols-4 gap-2">
          <SummaryCell value={dailySangria.possible.length} label="Possíveis" tone="muted" onClick={() => setSangriaDetail("possible")} />
          <SummaryCell value={dailySangria.done.length} label="Concluídas" tone="primary" onClick={() => setSangriaDetail("done")} />
          <SummaryCell value={dailySangria.late.length} label="Atrasadas" tone="destructive" onClick={() => setSangriaDetail("late")} />
          <SummaryCell value={dailySangria.ahead.length} label="Antecipadas" tone="warning" onClick={() => setSangriaDetail("ahead")} />
        </div>
      </section>

      {/* Próxima atividade */}
      {nextTask && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recomendações técnicas</h2>
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
      <DailySangriaDialog
        category={sangriaDetail}
        summary={dailySangria}
        onClose={() => setSangriaDetail(null)}
        onSelectTapper={(tapper) => { setSangriaDetail(null); setSelectedTapper(tapper); }}
      />
      <TapperStatsDialog tapper={selectedTapper} onClose={() => setSelectedTapper(null)} />
    </div>
  );
}

function SummaryCell({ value, label, tone, onClick }: { value: number; label: string; tone: "muted" | "primary" | "warning" | "destructive"; onClick: () => void }) {
  const cls =
    tone === "primary" ? "text-primary" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    "text-foreground";
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-border/60 bg-card px-2 py-3 text-center transition hover:border-primary/60 hover:bg-primary/5">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </button>
  );
}

function DailySangriaDialog({
  category, summary, onClose, onSelectTapper,
}: {
  category: DailySangriaCategory | null;
  summary: DailySangriaSummary;
  onClose: () => void;
  onSelectTapper: (tapper: DailyTapper) => void;
}) {
  const [search, setSearch] = useState("");
  const list = category ? summary[category] : [];
  const filtered = list.filter((tapper) => tapper.fullName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  useEffect(() => { setSearch(""); }, [category]);

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{category ? CATEGORY_LABEL[category] : "Sangrias"}</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por sangrador..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum sangrador encontrado.</p> : (
          <div className="space-y-2">
            {filtered.map((tapper) => (
              <button key={`${tapper.id}:${tapper.farmId}`} type="button" onClick={() => onSelectTapper(tapper)} className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/60 hover:bg-primary/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{tapper.fullName}</span><span className="block truncate text-[11px] text-muted-foreground">{tapper.records.length} registro(s) hoje</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TapperStatsDialog({ tapper, onClose }: { tapper: DailyTapper | null; onClose: () => void }) {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>("mes");
  const [records, setRecords] = useState<TappingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tapper) return;
    const option = PERIOD_OPTIONS.find((item) => item.value === period)!;
    const to = getLocalIsoDate();
    const from = getLocalIsoDate(new Date(Date.now() - (option.days - 1) * 86400000));
    setLoading(true);
    listTappingRecords(tapper.companyId, { farmId: tapper.farmId, from, to })
      .then((items) => setRecords(items.filter((record) => (record.tapperId && record.tapperId === tapper.id) || record.sangradorName.trim().toLowerCase() === tapper.fullName.trim().toLowerCase())))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [tapper, period]);

  const stats = useMemo(() => ({
    records: records.length,
    days: new Set(records.map((record) => record.date.slice(0, 10))).size,
    trees: records.reduce((sum, record) => sum + (record.treesTapped ?? 0), 0),
    liters: records.reduce((sum, record) => sum + (record.liters ?? 0), 0),
    ahead: records.filter((record) => (record.taskExtent ?? "").split(",").includes("/")).length,
  }), [records]);

  return (
    <Dialog open={!!tapper} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{tapper?.fullName ?? "Sangrador"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {PERIOD_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setPeriod(option.value)} className={`rounded-lg border px-2 py-2 text-xs font-medium ${period === option.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>{option.label}</button>)}
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
          <div className="grid grid-cols-2 gap-2">
            <StatCell label="Sangrias" value={stats.records} />
            <StatCell label="Dias trabalhados" value={stats.days} />
            <StatCell label="Árvores sangradas" value={stats.trees.toLocaleString("pt-BR")} />
            <StatCell label="Litros" value={stats.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <StatCell label="Antecipadas" value={stats.ahead} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-border/60 bg-card p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}
