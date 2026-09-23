import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2, Repeat, Trees, AlertTriangle } from "lucide-react";
import {
  getFieldMe, submitTapping, listFieldTappers, listFieldTapperTables, listFieldTapperPlots,
  type FieldMe, type FieldTapper, type FieldTapperTable,
} from "@/lib/field.functions";
import { getTapperRotation, listPlotTableLinks, upsertTapperRotation, type TapperRotationState } from "@/lib/tappers.functions";
import { listPlots, type Plot } from "@/lib/talhoes.functions";
import { listTappingRecords, updateTappingRecord } from "@/lib/sangrias.functions";
import { TASK_EXTENTS, END_PERIODS, listTappingTasks, type TappingTask } from "@/lib/sangrias.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { AudioRecorder } from "@/components/vertex/field/audio-recorder";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/sangria")({ component: SangriaPage });

function SangriaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);

  const [farmId, setFarmId] = useState("");
  const [tapperId, setTapperId] = useState("");
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotId, setPlotId] = useState("");
  const [tables, setTables] = useState<FieldTapperTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tappingTableId, setTappingTableId] = useState("");
  const [rotation, setRotation] = useState<TapperRotationState | null>(null);
  const [rotationAnchorTableId, setRotationAnchorTableId] = useState("");
  const [savingRotation, setSavingRotation] = useState(false);
  const [tasks, setTasks] = useState<TappingTask[]>([]);
  const [taskExtent, setTaskExtent] = useState("");
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

  const expectedTable = rotation?.suggestedTableId ? tables.find((t) => t.id === rotation.suggestedTableId) : undefined;
  const selectedTable = tables.find((t) => t.id === tappingTableId);
  const isDivergent = Boolean(rotation?.suggestedTableId && tappingTableId && rotation.suggestedTableId !== tappingTableId);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const tapper = tappers.find((t) => t.id === tapperId);
  const table = tables.find((t) => t.id === tappingTableId);

  useEffect(() => {
    setTapperId(""); setTappingTableId(""); setTables([]); setPlotId("");
    setTappers([]);
    if (!farm) return;
    Promise.all([listFieldTappers(farm.companyId, farm.id), listPlots(farm.companyId, farm.id)])
      .then(([nextTappers, nextPlots]) => {
        setTappers(nextTappers);
        setTapperId(nextTappers.length === 1 ? nextTappers[0].id : "");
        setPlots(nextPlots);
      })
      .catch(() => undefined);
  }, [farm]);

  useEffect(() => {
    if (!farm || !tapperId) return;
    listFieldTapperPlots(farm.companyId, tapperId, farm.id)
      .then((assigned) => {
        const next = assigned.map((p) => ({ ...p, companyId: farm.companyId, farmId: farm.id })) as Plot[];
        setPlots(next);
        setPlotId(next.length === 1 ? next[0].id : "");
      })
      .catch(() => { setPlots([]); setPlotId(""); });
  }, [farm, tapperId]);

  // A tabela (não o talhão) é que define quantas árvores o sangrador tem que
  // fazer — cada sangrador pode ter várias tabelas vinculadas, cada uma com
  // sua própria quantidade. Quando o sangrador tem rotação configurada, a
  // pré-seleção vem da sequência (próxima tabela do ciclo), não da lista.
  useEffect(() => {
    setTappingTableId(""); setTables([]); setRotation(null);
    if (!farm || !tapperId || !plotId) return;
    setTablesLoading(true);
    Promise.all([
      listPlotTableLinks(farm.companyId, tapperId, plotId),
      getTapperRotation(farm.companyId, tapperId).catch(() => null),
    ])
      .then(([ts, rot]) => {
        setTables(ts.map((t) => ({ id: t.tappingTable?.id ?? t.tappingTableId, name: t.tappingTable?.name ?? "Tabela", notation: t.tappingTable?.notation ?? null, treeCount: t.treeCount ?? null } as FieldTapperTable)));
        setRotation(rot);
        setRotationAnchorTableId(rot?.needsReset ? (rot.rotation?.anchorTableId ?? ts[0]?.tappingTable?.id ?? ts[0]?.tappingTableId ?? "") : "");
        const suggested = rot && !rot.needsReset && rot.suggestedTableId;
        if (suggested) setTappingTableId(suggested);
        else if (ts.length === 1) setTappingTableId(ts[0].id);
      })
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }, [farm, tapperId, plotId]);

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
    if (!farm || !tapperId || !rotationAnchorTableId) return;
    setSavingRotation(true);
    try {
      await upsertTapperRotation({ companyId: farm.companyId, tapperKey: tapperId, anchorTableId: rotationAnchorTableId, anchorDate: recordDate });
      const nextRotation = await getTapperRotation(farm.companyId, tapperId);
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
    if (!farm || !tapper || !plotId) { toast.error("Preencha fazenda, sangrador e talhão"); return; }
    if (!taskExtent) { toast.error("Selecione uma tarefa"); return; }
    if (isDivergent && !confirmDivergence) {
      toast.warning(`A tabela selecionada (${selectedTable?.name ?? "—"}) é diferente da tabela do dia (${expectedTable?.name ?? "—"}). Confirme para continuar.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyId: farm.companyId, farmId: farm.id, plotId,
        tappingTableId: tappingTableId || undefined,
        // Envia o instante real do aparelho; a data selecionada continua sendo usada para filtros civis.
        date: editingId ? recordDate : new Date().toISOString(),
        sangradorName: tapper.fullName,
        // Sangradores vinculados só pelo RH (sem ficha Tapper legada) vêm com um
        // id sintético "rh:<userId>" — não é uma linha real de Tapper, então
        // não pode ser enviado como tapperId (chave estrangeira).
        tapperId: tapper.id.startsWith("rh:") ? undefined : tapper.id,
        taskExtent,
        endPeriod: endPeriod || undefined,
        treesExpected: table?.treeCount ?? undefined,
        notes: notes.trim() || undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        audioUrl: audioUrl || undefined,
      } as any;
      const res = editingId ? await updateTappingRecord(editingId, payload) : await submitTapping(payload);
      setEditingId(null);
      setAllowDuplicate(false);
      toast.success(editingId ? "Sangria corrigida" : ("queued" in res && res.queued) ? "Sangria salva na fila (offline)" : "Sangria registrada");
      nav({ to: "/campo" });
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar a sangria");
    } finally {
      setSaving(false);
    }
  }

  return (
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
        {tapperId && plots.length === 1 ? (
          <Field label="Talhão">
            <div className="flex h-11 items-center rounded-xl border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-foreground">{plots[0].name}{plots[0].code ? ` — ${plots[0].code}` : ""}{plots[0].treeCount ? ` (${plots[0].treeCount.toLocaleString("pt-BR")} árvores)` : ""}</div>
          </Field>
        ) : tapperId && (
          <Field label="Talhão">
            <Select value={plotId} onValueChange={setPlotId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o talhão" /></SelectTrigger>
              <SelectContent>{plots.map((plot) => <SelectItem key={plot.id} value={plot.id}>{plot.name}{plot.code ? ` — ${plot.code}` : ""}{plot.treeCount ? ` (${plot.treeCount.toLocaleString("pt-BR")} árvores)` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        )}
        {tapperId && plotId && rotation && !rotation.needsReset && rotation.suggestedTableId && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
            <Repeat className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Sequência de hoje:</span>
            <span className="font-semibold text-foreground">
              {tables.find((t) => t.id === rotation.suggestedTableId)?.name ?? "Tabela"}
            </span>
          </div>
        )}
        {tapperId && plotId && rotation?.needsReset && (
          <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <p>Sequência de tabelas desatualizada para este sangrador. Escolha o ponto de partida para {recordDate}.</p>
            <Select value={rotationAnchorTableId} onValueChange={setRotationAnchorTableId}>
              <SelectTrigger className="h-10 rounded-xl bg-background/60"><SelectValue placeholder="Selecione a tabela inicial" /></SelectTrigger>
              <SelectContent>{tables.map((tableOption) => <SelectItem key={tableOption.id} value={tableOption.id}>{tableOption.name}{tableOption.notation ? ` — ${tableOption.notation}` : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={resetRotation} disabled={savingRotation || !rotationAnchorTableId}>
              {savingRotation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Definir sequência
            </Button>
          </div>
        )}
        {tapperId && plotId && (
          <Field label="Tabela">
            {tablesLoading ? (
              <div className="flex h-11 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando tabelas...
              </div>
            ) : tables.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                Nenhuma tabela vinculada a este sangrador. Vincule em Sangradores &gt; Tabelas, no admin.
              </div>
            ) : (
              <Select value={tappingTableId} onValueChange={setTappingTableId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                <SelectContent>{tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>
        )}
        {table && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
            <Trees className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Árvores previstas nesta tabela:</span>
            <span className="font-semibold text-foreground">{table.treeCount ?? "—"}</span>
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
