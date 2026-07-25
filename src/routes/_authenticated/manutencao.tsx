import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Wrench, Package } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  listMaintenanceOrders, createMaintenanceOrder, updateMaintenanceOrder, deleteMaintenanceOrder,
  getMaintenanceOrder, addMaintenanceItem, removeMaintenanceItem,
  listInventoryItems, type MaintenanceOrder,
} from "@/lib/frota-ops.functions";
import { listMachines, listImplements } from "@/lib/frota.functions";

export const Route = createFileRoute("/_authenticated/manutencao")({
  head: () => ({ meta: [
    { title: "Manutenção — Vertex Agro" },
    { name: "description", content: "Ordens de serviço, manutenções preventivas e corretivas." },
    { name: "robots", content: "noindex" },
  ] }),
  component: MaintenancePage,
});

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};

function MaintenancePage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [form, setForm] = useState<{ open: boolean; editing: MaintenanceOrder | null }>({ open: false, editing: null });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: orders = [] } = useQuery({
    queryKey: ["mo", companyId, statusFilter], enabled: !!companyId,
    queryFn: () => listMaintenanceOrders(companyId!, { status: statusFilter || undefined }),
  });
  const { data: machines = [] } = useQuery({
    queryKey: ["machines", companyId], enabled: !!companyId,
    queryFn: () => listMachines(companyId!),
  });
  const { data: impls = [] } = useQuery({
    queryKey: ["implements", companyId], enabled: !!companyId,
    queryFn: () => listImplements(companyId!),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteMaintenanceOrder(id),
    onSuccess: () => { toast.success("OS cancelada"); qc.invalidateQueries({ queryKey: ["mo"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalOpen = orders.filter(o => o.status === "aberta" || o.status === "em_andamento").length;
  const cost30d = orders.filter(o => o.status === "concluida").reduce((s, o) => s + (o.totalCost ?? 0), 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Manutenção"
        description="Ordens de serviço preventivas e corretivas, com peças, mão de obra e custo total."
        actions={companyId && <Button onClick={() => setForm({ open: true, editing: null })}><Plus className="mr-2 h-4 w-4" /> Nova OS</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">OS abertas</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{totalOpen}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total concluídas</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{orders.filter(o => o.status === "concluida").length}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Custo acumulado (R$)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">R$ {cost30d.toFixed(2)}</CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4 flex gap-3 items-center">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter || "__all"} onValueChange={v => setStatusFilter(v === "__all" ? "" : v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos</SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-3">OS</th><th className="p-3">Equipamento</th><th className="p-3">Tipo</th><th className="p-3">Prioridade</th><th className="p-3">Status</th><th className="p-3">Aberta em</th><th className="p-3">Custo</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-t cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(o.id)}>
                      <td className="p-3 font-mono text-xs">{o.code ?? o.id.slice(0, 8)}</td>
                      <td className="p-3">{o.machine?.name ?? o.implement?.name ?? "—"}</td>
                      <td className="p-3"><Badge variant="outline">{o.kind}</Badge></td>
                      <td className="p-3"><Badge variant={o.priority === "alta" ? "destructive" : o.priority === "baixa" ? "secondary" : "default"}>{o.priority}</Badge></td>
                      <td className="p-3"><Badge>{STATUS_LABEL[o.status] ?? o.status}</Badge></td>
                      <td className="p-3">{new Date(o.openedAt).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3">{o.totalCost != null ? `R$ ${o.totalCost.toFixed(2)}` : "—"}</td>
                      <td className="p-3 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, editing: o })}>Editar</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Cancelar OS ${o.code ?? o.id.slice(0, 8)}?`)) del.mutate(o.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />Nenhuma ordem de serviço.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {companyId && form.open && (
        <OrderDialog companyId={companyId} editing={form.editing}
          machines={machines.map(m => ({ id: m.id, name: m.name, plate: m.plate }))}
          implements={impls.map(i => ({ id: i.id, name: i.name }))}
          onClose={() => setForm({ open: false, editing: null })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["mo"] }); setForm({ open: false, editing: null }); }} />
      )}
      {companyId && detailId && (
        <OrderDetail companyId={companyId} id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function OrderDialog({ companyId, editing, machines, implements: impls, onClose, onSaved }: {
  companyId: string; editing: MaintenanceOrder | null;
  machines: Array<{ id: string; name: string; plate: string | null }>;
  implements: Array<{ id: string; name: string }>;
  onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    code: editing?.code ?? "",
    kind: editing?.kind ?? "corretiva",
    priority: editing?.priority ?? "media",
    status: editing?.status ?? "aberta",
    machineId: editing?.machineId ?? undefined as string | undefined,
    implementId: editing?.implementId ?? undefined as string | undefined,
    scheduledFor: editing?.scheduledFor?.slice(0, 10) ?? "",
    description: editing?.description ?? "",
    diagnosis: editing?.diagnosis ?? "",
    solution: editing?.solution ?? "",
    laborCost: editing?.laborCost ?? undefined as number | undefined,
    supplier: editing?.supplier ?? "",
    notes: editing?.notes ?? "",
    hourmeterAtOpen: editing?.hourmeterAtOpen ?? undefined as number | undefined,
  });
  const save = useMutation({
    mutationFn: async () => {
      const dto = {
        companyId, ...f,
        scheduledFor: f.scheduledFor ? new Date(f.scheduledFor).toISOString() : undefined,
      };
      return editing ? updateMaintenanceOrder(editing.id, dto as any) : createMaintenanceOrder(dto as any);
    },
    onSuccess: () => { toast.success("Salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar OS" : "Nova Ordem de Serviço"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Código</Label><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="Auto" /></div>
            <div><Label>Tipo</Label>
              <Select value={f.kind} onValueChange={v => setF({ ...f, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preditiva">Preditiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Prioridade</Label>
              <Select value={f.priority} onValueChange={v => setF({ ...f, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Máquina</Label>
              <Select value={f.machineId ?? "__none"} onValueChange={v => setF({ ...f, machineId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Implemento</Label>
              <Select value={f.implementId ?? "__none"} onValueChange={v => setF({ ...f, implementId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="__none">—</SelectItem>{impls.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Programada para</Label><Input type="date" value={f.scheduledFor} onChange={e => setF({ ...f, scheduledFor: e.target.value })} /></div>
            <div><Label>Horímetro (abertura)</Label><Input type="number" value={f.hourmeterAtOpen ?? ""} onChange={e => setF({ ...f, hourmeterAtOpen: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div><Label>Descrição *</Label><Textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
          <div><Label>Diagnóstico</Label><Textarea rows={2} value={f.diagnosis} onChange={e => setF({ ...f, diagnosis: e.target.value })} /></div>
          <div><Label>Solução aplicada</Label><Textarea rows={2} value={f.solution} onChange={e => setF({ ...f, solution: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Custo mão de obra (R$)</Label><Input type="number" step="0.01" value={f.laborCost ?? ""} onChange={e => setF({ ...f, laborCost: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><Label>Fornecedor externo</Label><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.description || save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetail({ companyId, id, onClose }: { companyId: string; id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: order } = useQuery({ queryKey: ["mo", id], queryFn: () => getMaintenanceOrder(id) });
  const { data: items = [] } = useQuery({
    queryKey: ["inv-items", companyId], queryFn: () => listInventoryItems(companyId),
  });
  const [add, setAdd] = useState({ description: "", quantity: 1, unitCost: undefined as number | undefined, inventoryItemId: undefined as string | undefined, consumeStock: false });

  const addItem = useMutation({
    mutationFn: () => addMaintenanceItem(id, add),
    onSuccess: () => {
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["mo", id] });
      qc.invalidateQueries({ queryKey: ["mo"] });
      setAdd({ description: "", quantity: 1, unitCost: undefined, inventoryItemId: undefined, consumeStock: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rmItem = useMutation({
    mutationFn: (itemId: string) => removeMaintenanceItem(id, itemId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mo", id] }); qc.invalidateQueries({ queryKey: ["mo"] }); },
  });

  if (!order) return null;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-3xl">
        <DialogHeader>
          <DialogTitle>OS {order.code ?? order.id.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="flex gap-2 flex-wrap">
            <Badge>{STATUS_LABEL[order.status] ?? order.status}</Badge>
            <Badge variant="outline">{order.kind}</Badge>
            <Badge variant="secondary">Prioridade: {order.priority}</Badge>
          </div>
          <Card><CardContent className="p-4 grid gap-2">
            <div><span className="text-muted-foreground">Equipamento:</span> {order.machine?.name ?? order.implement?.name ?? "—"}</div>
            <div><span className="text-muted-foreground">Descrição:</span> {order.description}</div>
            {order.diagnosis && <div><span className="text-muted-foreground">Diagnóstico:</span> {order.diagnosis}</div>}
            {order.solution && <div><span className="text-muted-foreground">Solução:</span> {order.solution}</div>}
          </CardContent></Card>

          <div>
            <div className="flex items-center justify-between mb-2"><h3 className="font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Peças e serviços</h3></div>
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><th className="p-2 text-left">Descrição</th><th className="p-2">Qtd</th><th className="p-2">Un.</th><th className="p-2">Total</th><th></th></tr></thead>
                <tbody>
                  {(order.items ?? []).map(it => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-center">{it.unitCost != null ? `R$ ${it.unitCost.toFixed(2)}` : "—"}</td>
                      <td className="p-2 text-center">{it.totalCost != null ? `R$ ${it.totalCost.toFixed(2)}` : "—"}</td>
                      <td className="p-2 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => rmItem.mutate(it.id)}><Trash2 className="h-3 w-3" /></Button></td>
                    </tr>
                  ))}
                  {(order.items ?? []).length === 0 && <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhum item.</td></tr>}
                </tbody>
              </table>
            </CardContent></Card>

            <Card className="mt-3"><CardContent className="p-4 grid gap-3">
              <p className="text-xs font-medium">Adicionar peça / serviço</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Selecionar do estoque</Label>
                  <Select value={add.inventoryItemId ?? "__manual"} onValueChange={v => {
                    if (v === "__manual") { setAdd({ ...add, inventoryItemId: undefined }); return; }
                    const it = items.find(i => i.id === v);
                    setAdd({ ...add, inventoryItemId: v, description: it?.name ?? add.description, unitCost: it?.unitCost ?? add.unitCost });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Manual" /></SelectTrigger>
                    <SelectContent><SelectItem value="__manual">— Manual —</SelectItem>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (est: {i.currentStock})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Descrição</Label><Input value={add.description} onChange={e => setAdd({ ...add, description: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs">Qtd</Label><Input type="number" value={add.quantity} onChange={e => setAdd({ ...add, quantity: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Custo un. (R$)</Label><Input type="number" step="0.01" value={add.unitCost ?? ""} onChange={e => setAdd({ ...add, unitCost: e.target.value ? Number(e.target.value) : undefined })} /></div>
                <div className="flex items-center gap-2">
                  <Checkbox id="consume" checked={add.consumeStock} onCheckedChange={v => setAdd({ ...add, consumeStock: !!v })} disabled={!add.inventoryItemId} />
                  <Label htmlFor="consume" className="text-xs">Baixar do estoque</Label>
                </div>
              </div>
              <Button size="sm" onClick={() => addItem.mutate()} disabled={!add.description || !add.quantity || addItem.isPending}>Adicionar</Button>
            </CardContent></Card>
          </div>

          <div className="flex justify-between border-t pt-3 text-sm">
            <div><span className="text-muted-foreground">Mão de obra:</span> R$ {(order.laborCost ?? 0).toFixed(2)}</div>
            <div><span className="text-muted-foreground">Peças:</span> R$ {(order.partsCost ?? 0).toFixed(2)}</div>
            <div className="font-semibold">Total: R$ {(order.totalCost ?? 0).toFixed(2)}</div>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
