import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, X, Minus } from "lucide-react";
import { getFieldMe, type FieldMe, submitChecklist } from "@/lib/field.functions";
import { listMachines, listOperators } from "@/lib/frota.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoString } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/checklist")({ component: ChecklistPage });

const DEFAULT_ITEMS = [
  "Óleo do motor",
  "Água do radiador",
  "Nível de combustível",
  "Pneus / esteiras",
  "Freios",
  "Luzes e sinalização",
  "Vazamentos aparentes",
  "Cinto de segurança",
  "Filtros",
  "Ferramentas / macaco",
];

function ChecklistPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);

  const [machineId, setMachineId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [kind, setKind] = useState("diario");
  const [hm, setHm] = useState("");
  const [items, setItems] = useState<Array<{ label: string; status: "ok" | "nok" | "na"; notes?: string }>>(
    DEFAULT_ITEMS.map((label) => ({ label, status: "ok" }))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const companyId = farm?.companyId;

  useEffect(() => {
    if (!companyId) return;
    Promise.all([listMachines(companyId).catch(() => []), listOperators(companyId).catch(() => [])])
      .then(([m, o]) => { setMachines(m); setOperators(o); });
  }, [companyId]);

  const overall: "aprovado" | "reprovado" | "atencao" = items.some(i => i.status === "nok") ? "reprovado" : "aprovado";

  function setStatus(idx: number, s: "ok" | "nok" | "na") {
    setItems(items.map((it, i) => i === idx ? { ...it, status: s } : it));
  }

  async function save() {
    if (!companyId || !machineId) { toast.error("Selecione a máquina"); return; }
    setSaving(true);
    const res = await submitChecklist({
      companyId, machineId,
      operatorId: operatorId || undefined,
      kind, performedAt: getLocalIsoString(),
      hourmeter: hm ? Number(hm) : undefined,
      overallStatus: overall, notes: notes || undefined,
      items,
    });
    setSaving(false);
    toast.success(res.queued ? "Salvo na fila" : "Checklist registrado");
    nav({ to: "/campo" });
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title="Checklist de máquina" step={1} steps={["Itens"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Máquina *">
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Operador">
            <Select value={operatorId || "none"} onValueChange={(v) => setOperatorId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {operators.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Horímetro"><Input className="h-11 rounded-xl" inputMode="decimal" value={hm} onChange={(e) => setHm(e.target.value)} /></F>
        </div>
        <F label="Tipo">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="pre_uso">Pré-uso</SelectItem>
              <SelectItem value="pos_uso">Pós-uso</SelectItem>
            </SelectContent>
          </Select>
        </F>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Itens verificados</Label>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${overall === "reprovado" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
              {overall}
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={it.label} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{it.label}</span>
                  <div className="flex gap-1">
                    <SBtn active={it.status === "ok"} tone="primary" onClick={() => setStatus(i, "ok")}><Check className="h-3.5 w-3.5" /></SBtn>
                    <SBtn active={it.status === "nok"} tone="destructive" onClick={() => setStatus(i, "nok")}><X className="h-3.5 w-3.5" /></SBtn>
                    <SBtn active={it.status === "na"} tone="muted" onClick={() => setStatus(i, "na")}><Minus className="h-3.5 w-3.5" /></SBtn>
                  </div>
                </div>
                {it.status === "nok" && (
                  <Input
                    className="mt-2 h-9 rounded-lg text-xs"
                    placeholder="Descreva o problema"
                    value={it.notes ?? ""}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        <F label="Observações gerais"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar checklist
        </Button>
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}

function SBtn({ active, tone, onClick, children }: { active: boolean; tone: "primary" | "destructive" | "muted"; onClick: () => void; children: React.ReactNode }) {
  const cls = active
    ? tone === "primary" ? "bg-primary text-primary-foreground border-primary"
      : tone === "destructive" ? "bg-destructive text-destructive-foreground border-destructive"
      : "bg-muted text-muted-foreground border-border"
    : "bg-transparent text-muted-foreground border-border/60";
  return <button type="button" onClick={onClick} className={`grid h-8 w-8 place-items-center rounded-lg border ${cls}`}>{children}</button>;
}
