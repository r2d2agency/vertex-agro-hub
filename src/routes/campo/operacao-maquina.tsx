import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitOperationLog, startOperationLog, captureLocation } from "@/lib/field.functions";
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
  const [showMore, setShowMore] = useState(false);
  const [pendingLogId, setPendingLogId] = useState<string | null>(null);
  const [pendingOffline, setPendingOffline] = useState(false);
  const [pendingStartedAt, setPendingStartedAt] = useState<string | null>(null);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });

    const pending = localStorage.getItem("vertex_pending_op_log");
    if (pending) {
      try {
        const log = JSON.parse(pending);
        setPendingLogId(log.id ?? null);
        setPendingOffline(Boolean(log.offline));
        setPendingStartedAt(log.startedAt ?? null);
        setMachineId(log.machineId ?? "");
        setImplementId(log.implementId ?? "");
        setOperatorId(log.operatorId ?? "");
        setTypeId(log.operationTypeId ?? "");
        setNotes(log.notes ?? "");
        setHmStart(String(log.hourmeterStart || ""));
        setFarmId(log.farmId ?? "");
        setIsFinishing(true);
      } catch (error) {
        console.error("[operacao-maquina] registro local inválido", error);
        localStorage.removeItem("vertex_pending_op_log");
        toast.error("O registro local da operação está inválido e foi removido.");
      }
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
      startedAt: isFinishing ? (pendingOffline ? pendingStartedAt ?? undefined : undefined) : getLocalIsoString(),
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
      if (isFinishing) {
        const res = pendingLogId
          ? await submitOperationLog({ ...payload, id: pendingLogId })
          : await submitOperationLog(payload);
        localStorage.removeItem("vertex_pending_op_log");
        toast.success(res.queued ? "Operação completa guardada na fila" : "Operação concluída");
      } else {
        const res = await startOperationLog(payload);
        if (res.localOnly) {
          localStorage.setItem("vertex_pending_op_log", JSON.stringify({
            offline: true,
            startedAt: payload.startedAt,
            machineId,
            implementId: implementId || undefined,
            operatorId: operatorId || undefined,
            operationTypeId: typeId || undefined,
            farmId: farm.id,
            hourmeterStart: hmStart,
            notes: notes || undefined,
          }));
          toast.warning("Início salvo neste aparelho. Finalize a operação para enviar o registro.");
        } else if (res.data?.id) {
          localStorage.setItem("vertex_pending_op_log", JSON.stringify({
            id: res.data.id,
            machineId,
            farmId: farm.id,
            hourmeterStart: hmStart,
          }));
          toast.success("Operação iniciada");
        } else {
          toast.error("O servidor não retornou o identificador da operação.");
          return;
        }
      }
      nav({ to: "/campo" });
    } catch (error) {
      toast.error("Erro ao salvar operação", {
        description: error instanceof Error ? error.message : String(error),
      });
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
          {machines.length === 0 && (
            <p className="mt-1 text-xs text-warning">
              Nenhuma máquina está salva neste aparelho. Conecte-se e prepare os dados offline na tela Sincronização.
            </p>
          )}
        </F>
        <F label="Horímetro inicial"><Input className="h-11 rounded-xl" inputMode="decimal" value={hmStart} onChange={(e) => setHmStart(e.target.value)} disabled={isFinishing} /></F>

        {isFinishing && (
          <div className="grid grid-cols-2 gap-3">
            <F label="Horímetro final"><Input className="h-11 rounded-xl" inputMode="decimal" value={hmEnd} onChange={(e) => setHmEnd(e.target.value)} /></F>
            <F label="Combustível (L)"><Input className="h-11 rounded-xl" inputMode="decimal" value={fuel} onChange={(e) => setFuel(e.target.value)} /></F>
          </div>
        )}
        {isFinishing && (
          <F label="Área trabalhada (ha)"><Input className="h-11 rounded-xl" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} /></F>
        )}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm font-medium text-muted-foreground"
        >
          Mais detalhes (opcional)
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>
        {showMore && (
          <div className="space-y-4">
            <F label="Implemento">
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
            <F label="Observações"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>
          </div>
        )}
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
          {isFinishing ? "Finalizar Operação" : "Iniciar Operação"}
        </Button>
        {isFinishing && (
          <Button variant="ghost" className="w-full mt-2" onClick={() => { localStorage.removeItem("vertex_pending_op_log"); setIsFinishing(false); setPendingLogId(null); setPendingOffline(false); setPendingStartedAt(null); setMachineId(""); setHmStart(""); }}>
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
