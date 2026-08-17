import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitOperationLog, captureLocation } from "@/lib/field.functions";
import { listMachines, listImplements, listOperators, listOperationTypes } from "@/lib/frota.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoString } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/operacao-maquina")({ component: OperacaoMaquinaPage });

function OperacaoMaquinaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [machines, setMachines] = useState<any[]>([]);
  const [implements_, setImplements] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);

  const [machineId, setMachineId] = useState("");
  const [implementId, setImplementId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [hmStart, setHmStart] = useState("");
  const [hmEnd, setHmEnd] = useState("");
  const [area, setArea] = useState("");
  const [fuel, setFuel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [pendingLogId, setPendingLogId] = useState<string | null>(null);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });

    const pending = localStorage.getItem("vertex_pending_op_log");
    if (pending) {
      const log = JSON.parse(pending);
      setPendingLogId(log.id);
      setMachineId(log.machineId);
      setHmStart(String(log.hourmeterStart || ""));
      setFarmId(log.farmId);
      setIsFinishing(true);
    }
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const companyId = farm?.companyId;

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      listMachines(companyId).catch(() => []),
      listImplements(companyId).catch(() => []),
      listOperators(companyId).catch(() => []),
      listOperationTypes(companyId).catch(() => []),
    ]).then(([m, i, o, t]) => {
      setMachines(m);
      setImplements(i);
      setOperators(o);
      setTypes(t);
    });
  }, [companyId]);

  async function save() {
    if (!farm || !companyId || !machineId) {
      toast.error("Selecione fazenda e máquina");
      return;
    }
    setSaving(true);
    const coords = await captureLocation(6000);

    const payload: any = {
      companyId,
      farmId: farm.id,
      machineId,
      implementId: implementId || undefined,
      operatorId: operatorId || undefined,
      operationTypeId: typeId || undefined,
      startedAt: isFinishing ? undefined : getLocalIsoString(),
      finishedAt: isFinishing ? getLocalIsoString() : undefined,
      hourmeterStart: hmStart ? Number(hmStart) : undefined,
      hourmeterEnd: hmEnd ? Number(hmEnd) : undefined,
      areaWorked: area ? Number(area.replace(",", ".")) : undefined,
      fuelConsumed: fuel ? Number(fuel.replace(",", ".")) : undefined,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      notes: notes || undefined,
      status: isFinishing ? "concluida" : "em_andamento",
    };

    try {
      if (isFinishing && pendingLogId) {
        payload.id = pendingLogId;
        const res = await submitOperationLog(payload);
        localStorage.removeItem("vertex_pending_op_log");
        toast.success(res.queued ? "Finalização em fila" : "Operação concluída");
      } else {
        if (!payload.startedAt) payload.startedAt = getLocalIsoString();
        const res = await (submitOperationLog(payload) as Promise<any>);
        if (!isFinishing && !res.queued && res.data?.id) {
          localStorage.setItem(
            "vertex_pending_op_log",
            JSON.stringify({ id: res.data.id, machineId, farmId: farm.id, hourmeterStart: hmStart })
          );
        }
        toast.success(res.queued ? "Início em fila" : "Operação iniciada");
      }
      nav({ to: "/campo" });
    } catch (e) {
      toast.error("Erro ao salvar operação");
    } finally {
      setSaving(false);
    }
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title={isFinishing ? "Finalizar operação" : "Apontar operação de máquina"} step={1} steps={["Dados"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Máquina *">
          <Select value={machineId} onValueChange={setMachineId} disabled={isFinishing}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.plate ? ` · ${m.plate}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Implemento (opcional)">
          <Select value={implementId || "none"} onValueChange={(v) => setImplementId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {implements_.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Operador">
          <Select value={operatorId || "none"} onValueChange={(v) => setOperatorId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {operators.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Tipo de operação">
          <Select value={typeId || "none"} onValueChange={(v) => setTypeId(v === "none" ? "" : v)}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Horímetro inicial"><Input className="h-11 rounded-xl" inputMode="decimal" value={hmStart} onChange={(e) => setHmStart(e.target.value)} disabled={isFinishing} /></F>
          <F label="Horímetro final"><Input className="h-11 rounded-xl" inputMode="decimal" value={hmEnd} onChange={(e) => setHmEnd(e.target.value)} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Área trabalhada (ha)"><Input className="h-11 rounded-xl" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} /></F>
          <F label="Combustível (L)"><Input className="h-11 rounded-xl" inputMode="decimal" value={fuel} onChange={(e) => setFuel(e.target.value)} /></F>
        </div>
        <F label="Observações"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          {isFinishing ? "Finalizar Operação" : "Iniciar Operação"}
        </Button>
        {isFinishing && (
          <Button variant="ghost" className="w-full mt-2" onClick={() => { localStorage.removeItem("vertex_pending_op_log"); setIsFinishing(false); setPendingLogId(null); setMachineId(""); setHmStart(""); }}>
            Cancelar / Novo início
          </Button>
        )}
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
