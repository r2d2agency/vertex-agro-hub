import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Pencil, Trees } from "lucide-react";
import { getFieldMe, listFieldTappers, listFieldTapperTables, listFieldTappingTables, type FieldMe, type FieldTapper, type FieldTapperTable } from "@/lib/field.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";
import { correctTappingRecord, listTappingRecords, listTappingTasks, type TappingRecord, type TappingTask, TASK_EXTENTS, END_PERIODS } from "@/lib/sangrias.functions";
import { tappingRecordMoment } from "@/lib/tapping-dates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLocalIsoDate } from "@/lib/date-utils";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

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
  { value: "dia", label: "Escolher data" },
  { value: "semana", label: "7 dias" },
  { value: "mes", label: "30 dias" },
  { value: "custom", label: "Personalizado" },
] as const;
type Period = typeof PERIODS[number]["value"];

type IsoRange = { from: string; to: string };
type TappingEditDraft = {
  date: string;
  sangradorName: string;
  tapperId: string | null;
  plotId: string;
  tappingTableId: string;
  taskExtent: string;
  endPeriod: string;
  treesExpected: string;
  treesTapped: string;
  notes: string;
};

const EMPTY_VALUE = "__none__";

function isoRange(from?: Date | null, to?: Date | null): IsoRange {
  return { from: getLocalIsoDate(from ?? new Date()), to: getLocalIsoDate(to ?? from ?? new Date()) };
}

function dateToIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeFor(period: Period, custom: IsoRange | null, selectedDate: string): IsoRange {
  const to = getLocalIsoDate();
  if (period === "custom") return custom ?? isoRange();
  if (period === "dia") return { from: selectedDate, to: selectedDate };
  if (period === "hoje") return { from: to, to };
  const days = period === "semana" ? 7 : 30;
  return { from: getLocalIsoDate(new Date(Date.now() - (days - 1) * 86400000)), to };
}

// Nome da tarefa via catálogo da empresa, com fallback para TASK_EXTENTS
function taskLabelFor(companyId: string, taskExtent?: string | null, catalog?: Map<string, string>) {
  if (!taskExtent) return null;
  return taskExtent.split(",").map((v) => catalog?.get(`${companyId}:${v}`) ?? TASK_EXTENTS.find((t) => t.value === v)?.label ?? v).join(" + ");
}

// Verifica se um registro é "adiantada" (tarefa com código earlyCode)
function isEarlyTask(taskExtent: string | null | undefined, code: string) {
  if (!taskExtent) return false;
  return taskExtent.split(",").map((v) => v.trim()).includes(code);
}

