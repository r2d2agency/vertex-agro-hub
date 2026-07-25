import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listChecklists, createChecklist, deleteChecklist,
  type MachineChecklistItem,
} from "@/lib/frota-ops.functions";
import { listMachines, listOperators } from "@/lib/frota.functions";

export const Route = createFileRoute("/_authenticated/checklists")({
  head: () => ({ meta: [
    { title: "Checklists — Vertex Agro" },
    { name: "description", content: "Checklists pré-operação e inspeções de máquinas." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ChecklistsPage,
});

const DEFAULT_ITEMS = [
  "Nível de óleo do motor", "Nível da água do radiador", "Nível de combustível",
  "Filtros (ar/óleo)", "Pneus / esteiras", "Freios", "Luzes e sinalização",
  "Vazamentos visíveis", "Cinto de segurança", "EPI do operador",
];

function ChecklistsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: list = [] } = useQuery({
    queryKey: ["checklists", companyId], enabled: !!companyId,
    queryFn: () => listChecklists(companyId!),
  });
  const { data: machines = [] } = useQuery({
    queryKey: ["machines", companyId], enabled: !!companyId,
    queryFn: () => listMachines(companyId!),
  });
  const { data: operators = [] } = useQuery({
    queryKey: ["operators", companyId], enabled: !!companyId,
    queryFn: () => listOperators(companyId!),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteChecklist(id),
    onSuccess: () => { toast.success("Checklist removido"); qc.invalidateQueries({ queryKey: ["checklists"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Checklists de Máquinas"
        description="Inspeções pré-operação para segurança e conservação da frota."
        actions={companyId && <Button onClick={() => setOpen(true)} disabled={machines.length === 0}><Plus className="mr-2 h-4 w-4" /> Novo checklist</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <div className="grid gap-3">
          {list.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{c.machine?.name}</span>
                      {c.machine?.plate && <Badge variant="outline">{c.machine.plate}</Badge>}
                      <Badge variant={c.overallStatus === "ok" ? "default" : "destructive"}>
                        {c.overallStatus === "ok" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                        {c.overallStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.performedAt).toLocaleString("pt-BR")} · {c.operator?.name ?? "sem operador"} · {c.kind}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Remover checklist?")) del.mutate(c.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                  {c.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      {it.status === "ok" ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : it.status === "nok" ? <XCircle className="h-3 w-3 text-destructive" /> : <span className="h-3 w-3 rounded-full bg-muted inline-block" />}
                      <span>{it.label}</span>
                    </div>
                  ))}
                </div>
                {c.notes && <p className="mt-2 text-xs text-muted-foreground">{c.notes}</p>}
              </CardContent>
            </Card>
          ))}
          {list.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhum checklist registrado ainda.
            </CardContent></Card>
          )}
        </div>
      )}

      {companyId && open && (
        <ChecklistDialog companyId={companyId} machines={machines} operators={operators}
          onClose={() => setOpen(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["checklists"] }); setOpen(false); }} />
      )}
    </div>
  );
}

function ChecklistDialog({ companyId, machines, operators, onClose, onSaved }: any) {
  const [f, setF] = useState({
    machineId: machines[0]?.id ?? "",
    operatorId: undefined as string | undefined,
    kind: "pre_operacao",
    hourmeter: undefined as number | undefined,
    notes: "",
    items: DEFAULT_ITEMS.map(l => ({ label: l, status: "ok" as "ok" | "nok" | "na", notes: "" })) as MachineChecklistItem[],
  });
  const save = useMutation({
    mutationFn: () => createChecklist({ companyId, ...f }),
    onSuccess: () => { toast.success("Checklist salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader><DialogTitle>Novo checklist</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Máquina *</Label>
              <Select value={f.machineId} onValueChange={v => setF({ ...f, machineId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Operador</Label>
              <Select value={f.operatorId ?? "__none"} onValueChange={v => setF({ ...f, operatorId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{operators.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={f.kind} onValueChange={v => setF({ ...f, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_operacao">Pré-operação</SelectItem>
                  <SelectItem value="pos_operacao">Pós-operação</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Horímetro</Label><Input type="number" value={f.hourmeter ?? ""} onChange={e => setF({ ...f, hourmeter: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>

          <div className="border rounded p-3 grid gap-2">
            <p className="text-sm font-medium">Itens de verificação</p>
            {f.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr,auto] gap-2 items-center">
                <span className="text-sm">{it.label}</span>
                <div className="flex gap-1">
                  {(["ok", "nok", "na"] as const).map(s => (
                    <Button key={s} size="sm" variant={it.status === s ? "default" : "outline"}
                      onClick={() => {
                        const items = [...f.items]; items[idx] = { ...items[idx], status: s }; setF({ ...f, items });
                      }}>
                      {s.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.machineId || save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
