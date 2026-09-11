import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Trees } from "lucide-react";
import { getFieldMe, listFieldTappers, listFieldTapperTables, type FieldMe, type FieldTapper, type FieldTapperTable } from "@/lib/field.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";
import { listTappingRecords, type TappingRecord, TASK_EXTENTS, END_PERIODS } from "@/lib/sangrias.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/historico")({ component: HistoricoPage });

const KIND_STYLE: Record<string, string> = {
  sangria: "bg-primary/15 text-primary",
  producao: "bg-chart-2/20 text-chart-2",
  estimulacao: "bg-chart-3/20 text-chart-3",
  ocorrencia: "bg-destructive/15 text-destructive",
  agenda: "bg-warning/20 text-warning",
  fotografia: "bg-muted text-muted-foreground",
};
const KIND_LABEL: Record<string, string> = {
  sangria: "Sangria", producao: "Produção", estimulacao: "Estimulação",
  ocorrencia: "Ocorrência", agenda: "Agenda", fotografia: "Foto",
};

const KIND_TABS = ["tudo", "sangria", "producao", "estimulacao", "ocorrencia"] as const;
type KindTab = typeof KIND_TABS[number];

const PERIODS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "7 dias" },
  { value: "mes", label: "30 dias" },
] as const;
type Period = typeof PERIODS[number]["value"];

function rangeFor(period: Period) {
  const to = getLocalIsoDate();
  if (period === "hoje") return { from: to, to };
  const days = period === "semana" ? 7 : 30;
  return { from: getLocalIsoDate(new Date(Date.now() - days * 86400000)), to };
}

function taskLabel(taskExtent?: string | null) {
  if (!taskExtent) return null;
  return taskExtent.split(",").map((v) => TASK_EXTENTS.find((t) => t.value === v)?.label ?? v).join(" + ");
}

function HistoricoPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [mode, setMode] = useState<"linha" | "sangrador">("linha");
  const [period, setPeriod] = useState<Period>("semana");
  const [farmId, setFarmId] = useState<string>(""); // "" = todas as fazendas

  // modo linha do tempo
  const [kindTab, setKindTab] = useState<KindTab>("tudo");
  const [entries, setEntries] = useState<HistoryEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  // modo por sangrador
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [tapperId, setTapperId] = useState("");
  const [tapperTables, setTapperTables] = useState<FieldTapperTable[]>([]);
  const [tapperRecords, setTapperRecords] = useState<TappingRecord[]>([]);
  const [loadingSangrador, setLoadingSangrador] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments.length === 1) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const range = useMemo(() => rangeFor(period), [period]);

  // Linha do tempo: uma fazenda específica, ou todas as fazendas/empresas do usuário.
  useEffect(() => {
    if (!me || mode !== "linha") return;
    setLoadingTimeline(true);
    (async () => {
      try {
        if (farm) {
          const r = await listHistory(farm.companyId, { farmId: farm.id, from: range.from, to: range.to, limit: 200 });
          setEntries(r);
          return;
        }
        const companyIds = Array.from(new Set(me.assignments.map((a) => a.farm.companyId)));
        const all: HistoryEvent[] = [];
        for (const cid of companyIds) {
          try { all.push(...(await listHistory(cid, { from: range.from, to: range.to, limit: 200 }))); } catch { /* ignore */ }
        }
        all.sort((a, b) => (a.date < b.date ? 1 : -1));
        setEntries(all);
      } catch { setEntries([]); } finally { setLoadingTimeline(false); }
    })();
  }, [me, mode, farm, range.from, range.to]);

  // Modo por sangrador precisa de uma fazenda selecionada (tabelas/sangradores são por fazenda).
  useEffect(() => {
    setTappers([]); setTapperId("");
    if (!farm || mode !== "sangrador") return;
    listFieldTappers(farm.companyId, farm.id).then(setTappers).catch(() => setTappers([]));
  }, [farm, mode]);

  useEffect(() => {
    setTapperRecords([]); setTapperTables([]);
    if (!farm || !tapperId) return;
    setLoadingSangrador(true);
    Promise.all([
      listTappingRecords(farm.companyId, { farmId: farm.id, from: range.from, to: range.to }),
      listFieldTapperTables(farm.companyId, tapperId).catch(() => []),
    ])
      .then(([records, tables]) => {
        const tapper = tappers.find((t) => t.id === tapperId);
        const filtered = records.filter((r) =>
          tapperId.startsWith("rh:")
            ? r.sangradorName.trim().toLowerCase() === (tapper?.fullName ?? "").trim().toLowerCase()
            : r.tapperId === tapperId,
        );
        setTapperRecords(filtered);
        setTapperTables(tables);
      })
      .finally(() => setLoadingSangrador(false));
  }, [farm, tapperId, range.from, range.to, tappers]);

  const tableName = (id?: string | null) => tapperTables.find((t) => t.id === id)?.name;

  const grouped = useMemo(() => {
    const f = kindTab === "tudo" ? entries : entries.filter((e) => e.kind === kindTab);
    const byDay = new Map<string, HistoryEvent[]>();
    for (const e of f) {
      const d = new Date(e.date).toISOString().slice(0, 10);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(e);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, kindTab]);

  const sangradorStats = useMemo(() => {
    const days = new Set(tapperRecords.map((r) => new Date(r.date).toISOString().slice(0, 10)));
    const periodDays = period === "hoje" ? 1 : period === "semana" ? 7 : 30;
    return { total: tapperRecords.length, daysWithRecord: days.size, periodDays };
  }, [tapperRecords, period]);

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Histórico</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("linha")}
          className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${mode === "linha" ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}
        >
          Linha do tempo
        </button>
        <button
          onClick={() => setMode("sangrador")}
          className={`flex-1 rounded-xl border py-2 text-xs font-semibold ${mode === "sangrador" ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}
        >
          Por sangrador
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {me.assignments.length > 1 && (
          <Select value={farmId || "todas"} onValueChange={(v) => setFarmId(v === "todas" ? "" : v)}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as fazendas</SelectItem>
              {me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className={`h-10 rounded-xl ${me.assignments.length > 1 ? "" : "col-span-2"}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {mode === "linha" ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {KIND_TABS.map((t) => (
              <button key={t} onClick={() => setKindTab(t)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  kindTab === t ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"
                }`}>
                {t === "tudo" ? "Tudo" : KIND_LABEL[t]}
              </button>
            ))}
          </div>

          {loadingTimeline ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro no período.</p>
          ) : (
            grouped.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </h2>
                <ul className="space-y-2">
                  {list.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
                      <div className="w-14 shrink-0 text-sm font-semibold">
                        {new Date(e.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${KIND_STYLE[e.kind] ?? "bg-muted text-muted-foreground"}`}>
                            {KIND_LABEL[e.kind] ?? e.kind}
                          </span>
                        </div>
                        <div className="truncate text-sm font-medium">{e.title}</div>
                        {e.subtitle && <div className="truncate text-[11px] text-muted-foreground">{e.subtitle}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      ) : (
        <>
          {!farm ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Selecione uma fazenda pra filtrar por sangrador.</p>
          ) : (
            <>
              <Select value={tapperId} onValueChange={setTapperId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={tappers.length ? "Selecione o sangrador" : "Nenhum sangrador nesta fazenda"} /></SelectTrigger>
                <SelectContent>{tappers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>

              {loadingSangrador ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : tapperId ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCell value={sangradorStats.total} label="Sangrias" />
                    <StatCell value={sangradorStats.daysWithRecord} label="Dias com registro" />
                    <StatCell value={Math.max(sangradorStats.periodDays - sangradorStats.daysWithRecord, 0)} label="Dias sem registro" tone="warning" />
                  </div>

                  {tapperRecords.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma sangria no período.</p>
                  ) : (
                    <ul className="space-y-2">
                      {tapperRecords.map((r) => (
                        <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                            {r.endPeriod && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {END_PERIODS.find((p) => p.value === r.endPeriod)?.label ?? r.endPeriod}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Trees className="h-3.5 w-3.5 text-primary" />
                            {tableName(r.tappingTableId ?? undefined) ?? "Sem tabela"}
                          </div>
                          {taskLabel(r.taskExtent) && (
                            <div className="mt-1 text-[11px] text-muted-foreground">Tarefa: {taskLabel(r.taskExtent)}</div>
                          )}
                          {r.notes && <div className="mt-1 text-[11px] text-muted-foreground">{r.notes}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCell({ value, label, tone }: { value: number; label: string; tone?: "warning" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-2 py-3 text-center">
      <div className={`text-2xl font-bold ${tone === "warning" ? "text-warning" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
