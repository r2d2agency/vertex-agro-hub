import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  Stethoscope,
  Droplets,
  Camera,
  Save,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Users,
  LayoutDashboard,
  MapPin,
  Calendar,
  CalendarClock,
  Sparkles,
  Search,
  TrendingUp,
  BarChart3,
  Mic,
  Video,
  ShieldCheck,
  AlertTriangle,
  History,
  Star,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

import { toast } from "sonner";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin, submitEvaluation } from "@/lib/field.functions";
import {
  submitConsultation, getVisitStatus, justifyMissedVisit, getConsultorDashboard, listConsultations,
  type VisitStatus, type ConsultorDashboard, type ConsultationForm,
} from "@/lib/consultor.functions";
import {
  listFarmTeam, listPersonEvaluations, type FarmAssignment as TeamAssignment, type PersonEvaluation,
} from "@/lib/people.functions";
import { listOccurrences, type Occurrence } from "@/lib/ocorrencias.functions";
import { listTappingRecords, type TappingRecord } from "@/lib/sangrias.functions";
import { listAlertEvents, type AlertEvent } from "@/lib/alertas.functions";
import { listInsights, type AiInsight } from "@/lib/ai.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";
import { listTasks, createTask, TASK_CATEGORIES, type ScheduledTask } from "@/lib/agenda.functions";
import { getLocalIsoDate, getLocalIsoString } from "@/lib/date-utils";

const EVAL_CATEGORIES = [
  { value: "sangria", label: "Sangria" },
  { value: "produtividade", label: "Produtividade" },
  { value: "conduta", label: "Conduta" },
  { value: "seguranca", label: "Segurança" },
  { value: "outros", label: "Outros" },
];

export const Route = createFileRoute("/campo/consultor/")({
  component: ConsultorFormPage,
});

const SELECTED_FARM_KEY = "vertex.field.selectedFarm.v1";

type Tab = "painel" | "agenda" | "historico" | "kpis" | "equipe";

function ConsultorFormPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"tabs" | "visit">("tabs");
  const [tab, setTab] = useState<Tab>("painel");

  // Fazenda selecionada — contexto persistente de toda a navegação
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [farmSwitcherOpen, setFarmSwitcherOpen] = useState(false);
  const [farmDetailLoading, setFarmDetailLoading] = useState(false);
  const [farmCheckinsToday, setFarmCheckinsToday] = useState<Occurrence[]>([]);
  const [farmTappingToday, setFarmTappingToday] = useState<TappingRecord[]>([]);
  const [farmAlerts, setFarmAlerts] = useState<AlertEvent[]>([]);
  const [farmInsights, setFarmInsights] = useState<AiInsight[]>([]);
  const [farmTasks, setFarmTasks] = useState<ScheduledTask[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);

  // Histórico (aba própria, com filtro de data)
  const [historyFrom, setHistoryFrom] = useState(() => getLocalIsoDate(new Date(Date.now() - 30 * 86400000)));
  const [historyTo, setHistoryTo] = useState(() => getLocalIsoDate());
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [historyVisits, setHistoryVisits] = useState<ConsultationForm[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Agenda (aba própria — com ou sem fazenda selecionada)
  const [agendaPeriod, setAgendaPeriod] = useState<"hoje" | "semana" | "mes">("semana");
  const [allFarmsTasks, setAllFarmsTasks] = useState<ScheduledTask[]>([]);
  const [allFarmsTasksLoading, setAllFarmsTasksLoading] = useState(false);

  // Ficha do colaborador (Equipe)
  const [selectedMember, setSelectedMember] = useState<TeamAssignment | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberEvaluations, setMemberEvaluations] = useState<PersonEvaluation[]>([]);
  const [memberActivity, setMemberActivity] = useState<Array<{ id: string; date: string; label: string }>>([]);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [evalRating, setEvalRating] = useState(4);
  const [evalCategory, setEvalCategory] = useState("sangria");
  const [evalTitle, setEvalTitle] = useState("");
  const [evalNotes, setEvalNotes] = useState("");
  const [evalSaving, setEvalSaving] = useState(false);

  // Check-in state
  const [activeCheckin, setActiveCheckin] = useState<{ farmId?: string; plotId?: string; at: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "getting" | "active" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Visit Form state
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [tappingQuality, setTappingQuality] = useState(5);
  const [sanitaryState, setSanitaryState] = useState("Ótimo");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");
  const [sanitaryInspector, setSanitaryInspector] = useState("");
  const [isThirdPartyInspector, setIsThirdPartyInspector] = useState(false);
  const [consultantId, setConsultantId] = useState("");

  // Visita obrigatória
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(null);
  const [justifyingFarmId, setJustifyingFarmId] = useState<string | null>(null);
  const [justifyReason, setJustifyReason] = useState("");
  const [justifying, setJustifying] = useState(false);

  // Dashboard e equipe (dados reais)
  const [dashboard, setDashboard] = useState<ConsultorDashboard | null>(null);
  const [team, setTeam] = useState<TeamAssignment[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  useEffect(() => {
    getFieldMe().then(setMe).catch(console.error);

    const CHECKIN_KEY = "vertex.field.checkin.v1";
    const raw = sessionStorage.getItem(CHECKIN_KEY);
    if (raw) {
      const stamp = JSON.parse(raw);
      if (Date.now() - stamp.at < 12 * 60 * 60 * 1000) {
        setActiveCheckin(stamp);
      }
    }

    const savedFarm = sessionStorage.getItem(SELECTED_FARM_KEY);
    if (savedFarm) setSelectedFarmId(savedFarm);
  }, []);

  useEffect(() => {
    if (selectedFarmId) sessionStorage.setItem(SELECTED_FARM_KEY, selectedFarmId);
    else sessionStorage.removeItem(SELECTED_FARM_KEY);
  }, [selectedFarmId]);

  useEffect(() => {
    const companyId = me?.companies?.[0]?.id;
    if (!companyId) return;
    getVisitStatus(companyId).then(setVisitStatus).catch(() => undefined);
    getConsultorDashboard(companyId).then(setDashboard).catch(() => undefined);
  }, [me]);

  useEffect(() => {
    const companyId = me?.companies?.[0]?.id;
    const farms = me?.assignments ?? [];
    if (!companyId || farms.length === 0) return;
    setTeamLoading(true);
    Promise.all(farms.map((a) => listFarmTeam(a.farm.id, companyId).catch(() => [] as TeamAssignment[])))
      .then((lists) => {
        const merged = lists.flat().filter((m) => m.role === "monitor" || m.role === "sangrador" || m.role === "operador");
        const byUser = new Map<string, TeamAssignment>();
        for (const m of merged) if (!byUser.has(m.userId)) byUser.set(m.userId, m);
        setTeam([...byUser.values()]);
      })
      .finally(() => setTeamLoading(false));
  }, [me]);

  // Dados do "dia" da fazenda selecionada — alimenta a aba Painel e a lista de
  // tarefas usada tanto na Agenda quanto para achar a visita agendada de hoje.
  useEffect(() => {
    const companyId = me?.assignments.find((a) => a.farm.id === selectedFarmId)?.farm.companyId
      || me?.companies?.[0]?.id;
    if (!selectedFarmId || !companyId) return;
    const today = getLocalIsoDate();
    setFarmDetailLoading(true);
    Promise.all([
      listOccurrences(companyId, { farmId: selectedFarmId, from: today, to: today }).catch(() => [] as Occurrence[]),
      listTappingRecords(companyId, { farmId: selectedFarmId, from: today, to: today }).catch(() => [] as TappingRecord[]),
      listAlertEvents(companyId, { farmId: selectedFarmId, limit: 20 }).catch(() => [] as AlertEvent[]),
      listInsights(companyId).catch(() => [] as AiInsight[]),
      listTasks(companyId, { farmId: selectedFarmId }).catch(() => [] as ScheduledTask[]),
    ])
      .then(([occurrences, tapping, alerts, insights, tasks]) => {
        setFarmCheckinsToday(occurrences.filter((o) => o.type === "checkin"));
        setFarmTappingToday(tapping);
        setFarmAlerts(alerts);
        setFarmInsights(insights.filter((i) => i.farmId === selectedFarmId));
        setFarmTasks(tasks);
      })
      .finally(() => setFarmDetailLoading(false));
  }, [selectedFarmId, me]);

  // Histórico da fazenda selecionada — reage ao intervalo de datas escolhido na aba.
  useEffect(() => {
    const companyId = me?.assignments.find((a) => a.farm.id === selectedFarmId)?.farm.companyId
      || me?.companies?.[0]?.id;
    if (!selectedFarmId || !companyId) return;
    setHistoryLoading(true);
    Promise.all([
      listConsultations(companyId, { farmId: selectedFarmId, from: historyFrom, to: historyTo }).catch(() => [] as ConsultationForm[]),
      listHistory(companyId, { farmId: selectedFarmId, from: historyFrom, to: historyTo, limit: 50 }).catch(() => [] as HistoryEvent[]),
    ])
      .then(([visits, history]) => {
        setHistoryVisits(visits);
        setHistoryEvents(history);
      })
      .finally(() => setHistoryLoading(false));
  }, [selectedFarmId, historyFrom, historyTo, me]);

  const agendaRange = useMemo(() => {
    const today = getLocalIsoDate();
    if (agendaPeriod === "hoje") return { from: today, to: today };
    const days = agendaPeriod === "semana" ? 7 : 30;
    return { from: today, to: getLocalIsoDate(new Date(Date.now() + days * 86400000)) };
  }, [agendaPeriod]);

  // Agenda sem fazenda selecionada — junta as tarefas de todas as fazendas do consultor.
  useEffect(() => {
    const companyId = me?.companies?.[0]?.id;
    const farms = me?.assignments ?? [];
    if (tab !== "agenda" || selectedFarmId || !companyId || farms.length === 0) return;
    setAllFarmsTasksLoading(true);
    Promise.all(
      farms.map((a) =>
        listTasks(companyId, { farmId: a.farm.id, from: agendaRange.from, to: agendaRange.to }).catch(() => [] as ScheduledTask[]),
      ),
    )
      .then((lists) => setAllFarmsTasks(lists.flat()))
      .finally(() => setAllFarmsTasksLoading(false));
  }, [tab, selectedFarmId, agendaRange.from, agendaRange.to, me]);

  // Ficha do colaborador — avaliações + atividade recente (sangria/check-in), casada pelo nome.
  useEffect(() => {
    if (!selectedMember) return;
    const companyId = selectedMember.companyId;
    const since = getLocalIsoDate(new Date(Date.now() - 30 * 86400000));
    const today = getLocalIsoDate();
    const name = (selectedMember.user?.fullName ?? "").trim().toLowerCase();
    setMemberLoading(true);
    Promise.all([
      listPersonEvaluations(selectedMember.userId, companyId).catch(() => [] as PersonEvaluation[]),
      listTappingRecords(companyId, { farmId: selectedMember.farmId, from: since, to: today }).catch(() => [] as TappingRecord[]),
      listOccurrences(companyId, { farmId: selectedMember.farmId, from: since, to: today }).catch(() => [] as Occurrence[]),
    ])
      .then(([evals, tapping, occurrences]) => {
        setMemberEvaluations(evals);
        const tappingActivity = name
          ? tapping
              .filter((r) => (r.sangradorName ?? "").trim().toLowerCase() === name)
              .map((r) => ({ id: `tap-${r.id}`, date: r.date, label: `Sangria lançada${r.liters != null ? ` · ${r.liters} L` : ""}` }))
          : [];
        const checkinActivity = name
          ? occurrences
              .filter((o) => o.type === "checkin" && (o.responsible ?? "").trim().toLowerCase() === name)
              .map((o) => ({ id: `chk-${o.id}`, date: o.date, label: "Check-in na fazenda" }))
          : [];
        setMemberActivity([...tappingActivity, ...checkinActivity].sort((a, b) => b.date.localeCompare(a.date)));
      })
      .finally(() => setMemberLoading(false));
  }, [selectedMember]);

  const farmVisit = (fId?: string) => visitStatus?.farms.find((f) => f.farmId === fId);
  const overdueFarms = visitStatus?.farms.filter((f) => f.overdue) ?? [];
  const farmVisitTasks = useMemo(() => farmTasks.filter((t) => t.category === "visita"), [farmTasks]);
  const selectedFarm = me?.assignments.find((a) => a.farm.id === selectedFarmId)?.farm ?? null;
  const farmStat = dashboard?.farmStats.find((f) => f.farmId === selectedFarmId) ?? null;

  async function submitJustification() {
    const companyId = me?.companies?.[0]?.id;
    if (!justifyingFarmId || !companyId) return;
    if (justifyReason.trim().length < 3) { toast.error("Descreva o motivo da falta de visita"); return; }
    setJustifying(true);
    try {
      await justifyMissedVisit({ companyId, farmId: justifyingFarmId, reason: justifyReason.trim() });
      toast.success("Justificativa registrada");
      setJustifyingFarmId(null);
      setJustifyReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar justificativa");
    } finally {
      setJustifying(false);
    }
  }

  const handleNewCheckin = async (fId?: string, pId?: string, taskId?: string) => {
    setGpsStatus("getting");
    const loc = await captureLocation();
    if (!loc) {
      toast.error("GPS não detectado");
      setGpsStatus("error");
      return;
    }

    setCoords({ lat: loc.latitude, lng: loc.longitude });
    setGpsStatus("active");

    const companyId = me?.assignments.find((a) => a.farm.id === (fId || farmId))?.farm.companyId
      || me?.companies?.[0]?.id || "";
    try {
      await submitCheckin({
        companyId,
        farmId: fId || farmId || undefined,
        plotId: pId || plotId || undefined,
        taskId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyM: loc.accuracyM
      });

      const stamp = { farmId: fId || farmId || undefined, plotId: pId || plotId || undefined, at: Date.now() };
      sessionStorage.setItem("vertex.field.checkin.v1", JSON.stringify(stamp));
      setActiveCheckin(stamp);

      const farmName = me?.assignments.find(a => a.farm.id === (fId || farmId))?.farm.name;
      toast.success(`Check-in realizado em ${farmName || 'Fazenda'}`);
    } catch (e) {
      toast.error("Erro ao registrar check-in");
    }
  };

  async function scheduleVisit() {
    const companyId = me?.assignments.find((a) => a.farm.id === selectedFarmId)?.farm.companyId
      || me?.companies?.[0]?.id;
    if (!selectedFarmId || !companyId) { toast.error("Selecione uma fazenda"); return; }
    if (!scheduleDate) { toast.error("Escolha a data da visita"); return; }
    setScheduling(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime || "09:00"}:00`).toISOString();
      await createTask(companyId, {
        farmId: selectedFarmId,
        title: "Visita técnica",
        category: "visita",
        priority: "media",
        status: "planejada",
        scheduledAt,
        responsible: me?.user.fullName ?? undefined,
      });
      toast.success("Visita agendada");
      setScheduleDate("");
      const tasks = await listTasks(companyId, { farmId: selectedFarmId }).catch(() => [] as ScheduledTask[]);
      setFarmTasks(tasks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao agendar visita");
    } finally {
      setScheduling(false);
    }
  }

  async function startVisitWithCheckin() {
    if (!selectedFarmId) return;
    if (activeCheckin?.farmId !== selectedFarmId) {
      const today = getLocalIsoDate();
      const todaysTask = farmVisitTasks.find(
        (t) => t.scheduledAt.slice(0, 10) === today && t.status !== "concluida" && t.status !== "cancelada",
      );
      await handleNewCheckin(selectedFarmId, undefined, todaysTask?.id);
    }
    setFarmId(selectedFarmId);
    setMode("visit");
  }

  function pickFarm(fId: string | null) {
    setSelectedFarmId(fId);
    setFarmSwitcherOpen(false);
  }

  function openMember(m: TeamAssignment) {
    setSelectedMember(m);
    setShowEvalForm(false);
  }

  function closeMember(open: boolean) {
    if (!open) {
      setSelectedMember(null);
      setShowEvalForm(false);
    }
  }

  async function saveEvaluation() {
    if (!selectedMember) return;
    setEvalSaving(true);
    try {
      const res = await submitEvaluation({
        targetUserId: selectedMember.userId,
        companyId: selectedMember.companyId,
        ratedAt: getLocalIsoString(),
        rating: evalRating,
        category: evalCategory,
        title: evalTitle.trim() || undefined,
        notes: evalNotes.trim() || undefined,
      });
      toast.success(res.queued ? "Avaliação salva (offline)" : "Avaliação registrada");
      setShowEvalForm(false);
      setEvalTitle("");
      setEvalNotes("");
      setEvalRating(4);
      setEvalCategory("sangria");
      const evals = await listPersonEvaluations(selectedMember.userId, selectedMember.companyId).catch(() => [] as PersonEvaluation[]);
      setMemberEvaluations(evals);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar avaliação");
    } finally {
      setEvalSaving(false);
    }
  }

  const stats = useMemo(() => {
    if (!me) return null;
    return {
      totalFarms: me.assignments?.length || 0,
      monitors: dashboard?.totalMonitors ?? 0,
      avgQuality: dashboard?.avgQuality ?? null,
    };
  }, [me, dashboard]);

  const handleSubmit = async () => {
    if (!farmId) {
      toast.error("Selecione uma fazenda");
      return;
    }

    const companyId = me?.assignments.find((a) => a.farm.id === farmId)?.farm.companyId || me?.companies?.[0]?.id || "";
    if (!companyId) {
      toast.error("Não foi possível identificar a empresa desta fazenda");
      return;
    }
    setLoading(true);
    try {
      const res = await submitConsultation({
        companyId,
        farmId: farmId || activeCheckin?.farmId || "",
        plotId: activeCheckin?.plotId || undefined,
        consultantId: consultantId || me?.user.id || "",
        conductedAt: new Date().toISOString(),
        recommendations,
        sanitaryState,
        tappingQuality,
        notes,
        sanitaryInspector,
        isThirdPartyInspector,
      });

      toast.success(res.queued ? "Ficha salva offline!" : "Consultoria registrada com sucesso!");
      setMode("tabs");
      setTab("painel");
      if (companyId) getVisitStatus(companyId).then(setVisitStatus).catch(() => undefined);
    } catch (error) {
      toast.error("Erro ao salvar ficha");
    } finally {
      setLoading(false);
    }
  };

  if (!me) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  const FarmSwitcherBar = () => {
    if (!selectedFarm) return null;
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{selectedFarm.name}</p>
            <p className="text-[10px] text-muted-foreground">Fazenda selecionada</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            title="Ver ficha da fazenda"
            onClick={() => navigate({ to: "/campo/fazenda/$id", params: { id: selectedFarm.id } })}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFarmSwitcherOpen(true)}>Trocar</Button>
        </div>
      </div>
    );
  };

  const FarmPickerList = () => (
    <div className="space-y-3">
      {(me.assignments || []).map((a) => (
        <button
          key={a.id}
          onClick={() => setSelectedFarmId(a.farm.id)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">{a.farm.name}</div>
              <div className={`flex items-center gap-2 text-[10px] ${farmVisit(a.farm.id)?.overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                <Calendar className="h-3 w-3" />
                {(() => {
                  const v = farmVisit(a.farm.id);
                  if (!v) return "—";
                  return v.lastVisitAt ? `Visitada há ${v.daysSinceVisit}d${v.overdue ? " · atrasada" : ""}` : "Nunca visitada";
                })()}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );

  const renderPainel = () => {
    if (!selectedFarmId || !selectedFarm) {
      return (
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Olá, {me.user.fullName?.split(" ")[0]}</h1>
              <p className="text-sm text-muted-foreground">Painel do Consultor</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </header>

          {overdueFarms.length > 0 && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-destructive">
                <ShieldCheck className="h-4 w-4" />
                {overdueFarms.length} fazenda(s) com visita atrasada
              </div>
              <div className="space-y-2">
                {overdueFarms.map((f) => (
                  <div key={f.farmId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {f.farmName} — {f.lastVisitAt ? `há ${f.daysSinceVisit}d` : "nunca visitada"}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setSelectedFarmId(f.farmId)}>
                        Visitar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setJustifyingFarmId(f.farmId)}>
                        Justificar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {justifyingFarmId && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-semibold">
                Justificar falta de visita — {visitStatus?.farms.find((f) => f.farmId === justifyingFarmId)?.farmName}
              </p>
              <Textarea
                className="rounded-xl border-border bg-background"
                placeholder="Explique o motivo pelo qual a visita não foi realizada..."
                value={justifyReason}
                onChange={(e) => setJustifyReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setJustifyingFarmId(null); setJustifyReason(""); }}>Cancelar</Button>
                <Button size="sm" onClick={submitJustification} disabled={justifying}>
                  {justifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar justificativa
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Fazendas sob gestão</div>
              <div className="text-2xl font-bold">{stats?.totalFarms}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Qualidade Média</div>
              <div className="text-2xl font-bold text-primary">{stats?.avgQuality ?? "—"}</div>
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Minhas fazendas — selecione uma para começar
            </h2>
            <FarmPickerList />
          </section>
        </div>
      );
    }

    const isCheckedInHere = activeCheckin?.farmId === selectedFarm.id;
    const v = farmVisit(selectedFarm.id);
    const farmTeam = team.filter((m) => m.farmId === selectedFarm.id);
    const tappingTotals = farmTappingToday.reduce(
      (acc, r) => { acc.liters += r.liters ?? 0; acc.dryKg += r.dryKg ?? 0; return acc; },
      { liters: 0, dryKg: 0 },
    );

    return (
      <div className="space-y-6 pb-24">
        <FarmSwitcherBar />

        <header>
          {isCheckedInHere ? (
            <p className="flex items-center gap-1 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" /> Check-in ativo nesta fazenda
            </p>
          ) : (
            <p className={`text-sm ${v?.overdue ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
              {v?.lastVisitAt ? `Última visita há ${v.daysSinceVisit} dia(s)` : "Nunca visitada"}
              {v?.overdue ? " · atrasada" : ""}
            </p>
          )}
        </header>

        {farmDetailLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Users className="h-4 w-4" />
                <h2 className="text-sm">Hoje na fazenda</h2>
              </div>
              {farmCheckinsToday.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ninguém fez check-in nesta fazenda hoje.</p>
              ) : (
                <ul className="space-y-1">
                  {farmCheckinsToday.map((o) => (
                    <li key={o.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      {o.title}
                      {o.resolvedAt && (
                        <span>· {new Date(o.resolvedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {farmTeam.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Equipe vinculada</p>
                  <div className="flex flex-wrap gap-1.5">
                    {farmTeam.map((m) => (
                      <span key={m.id} className="rounded-full bg-secondary px-2 py-1 text-[10px] font-medium">
                        {m.user?.fullName || m.user?.email || "Sem nome"} · {m.role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Droplets className="h-4 w-4" />
                <h2 className="text-sm">Sangrias de hoje</h2>
              </div>
              {farmTappingToday.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma sangria lançada hoje ainda.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-secondary/40 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Litros</div>
                      <div className="text-lg font-bold">{tappingTotals.liters.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-2">
                      <div className="text-[10px] uppercase text-muted-foreground">Kg seco</div>
                      <div className="text-lg font-bold">{tappingTotals.dryKg.toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {farmTappingToday.map((r) => (
                      <li key={r.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.sangradorName}</span>
                        <span>{r.liters ?? "—"} L</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <AlertTriangle className="h-4 w-4" />
                <h2 className="text-sm">Alertas da fazenda</h2>
              </div>
              {farmAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem alertas nesta fazenda.</p>
              ) : (
                <ul className="space-y-2">
                  {farmAlerts.map((a) => (
                    <li
                      key={a.id}
                      className={`rounded-xl border p-2 text-xs ${
                        a.level === "warning" ? "border-warning/40 bg-warning/10" : "border-border/60 bg-background/40"
                      }`}
                    >
                      <p className="font-semibold">{a.title}</p>
                      {a.message && <p className="text-muted-foreground">{a.message}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-sm">Insights da IA</h2>
              </div>
              {farmInsights.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem insights gerados para esta fazenda ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {farmInsights.map((i) => (
                    <li key={i.id} className="rounded-xl border border-border/60 bg-background p-2 text-xs">
                      <p className="font-semibold">{i.title}</p>
                      {i.summary && <p className="text-muted-foreground">{i.summary}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Button className="h-14 w-full rounded-2xl text-base font-bold" onClick={startVisitWithCheckin}>
              <ClipboardCheck className="mr-2 h-5 w-5" />
              {isCheckedInHere ? "Continuar visita" : "Fazer check-in e iniciar visita"}
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderAgenda = () => {
    const periodTabs = (
      <div className="flex gap-2">
        {([
          { value: "hoje", label: "Hoje" },
          { value: "semana", label: "Semana" },
          { value: "mes", label: "Mês" },
        ] as const).map((p) => (
          <button
            key={p.value}
            onClick={() => setAgendaPeriod(p.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              agendaPeriod === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-background text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    );

    const taskItem = (t: ScheduledTask, farmName?: string | null) => (
      <li key={t.id} className="rounded-xl border border-border/60 bg-background p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{t.title}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase">
            {t.status}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-muted-foreground">
          <span>
            {TASK_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
            {farmName ? ` · ${farmName}` : ""}
          </span>
          <span>
            {new Date(t.scheduledAt).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      </li>
    );

    if (!selectedFarmId || !selectedFarm) {
      const sorted = [...allFarmsTasks].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      return (
        <div className="space-y-6">
          <h1 className="text-xl font-bold">Agenda — todas as fazendas</h1>
          {periodTabs}

          <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <CalendarClock className="h-4 w-4" />
              <h2 className="text-sm">Tarefas e visitas agendadas</h2>
            </div>
            {allFarmsTasksLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa agendada nesse período.</p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((t) => taskItem(t, me.assignments.find((a) => a.farm.id === t.farmId)?.farm.name))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Selecione uma fazenda para agendar uma visita
            </h2>
            <FarmPickerList />
          </section>
        </div>
      );
    }

    const sortedTasks = [...farmTasks]
      .filter((t) => t.scheduledAt.slice(0, 10) >= agendaRange.from && t.scheduledAt.slice(0, 10) <= agendaRange.to)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    return (
      <div className="space-y-6 pb-10">
        <FarmSwitcherBar />
        <h1 className="text-xl font-bold">Agenda</h1>
        {periodTabs}

        {farmDetailLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <CalendarClock className="h-4 w-4" />
                <h2 className="text-sm">Tarefas e visitas agendadas</h2>
              </div>
              {sortedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa agendada para esse período nesta fazenda.</p>
              ) : (
                <ul className="space-y-2">{sortedTasks.map((t) => taskItem(t))}</ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Calendar className="h-4 w-4" />
                <h2 className="text-sm">Agendar visita técnica</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="flex-1 rounded-xl border border-border/60 bg-background px-2 py-2 text-xs"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <input
                  type="time"
                  className="w-24 rounded-xl border border-border/60 bg-background px-2 py-2 text-xs"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
                <Button size="sm" onClick={scheduleVisit} disabled={scheduling}>
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agendar"}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    );
  };

  const renderHistorico = () => {
    if (!selectedFarmId || !selectedFarm) {
      return (
        <div className="space-y-6">
          <h1 className="text-xl font-bold">Histórico</h1>
          <p className="text-sm text-muted-foreground">Selecione uma fazenda para ver o histórico.</p>
          <FarmPickerList />
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24">
        <FarmSwitcherBar />
        <h1 className="text-xl font-bold">Histórico</h1>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="flex-1 rounded-xl border border-border/60 bg-background px-2 py-2 text-xs"
            value={historyFrom}
            onChange={(e) => setHistoryFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            className="flex-1 rounded-xl border border-border/60 bg-background px-2 py-2 text-xs"
            value={historyTo}
            onChange={(e) => setHistoryTo(e.target.value)}
          />
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <ClipboardCheck className="h-4 w-4" />
                <h2 className="text-sm">Visitas realizadas</h2>
              </div>
              {historyVisits.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma visita registrada nesse período.</p>
              ) : (
                <ul className="space-y-2">
                  {historyVisits.map((v) => (
                    <li key={v.id} className="rounded-xl border border-border/60 bg-background p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {new Date(v.conductedAt).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-muted-foreground">Nota {v.tappingQuality}/5 · {v.sanitaryState}</span>
                      </div>
                      {v.recommendations && <p className="mt-1 text-muted-foreground">{v.recommendations}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <History className="h-4 w-4" />
                <h2 className="text-sm">Linha do tempo</h2>
              </div>
              {historyEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem eventos nesse período.</p>
              ) : (
                <ul className="space-y-1.5">
                  {historyEvents.map((h) => (
                    <li key={h.id} className="text-xs">
                      <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString("pt-BR")}</span>
                      {" — "}
                      <span className="font-medium">{h.title}</span>
                      {h.subtitle && <span className="text-muted-foreground"> · {h.subtitle}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    );
  };

  const renderKpis = () => {
    if (!selectedFarmId || !selectedFarm) {
      return (
        <div className="space-y-6">
          <h1 className="text-xl font-bold">Indicadores (KPIs)</h1>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Qualidade Global</h3>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="mb-1 text-4xl font-black text-primary">{dashboard?.avgQuality ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Média das visitas técnicas dos últimos 90 dias</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Produtividade Estimada</h3>
                <Droplets className="h-4 w-4 text-primary" />
              </div>
              <div className="mb-1 text-3xl font-bold">
                {dashboard?.productivityKgHa ?? "—"} <span className="text-sm font-normal text-muted-foreground">kg/ha</span>
              </div>
              <p className="text-xs text-muted-foreground">Kg secos entregues nos últimos 30 dias / área total das fazendas</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <h3 className="mb-4 text-xs font-bold uppercase text-muted-foreground">Top fazendas (qualidade da visita)</h3>
              {!dashboard?.topFarms.length ? (
                <p className="text-sm text-muted-foreground">Sem visitas com nota registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.topFarms.map((f) => (
                    <button
                      key={f.farmId}
                      onClick={() => setSelectedFarmId(f.farmId)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="text-sm font-medium">{f.farmName}</div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary" style={{ width: `${((f.avgQuality ?? 0) / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold">{f.avgQuality?.toFixed(1)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-24">
        <FarmSwitcherBar />
        <h1 className="text-xl font-bold">Indicadores (KPIs)</h1>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Qualidade média</div>
            <div className="text-2xl font-bold text-primary">{farmStat?.avgQuality ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Produtividade</div>
            <div className="text-2xl font-bold">
              {farmStat?.productivityKgHa ?? "—"} <span className="text-xs font-normal text-muted-foreground">kg/ha</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Produção (últimos 30 dias)</div>
          <div className="text-2xl font-bold">{farmStat?.totalDryKg ?? "—"} <span className="text-sm font-normal text-muted-foreground">kg seco</span></div>
        </div>

        <p className="text-xs text-muted-foreground">
          Qualidade calculada sobre as visitas técnicas dos últimos 90 dias; produtividade e produção sobre as entregas dos últimos 30 dias.
        </p>
      </div>
    );
  };

  const renderEquipe = () => {
    const q = teamSearch.trim().toLowerCase();
    const scopedTeam = selectedFarmId ? team.filter((m) => m.farmId === selectedFarmId) : team;
    const filtered = scopedTeam.filter((m) => {
      if (!q) return true;
      return (m.user?.fullName ?? "").toLowerCase().includes(q) || (m.user?.email ?? "").toLowerCase().includes(q);
    });
    const monitors = filtered.filter((m) => m.role === "monitor");
    const sangradores = filtered.filter((m) => m.role === "sangrador");
    const operadores = filtered.filter((m) => m.role === "operador");

    return (
      <div className="space-y-6 pb-24">
        <FarmSwitcherBar />
        <h1 className="text-xl font-bold">Equipe</h1>

        <section className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-sm font-semibold">Cadastrar colaborador</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate({ to: "/campo/sangrador" })}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/40 p-3 text-center transition hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="text-lg">🧑‍🌾</span>
              <span className="text-[10px] font-medium">Sangrador</span>
            </button>
            <button
              onClick={() => navigate({ to: "/campo/monitor-pre-cadastro" })}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/40 p-3 text-center transition hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="text-lg">🧑‍💼</span>
              <span className="text-[10px] font-medium">Monitor</span>
            </button>
            <button
              onClick={() => navigate({ to: "/campo/operador-pre-cadastro" })}
              className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-background/40 p-3 text-center transition hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="text-lg">🚜</span>
              <span className="text-[10px] font-medium">Operador</span>
            </button>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            className="w-full rounded-xl border border-border/60 bg-card py-3 pl-10 pr-4 text-sm"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
          />
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <TeamGroup title="Monitores" members={monitors} onSelect={openMember} />
            <TeamGroup title="Sangradores" members={sangradores} onSelect={openMember} />
            <TeamGroup title="Operadores" members={operadores} onSelect={openMember} />
            {scopedTeam.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {selectedFarmId ? "Nenhum colaborador vinculado a esta fazenda." : "Nenhum colaborador vinculado às suas fazendas."}
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  const renderVisitForm = () => (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMode("tabs")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nova Visita Técnica</h1>
      </header>

      <div className="space-y-4">
        {/* Seleção de Fazenda */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Fazenda Visitada</label>
          <select
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-card px-3 py-3 text-foreground"
          >
            <option value="">Selecione a fazenda...</option>
            {(me.assignments || []).map((a) => (
              <option key={a.farm.id} value={a.farm.id}>{a.farm.name}</option>
            ))}
          </select>
        </div>

        {/* Seleção de Consultor (Vínculo ou Novo) */}
        {farmId && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <label className="text-sm font-medium">Consultor / Responsável</label>
            <Select
              value={consultantId || me.user.id}
              onValueChange={(v: string) => setConsultantId(v === me.user.id ? "" : v)}
            >
              <SelectTrigger className="w-full rounded-xl h-12 bg-card border-border/60">
                <SelectValue placeholder="Selecione o consultor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={me.user.id}>{me.user.fullName} (Você)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground px-1 italic">
              Se o consultor atual não puder comparecer, você pode registrar a visita em nome de outro ou adicionar um substituto.
            </p>
          </div>
        )}

        {/* Avaliação Fitossanitária */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Stethoscope className="h-5 w-5" />
            <h2>Estado Fitossanitário</h2>
          </div>

          {activeCheckin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="text-xs">
                  <div className="font-bold text-primary">Localização confirmada</div>
                  <div className="text-muted-foreground">
                    {me.assignments.find(a => a.farm.id === activeCheckin.farmId)?.farm.name}
                    {activeCheckin.plotId && ` · Talhão ${activeCheckin.plotId}`}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[10px] font-bold uppercase text-primary"
                onClick={() => handleNewCheckin(activeCheckin.farmId)}
              >
                Trocar Talhão
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {["Ótimo", "Bom", "Alerta", "Crítico"].map((status) => (
              <button
                key={status}
                onClick={() => setSanitaryState(status)}
                className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                  sanitaryState === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspecionado por</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isThirdParty"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={isThirdPartyInspector}
                  onChange={(e) => setIsThirdPartyInspector(e.target.checked)}
                />
                <label htmlFor="isThirdParty" className="text-xs font-medium cursor-pointer">Terceirizado</label>
              </div>
            </div>
            <Input
              placeholder="Nome do inspetor ou colaborador..."
              value={sanitaryInspector}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSanitaryInspector(e.target.value)}
              className="bg-background border-border rounded-xl"
            />
          </div>
        </section>

        {/* Qualidade da Sangria */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Droplets className="h-5 w-5" />
            <h2>Qualidade da Sangria</h2>
          </div>

          <div className="flex justify-between gap-1">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => setTappingQuality(score)}
                className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-bold transition-all ${
                  tappingQuality === score
                    ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg"
                    : "bg-background border-border"
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase px-1">
            <span>Insatisfatório</span>
            <span>Excelente</span>
          </div>
        </section>

        {/* Recomendações */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <ClipboardCheck className="h-5 w-5" />
            <h2>Recomendações Técnicas</h2>
          </div>
          <Textarea
            placeholder="Descreva as orientações para o produtor/equipe..."
            className="min-h-[120px] bg-background border-border rounded-xl"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </section>

        {/* Fotos e Notas */}
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-5 w-5" />
            <h2>Fotos e Mídia</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Capturar Foto</span>
                <span className="text-[10px] text-muted-foreground uppercase">Georeferenciada</span>
              </div>
            </Button>

            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Gravar Áudio</span>
                <span className="text-[10px] text-muted-foreground uppercase">Relato Técnico</span>
              </div>
            </Button>

            <Button variant="outline" className="h-28 rounded-2xl border-dashed border-2 flex flex-col items-center justify-center gap-2 group active:bg-secondary">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-active:scale-110 transition-transform">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold">Gravar Vídeo</span>
                <span className="text-[10px] text-muted-foreground uppercase">Inspeção Visual</span>
              </div>
            </Button>

            <div className="h-28 rounded-2xl bg-secondary/30 border border-border/40 p-3 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                <ShieldCheck className="h-2.5 w-2.5" /> Marca d'água
              </div>
              <p className="text-[10px] leading-tight text-muted-foreground italic">
                {activeCheckin ? (
                  <>Registrando coords, timestamp e consultor no rodapé da mídia para rastreabilidade total.</>
                ) : (
                  <>Check-in necessário para carimbar dados de localização.</>
                )}
              </p>
            </div>
          </div>

          <Textarea
            placeholder="Notas internas ou lembretes..."
            className="bg-background border-border rounded-xl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <Button
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl flex gap-2"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Salvar Visita Técnica
        </Button>
      </div>
    </div>
  );

  const goTab = (t: Tab) => { setMode("tabs"); setTab(t); };

  return (
    <div className="relative min-h-screen">
      <div className="p-6">
        {mode === "visit" ? (
          renderVisitForm()
        ) : (
          <>
            {tab === "painel" && renderPainel()}
            {tab === "agenda" && renderAgenda()}
            {tab === "historico" && renderHistorico()}
            {tab === "kpis" && renderKpis()}
            {tab === "equipe" && renderEquipe()}
          </>
        )}
      </div>


      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-card/80 px-3 py-3 backdrop-blur-md">
        <NavButton active={mode === "tabs" && tab === "painel"} onClick={() => goTab("painel")} icon={<LayoutDashboard className="h-5 w-5" />} label="Painel" />
        <NavButton active={mode === "tabs" && tab === "agenda"} onClick={() => goTab("agenda")} icon={<CalendarClock className="h-5 w-5" />} label="Agenda" />
        <NavButton active={mode === "tabs" && tab === "historico"} onClick={() => goTab("historico")} icon={<History className="h-5 w-5" />} label="Histórico" />
        <NavButton active={mode === "tabs" && tab === "kpis"} onClick={() => goTab("kpis")} icon={<BarChart3 className="h-5 w-5" />} label="KPIs" />
        <NavButton active={mode === "tabs" && tab === "equipe"} onClick={() => goTab("equipe")} icon={<Users className="h-5 w-5" />} label="Equipe" />
      </nav>

      <Sheet open={farmSwitcherOpen} onOpenChange={setFarmSwitcherOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-border/60 bg-card">
          <SheetHeader>
            <SheetTitle className="text-left">Trocar de fazenda</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2 pb-6">
            <button
              onClick={() => pickFarm(null)}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ver todas as fazendas</span>
            </button>
            {me.assignments.map((a) => (
              <button
                key={a.farm.id}
                onClick={() => pickFarm(a.farm.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  a.farm.id === selectedFarmId
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 bg-background/40 hover:border-primary/60 hover:bg-primary/5"
                }`}
              >
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{a.farm.name}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!selectedMember} onOpenChange={closeMember}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-border/60 bg-card">
          <SheetHeader>
            <SheetTitle className="text-left">
              {selectedMember?.user?.fullName || selectedMember?.user?.email || "Colaborador"}
            </SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-4 space-y-4 pb-6">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2 py-1 font-medium capitalize">{selectedMember.role}</span>
                <span className="rounded-full bg-secondary px-2 py-1 font-medium">{selectedMember.farm?.name ?? "Sem fazenda"}</span>
                {selectedMember.user && (
                  <span className={`rounded-full px-2 py-1 font-medium ${selectedMember.user.active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {selectedMember.user.active ? "Ativo" : "Inativo"}
                  </span>
                )}
              </div>

              {memberLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Avaliações</h3>
                    {memberEvaluations.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
                    ) : (
                      <ul className="space-y-2">
                        {memberEvaluations.map((ev) => (
                          <li key={ev.id} className="rounded-xl border border-border/60 bg-background p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{ev.title || EVAL_CATEGORIES.find((c) => c.value === ev.category)?.label || "Avaliação"}</span>
                              <span className="flex items-center gap-0.5 font-semibold text-primary">
                                {ev.rating}/5 <Star className="h-3 w-3 fill-current" />
                              </span>
                            </div>
                            <p className="mt-0.5 text-muted-foreground">
                              {new Date(ev.ratedAt).toLocaleDateString("pt-BR")}
                              {ev.notes ? ` · ${ev.notes}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Atividade recente (30 dias)</h3>
                    {memberActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem atividade recente registrada.</p>
                    ) : (
                      <ul className="space-y-1">
                        {memberActivity.map((a) => (
                          <li key={a.id} className="text-xs">
                            <span className="text-muted-foreground">{new Date(a.date).toLocaleDateString("pt-BR")}</span> — {a.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {!showEvalForm ? (
                    <Button className="w-full" onClick={() => setShowEvalForm(true)}>Nova avaliação</Button>
                  ) : (
                    <section className="space-y-3 rounded-2xl border border-border/60 bg-background p-3">
                      <div className="flex items-center justify-between gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEvalRating(n)}
                            className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                              n <= evalRating ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background text-muted-foreground"
                            }`}
                          >
                            <Star className={`h-4 w-4 ${n <= evalRating ? "fill-current" : ""}`} />
                          </button>
                        ))}
                        <span className="ml-2 text-sm font-semibold">{evalRating}/5</span>
                      </div>
                      <select
                        value={evalCategory}
                        onChange={(e) => setEvalCategory(e.target.value)}
                        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                      >
                        {EVAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <input
                        placeholder="Título (opcional)"
                        value={evalTitle}
                        onChange={(e) => setEvalTitle(e.target.value)}
                        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                      />
                      <Textarea
                        placeholder="Observações..."
                        rows={3}
                        className="rounded-xl border-border/60 bg-background"
                        value={evalNotes}
                        onChange={(e) => setEvalNotes(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={() => setShowEvalForm(false)}>Cancelar</Button>
                        <Button className="flex-1" onClick={saveEvaluation} disabled={evalSaving}>
                          {evalSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                        </Button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TeamGroup({ title, members, onSelect }: { title: string; members: TeamAssignment[]; onSelect: (m: TeamAssignment) => void }) {
  if (members.length === 0) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{title}</h2>
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left transition active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(m.user?.fullName ?? m.user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-sm">{m.user?.fullName || m.user?.email || "Sem nome"}</div>
              <div className="text-[10px] text-muted-foreground">{m.farm?.name ?? "Sem fazenda"}</div>
            </div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${m.user?.active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            {m.user?.active ? "Ativo" : "Inativo"}
          </div>
        </button>
      ))}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
