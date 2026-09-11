import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  getFieldMe, submitTapping, listFieldTappers, listFieldTapperTables,
  type FieldMe, type FieldTapper, type FieldTapperTable,
} from "@/lib/field.functions";
import { TASK_EXTENTS, END_PERIODS } from "@/lib/sangrias.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [step, setStep] = useState(1);

  // step 1 — info
  const [farmId, setFarmId] = useState("");
  const [tapperId, setTapperId] = useState("");
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [tables, setTables] = useState<FieldTapperTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tappingTableId, setTappingTableId] = useState("");
  const [taskExtents, setTaskExtents] = useState<string[]>([]);
  const [endPeriod, setEndPeriod] = useState("");
  const [previstas, setPrevistas] = useState("");
  const [realizadas, setRealizadas] = useState("");

  // step 2 — observações
  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [saving, setSaving] = useState(false);

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
    setTapperId(""); setTappingTableId(""); setTables([]);
    setTappers([]);
    if (!farm) return;
    listFieldTappers(farm.companyId, farm.id).then(setTappers).catch(() => undefined);
  }, [farm]);

  // A tabela (não o talhão) é que define quantas árvores o sangrador tem que
  // fazer — cada sangrador pode ter várias tabelas vinculadas, cada uma com
  // sua própria quantidade.
  useEffect(() => {
    setTappingTableId(""); setTables([]); setPrevistas("");
    if (!farm || !tapperId) return;
    setTablesLoading(true);
    listFieldTapperTables(farm.companyId, tapperId)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }, [farm, tapperId]);

  function selectTable(id: string) {
    setTappingTableId(id);
    const t = tables.find((x) => x.id === id);
    if (t?.treeCount != null) setPrevistas(String(t.treeCount));
  }

  function toggleTask(value: string) {
    setTaskExtents((cur) => cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
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
    setSaving(true);
    const res = await submitTapping({
      companyId: farm.companyId, farmId: farm.id,
      tappingTableId: tappingTableId || undefined,
      date: getLocalIsoDate(),
      sangradorName: tapper.fullName,
      // Sangradores vinculados só pelo RH (sem ficha Tapper legada) vêm com um
      // id sintético "rh:<userId>" — não é uma linha real de Tapper, então
      // não pode ser enviado como tapperId (chave estrangeira).
      tapperId: tapper.id.startsWith("rh:") ? undefined : tapper.id,
      taskExtent: taskExtents.length ? taskExtents.join(",") : undefined,
      endPeriod: endPeriod || undefined,
      treesExpected: previstas ? Number(previstas) : undefined,
      treesTapped: realizadas ? Number(realizadas) : undefined,
      notes: notes.trim() || undefined,
      photoUrls: photoUrls.length ? photoUrls : undefined,
      audioUrl: audioUrl || undefined,
    });
    setSaving(false);
    toast.success(res.queued ? "Sangria salva na fila (offline)" : "Sangria registrada");
    nav({ to: "/campo" });
  }

  return (
    <div>
      <StepHeader title="Registrar sangria" step={step} steps={["Informações", "Observações", "Concluir"]} onBack={() => step > 1 ? setStep(step - 1) : nav({ to: "/campo" })} />

      {step === 1 && (
        <FieldCard className="space-y-4">
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
            <Select value={tapperId} onValueChange={setTapperId}>
              <SelectTrigger className="h-11 rounded-xl border-primary/50 bg-primary/5"><SelectValue placeholder={tappers.length ? "Selecione o sangrador" : "Nenhum sangrador vinculado a esta fazenda"} /></SelectTrigger>
              <SelectContent>{tappers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic px-1">
              O monitor é responsável por registrar a atividade da sua equipe de sangradores.
            </p>
          </Field>
          {tapperId && (
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
                <Select value={tappingTableId} onValueChange={selectTable}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                  <SelectContent>{tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
          )}
          {tappingTableId && (
            <div>
              <Label className="mb-2 block text-xs font-medium text-muted-foreground">Tarefa</Label>
              <div className="grid grid-cols-3 gap-2">
                {TASK_EXTENTS.map((t) => {
                  const active = taskExtents.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTask(t.value)}
                      className={`h-11 rounded-xl border text-xs font-semibold transition ${
                        active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-background/40 text-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 px-1 text-[10px] text-muted-foreground italic">Pode marcar mais de uma opção (ex.: tabela completa + reposição).</p>
            </div>
          )}
          <Field label="Período realizado">
            <Select value={endPeriod} onValueChange={setEndPeriod}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{END_PERIODS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Árvores previstas">
              <Input className="h-11 rounded-xl" inputMode="numeric" value={previstas} onChange={(e) => setPrevistas(e.target.value)} />
              {table?.treeCount != null && (
                <p className="text-[10px] text-muted-foreground italic px-1">Sugerido pela tabela, edite se necessário.</p>
              )}
            </Field>
            <Field label="Árvores realizadas"><Input className="h-11 rounded-xl" inputMode="numeric" value={realizadas} onChange={(e) => setRealizadas(e.target.value)} /></Field>
          </div>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => setStep(2)}>Continuar</Button>
        </FieldCard>
      )}

      {step === 2 && (
        <FieldCard className="space-y-4">
          <Field label="Observações">
            <Textarea rows={5} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi a sangria, qual período foi realizado, alguma ocorrência..." />
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
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => setStep(3)}>Continuar</Button>
        </FieldCard>
      )}

      {step === 3 && (
        <FieldCard className="space-y-4">
          <h3 className="text-sm font-semibold">Confirmar registro</h3>
          <dl className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40 text-sm">
            <Row label="Fazenda" value={farm?.name ?? "—"} />
            <Row label="Sangrador" value={tapper?.fullName ?? "—"} />
            <Row label="Tabela" value={table?.name ?? "—"} />
            <Row label="Tarefa" value={taskExtents.length ? taskExtents.map((v) => TASK_EXTENTS.find((t) => t.value === v)?.label ?? v).join(", ") : "—"} />
            <Row label="Árvores (realizadas / previstas)" value={`${realizadas || "—"} / ${previstas || "—"}`} />
            <Row
              label="Saldo"
              value={realizadas && previstas ? `${Number(realizadas) - Number(previstas)} árvore(s)` : "—"}
            />
          </dl>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar sangria
          </Button>
        </FieldCard>
      )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
