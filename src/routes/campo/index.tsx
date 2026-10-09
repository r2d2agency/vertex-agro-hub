import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronRight, ChevronLeft, AlertTriangle, ShieldCheck, PlusCircle, Search, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getFieldMe, type FieldMe, type Coords, captureLocation, type FieldTapper, listFieldTappers, listFieldTappingTables, type FieldTappingTable, listFieldTapperTables, type FieldTapperTable } from "@/lib/field.functions";
import { toast } from "sonner";
import { listTasks, categoryLabel, categoryStyle, type ScheduledTask } from "@/lib/agenda.functions";
import { listTappingRecords, listTappingTasks, type TappingRecord, type TappingTask } from "@/lib/sangrias.functions";
import { getLocalIsoDate, monthRange, monthLabel } from "@/lib/date-utils";
import { CheckinSheet } from "@/components/vertex/field/checkin-sheet";

// Saudação por horário do aparelho: bom dia até o meio-dia, boa tarde até o
// fim da tarde, boa noite depois. Fica fixa no primeiro render para não
// mudar sozinha no meio da sessão.
function greetingAt(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// Atalhos que antes só apareciam no menu do "+" — trazidos pra tela inicial
// pra economizar um clique nas operações mais usadas do monitor.
const QUICK_ACTIONS: Array<{ to: string; label: string; emoji: string; roles?: string[] }> = [
  { to: "/campo/sangria", label: "Registrar sangria", emoji: "💧", roles: ["monitor", "admin"] },
  { to: "/campo/chuva", label: "Informar chuva", emoji: "🌧️" },
  { to: "/campo/abastecimento", label: "Abastecimento", emoji: "⛽" },
  { to: "/campo/operacao-maquina", label: "Operação de máquina", emoji: "🚜" },
];

type SangriaCategory = "possible" | "done" | "overdue" | "early";
// Um "dia-sangrador": a mesma pessoa pode aparecer em mais de um balde
// no mesmo período, com um item por dia trabalhado. No modo diário o
// período tem 1 dia, então o comportamento é idêntico ao anterior.
type SangriaDay = {
  tapper: FieldTapper;
  farmId: string;
  companyId: string;
  date: string;
  records: TappingRecord[];
};
type SangriaSummary = Record<SangriaCategory, SangriaDay[]>;

const CATEGORY_LABEL: Record<SangriaCategory, string> = {
  possible: "Sangrias previstas",
  done: "Sangrias realizadas",
  overdue: "Sangrias atrasadas",
  early: "Sangrias antecipadas",
};

// Nomes das tarefas (catálogo por empresa). Uma sangria é classificada pelo
// NOME da tarefa, nunca pelo código: o código varia por empresa e pode nem
// existir. Sem o catálogo carregado, cai no rótulo genérico.
const TASK_LABEL: Record<string, string> = {
  X: "Tabela completa",
  "/": "Tabela adiantada",
  "1": "Reposição",
};

// Rótulo dos cards de prevista que ainda não têm registro. Precisa ser o
// mesmo valor usado no filtro de tarefa, senão o select os esconderia.
const TO_DO_LABEL = "A fazer";

const PERIOD_OPTIONS = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "semana", label: "Últimos 7 dias", days: 7 },
  { value: "quinzena", label: "Últimos 15 dias", days: 15 },
  { value: "mes", label: "Últimos 30 dias", days: 30 },
] as const;

// Data segura: se o valor for inválido, retorna "" em vez de "Invalid Date".
function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Formata data ISO (YYYY-MM-DD) para exibição, com fallback seguro.
function formatDayDate(date: string | null | undefined): string {
  const d = safeDate(`${date}T00:00:00`);
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
}

export const Route = createFileRoute("/campo/")({ component: FieldHome });

