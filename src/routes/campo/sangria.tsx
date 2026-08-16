import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitTapping } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/sangria")({ component: SangriaPage });

function SangriaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [step, setStep] = useState(1);

  // step 1 — info
  const [farmId, setFarmId] = useState("");
  const [sangrador, setSangrador] = useState("");
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
      setSangrador(m.user.fullName ?? "");
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function save() {
    if (!farm || !sangrador.trim()) { toast.error("Preencha fazenda e sangrador"); return; }
    setSaving(true);
    const res = await submitTapping({
      companyId: farm.companyId, farmId: farm.id,
      date: new Date().toISOString().slice(0, 10),
      sangradorName: sangrador.trim(),
      liters: liters ? Number(liters) : undefined,
      drcPercent: drc ? Number(drc) : undefined,
      adherencePct: ader ? Number(ader) : undefined,
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
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Sangrador">
            <Input className="h-11 rounded-xl" value={sangrador} onChange={(e) => setSangrador(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Árvores previstas"><Input className="h-11 rounded-xl" inputMode="numeric" value={previstas} onChange={(e) => setPrevistas(e.target.value)} /></Field>
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
            <Row label="Sangrador" value={sangrador || "—"} />
            <Row label="Árvores" value={`${realizadas || "—"} / ${previstas || "—"}`} />
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
