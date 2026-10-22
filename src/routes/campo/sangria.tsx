import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2, Repeat, Trees, AlertTriangle, ChevronDown } from "lucide-react";
import {
  getFieldMe, submitTapping, listFieldTappers, listFieldTapperPlots,
  type FieldMe, type FieldTapper, type FieldTapperPlot,
} from "@/lib/field.functions";
import { getTapperRotation, upsertTapperRotation, type TapperRotationState } from "@/lib/tappers.functions";
import { listTappingRecords, updateTappingRecord, listTappingSummary, type TappingRecord, type TappingSummary } from "@/lib/sangrias.functions";
import { TASK_EXTENTS, END_PERIODS, listTappingTasks, isPartialTask, type TappingTask } from "@/lib/sangrias.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { AudioRecorder } from "@/components/vertex/field/audio-recorder";
import { getLocalIsoDate } from "@/lib/date-utils";
import { tappingRecordMoment } from "@/lib/tapping-dates";

export const Route = createFileRoute("/campo/sangria")({ component: SangriaPage });

function SangriaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);

  const [farmId, setFarmId] = useState("");
  const [tapperId, setTapperId] = useState("");
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [plots, setPlots] = useState<FieldTapperPlot[]>([]);
  const [plotId, setPlotId] = useState("");
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tappingTableId, setTappingTableId] = useState("");
  const [rotation, setRotation] = useState<TapperRotationState | null>(null);
  const [rotationAnchorTableId, setRotationAnchorTableId] = useState("");
  const [savingRotation, setSavingRotation] = useState(false);
  const [tasks, setTasks] = useState<TappingTask[]>([]);
  const [taskExtent, setTaskExtent] = useState("");
  // Árvores previstas: vêm do cadastro (treeCount do vínculo tabela/sangrador).
  // O monitor não preenche nada — o valor é sempre o do cadastro.
  const [summary, setSummary] = useState<TappingSummary | null>(null);
  // O resumo do talhão pode ser recolhido — os valores continuam disponíveis.
  const [showSummary, setShowSummary] = useState(false);
  const [savingAuxiliary, setSavingAuxiliary] = useState(false);
  const [endPeriod, setEndPeriod] = useState("");
  const [recordDate, setRecordDate] = useState(() => getLocalIsoDate());
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [dateRecords, setDateRecords] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmDivergence, setConfirmDivergence] = useState(false);
  const [savedRecord, setSavedRecord] = useState<TappingRecord | null>(null);

  // Todas as combinações talhão–tabela do sangrador (ex.: "T10 – A"). Uma
  // tabela pode se repetir em talhões diferentes, então a escolha é sempre o
  // par talhão+tabela — o value carrega os dois ids separados por "|".
  const combos = useMemo(
    () => plots.flatMap((p) => p.tables.map((t) => ({ plot: p, table: t, value: `${p.id}|${t.tappingTableId}` }))),
    [plots],
  );
  // Tabelas do talhão escolhido: só as vinculadas a ele (com a quantidade
  // de árvores de cada uma, já cadastrada).
  const plot = plots.find((p) => p.id === plotId);
  const tables = useMemo(() => plot?.tables ?? [], [plot]);
  // A sequência é por talhão: a tabela sugerida sempre está entre as tabelas
  // do talhão escolhido.
  const expectedTable = rotation?.suggestedTableId ? tables.find((t) => t.tappingTableId === rotation.suggestedTableId) : undefined;
  const selectedTable = tables.find((t) => t.tappingTableId === tappingTableId);
  const isDivergent = Boolean(rotation?.suggestedTableId && tappingTableId && rotation.suggestedTableId !== tappingTableId);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const tapper = tappers.find((t) => t.id === tapperId);
  // Parcela do resumo que pertence ao sangrador escolhido (id do vínculo ou
  // "rh:<userId>", ou o nome, quando o id não bate).
  const myTapperSummary = useMemo(() => {
    if (!summary) return null;
    if (!tapperId) return null;
    const exact = summary.tappers.find((t) => t.id === tapperId);
    if (exact) return exact;
    const byName = summary.tappers.find((t) => t.name && t.name === tapper?.fullName);
    return byName ?? null;
  }, [summary, tapperId, tapper?.fullName]);
  const table = selectedTable;
  // Uma escolha define os dois: o value traz "plotId|tableId".
  function selectCombo(value: string) {
    const [nextPlotId, nextTableId] = value.split("|");
    setPlotId(nextPlotId ?? "");
    setTappingTableId(nextTableId ?? "");
  }

  useEffect(() => {
    setTapperId(""); setTappingTableId(""); setPlotId("");
    setTappers([]);
    if (!farm) return;
    listFieldTappers(farm.companyId, farm.id)
      .then((nextTappers) => {
        setTappers(nextTappers);
        setTapperId(nextTappers.length === 1 ? nextTappers[0].id : "");
      })
      .catch(() => undefined);
  }, [farm]);

  // Talhões do sangrador nesta fazenda, com as tabelas e as quantidades já
  // cadastradas. É a fonte da quantidade prevista — não há cálculo.
  useEffect(() => {
    setPlots([]); setPlotId(""); setTappingTableId(""); setRotation(null); setTablesError(null);
    if (!farm || !tapperId) return;
    setTablesLoading(true);
    listFieldTapperPlots(farm.companyId, tapperId, farm.id)
      .then((assigned) => {
        setPlots(assigned);
        // Com uma única combinação talhão–tabela não há o que escolher: já
        // define os dois direto, para exibir a sequência do dia e a previsão.
        const only = assigned.length === 1 ? assigned[0] : null;
        if (only && only.tables.length === 1) {
          setPlotId(only.id);
          setTappingTableId(only.tables[0].tappingTableId);
        }
      })
      .catch((error) => {
        // Sem isto, qualquer falha de rede ou erro do servidor virava "nenhuma
        // tabela vinculada" — mandava o monitor caçar no admin um vínculo que
        // estava correto. Registra o motivo para o log e distingue os dois casos.
        console.error("[sangria] falha ao carregar talhões do sangrador", tapperId, error);
        setPlots([]);
        setTablesError(error instanceof Error ? error.message : String(error?.message ?? error));
      })
      .finally(() => setTablesLoading(false));
  }, [farm, tapperId]);

  // Sequência de tabelas do talhão escolhido. Só faz sentido com o talhão
  // definido — enquanto o sangrador tiver mais de um talhão, não há sequência
  // única a sugerir.
  useEffect(() => {
    setRotation(null);
    if (!farm || !tapperId || !plotId) return;
    getTapperRotation(farm.companyId, tapperId, plotId)
      .then((rot) => {
        setRotation(rot);
        setRotationAnchorTableId(rot?.rotation?.anchorTableId ?? "");
        // A sequência de hoje pré-seleciona a tabela sugerida do talhão.
        if (rot && !rot.needsReset && rot.suggestedTableId) {
          setTappingTableId((current) => current || rot.suggestedTableId!);
        }
      })
      .catch(() => setRotation(null));
  }, [farm, tapperId, plotId]);

  // Relatório do talhão: árvores do talhão, da fazenda, do sangrador e o que
  // já foi realizado.
  useEffect(() => {
    setSummary(null);
    if (!farm || !plotId) return;
    listTappingSummary({ companyId: farm.companyId, farmId: farm.id, plotId })
      .then((rows) => setSummary(rows[0] ?? null))
      .catch(() => setSummary(null));
  }, [farm, plotId]);

  useEffect(() => {
    if (!farm || !recordDate) { setDateRecords([]); return; }
    listTappingRecords(farm.companyId, { farmId: farm.id, from: recordDate, to: recordDate })
      .then((records) => setDateRecords(records.filter((r) => r.plotId === plotId && r.taskExtent === taskExtent)))
      .catch(() => setDateRecords([]));
  }, [farm, plotId, taskExtent, recordDate]);

  useEffect(() => {
    if (!farm || !plotId || !tappingTableId || !taskExtent || !recordDate) { setExistingRecords([]); return; }
    listTappingRecords(farm.companyId, { farmId: farm.id, plotId, from: recordDate, to: recordDate })
      .then((records) => setExistingRecords(records.filter((r) => r.tapperId === (tapperId.startsWith("rh:") ? null : tapperId) && r.tappingTableId === tappingTableId && r.taskExtent === taskExtent)))
      .catch(() => setExistingRecords([]));
  }, [farm, plotId, tappingTableId, taskExtent, recordDate, tapperId]);

  useEffect(() => {
    if (!farm) return;
    listTappingTasks(farm.companyId)
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [farm]);

  async function resetRotation() {
    if (!farm || !tapperId || !plotId || !rotationAnchorTableId) return;
    setSavingRotation(true);
    try {
      await upsertTapperRotation({ companyId: farm.companyId, tapperKey: tapperId, plotId, anchorTableId: rotationAnchorTableId, anchorDate: recordDate });
      const nextRotation = await getTapperRotation(farm.companyId, tapperId, plotId);
      setRotation(nextRotation);
      setTappingTableId(nextRotation.suggestedTableId ?? rotationAnchorTableId);
      toast.success("Sequência de tabelas atualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível atualizar a sequência");
    } finally {
      setSavingRotation(false);
    }
  }

  async function onPhoto(f: File | null) {
    if (!f) return;
    setUploadingPhoto(true);
    try { const r = await uploadFile(f); setPhotoUrls((c) => [...c, r.url]); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload da foto"); }
    finally { setUploadingPhoto(false); }
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function save() {
    if (!farm || !tapper) { toast.error("Preencha fazenda e sangrador"); return; }
    if (!plotId || !tappingTableId) { toast.error("Selecione o talhão e a tabela"); return; }
    if (!taskExtent) { toast.error("Selecione uma tarefa"); return; }
    // A quantidade prevista é sempre a que está cadastrada na tabela para
    // este sangrador — o monitor não preenche nada. A tarefa define a fração:
    // completa = todas as árvores da tabela; meia tabela e adiantamento = metade.
    const registered = table?.treeCount ?? null;
    if (registered == null) {
      toast.error("Esta tabela não tem quantidade de árvores cadastrada. Peça ao administrador para cadastrar antes de registrar a sangria.");
      return;
    }
    const treesExpected = isPartialTask(taskExtent) ? Math.floor(registered / 2) : registered;
    if (isDivergent && !confirmDivergence) {
      toast.warning(`A tabela selecionada (${selectedTable?.name ?? "—"}) é diferente da tabela do dia (${expectedTable?.name ?? "—"}). Confirme para continuar.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyId: farm.companyId, farmId: farm.id, plotId,
        tappingTableId: tappingTableId || undefined,
        // Data civil (YYYY-MM-DD) no fuso de Brasília. O backend grava o campo
        // `date` como @db.Date: mandar o ISO completo do aparelho fazia o registro
        // cair no dia seguinte quando o instante local ainda não tinha virado o dia
        // em UTC. O horário real vai na descrição, que é onde ele pertence.
        date: editingId ? recordDate : getLocalIsoDate(),
        // Instante real de gravação, para a linha de confirmação mostrar hora junto
        // com a data. Dia civil (que é o que vai para `date`) não tem hora real.
        ...(editingId ? {} : { recordedAt: new Date().toISOString() }),
        sangradorName: tapper.fullName,
        // Sangradores vinculados só pelo RH (sem ficha Tapper legada) vêm com um
        // id sintético "rh:<userId>" — não é uma linha real de Tapper, então
        // não pode ser enviado como tapperId (chave estrangeira).
        tapperId: tapper.id.startsWith("rh:") ? undefined : tapper.id,
        taskExtent,
        endPeriod: endPeriod || undefined,
        treesExpected,
        notes: notes.trim() || undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        audioUrl: audioUrl || undefined,
      } as any;
      if (editingId) {
        const record = await updateTappingRecord(editingId, payload);
        setSavedRecord(record);
      } else {
        const result = await submitTapping(payload);
        if (result.queued) {
          setEditingId(null);
          setAllowDuplicate(false);
          toast.warning("Sangria guardada na fila do aparelho; ainda não há confirmação do servidor.");
          nav({ to: "/campo" });
          return;
        }
        setSavedRecord(result.data);
      }
      setEditingId(null);
      setAllowDuplicate(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar a sangria");
    } finally {
      setSaving(false);
    }
  }

  // Mesmo ponto de formatação do histórico e da lista de sangrias: o instante
  // real vem de `recordedAt`; sem ele, o dia civil é re-ancorado em 15:00 UTC
  // para não virar o dia anterior às 21:00. O fuso é o da fazenda, como no
  // resto do app — a linha de confirmação precisa bater com o que o monitor
  // verá no histórico.
  const savedDateLabel = savedRecord
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: farm?.timezone ?? "America/Sao_Paulo",
        dateStyle: "short",
        ...(savedRecord.recordedAt ? { timeStyle: "medium" as const } : {}),
      }).format(tappingRecordMoment(savedRecord))
    : "—";

  return (
    <>
    <div>
      <StepHeader title={editingId ? "Corrigir sangria" : "Registrar sangria"} step={1} steps={["Sangria"]} onBack={() => nav({ to: "/campo" })} />

      <FieldCard className="space-y-4">
        <Field label="Data da sangria">
          <input type="date" className="flex h-11 w-full rounded-xl border border-border/60 bg-background/40 px-3 text-sm" value={recordDate} max={getLocalIsoDate()} onChange={(e) => { setRecordDate(e.target.value); setAllowDuplicate(false); setEditingId(null); }} />
          {recordDate < getLocalIsoDate() && <p className="mt-1 text-xs text-warning">Lançamento fora da data da sangria.</p>}
        </Field>
        {me.assignments.length > 1 ? (
          <Field label="Fazenda">
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : (
          <Field label="Fazenda">
            <div className="flex h-11 items-center rounded-xl border border-border/60 bg-background/40 px-3 text-sm font-medium">
              {farm?.name ?? "—"}
            </div>
          </Field>
        )}
        <Field label="Sangrador (Quem realizou a sangria)">
          {tappers.length === 1 && tapper ? (
            <div className="flex h-11 items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium">{tapper.fullName}</div>
          ) : (
            <Select value={tapperId} onValueChange={setTapperId}>
              <SelectTrigger className="h-11 rounded-xl border-primary/50 bg-primary/5"><SelectValue placeholder={tappers.length ? "Selecione o sangrador" : "Nenhum sangrador vinculado a esta fazenda"} /></SelectTrigger>
              <SelectContent>{tappers.map((t) => { const done = dateRecords.some((r) => (r.tapperId && r.tapperId === (t.id.startsWith("rh:") ? null : t.id)) || (!r.tapperId && r.sangradorName === t.fullName)); return <SelectItem key={t.id} value={t.id} className={done ? "bg-warning/15 text-warning" : ""}>{t.fullName}{done ? " · já realizou" : ""}</SelectItem>; })}</SelectContent>
            </Select>
          )}
        </Field>
        {tapperId && (
          <Field label="Tabela">
            {tablesLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando talhões...
              </div>
            ) : combos.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                {tablesError
                  ? <>Não foi possível carregar os talhões deste sangrador. Detalhe: {tablesError}</>
                  : <>Nenhum talhão vinculado a este sangrador. No admin, abra Sangradores, clique no nome e use <strong>Talhões e tabelas</strong> para escolher o talhão e as tabelas.</>}
              </div>
            ) : combos.length === 1 ? (
              /* Com uma única combinação não há o que escolher: mostra só ela,
                 já que o talhão e a tabela estão definidos de forma implícita. */
              <div className="flex h-11 items-center rounded-xl border border-border/60 bg-background/40 px-3 text-sm font-medium">
                {(() => {
                  const name = (combos[0].table.name ?? "").trim();
                  const notation = (combos[0].table.notation ?? "").trim();
                  const showNotation = notation && notation.toLowerCase() !== name.toLowerCase();
                  return <>{combos[0].plot.name} - {name}{showNotation ? ` - ${notation}` : ""}{combos[0].table.treeCount != null ? ` - ${combos[0].table.treeCount} árvores` : ""}</>;
                })()}
              </div>
            ) : (
              <Select value={plotId && tappingTableId ? `${plotId}|${tappingTableId}` : ""} onValueChange={selectCombo}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                {/* O par talhão–tabela com a quantidade de árvores do cadastro:
                    a tabela pode se repetir em talhões diferentes, então a
                    escolha é sempre a combinação. A notação só aparece quando
                    for diferente do nome, para não duplicar ("A — A"). */}
                <SelectContent>{combos.map((c) => {
                  const name = (c.table.name ?? "").trim();
                  const notation = (c.table.notation ?? "").trim();
                  const showNotation = notation && notation.toLowerCase() !== name.toLowerCase();
                  return <SelectItem key={c.value} value={c.value}>{c.plot.name} - {name}{showNotation ? ` - ${notation}` : ""}{c.table.treeCount != null ? ` - ${c.table.treeCount} árvores` : ""}</SelectItem>;
                })}</SelectContent>
              </Select>
            )}
          </Field>
        )}
        {/* Sequência do talhão escolhido: só aparece com o talhão definido,
            porque o percurso de sangria é por talhão. */}
        {plotId && rotation && !rotation.needsReset && rotation.suggestedTableId && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
            <Repeat className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Sequência de hoje:</span>
            <span className="font-semibold text-foreground">
              {tables.find((t) => t.tappingTableId === rotation.suggestedTableId)?.name ?? "Tabela"}
            </span>
          </div>
        )}
        {plotId && rotation?.needsReset && (
          <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <p>Sequência de tabelas desatualizada neste talhão. Escolha o ponto de partida para {recordDate}.</p>
            <Select value={rotationAnchorTableId} onValueChange={setRotationAnchorTableId}>
              <SelectTrigger className="h-10 rounded-xl bg-background/60"><SelectValue placeholder="Selecione a tabela inicial" /></SelectTrigger>
              {/* Só as tabelas deste talhão — o ponto de partida é por talhão. */}
              <SelectContent>{tables.map((t) => <SelectItem key={t.tappingTableId} value={t.tappingTableId}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={resetRotation} disabled={savingRotation || !rotationAnchorTableId}>
              {savingRotation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Definir sequência
            </Button>
          </div>
        )}
        {table && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <Trees className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Árvores previstas nesta tabela:</span>
              <span className="font-semibold text-foreground">{table.treeCount ?? "não cadastrado"}</span>
            </div>
            {table.treeCount == null ? (
              <p className="text-xs text-warning">
                Esta tabela não tem quantidade de árvores cadastrada. Peça ao administrador para cadastrar a tabela antes de registrar a sangria.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {taskExtent
                  ? isPartialTask(taskExtent)
                    ? `Tarefa parcial: ${Math.floor((table.treeCount ?? 0) / 2)} árvores previstas.`
                    : `Tarefa completa: ${table.treeCount} árvores previstas.`
                  : "Escolha a tarefa para ver a quantidade prevista."}
              </p>
            )}
          </div>
        )}
        {summary && (
          <div className="space-y-1 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
            <button
              type="button"
              onClick={() => setShowSummary((s) => !s)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
            >
              <span>Resumo do talhão</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showSummary ? "rotate-180" : ""}`} />
            </button>
            {showSummary && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Árvores do talhão</span><span className="text-right font-semibold">{summary.plotTreeCount}</span>
                <span className="text-muted-foreground">Árvores da fazenda</span><span className="text-right font-semibold">{summary.farmTreeCount}</span>
                <span className="text-muted-foreground">Previstas para sangrar</span><span className="text-right font-semibold">{summary.plannedTreeCount}</span>
                <span className="text-muted-foreground">Do meu sangrador</span><span className="text-right font-semibold">{myTapperSummary ? myTapperSummary.treeCount : "—"}</span>
                <span className="text-muted-foreground">Feitas</span><span className="text-right font-semibold">{summary.treesDone}</span>
                <span className="text-muted-foreground">Sangrias realizadas</span><span className="text-right font-semibold">{summary.treesRealized}</span>
              </div>
            )}
          </div>
        )}
        {existingRecords.length > 0 && !editingId && !allowDuplicate && <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Esta sangria já foi registrada</p><p className="mt-1 text-xs">Escolha se deseja corrigir o lançamento atual ou registrar uma nova sangria adicional.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { const r = existingRecords[0]; setEditingId(r.id); setNotes(r.notes ?? ""); setEndPeriod(r.endPeriod ?? ""); setPhotoUrls(r.photoUrls ?? []); setAudioUrl(r.audioUrl ?? null); toast.info("Registro carregado para correção"); }}>Corrigir atual</Button><Button type="button" size="sm" onClick={() => setAllowDuplicate(true)}>Registrar nova mesmo assim</Button></div></div></div></div>}
        {allowDuplicate && <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">Lançamento adicional confirmado. Ele será registrado separadamente.</div>}
        {tappingTableId && (
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Tarefa</Label>
            <div className="grid grid-cols-3 gap-2">
              {(tasks.length ? tasks : TASK_EXTENTS.map((t) => ({ id: t.value, companyId: farm?.companyId ?? "", code: t.value, label: t.label, position: 0, active: true }))).map((t) => {
                const active = taskExtent === t.code;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setTaskExtent(t.code)}
                    className={`h-11 rounded-xl border text-xs font-semibold transition ${
                      active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background/40 text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 px-1 text-[10px] text-muted-foreground italic">Selecione uma tarefa realizada.</p>
          </div>
        )}
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Período realizado</Label>
          <div className="grid grid-cols-3 gap-2">
            {END_PERIODS.map((p) => {
              const active = endPeriod === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setEndPeriod((cur) => (cur === p.value ? "" : p.value))}
                  className={`h-11 rounded-xl border text-xs font-semibold transition ${
                    active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background/40 text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Observações (opcional)">
          <Textarea rows={3} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi a sangria, alguma ocorrência..." />
        </Field>
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Fotos (opcional)</Label>
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.map((u, i) => <img key={i} src={u} alt="" className="h-20 w-full rounded-xl object-cover" />)}
            <label className="grid h-20 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {uploadingPhoto && <div className="mt-2 text-xs text-muted-foreground">Enviando foto...</div>}
        </div>
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Áudio (opcional)</Label>
          <AudioRecorder value={audioUrl} onChange={setAudioUrl} />
        </div>
        {isDivergent && (
          <div className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
            <p className="font-semibold">Tabela divergente da sequência</p>
            <p className="mt-1 text-xs">O sistema sugeriu <strong>{expectedTable?.name ?? "—"}</strong>, mas você selecionou <strong>{selectedTable?.name ?? "—"}</strong>. Ao confirmar, essa divergência ficará registrada e a sequência seguirá a partir da tabela realizada.</p>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={confirmDivergence} onChange={(e) => setConfirmDivergence(e.target.checked)} />
              Confirmo registrar a tabela divergente
            </label>
          </div>
        )}
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving || (existingRecords.length > 0 && !editingId && !allowDuplicate) || (isDivergent && !confirmDivergence)}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar sangria
        </Button>
      </FieldCard>
    </div>
    <Dialog open={!!savedRecord} onOpenChange={(open) => { if (!open) setSavedRecord(null); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Sangria confirmada pelo servidor</DialogTitle>
          <DialogDescription>Estes são os dados devolvidos após a gravação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Data e horário gravados</div><div className="font-semibold">{savedDateLabel}</div></div>
          <div><div className="text-xs text-muted-foreground">Sangrador gravado</div><div className="font-semibold">{savedRecord?.sangradorName ?? "—"}</div></div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => { setSavedRecord(null); nav({ to: "/campo" }); }}>Confirmar e sair</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