function FieldHome() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);
  const [checkinSheetOpen, setCheckinSheetOpen] = useState(false);
  const [checkinCoords, setCheckinCoords] = useState<Coords | null>(null);
  const [sangriaSummary, setSangriaSummary] = useState<SangriaSummary>({ possible: [], done: [], overdue: [], early: [] });
  // `${companyId}:${code}` → nome da tarefa, para exibir rótulo em vez de código.
  const [taskNames, setTaskNames] = useState<Map<string, string>>(new Map());
  // companyId → (tableId → nome), para mostrar o nome da tabela no detalhe.
  const [tableNames, setTableNames] = useState<Map<string, Map<string, string>>>(new Map());
  // 0 = mês atual, -1 = mês anterior, -2 = dois meses atrás…
  const [monthOffset, setMonthOffset] = useState(0);
  // "Hoje" é o padrão: o monitor abre a tela pra ver o dia que está
  // trabalhando, e um período de 30 dias escondia isso num mar de cards.
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>("hoje");
  const [sangriaDetail, setSangriaDetail] = useState<SangriaCategory | null>(null);
  const [selectedTapper, setSelectedTapper] = useState<SangriaDay | null>(null);

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

  // Resumo de sangrias do período selecionado (hoje, 7 dias, 15 dias, 30 dias).
  // "Previstas" = sangradores ativos × dias do período (cada sangrador faz 1 sangria/dia).
  // "Realizadas" = dias com registro.
  // "Atrasadas" = previstas que passaram e não foram realizadas.
  // "Antecipadas" = realizadas antes do dia previsto.
  // A tarefa vem do catálogo da empresa, nunca do código.
  // "Antecipada" = a tarefa da sangria é a "adiantada" do catálogo (o código
  // continua gravado em `taskExtent`; a tela mostra o nome). Antes isso era
  // `day.date < today`, que nunca é verdade no período padrão "hoje" — a aba
  // ficava sempre zerada.
  useEffect(() => {
    const farms = me?.assignments ?? [];
    if (farms.length === 0) return;

    const option = PERIOD_OPTIONS.find((item) => item.value === period)!;
    const to = getLocalIsoDate();
    const from = getLocalIsoDate(new Date(Date.now() - (option.days - 1) * 86400000));
    const today = getLocalIsoDate();

    let cancelled = false;
    setSangriaSummary({ possible: [], done: [], overdue: [], early: [] });
    (async () => {
      try {
        const cids = Array.from(new Set(farms.map((a) => a.farm.companyId)));
        const [recordLists, taskLists, tableLists, tapperLists] = await Promise.all([
          // .catch por chamada: uma falha isolada zera só a parte dela, sem
          // derrubar o resumo inteiro. O erro é logado, não escondido.
          Promise.all(farms.map((a) => listTappingRecords(a.farm.companyId, { farmId: a.farm.id, from, to })
            .catch((e) => { console.error("[resumo] sangrias", a.farm.id, e); return [] as TappingRecord[]; }))),
          Promise.all(cids.map((cid) => listTappingTasks(cid)
            .catch((e) => { console.error("[resumo] tarefas", cid, e); return [] as TappingTask[]; }))),
          Promise.all(cids.map((cid) => listFieldTappingTables(cid)
            .catch((e) => { console.error("[resumo] tabelas", cid, e); return [] as FieldTappingTable[]; }))),
          Promise.all(farms.map((a) => listFieldTappers(a.farm.companyId, a.farm.id)
            .catch((e) => { console.error("[resumo] sangradores", a.farm.id, e); return [] as FieldTapper[]; }))),
        ]);
        if (cancelled) return;
        // A API pode devolver algo que não é lista (null num 204, ou objeto
        // paginado). Sem isto, um for...of estoura e o resumo inteiro cai.
        const asList = <T,>(value: T[] | unknown): T[] => (Array.isArray(value) ? value : []);
        // Cada etapa degrada em vez de estourar: só os registros alimentam a
        // contagem, então um catálogo malformado não pode zerar a tela. O
        // nome da etapa vai no log, porque "is not iterable" sozinho não diz
        // qual das três respostas quebrou.
        const safe = <T,>(name: string, run: () => T, fallback: T): T => {
          try { return run(); } catch (e) {
            console.error(`[resumo] falha ao montar ${name}:`, e);
            return fallback;
          }
        };
        const records = safe("as sangrias", () => recordLists.flatMap(asList<TappingRecord>), [] as TappingRecord[]);
        // Código → nome, do catálogo de cada empresa. É o nome que a UI
        // mostra; o código serve só de chave de junção.
        const catalog = safe("o catalogo de tarefas", () => {
          const map = new Map<string, string>();
          // flatMap já achata: o que sobra é a própria lista de tarefas, não
          // listas de tarefas. Iterar por cima disso quebrava com
          // "is not iterable".
          for (const task of taskLists.flatMap(asList<TappingTask>)) {
            if (task?.code) map.set(`${task.companyId}:${task.code}`, task.label);
          }
          return map;
        }, new Map<string, string>());
        setTaskNames(catalog);
        // Nome → código, só para tarefas ativas. É o que permite classificar
        // "antecipada" pelo nome exibido sem perder o código gravado em
        // `taskExtent` (que a alocação de metade de árvores ainda usa).
        const codeByName = safe("o reverso do catalogo de tarefas", () => {
          const map = new Map<string, string>();
          for (const task of taskLists.flatMap(asList<TappingTask>)) {
            if (task?.active && task?.label) map.set(task.label, task.code);
          }
          return map;
        }, new Map<string, string>());
        // Código da tarefa "adiantada" — o que o monitor chama de
        // "antecipada" na aba de resumo. Sem catálogo, cai no código legado.
        const earlyCode = safe("o codigo da tarefa antecipada", () => {
          const preferred = codeByName.get("Tabela adiantada");
          if (preferred) return preferred;
          // Fallback: qualquer tarefa ativa cujo nome mencione "adiant".
          for (const [label, code] of codeByName) {
            if (/adiant/i.test(label)) return code;
          }
          return "/";
        }, "/");
        // Um dia é "antecipada" se algum registro tem o código da tarefa
        // adiantada na lista `taskExtent` (separada por vírgula).
        const hasEarlyTask = (day: SangriaDay) =>
          (day.records ?? []).some((record) =>
            String(record.taskExtent ?? "")
              .split(",")
              .map((code) => code.trim())
              .includes(earlyCode),
          );
        // Tabelas por empresa: cada chamada já vem escopada a uma empresa,
        // então o zip com cids é seguro.
        const tables = safe("o catalogo de tabelas", () => {
          const map = new Map<string, Map<string, string>>();
          cids.forEach((cid, i) => {
            const inner = new Map<string, string>();
            for (const table of asList<FieldTappingTable>(tableLists[i])) {
              if (table?.id) inner.set(table.id, table.name);
            }
            map.set(cid, inner);
          });
          return map;
        }, new Map<string, Map<string, string>>());
        setTableNames(tables);
        const summary: SangriaSummary = { possible: [], done: [], overdue: [], early: [] };
        // Chave: sangrador + fazenda + data. Nomes gravados sem acento ou
        // com caixa diferente ainda casam, porque a comparação ignora ambos.
        const byTapperDay = safe("o agrupamento por dia", () => {
          const map = new Map<string, SangriaDay>();
          for (const record of records) {
            if (!record || typeof record !== "object") continue;
            const farmId = record.farmId ?? "";
            const rawName = typeof record.sangradorName === "string" ? record.sangradorName.trim() : "";
            const name = rawName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            const date = String(record.date ?? "").slice(0, 10);
            // Sem data não dá para localizar o dia; sem nome não dá para
            // identificar quem. Descartar o registro é melhor que quebrar.
            if (!date || !name) continue;
            const key = `${farmId}:${name}:${date}`;
            const existing = map.get(key);
            if (existing) {
              existing.records.push(record);
            } else {
              map.set(key, {
                tapper: { id: record.tapperId ?? name, fullName: rawName || "Sem nome" },
                farmId,
                companyId: record.companyId,
                date,
                records: [record],
              });
            }
          }
          return map;
        }, new Map<string, SangriaDay>());
        // "Previstas" = sangradores ativos × dias do período. Cada sangrador faz
        // 1 sangria por dia. "Realizadas" = dias com registro.
        const daysInPeriod = Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1;
        // tapperLists vem na mesma ordem de farms (uma chamada por fazenda),
        // então o zip é seguro e cada sangrador só prevê dia na sua fazenda.
        const tappersByFarm = farms.map((farm, index) => ({
          farm,
          tappers: asList<FieldTapper>(tapperLists[index]),
        }));
        // A chave tem que casar com a do agrupamento: fazenda + nome sem
        // acento/caixa + data. Sem a fazenda, o nome de um sangrador que
        // trabalha em duas fazendas casava com o registro errado e o dia
        // aparecia como realizado (ou atrasado) na fazenda errada.
        const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        // Um item por (fazenda, sangrador, dia) — inclusive os já realizados.
        // Antes os realizados entravam só em "done" e os vazios só em
        // "overdue", então a aba "Previstas" mostrava uma lista de cards
        // vazios e o total não fechava com a soma das outras abas.
        const possibleDays: SangriaDay[] = [];
        for (const { farm, tappers } of tappersByFarm) {
          for (const tapper of tappers) {
            for (let dayIndex = 0; dayIndex < daysInPeriod; dayIndex++) {
              const date = getLocalIsoDate(new Date(new Date(`${from}T00:00:00`).getTime() + dayIndex * 86400000));
              const key = `${farm.farm.id}:${normalize(tapper.fullName)}:${date}`;
              const realized = byTapperDay.get(key);
              possibleDays.push({
                tapper,
                farmId: farm.farm.id,
                companyId: farm.farm.companyId,
                date,
                records: realized ? realized.records : [],
              });
            }
          }
        }
        for (const day of possibleDays) {
          // "Previstas" = o que ainda NÃO foi feito. O que já tem registro é
          // "Realizada" e não pode aparecer aqui — senão a aba mostrava o
          // histórico do dia em vez da pendência.
          if (day.records.length > 0) {
            summary.done.push(day);
          } else {
            summary.possible.push(day);
            if (day.date < today) {
              // Atrasada: passou e não foi realizada.
              summary.overdue.push(day);
            }
          }
          // "Antecipada" = a tarefa da sangria é a "adiantada" do catálogo.
          // Um dia realizado também pode ser antecipado, então isso é avaliado
          // fora do if/else de realização.
          if (hasEarlyTask(day)) {
            summary.early.push(day);
          }
        }
        if (!cancelled) setSangriaSummary(summary);
      } catch (error) {
        // A mensagem real importa: sem ela, qualquer falha vira o mesmo
        // "não foi possível carregar", sem pista de onde veio.
        console.error("[resumo de sangrias]", error);
        if (!cancelled) toast.error(`Não foi possível carregar o resumo: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      }
    })();
    return () => { cancelled = true; };
  }, [me, period]);

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

  const [greeting, setGreeting] = useState(() => greetingAt(new Date()));
  useEffect(() => {
    // Recalcula o bom dia/boa tarde/boa noite quando o app volta pra frente.
    const onVisible = () => { if (!document.hidden) setGreeting(greetingAt(new Date())); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }));
  }, []);
  const farmName = (farmId?: string | null) => (me?.assignments || []).find((a) => a.farm.id === farmId)?.farm.name ?? "";

  if (loading || !me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Primeiro nome só — a saudação é curta e o nome completo estourava a linha.
  const firstName = (me.user?.fullName ?? "").trim().split(/\s+/)[0] || "campo";

  return (
    <div className="space-y-5">
      {/* Topo: só o atalho de check-in. A data foi para o bloco de boas-vindas. */}
      <header className="flex items-center justify-end">
        {activeCheckin && me.primaryRole !== "monitor" && (
          <button
            onClick={openCheckinSheet}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 transition-transform"
            title="Trocar Fazenda / Novo Check-in"
          >
            <PlusCircle className="h-5 w-5" />
          </button>
        )}
      </header>

      {/* Saudação: a marca já está no topo do app, então aqui não vai logo. */}
      <section className="space-y-1">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}!
        </p>
        <p className="text-xs capitalize text-muted-foreground">{todayLabel}</p>
        {activeCheckin ? (
          <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3 w-3" />
            <span className="leading-tight">
              {(me.assignments || []).find(a => a.farm.id === activeCheckin.farmId)?.farm.name || "Fazenda"}
            </span>
          </div>
        ) : (
          <p className="pt-1 text-[10px] text-warning">{me.primaryRole === "monitor" ? "Escolha uma propriedade" : "Aguardando Check-in"}</p>
        )}
      </section>

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

      {/* Resumo de sangrias — por período selecionável */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Resumo de sangrias</h2>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                period === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/60 hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SummaryCell value={sangriaSummary.possible.length} label="Previstas" tone="muted" onClick={() => setSangriaDetail("possible")} />
          <SummaryCell value={sangriaSummary.done.length} label="Realizadas" tone="primary" onClick={() => setSangriaDetail("done")} />
          <SummaryCell value={sangriaSummary.overdue.length} label="Atrasadas" tone="destructive" onClick={() => setSangriaDetail("overdue")} />
          <SummaryCell value={sangriaSummary.early.length} label="Antecipadas" tone="warning" onClick={() => setSangriaDetail("early")} />
        </div>
        {sangriaSummary.possible.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {sangriaSummary.done.length} sangria(s) realizada(s) no período.
          </p>
        )}
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
        summary={sangriaSummary}
        monthOffset={monthOffset}
        taskNames={taskNames}
        tableNames={tableNames}
        onClose={() => setSangriaDetail(null)}
        onSelectTapper={(day) => { setSangriaDetail(null); setSelectedTapper(day); }}
      />
      <TapperStatsDialog day={selectedTapper} onClose={() => setSelectedTapper(null)} />
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
  category, summary, monthOffset, taskNames, tableNames, onClose, onSelectTapper,
}: {
  category: SangriaCategory | null;
  summary: SangriaSummary;
  monthOffset: number;
  taskNames: Map<string, string>;
  tableNames: Map<string, Map<string, string>>;
  onClose: () => void;
  onSelectTapper: (day: SangriaDay) => void;
}) {
  const [search, setSearch] = useState("");
  const [tapperFilter, setTapperFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const list = category ? summary[category] : [];
  // Nome da tarefa de um registro: catálogo da empresa, com o rótulo
  // genérico como reserva quando o código não está no catálogo.
  const labelFor = (record: TappingRecord) =>
    taskNames.get(`${record.companyId}:${record.taskExtent ?? ""}`) ?? TASK_LABEL[record.taskExtent ?? ""] ?? "Sem tarefa";
  // Nome da tabela, quando a tela de campo carregou o catálogo. Sem ele,
  // mostra só o id curto em vez de omitir a informação.
  const tableName = (record: TappingRecord) => {
    const tables = tableNames.get(record.companyId);
    const name = tables?.get(record.tappingTableId ?? "");
    return name ?? (record.tappingTableId ? `#${record.tappingTableId.slice(0, 6)}` : "");
  };
  // Hora do registro — fica logo abaixo do nome, na mesma linha da data.
  // Vem de recordedAt (quando o monitor gravou); sem ele, não há hora pra
  // mostrar, e a linha mostra só a data em vez de um "--:--" inventado.
  const timeFor = (day: SangriaDay) => {
    const stamp = day.records?.find((record) => record.recordedAt)?.recordedAt;
    if (!stamp) return "";
    const at = new Date(stamp);
    if (Number.isNaN(at.getTime())) return "";
    return at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  // Tarefas oferecidas no filtro: as que aparecem no balde aberto. Cards sem
  // registro ("a fazer") entram como "A fazer", senão o filtro por tarefa
  // os esconderia — não há tarefa realizada neles para casar.
  const taskOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const day of list) {
      if ((day.records ?? []).length === 0) {
        seen.add(TO_DO_LABEL);
      } else {
        for (const record of day.records ?? []) seen.add(labelFor(record));
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [list, taskNames]);
  // Opções do select: só quem aparece no balde aberto, deduplicado.
  const tapperOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const day of list) {
      const key = day.tapper?.fullName?.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, day.tapper!.fullName.trim());
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [list]);
  const filtered = list.filter((day) => {
    if (tapperFilter !== "all" && day.tapper?.fullName?.trim().toLowerCase() !== tapperFilter) return false;
    // Um dia aparece se ao menos um dos registros casar com a tarefa. Cards
    // sem registro só casam com "A fazer" — não há tarefa realizada neles.
    if (taskFilter !== "all") {
      const isToDo = (day.records ?? []).length === 0;
      const matches = isToDo
        ? taskFilter === TO_DO_LABEL
        : (day.records ?? []).some((record) => labelFor(record) === taskFilter);
      if (!matches) return false;
    }
    return day.tapper?.fullName?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) ?? false;
  });
  // Data decrescente: o mais recente do período primeiro.
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  // Precisa ser "all", não "": o filtro compara por desigualdade exata, e
  // uma string vazia não casa com nenhum nome, zerando a lista inteira.
  useEffect(() => { setSearch(""); setTapperFilter("all"); setTaskFilter("all"); }, [category]);

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? CATEGORY_LABEL[category] : "Sangrias"}</DialogTitle>
          <p className="text-xs text-muted-foreground">{monthLabel(monthOffset)}</p>
        </DialogHeader>
        <div className="space-y-2">
          <Select value={tapperFilter} onValueChange={setTapperFilter}>
            <SelectTrigger className="w-full" aria-label="Filtrar por sangrador">
              <SelectValue placeholder="Todos os sangradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os sangradores</SelectItem>
              {tapperOptions.map((name) => (
                <SelectItem key={name} value={name.toLowerCase()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={taskFilter} onValueChange={setTaskFilter}>
            <SelectTrigger className="w-full" aria-label="Filtrar por tarefa">
              <SelectValue placeholder="Todas as tarefas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tarefas</SelectItem>
              {taskOptions.map((label) => (
                <SelectItem key={label} value={label}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar por sangrador..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        {sorted.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum sangrador encontrado.</p> : (
          <div className="space-y-2">
            {sorted.map((day, index) => {
              const tapperName = day.tapper?.fullName?.trim() || "Sangrador não identificado";
              return (
              <button key={`${day.tapper?.id ?? "unknown"}:${day.farmId ?? ""}:${day.date ?? ""}:${index}`} type="button" onClick={() => onSelectTapper(day)} className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/60 hover:bg-primary/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tapperName}</span>
                  {/* Uma linha por registro: a tarefa vem do catálogo, pelo nome. */}
                  {(day.records ?? []).map((record) => (
                    <span key={record.id} className="mt-0.5 block truncate text-[11px] text-primary">
                      {labelFor(record)}
                      {record.tappingTableId ? ` · ${tableName(record)}` : ""}
                    </span>
                  ))}
                  {/* Sem registro não há tabela feita: mostra a pendência. */}
                  {(day.records ?? []).length === 0 && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      A fazer
                    </span>
                  )}
                </span>
                {/* Data/hora empilhadas acima do chevron: o nome fica sozinho à
                    esquerda, sem a data competindo com ele por espaço. */}
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-right text-[11px] leading-tight text-muted-foreground">
                    <span className="block">{formatDayDate(day.date)}</span>
                    {timeFor(day) ? <span className="block">{timeFor(day)}</span> : null}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TapperStatsDialog({ day, onClose }: { day: SangriaDay | null; onClose: () => void }) {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]["value"]>("hoje");
  const [monthOffset, setMonthOffset] = useState(0);
  const [records, setRecords] = useState<TappingRecord[]>([]);
  const [tasks, setTasks] = useState<TappingTask[]>([]);
  const [tables, setTables] = useState<FieldTapperTable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!day) return;
    const option = PERIOD_OPTIONS.find((item) => item.value === period)!;
    const to = getLocalIsoDate();
    // "Últimos 7 dias" = hoje + 6 dias atrás. Subtrair 7 em vez de 6 fazia o
    // período começar um dia antes e puxar registro de fora da seleção.
    const from = getLocalIsoDate(new Date(new Date(`${to}T00:00:00`).getTime() - (option.days - 1) * 86400000));
    setLoading(true);

    // Buscar sangrias do período
    const recordsPromise = listTappingRecords(day.companyId, { farmId: day.farmId, from, to })
      .then((items) => items.filter((record) => (record.tapperId && record.tapperId === day.tapper.id) || record.sangradorName.trim().toLowerCase() === day.tapper.fullName.trim().toLowerCase()))
      .catch(() => [] as TappingRecord[]);

    // Buscar tarefas do período. O endpoint é só por empresa (não filtra por
    // fazenda nem por data), então o recorte pelo período é feito abaixo.
    const tasksPromise = listTappingTasks(day.companyId)
      .catch(() => [] as TappingTask[]);

    // Buscar tabelas previstas do sangrador. O endpoint é por empresa; o
    // treeCount vem do vínculo e pode não existir ainda — isso não é obrigatório.
    const tablesPromise = listFieldTapperTables(day.companyId, day.tapper.id)
      .catch(() => [] as FieldTapperTable[]);

    Promise.all([recordsPromise, tasksPromise, tablesPromise])
      .then(([recs, tsk, tbl]) => {
        setRecords(recs);
        setTasks(tsk);
        setTables(tbl);
      })
      .finally(() => setLoading(false));
  }, [day, period]);

  // Filtrar tarefas realizadas no período. O registro não guarda o id da
  // tarefa — guarda o "extent" (X, /, 1), que é o código dela no catálogo.
  const performedTasks = useMemo(() => {
    const extents = new Set(records.map((r) => r.taskExtent).filter(Boolean));
    return tasks.filter((task) => extents.has(task.code));
  }, [records, tasks]);

  const performedTables = useMemo(() => {
    const performedTableIds = new Set(records.map((r) => r.tappingTableId).filter(Boolean));
    return tables.filter((table) => performedTableIds.has(table.id));
  }, [records, tables]);

  // treeCount vive no vínculo (tapper-tables). Sem vínculo não há total — mostra "—" em vez de 0.
  const treeCountByTable = useMemo(() => {
    const map: Record<string, number> = {};
    for (const link of tables) {
      if (link.treeCount != null) map[link.id] = link.treeCount;
    }
    return map;
  }, [tables]);

  const totalTrees = useMemo(() => {
    const values = performedTables
      .map((table) => treeCountByTable[table.id])
      .filter((value): value is number => value != null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  }, [performedTables, treeCountByTable]);

  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{day?.tapper.fullName ?? "Sangrador"}</DialogTitle>
          {day && <p className="text-xs text-muted-foreground">Tocado em {formatDayDate(day.date)}{(() => { const stamp = day.records.find((r) => r.recordedAt)?.recordedAt; if (!stamp) return ""; const at = new Date(stamp); return Number.isNaN(at.getTime()) ? "" : ` · ${at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`; })()}</p>}
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {PERIOD_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setPeriod(option.value)} className={`rounded-lg border px-2 py-2 text-xs font-medium ${period === option.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>{option.label}</button>)}
        </div>
        {/* Navegação por mês: permite ver o histórico de sangrias do sangrador em meses anteriores. */}
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMonthOffset((v) => v - 1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:border-primary/60 hover:text-primary" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">{monthLabel(monthOffset)}</span>
          <button type="button" onClick={() => setMonthOffset((v) => v + 1)} className="rounded-lg border border-border/60 p-2 text-muted-foreground hover:border-primary/60 hover:text-primary" aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
          Total de árvores previstas: <span className="font-semibold text-foreground">{totalTrees ?? "—"}</span>
          {totalTrees === null && <span className="ml-1 text-[10px]">(vincule o sangrador às tabelas)</span>}
        </div>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
          <div className="space-y-4">
            {/* Tarefas Realizadas */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Tarefas Realizadas ({performedTasks.length})</h3>
              {performedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhuma tarefa realizada no período.</p>
              ) : (
                <div className="space-y-1">
                  {performedTasks.map((task) => {
                    const taskRecords = records.filter((r) => r.taskExtent === task.code);
                    const lastRecord = taskRecords[taskRecords.length - 1];
                    return (
                      <div key={task.id} className="rounded-lg border border-border/60 bg-card p-2">
                        <div className="text-xs font-medium">{task.label}</div>
                        {lastRecord && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDayDate(lastRecord.date)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tabelas Realizadas */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Tabelas Realizadas ({performedTables.length})</h3>
              {performedTables.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhuma tabela realizada no período.</p>
              ) : (
                <div className="space-y-1">
                  {performedTables.map((table) => {
                    const tableRecords = records.filter((r) => r.tappingTableId === table.id);
                    const lastRecord = tableRecords[tableRecords.length - 1];
                    return (
                      <div key={table.id} className="rounded-lg border border-border/60 bg-card p-2">
                        <div className="text-xs font-medium">{table.name}</div>
                        {treeCountByTable[table.id] != null && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{treeCountByTable[table.id]} árvores</div>
                        )}
                        {lastRecord && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDayDate(lastRecord.date)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-border/60 bg-card p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>;
}
