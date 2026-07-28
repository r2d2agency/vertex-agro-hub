import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitFuelMovement } from "@/lib/field.functions";
import { listFuelTanks } from "@/lib/frota-ops.functions";
import { listMachines, listOperators } from "@/lib/frota.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/abastecimento")({ component: AbastecimentoPage });

function AbastecimentoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [tanks, setTanks] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);

  const [tankId, setTankId] = useState("");
  const [kind, setKind] = useState<"saida" | "entrada" | "ajuste">("saida");
  const [liters, setLiters] = useState("");
  const [machineId, setMachineId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [hm, setHm] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const companyId = farm?.companyId;

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      listFuelTanks(companyId, farmId || undefined).catch(() => []),
      listMachines(companyId).catch(() => []),
      listOperators(companyId).catch(() => []),
    ]).then(([t, m, o]) => {
      setTanks(t); setMachines(m); setOperators(o);
      if (t[0] && !tankId) setTankId(t[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, farmId]);

  const tank = tanks.find(t => t.id === tankId);

  async function save() {
    if (!companyId || !tankId || !liters) { toast.error("Preencha tanque e litros"); return; }
    setSaving(true);
    const res = await submitFuelMovement({
      companyId, tankId, kind,
      liters: Number(liters.replace(",", ".")),
      occurredAt: new Date().toISOString(),
      machineId: machineId || undefined,
      operatorId: operatorId || undefined,
      hourmeter: hm ? Number(hm) : undefined,
      unitCost: unitCost ? Number(unitCost.replace(",", ".")) : undefined,
      supplier: supplier || undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    toast.success(res.queued ? "Salvo na fila" : "Abastecimento registrado");
    nav({ to: "/campo" });
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title="Abastecer máquina" step={1} steps={["Dados"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Tanque *">
          <Select value={tankId} onValueChange={setTankId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o tanque" /></SelectTrigger>
            <SelectContent>{tanks.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.fuelType} ({t.currentLevel}L)</SelectItem>)}</SelectContent>
          </Select>
          {tank && <p className="mt-1 text-[11px] text-muted-foreground">Saldo atual: {tank.currentLevel} L</p>}
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Tipo">
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída (uso)</SelectItem>
                <SelectItem value="entrada">Entrada (compra)</SelectItem>
                <SelectItem value="ajuste">Ajuste de saldo</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label={kind === "ajuste" ? "Novo saldo (L) *" : "Litros *"}>
            <Input className="h-11 rounded-xl" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} />
          </F>
        </div>
        {kind === "saida" && (
          <>
            <F label="Máquina abastecida">
              <Select value={machineId || "none"} onValueChange={(v) => setMachineId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
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
          </>
        )}
        {kind === "entrada" && (
          <div className="grid grid-cols-2 gap-3">
            <F label="Custo un. (R$/L)"><Input className="h-11 rounded-xl" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></F>
            <F label="Fornecedor"><Input className="h-11 rounded-xl" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></F>
          </div>
        )}
        <F label="Observações"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
