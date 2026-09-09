import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getFieldMe, submitTapping, listFieldTappers, listFieldTappingTables,
  type FieldMe, type FieldTapper, type FieldTappingTable,
} from "@/lib/field.functions";
import { TASK_EXTENTS, END_PERIODS } from "@/lib/sangrias.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/sangria")({ component: SangriaPage });

function SangriaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [step, setStep] = useState(1);

  // step 1 — info
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [tapperId, setTapperId] = useState("");
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [tables, setTables] = useState<FieldTappingTable[]>([]);
  const [tappingTableId, setTappingTableId] = useState("");
  const [taskExtent, setTaskExtent] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const [previstas, setPrevistas] = useState("");
  const [realizadas, setRealizadas] = useState("");

  // step 2 — execução
  const [situacao, setSituacao] = useState("concluida");
  const [qualidade, setQualidade] = useState("boa");
  const [condicao, setCondicao] = useState("normal");
  const [notes, setNotes] = useState("");
  const [liters, setLiters] = useState("");
  const [drc, setDrc] = useState("");
  const [ader, setAder] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const plots = farm?.plots ?? [];
  const plot = plots.find((p) => p.id === plotId);
  const tapper = tappers.find((t) => t.id === tapperId);

  useEffect(() => {
    setTapperId(""); setTappingTableId(""); setPlotId("");
    setTappers([]); setTables([]);
    if (!farm) return;
    listFieldTappers(farm.companyId, farm.id).then(setTappers).catch(() => undefined);
    listFieldTappingTables(farm.companyId).then(setTables).catch(() => undefined);
  }, [farm]);

  function selectFarm(id: string) {
    setFarmId(id);
  }

  function selectPlot(id: string) {
    setPlotId(id);
    const p = plots.find((x) => x.id === id);
    if (p?.treeCount != null) setPrevistas(String(p.treeCount));
    const t = p?.tappingSystem
      ? tables.find((table) => table.notation === p.tappingSystem || table.name === p.tappingSystem)
      : undefined;
    if (t) setTappingTableId(t.id);
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function save() {
    if (!farm || !tapper) { toast.error("Preencha fazenda e sangrador"); return; }
    setSaving(true);
    const res = await submitTapping({
      companyId: farm.companyId, farmId: farm.id, plotId: plotId || undefined,
      tappingTableId: tappingTableId || undefined,
      date: getLocalIsoDate(),
      sangradorName: tapper.fullName,
      tapperId: tapper.id,
      taskExtent: taskExtent || undefined,
      endPeriod: endPeriod || undefined,
      liters: liters ? Number(liters) : undefined,
      drcPercent: drc ? Number(drc) : undefined,
      adherencePct: ader ? Number(ader) : undefined,
      treesExpected: previstas ? Number(previstas) : undefined,
      treesTapped: realizadas ? Number(realizadas) : undefined,
      notes: notes.trim() || undefined,
      status: situacao,
      quality: qualidade,
      tableCondition: condicao,
    });
    setSaving(false);
    toast.success(res.queued ? "Sangria salva na fila (offline)" : "Sangria registrada");
    nav({ to: "/campo" });
  }

  return (
    <div>
      <StepHeader title="Registrar sangria" step={step} steps={["Informações", "Execução", "Concluir"]} onBack={() => step > 1 ? setStep(step - 1) : nav({ to: "/campo" })} />

      {step === 1 && (
        <FieldCard className="space-y-4">
          <Field label="Fazenda">
            <Select value={farmId} onValueChange={selectFarm}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {plots.length > 0 && (
            <Field label="Talhão">
              <Select value={plotId} onValueChange={selectPlot}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o talhão" /></SelectTrigger>
                <SelectContent>{plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
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
          {tables.length > 0 && (
            <Field label="Tabela de sangria">
              <Select value={tappingTableId} onValueChange={setTappingTableId}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                <SelectContent>{tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarefa">
              <Select value={taskExtent} onValueChange={setTaskExtent}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TASK_EXTENTS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Período de término">
              <Select value={endPeriod} onValueChange={setEndPeriod}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{END_PERIODS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Árvores previstas">
              <Input className="h-11 rounded-xl" inputMode="numeric" value={previstas} onChange={(e) => setPrevistas(e.target.value)} />
              {plot?.treeCount != null && (
                <p className="text-[10px] text-muted-foreground italic px-1">Sugerido pelo cadastro do talhão, edite se necessário.</p>
              )}
            </Field>
            <Field label="Árvores realizadas"><Input className="h-11 rounded-xl" inputMode="numeric" value={realizadas} onChange={(e) => setRealizadas(e.target.value)} /></Field>
          </div>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => setStep(2)}>Continuar</Button>
        </FieldCard>
      )}

      {step === 2 && (
        <FieldCard className="space-y-4">
          <Field label="Situação da sangria">
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="interrompida">Interrompida</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Qualidade da execução">
            <Select value={qualidade} onValueChange={setQualidade}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excelente">Excelente</SelectItem>
                <SelectItem value="boa">Boa</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="ruim">Ruim</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Condição da tabela">
            <Select value={condicao} onValueChange={setCondicao}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Litros"><Input className="h-11 rounded-xl" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></Field>
            <Field label="DRC %"><Input className="h-11 rounded-xl" inputMode="decimal" value={drc} onChange={(e) => setDrc(e.target.value)} /></Field>
          </div>
          <Field label="Aderência %"><Input className="h-11 rounded-xl" inputMode="decimal" value={ader} onChange={(e) => setAder(e.target.value)} /></Field>
          <Field label="Observações"><Textarea rows={3} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sangria realizada normalmente." /></Field>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => setStep(3)}>Continuar</Button>
        </FieldCard>
      )}

      {step === 3 && (
        <FieldCard className="space-y-4">
          <h3 className="text-sm font-semibold">Confirmar registro</h3>
          <dl className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40 text-sm">
            <Row label="Fazenda" value={farm?.name ?? "—"} />
            <Row label="Talhão" value={plot?.name ?? "—"} />
            <Row label="Sangrador" value={tapper?.fullName ?? "—"} />
            <Row label="Árvores (realizadas / previstas)" value={`${realizadas || "—"} / ${previstas || "—"}`} />
            <Row
              label="Saldo"
              value={realizadas && previstas ? `${Number(realizadas) - Number(previstas)} árvore(s)` : "—"}
            />
            <Row label="Situação" value={situacao} />
            <Row label="Qualidade" value={qualidade} />
            <Row label="Litros" value={liters ? `${liters} L` : "—"} />
            <Row label="DRC" value={drc ? `${drc}%` : "—"} />
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