// Fuso horário seguro para o Intl. O `??` do timezoneForEvent não pega string
// vazia — e `new Intl.DateTimeFormat("pt-BR", { timeZone: "" })` joga
// `RangeError: Invalid time zone specified`, que derruba a página inteira.
// Qualquer valor vazio/inválido cai no padrão de Brasília.
const DEFAULT_TIMEZONE = "America/Sao_Paulo";
function safeZone(zone?: string | null): string {
  if (!zone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function HistoricoPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [mode, setMode] = useState<"linha" | "sangrador">("linha");
  const [period, setPeriod] = useState<Period>("semana");
  const [custom, setCustom] = useState<IsoRange | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalIsoDate());
  const [farmId, setFarmId] = useState<string>(""); // "" = todas as fazendas

  // modo linha do tempo
  const [kindTab, setKindTab] = useState<KindTab>("tudo");
  const [entries, setEntries] = useState<HistoryEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  // Catálogo de tabelas e tarefas por empresa, para enriquecer a linha do tempo
  const [tableNames, setTableNames] = useState<Map<string, Map<string, string>>>(new Map());
  const [taskNames, setTaskNames] = useState<Map<string, string>>(new Map());
  const [earlyCode, setEarlyCode] = useState("/");
  const [refreshToken, setRefreshToken] = useState(0);
  const [editingRecord, setEditingRecord] = useState<TappingRecord | null>(null);
  const [editDraft, setEditDraft] = useState<TappingEditDraft | null>(null);
  const [editTappers, setEditTappers] = useState<FieldTapper[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

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
  const range = useMemo(() => rangeFor(period, custom, selectedDate), [period, custom, selectedDate]);
  const timezone = safeZone(farm?.timezone);
  const datePickerDate = new Date(`${selectedDate}T12:00:00`);
  const timezoneForEvent = (event: HistoryEvent) =>
    safeZone(event.farmId ? me?.assignments.find((a) => a.farm.id === event.farmId)?.farm.timezone : timezone);
  const formatDate = (value: string | Date, options: Intl.DateTimeFormatOptions, zone: string) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: safeZone(zone) }).format(d);
  };
  // Cabeçalho do dia: a chave vem do Intl em en-CA ("YYYY-MM-DD"). Ancorar em
  // meia-noite UTC e formatar num fuso -3 desloca para 21:00 do dia ANTERIOR —
  // o histórico mostrava tudo 1 dia atrasado. Âncora de 15:00 UTC (meio-dia de
  // Brasília), igual ao `tappingRecordMoment` e ao `civilDateToIso` do backend:
  // o dia civil sobrevive em qualquer fuso ocidental.
  const formatDayKey = (day: string, zone: string) => {
    const d = new Date(`${day}T15:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return day;
    return new Intl.DateTimeFormat("pt-BR", { timeZone: safeZone(zone), day: "2-digit", month: "long", year: "numeric" }).format(d);
  };

  // Carrega catálogo de tabelas e tarefas por empresa (para enriquecer a linha do tempo)
  useEffect(() => {
    if (!me) return;
    const cids = Array.from(new Set(me.assignments.map((a) => a.farm.companyId)));
    Promise.all(cids.map((cid) => listFieldTappingTables(cid).catch(() => []))).then((tableLists) => {
      const map = new Map<string, Map<string, string>>();
      cids.forEach((cid, i) => {
        const inner = new Map<string, string>();
        for (const t of tableLists[i] ?? []) if (t?.id) inner.set(t.id, t.name);
        map.set(cid, inner);
      });
      setTableNames(map);
    });
    Promise.all(cids.map((cid) => listTappingTasks(cid).catch(() => []))).then((taskLists) => {
      const catalog = new Map<string, string>();
      const codeByName = new Map<string, string>();
      for (const task of taskLists.flat()) {
        if (task?.code) catalog.set(`${task.companyId}:${task.code}`, task.label);
        if (task?.active && task?.label) codeByName.set(task.label, task.code);
      }
      setTaskNames(catalog);
      const preferred = codeByName.get("Tabela adiantada");
      if (preferred) {
        setEarlyCode(preferred);
      } else {
        let fallback = "/";
        for (const [label, code] of codeByName) {
          if (/adiant/i.test(label)) { fallback = code; break; }
        }
        setEarlyCode(fallback);
      }
    });
  }, [me]);

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
  }, [me, mode, farm, range.from, range.to, refreshToken]);

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
  }, [farm, tapperId, range.from, range.to, tappers, refreshToken]);

  const editingFarm = useMemo(
    () => me?.assignments.find((assignment) => assignment.farm.id === editingRecord?.farmId),
    [me, editingRecord?.farmId],
  );
  const editingCompanyId = editingRecord?.companyId;
  const editTaskOptions = useMemo(() => {
    const companyPrefix = editingCompanyId ? `${editingCompanyId}:` : "";
    const catalogTasks = Array.from(taskNames.entries())
      .filter(([key]) => companyPrefix && key.startsWith(companyPrefix))
      .map(([key, label]) => ({ code: key.slice(companyPrefix.length), label }));
    const byCode = new Map(TASK_EXTENTS.map((task) => [task.value, task.label]));
    for (const task of catalogTasks) byCode.set(task.code, task.label);
    if (editDraft?.taskExtent && !byCode.has(editDraft.taskExtent)) byCode.set(editDraft.taskExtent, editDraft.taskExtent);
    return Array.from(byCode, ([code, label]) => ({ code, label }));
  }, [editingCompanyId, editDraft?.taskExtent, taskNames]);

  useEffect(() => {
    let active = true;
    setEditTappers([]);
    if (!editingRecord?.farmId || !editingFarm) return () => { active = false; };
    listFieldTappers(editingFarm.farm.companyId, editingRecord.farmId)
      .then((items) => { if (active) setEditTappers(items); })
      .catch((error) => {
        console.error("[historico] falha ao carregar sangradores para correção", error);
        if (active) toast.error("Não foi possível carregar os sangradores para a correção.");
      });
    return () => { active = false; };
  }, [editingRecord?.farmId, editingFarm]);

  function openRecordEditor(record: TappingRecord) {
    setEditingRecord(record);
    setEditDraft({
      date: record.date.slice(0, 10),
      sangradorName: record.sangradorName,
      tapperId: record.tapperId ?? null,
      plotId: record.plotId ?? "",
      tappingTableId: record.tappingTableId ?? "",
      taskExtent: record.taskExtent ?? "",
      endPeriod: record.endPeriod ?? "",
      treesExpected: record.treesExpected == null ? "" : String(record.treesExpected),
      treesTapped: record.treesTapped == null ? "" : String(record.treesTapped),
      notes: record.notes ?? "",
    });
  }

  function openEventEditor(event: HistoryEvent) {
    const meta = event.meta ?? {};
    const recordId = typeof meta.recordId === "string" ? meta.recordId : event.id.replace(/^tap-/, "");
    openRecordEditor({
      id: recordId,
      companyId: companyIdForEvent(event),
      farmId: event.farmId ?? null,
      plotId: meta.plotId ?? null,
      tappingTableId: meta.tappingTableId ?? null,
      date: String(meta.recordDate ?? event.date),
      sangradorName: String(meta.sangradorName ?? event.title.replace(/^Sangria — /, "")),
      tapperId: meta.tapperId ?? null,
      taskExtent: meta.taskExtent ?? null,
      endPeriod: meta.endPeriod ?? null,
      treesExpected: meta.treesExpected ?? null,
      treesTapped: meta.treesTapped ?? null,
      notes: meta.notes ?? null,
      version: Number(meta.version ?? 1),
      updatedAt: meta.updatedAt ?? null,
      updatedById: meta.updatedById ?? null,
      updatedByName: meta.updatedByName ?? null,
    });
  }

  async function saveRecordEdit() {
    if (!editingRecord || !editDraft) return;
    if (!editDraft.date || !editDraft.sangradorName.trim()) {
      toast.error("Informe a data e o nome do sangrador.");
      return;
    }
    const treeCounts = [editDraft.treesExpected, editDraft.treesTapped].filter((value) => value !== "");
    if (treeCounts.some((value) => !Number.isInteger(Number(value)) || Number(value) < 0)) {
      toast.error("Informe quantidades de árvores válidas.");
      return;
    }
    setSavingEdit(true);
    try {
      await correctTappingRecord(editingRecord.id, {
        date: editDraft.date,
        sangradorName: editDraft.sangradorName.trim(),
        tapperId: editDraft.tapperId,
        plotId: editDraft.plotId || null,
        tappingTableId: editDraft.tappingTableId || null,
        taskExtent: editDraft.taskExtent || null,
        endPeriod: editDraft.endPeriod || null,
        treesExpected: editDraft.treesExpected === "" ? null : Number(editDraft.treesExpected),
        treesTapped: editDraft.treesTapped === "" ? null : Number(editDraft.treesTapped),
        notes: editDraft.notes.trim(),
      });
      setEditingRecord(null);
      setEditDraft(null);
      toast.success("Sangria corrigida e auditoria atualizada.");
      setRefreshToken((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível corrigir a sangria.");
    } finally {
      setSavingEdit(false);
    }
  }

  const tableName = (id?: string | null) => tapperTables.find((t) => t.id === id)?.name;

  // companyId de um evento de sangria, resolvido pelo farmId
  const companyIdForEvent = (event: HistoryEvent) => {
    if (!event.farmId) return farm?.companyId ?? "";
    return me?.assignments.find((a) => a.farm.id === event.farmId)?.farm.companyId ?? "";
  };

  // Nome da tabela de um evento de sangria, via catálogo carregado
  const tableNameForEvent = (event: HistoryEvent) => {
    const cid = companyIdForEvent(event);
    const tables = tableNames.get(cid);
    const id = event.meta?.tappingTableId as string | undefined;
    if (!id) return null;
    return tables?.get(id) ?? `#${id.slice(0, 6)}`;
  };

  // Tarefa de um evento de sangria, via catálogo carregado
  const taskLabelForEvent = (event: HistoryEvent) => {
    const cid = companyIdForEvent(event);
    return taskLabelFor(cid, event.meta?.taskExtent as string | undefined, taskNames);
  };

  const periodLabelForEvent = (event: HistoryEvent) => {
    const value = event.meta?.endPeriod;
    return END_PERIODS.find((period) => period.value === value)?.label ?? null;
  };

  // Verifica se um evento de sangria é "adiantada"
  const isEarlyEvent = (event: HistoryEvent) => {
    return isEarlyTask(event.meta?.taskExtent as string | undefined, earlyCode);
  };

  const grouped = useMemo(() => {
    const f = kindTab === "tudo" ? entries : entries.filter((e) => e.kind === kindTab);
    const byDay = new Map<string, HistoryEvent[]>();
    for (const e of f) {
      // `e.date` inválido viraria "Invalid Date" no agrupamento — descarta em vez de quebrar a página.
      const when = new Date(e.date);
      if (Number.isNaN(when.getTime())) continue;
      const d = new Intl.DateTimeFormat("en-CA", { timeZone: timezoneForEvent(e), year: "numeric", month: "2-digit", day: "2-digit" }).format(when);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(e);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, kindTab, farm, me]);

  const sangradorStats = useMemo(() => {
    const days = new Set(tapperRecords.flatMap((r) => {
      const when = tappingRecordMoment(r);
      return Number.isNaN(when.getTime()) ? [] : [new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(when)];
    }));
    const periodDays = period === "hoje" || period === "dia" ? 1 : period === "semana" ? 7 : period === "custom" && custom
      ? Math.round((new Date(`${custom.to}T15:00:00.000Z`).getTime() - new Date(`${custom.from}T15:00:00.000Z`).getTime()) / 86400000) + 1
      : 30;
    return { total: tapperRecords.length, daysWithRecord: days.size, periodDays };
  }, [tapperRecords, period, custom]);

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Histórico diário</h1>

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
        {period === "dia" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="col-span-2 h-10 justify-start rounded-xl font-normal">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                {formatDate(`${selectedDate}T15:00:00.000Z`, { dateStyle: "long" }, timezone)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                defaultMonth={datePickerDate}
                selected={datePickerDate}
                onSelect={(date) => {
                  if (date) setSelectedDate(dateToIso(date));
                }}
                disabled={{ after: new Date() }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
        {period === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="col-span-2 h-10 justify-start rounded-xl font-normal">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                {custom
                  ? `${formatDate(`${custom.from}T15:00:00.000Z`, { day: "2-digit", month: "short" }, timezone)} – ${formatDate(`${custom.to}T15:00:00.000Z`, { day: "2-digit", month: "short", year: "numeric" }, timezone)}`
                  : "Escolher período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={custom ? new Date(`${custom.from}T15:00:00.000Z`) : undefined}
                selected={
                  custom
                    ? { from: new Date(`${custom.from}T15:00:00.000Z`), to: new Date(`${custom.to}T15:00:00.000Z`) }
                    : undefined
                }
                onSelect={(sel: DateRange | undefined) => {
                  if (sel?.from && sel?.to) setCustom(isoRange(sel.from, sel.to));
                }}
                disabled={{ after: new Date() }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
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
                  {formatDayKey(day, timezone ?? "America/Sao_Paulo")}
                </h2>
                <ul className="space-y-2">
                  {list.map((e) => {
                    const early = e.kind === "sangria" && isEarlyEvent(e);
                    const tLabel = e.kind === "sangria" ? taskLabelForEvent(e) : null;
                    const tName = e.kind === "sangria" ? tableNameForEvent(e) : null;
                    const endPeriod = e.kind === "sangria" ? periodLabelForEvent(e) : null;
                    const edited = e.kind === "sangria" && Number(e.meta?.version ?? 1) > 1;
                    const reportedAfter = Boolean(e.meta?.reportedAfter);
                    return (
                      <li key={e.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${early ? "border-warning/40 bg-warning/5" : "border-border/60 bg-card"}`}>
                        <div className="w-14 shrink-0 text-sm font-semibold">
                          {reportedAfter ? "—" : formatDate(e.date, { hour: "2-digit", minute: "2-digit" }, timezoneForEvent(e))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${KIND_STYLE[e.kind] ?? "bg-muted text-muted-foreground"}`}>
                              {KIND_LABEL[e.kind] ?? e.kind}
                            </span>
                            {early && (
                              <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-warning">
                                Antecipada
                              </span>
                            )}
                            {endPeriod && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                {endPeriod}
                              </span>
                            )}
                            {edited && (
                              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                Editado
                              </span>
                            )}
                            {reportedAfter && (
                              <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                                Lançado depois
                              </span>
                            )}
                          </div>
                          <div className="truncate text-sm font-medium">{e.title}</div>
                          {e.subtitle && <div className="truncate text-[11px] text-muted-foreground">{e.subtitle}</div>}
                          {edited && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Editado por {e.meta?.updatedByName ?? "usuário não identificado"}
                              {e.meta?.updatedAt ? ` · ${formatDate(String(e.meta.updatedAt), { dateStyle: "short", timeStyle: "short" }, timezoneForEvent(e))}` : ""}
                            </div>
                          )}
                          {reportedAfter && e.meta?.enteredAt && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Data do registro: {formatDate(`${String(e.meta?.recordDate ?? e.date).slice(0, 10)}T15:00:00.000Z`, { dateStyle: "short" }, timezoneForEvent(e))}
                              {" · "}Lançado em {formatDate(String(e.meta.enteredAt), { dateStyle: "short", timeStyle: "short" }, timezoneForEvent(e))}
                            </div>
                          )}
                          {e.kind === "sangria" && (tName || tLabel) && (
                            <div className={`mt-0.5 truncate text-[11px] ${early ? "text-warning" : "text-primary"}`}>
                              {tLabel}{tName ? ` · ${tName}` : ""}
                            </div>
                          )}
                          {e.kind === "sangria" && (
                            <Button type="button" size="sm" variant="outline" className="mt-2 h-8" onClick={() => openEventEditor(e)}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Corrigir marcação
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
                      {tapperRecords.map((r) => {
                        const recordTask = taskLabelFor(farm.companyId, r.taskExtent, taskNames);
                        return (
                          <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-semibold">
                                {formatDate(`${r.date.slice(0, 10)}T15:00:00.000Z`, { day: "2-digit", month: "short" }, timezone)}
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
                            {recordTask && (
                              <div className="mt-1 text-[11px] text-muted-foreground">Tarefa: {recordTask}</div>
                            )}
                            {r.reportedAfter && (
                              <div className="mt-1 text-[10px] text-sky-700">
                                Lançado depois{r.enteredAt ? ` · ${formatDate(r.enteredAt, { dateStyle: "short", timeStyle: "short" }, timezone)}` : ""}
                              </div>
                            )}
                            {r.notes && <div className="mt-1 text-[11px] text-muted-foreground">{r.notes}</div>}
                            {Number(r.version ?? 1) > 1 && (
                              <div className="mt-2 text-[10px] text-muted-foreground">
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold uppercase text-amber-700">Editado</span>
                                {" "}por {r.updatedByName ?? "usuário não identificado"}
                                {r.updatedAt ? ` · ${formatDate(r.updatedAt, { dateStyle: "short", timeStyle: "short" }, timezone)}` : ""}
                              </div>
                            )}
                            <Button type="button" size="sm" variant="outline" className="mt-2 h-8" onClick={() => openRecordEditor(r)}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Corrigir marcação
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : null}
            </>
          )}
        </>
      )}
      <Dialog
        open={!!editingRecord && !!editDraft}
        onOpenChange={(open) => {
          if (!open && !savingEdit) {
            setEditingRecord(null);
            setEditDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Corrigir marcação de sangria</DialogTitle>
            <DialogDescription>Ao salvar, o sistema registra quem fez a alteração e a data/hora.</DialogDescription>
          </DialogHeader>
          {editDraft && editingRecord && (
            <div className="space-y-3">
              <label className="block space-y-1 text-xs text-muted-foreground">
                Data da sangria
                <Input type="date" max={getLocalIsoDate()} value={editDraft.date} onChange={(event) => setEditDraft({ ...editDraft, date: event.target.value })} />
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Sangrador
                <Select
                  value={editDraft.tapperId ?? (editTappers.find((tapper) => tapper.fullName === editDraft.sangradorName)?.id ?? EMPTY_VALUE)}
                  onValueChange={(value) => {
                    if (value === EMPTY_VALUE) {
                      setEditDraft({ ...editDraft, tapperId: null });
                      return;
                    }
                    const selected = editTappers.find((tapper) => tapper.id === value);
                    if (selected) setEditDraft({ ...editDraft, tapperId: selected.id.startsWith("rh:") ? null : selected.id, sangradorName: selected.fullName });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o sangrador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Manter nome sem vínculo</SelectItem>
                    {editDraft.tapperId && !editTappers.some((tapper) => tapper.id === editDraft.tapperId) && (
                      <SelectItem value={editDraft.tapperId}>{editDraft.sangradorName}</SelectItem>
                    )}
                    {editTappers.map((tapper) => <SelectItem key={tapper.id} value={tapper.id}>{tapper.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  value={editDraft.sangradorName}
                  onChange={(event) => setEditDraft({ ...editDraft, sangradorName: event.target.value, tapperId: null })}
                  aria-label="Nome do sangrador"
                />
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Talhão
                <Select value={editDraft.plotId || EMPTY_VALUE} onValueChange={(value) => setEditDraft({ ...editDraft, plotId: value === EMPTY_VALUE ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o talhão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Sem talhão</SelectItem>
                    {editDraft.plotId && !editingFarm?.farm.plots.some((plot) => plot.id === editDraft.plotId) && (
                      <SelectItem value={editDraft.plotId}>Talhão atual</SelectItem>
                    )}
                    {editingFarm?.farm.plots.map((plot) => <SelectItem key={plot.id} value={plot.id}>{plot.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Tabela
                <Select value={editDraft.tappingTableId || EMPTY_VALUE} onValueChange={(value) => setEditDraft({ ...editDraft, tappingTableId: value === EMPTY_VALUE ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Sem tabela</SelectItem>
                    {editDraft.tappingTableId && !tableNames.get(editingRecord.companyId)?.has(editDraft.tappingTableId) && (
                      <SelectItem value={editDraft.tappingTableId}>Tabela atual</SelectItem>
                    )}
                    {[...(tableNames.get(editingRecord.companyId)?.entries() ?? [])].map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Tarefa
                <Select value={editDraft.taskExtent || EMPTY_VALUE} onValueChange={(value) => setEditDraft({ ...editDraft, taskExtent: value === EMPTY_VALUE ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a tarefa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Sem tarefa</SelectItem>
                    {editTaskOptions.map((task) => <SelectItem key={task.code} value={task.code}>{task.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Período
                <Select value={editDraft.endPeriod || EMPTY_VALUE} onValueChange={(value) => setEditDraft({ ...editDraft, endPeriod: value === EMPTY_VALUE ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>Sem período</SelectItem>
                    {END_PERIODS.map((period) => <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-xs text-muted-foreground">
                  Árvores previstas
                  <Input type="number" min="0" step="1" value={editDraft.treesExpected} onChange={(event) => setEditDraft({ ...editDraft, treesExpected: event.target.value })} />
                </label>
                <label className="block space-y-1 text-xs text-muted-foreground">
                  Árvores realizadas
                  <Input type="number" min="0" step="1" value={editDraft.treesTapped} onChange={(event) => setEditDraft({ ...editDraft, treesTapped: event.target.value })} />
                </label>
              </div>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Observações
                <Textarea rows={3} value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} />
              </label>
              {Number(editingRecord.version ?? 1) > 1 && (
                <p className="text-xs text-muted-foreground">
                  Última edição: {editingRecord.updatedByName ?? "usuário não identificado"}
                  {editingRecord.updatedAt ? ` · ${formatDate(editingRecord.updatedAt, { dateStyle: "short", timeStyle: "short" }, timezone)}` : ""}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={savingEdit} onClick={() => { setEditingRecord(null); setEditDraft(null); }}>Cancelar</Button>
            <Button type="button" disabled={savingEdit || !editDraft?.date || !editDraft.sangradorName.trim()} onClick={saveRecordEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
