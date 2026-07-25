import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Activity } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listOperationLogs, createOperationLog, deleteOperationLog,
} from "@/lib/frota-ops.functions";
import { listMachines, listImplements, listOperators, listOperationTypes } from "@/lib/frota.functions";
import { listFarms } from "@/lib/fazendas.functions";

export const Route = createFileRoute("/_authenticated/apontamentos")({
  head: () => ({ meta: [
    { title: "Apontamentos — Vertex Agro" },
    { name: "description", content: "Apontamento de operação das máquinas: horas, área trabalhada e consumo." },
    { name: "robots", content: "noindex" },
  ] }),
  component: LogsPage,
});

function LogsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ["op-logs", companyId], enabled: !!companyId,
    queryFn: () => listOperationLogs(companyId!),
  });
  const { data: machines = [] } = useQuery({
    queryKey: ["machines", companyId], enabled: !!companyId,
    queryFn: () => listMachines(companyId!),
  });
  const { data: impls = [] } = useQuery({
    queryKey: ["implements", companyId], enabled: !!companyId,
    queryFn: () => listImplements(companyId!),
  });
  const { data: operators = [] } = useQuery({
    queryKey: ["operators", companyId], enabled: !!companyId,
    queryFn: () => listOperators(companyId!),
  });
  const { data: opTypes = [] } = useQuery({
    queryKey: ["op-types", companyId], enabled: !!companyId,
    queryFn: () => listOperationTypes(companyId!),
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId], enabled: !!companyId,
    queryFn: () => listFarms(companyId!),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteOperationLog(id),
    onSuccess: () => { toast.success("Apontamento removido"); qc.invalidateQueries({ queryKey: ["op-logs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalHours = logs.reduce((s, l) => s + (l.durationHours ?? 0), 0);
  const totalArea = logs.reduce((s, l) => s + (l.areaWorked ?? 0), 0);
  const totalFuel = logs.reduce((s, l) => s + (l.fuelConsumed ?? 0), 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Apontamentos de Operação"
        description="Registro de operações executadas: máquina, implemento, operador, horímetro, área e consumo."
        actions={companyId && <Button onClick={() => setOpen(true)} disabled={machines.length === 0}><Plus className="mr-2 h-4 w-4" /> Novo apontamento</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Apontamentos</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{logs.length}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Horas trabalhadas</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totalHours.toFixed(1)}h</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Área trabalhada</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totalArea.toFixed(1)} ha</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Diesel consumido</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totalFuel.toFixed(1)} L</CardContent></Card>
          </div>

          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr><th className="p-3">Início</th><th className="p-3">Máquina</th><th className="p-3">Operação</th><th className="p-3">Operador</th><th className="p-3">Duração</th><th className="p-3">Área/Diesel</th><th className="p-3">Status</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{new Date(l.startedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-3">{l.machine?.name}</td>
                    <td className="p-3">{l.operationType?.name ?? "—"}</td>
                    <td className="p-3">{l.operator?.name ?? "—"}</td>
                    <td className="p-3">{l.durationHours != null ? `${l.durationHours.toFixed(1)}h` : "—"}</td>
                    <td className="p-3 text-xs">{l.areaWorked ? `${l.areaWorked.toFixed(1)}ha` : "—"} · {l.fuelConsumed ? `${l.fuelConsumed.toFixed(1)}L` : "—"}</td>
                    <td className="p-3"><Badge variant={l.status === "concluida" ? "default" : "secondary"}>{l.status}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Remover apontamento?")) del.mutate(l.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground"><Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />Nenhum apontamento.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </>
      )}

      {companyId && open && (
        <LogDialog
          companyId={companyId}
          machines={machines} implements={impls} operators={operators}
          opTypes={opTypes} farms={farms}
          onClose={() => setOpen(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["op-logs"] }); setOpen(false); }}
        />
      )}
    </div>
  );
}

function LogDialog({ companyId, machines, implements: impls, operators, opTypes, farms, onClose, onSaved }: any) {
  const now = new Date().toISOString().slice(0, 16);
  const [f, setF] = useState({
    machineId: machines[0]?.id ?? "",
    implementId: undefined as string | undefined,
    operatorId: undefined as string | undefined,
    operationTypeId: undefined as string | undefined,
    farmId: undefined as string | undefined,
    startedAt: now,
    finishedAt: "",
    hourmeterStart: undefined as number | undefined,
    hourmeterEnd: undefined as number | undefined,
    fuelConsumed: undefined as number | undefined,
    areaWorked: undefined as number | undefined,
    distanceKm: undefined as number | undefined,
    notes: "",
    status: "concluida",
  });
  const save = useMutation({
    mutationFn: () => createOperationLog({
      companyId, ...f,
      startedAt: new Date(f.startedAt).toISOString(),
      finishedAt: f.finishedAt ? new Date(f.finishedAt).toISOString() : undefined,
    }),
    onSuccess: () => { toast.success("Apontamento salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader><DialogTitle>Novo apontamento de operação</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Máquina *</Label>
              <Select value={f.machineId} onValueChange={v => setF({ ...f, machineId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Implemento</Label>
              <Select value={f.implementId ?? "__none"} onValueChange={v => setF({ ...f, implementId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{impls.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Operação</Label>
              <Select value={f.operationTypeId ?? "__none"} onValueChange={v => setF({ ...f, operationTypeId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{opTypes.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Operador</Label>
              <Select value={f.operatorId ?? "__none"} onValueChange={v => setF({ ...f, operatorId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{operators.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Fazenda</Label>
            <Select value={f.farmId ?? "__none"} onValueChange={v => setF({ ...f, farmId: v === "__none" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent><SelectItem value="__none">—</SelectItem>{farms.map((fm: any) => <SelectItem key={fm.id} value={fm.id}>{fm.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Início *</Label><Input type="datetime-local" value={f.startedAt} onChange={e => setF({ ...f, startedAt: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="datetime-local" value={f.finishedAt} onChange={e => setF({ ...f, finishedAt: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Horímetro inicial</Label><Input type="number" value={f.hourmeterStart ?? ""} onChange={e => setF({ ...f, hourmeterStart: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><Label>Horímetro final</Label><Input type="number" value={f.hourmeterEnd ?? ""} onChange={e => setF({ ...f, hourmeterEnd: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><Label>Diesel (L)</Label><Input type="number" value={f.fuelConsumed ?? ""} onChange={e => setF({ ...f, fuelConsumed: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Área (ha)</Label><Input type="number" step="0.01" value={f.areaWorked ?? ""} onChange={e => setF({ ...f, areaWorked: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><Label>Distância (km)</Label><Input type="number" step="0.1" value={f.distanceKm ?? ""} onChange={e => setF({ ...f, distanceKm: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.machineId || !f.startedAt || save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
