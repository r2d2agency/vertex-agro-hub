import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Package, AlertTriangle } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  listInventoryMovements, createInventoryMovement, type InventoryItem,
} from "@/lib/frota-ops.functions";
import { listFarms } from "@/lib/fazendas.functions";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [
    { title: "Estoque — Vertex Agro" },
    { name: "description", content: "Estoque de peças, produtos e insumos." },
    { name: "robots", content: "noindex" },
  ] }),
  component: StockPage,
});

const CATS = [
  { v: "peca", label: "Peça" },
  { v: "insumo", label: "Insumo" },
  { v: "produto", label: "Produto" },
  { v: "lubrificante", label: "Lubrificante" },
  { v: "ferramenta", label: "Ferramenta" },
  { v: "outro", label: "Outro" },
];

function StockPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [tab, setTab] = useState("items");
  const [farmFilter, setFarmFilter] = useState<string>("all");
  const [form, setForm] = useState<{ open: boolean; editing: InventoryItem | null }>({ open: false, editing: null });
  const [mv, setMv] = useState<{ open: boolean; itemId?: string } | null>(null);

  const { data: itemsAll = [] } = useQuery({
    queryKey: ["inv-items", companyId], enabled: !!companyId,
    queryFn: () => listInventoryItems(companyId!),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["inv-movements", companyId], enabled: !!companyId,
    queryFn: () => listInventoryMovements(companyId!),
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId], enabled: !!companyId,
    queryFn: () => listFarms(companyId!),
  });

  const items = useMemo(
    () => farmFilter === "all" ? itemsAll : itemsAll.filter(i => (i.farmId ?? "") === (farmFilter === "none" ? "" : farmFilter)),
    [itemsAll, farmFilter],
  );
  const low = useMemo(() => items.filter(i => i.minStock != null && i.currentStock <= i.minStock), [items]);
  const totalValue = items.reduce((s, i) => s + (i.unitCost ?? 0) * i.currentStock, 0);

  const del = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => { toast.success("Item removido"); qc.invalidateQueries({ queryKey: ["inv-items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Estoque de Produtos e Peças"
        description="Cadastro de itens, entradas, saídas e alertas de estoque mínimo."
        actions={companyId && <Button onClick={() => setForm({ open: true, editing: null })}><Plus className="mr-2 h-4 w-4" /> Novo item</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Itens cadastrados</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{items.length}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Alertas de estoque</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold flex items-center gap-2">
                {low.length > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}{low.length}
              </CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Valor em estoque</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">R$ {totalValue.toFixed(2)}</CardContent></Card>
          </div>

          {low.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm">Itens abaixo do estoque mínimo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {low.map(i => <Badge key={i.id} variant="outline" className="mr-2 mb-1">{i.name} · {i.currentStock}{i.unit}</Badge>)}
              </CardContent>
            </Card>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="items">Itens</TabsTrigger>
                <TabsTrigger value="movements">Movimentações</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Fazenda:</span>
                <Select value={farmFilter} onValueChange={setFarmFilter}>
                  <SelectTrigger className="h-8 w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="none">Sem vínculo (empresa)</SelectItem>
                    {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="items" className="mt-4">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr><th className="p-3">Item</th><th className="p-3">Fazenda</th><th className="p-3">Categoria</th><th className="p-3">Estoque</th><th className="p-3">Mín.</th><th className="p-3">Custo un.</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {items.map(i => (
                      <tr key={i.id} className="border-t">
                        <td className="p-3"><div className="font-medium">{i.name}</div><div className="text-xs text-muted-foreground">{i.sku ?? "—"}</div></td>
                        <td className="p-3 text-xs">{farms.find(f => f.id === i.farmId)?.name ?? "—"}</td>
                        <td className="p-3"><Badge variant="secondary">{CATS.find(c => c.v === i.category)?.label ?? i.category}</Badge></td>
                        <td className="p-3">{i.currentStock} {i.unit}</td>
                        <td className="p-3">{i.minStock ?? "—"}</td>
                        <td className="p-3">{i.unitCost != null ? `R$ ${i.unitCost.toFixed(2)}` : "—"}</td>
                        <td className="p-3 text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => setMv({ open: true, itemId: i.id })}>Movimentar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, editing: i })}>Editar</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Remover ${i.name}?`)) del.mutate(i.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" />Nenhum item cadastrado.</td></tr>}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="movements" className="mt-4">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr><th className="p-3">Data</th><th className="p-3">Item</th><th className="p-3">Tipo</th><th className="p-3">Qtd</th><th className="p-3">Motivo</th><th className="p-3">Custo</th></tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id} className="border-t">
                        <td className="p-3">{new Date(m.occurredAt).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3">{m.item?.name ?? "—"}</td>
                        <td className="p-3"><Badge variant={m.kind === "entrada" ? "default" : "secondary"}>{m.kind}</Badge></td>
                        <td className="p-3 font-medium">{m.quantity} {m.item?.unit}</td>
                        <td className="p-3">{m.reason ?? m.supplier ?? "—"}</td>
                        <td className="p-3">{m.totalCost != null ? `R$ ${m.totalCost.toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma movimentação.</td></tr>}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {companyId && form.open && (
        <ItemDialog companyId={companyId} editing={form.editing} farms={farms}
          defaultFarmId={farmFilter !== "all" && farmFilter !== "none" ? farmFilter : undefined}
          onClose={() => setForm({ open: false, editing: null })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["inv-items"] }); setForm({ open: false, editing: null }); }} />
      )}
      {companyId && mv?.open && (
        <InvMovementDialog companyId={companyId} items={items} initialItemId={mv.itemId}
          onClose={() => setMv(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["inv-movements"] }); qc.invalidateQueries({ queryKey: ["inv-items"] }); setMv(null); }} />
      )}
    </div>
  );
}

function ItemDialog({ companyId, editing, farms, defaultFarmId, onClose, onSaved }: {
  companyId: string; editing: InventoryItem | null; farms: Array<{ id: string; name: string }>;
  defaultFarmId?: string; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: editing?.name ?? "",
    sku: editing?.sku ?? "",
    category: editing?.category ?? "insumo",
    unit: editing?.unit ?? "un",
    farmId: (editing?.farmId ?? defaultFarmId ?? "") as string,
    currentStock: editing?.currentStock ?? 0,
    minStock: editing?.minStock ?? undefined as number | undefined,
    unitCost: editing?.unitCost ?? undefined as number | undefined,
    supplier: editing?.supplier ?? "",
    location: editing?.location ?? "",
    notes: editing?.notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { farmId, ...rest } = f;
      const dto = { companyId, farmId: farmId || null, ...rest } as any;
      return editing ? updateInventoryItem(editing.id, dto) : createInventoryItem(dto);
    },
    onSuccess: () => { toast.success("Salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Categoria</Label>
              <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Unidade</Label><Input value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /></div>
            <div><Label>Custo un. (R$)</Label><Input type="number" step="0.01" value={f.unitCost ?? ""} onChange={e => setF({ ...f, unitCost: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Estoque atual</Label><Input type="number" value={f.currentStock} onChange={e => setF({ ...f, currentStock: Number(e.target.value) })} disabled={!!editing} /></div>
            <div><Label>Estoque mínimo</Label><Input type="number" value={f.minStock ?? ""} onChange={e => setF({ ...f, minStock: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fazenda (opcional)</Label>
              <Select value={f.farmId || "none"} onValueChange={v => setF({ ...f, farmId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todas / empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Empresa (todas)</SelectItem>
                  {farms.map(fm => <SelectItem key={fm.id} value={fm.id}>{fm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Local (galpão/prateleira)</Label><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fornecedor</Label><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
            <div />
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          {editing && <p className="text-xs text-muted-foreground">Ajuste o estoque usando o botão "Movimentar" na lista.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.name || save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvMovementDialog({ companyId, items, initialItemId, onClose, onSaved }: {
  companyId: string; items: InventoryItem[]; initialItemId?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    itemId: initialItemId ?? items[0]?.id ?? "",
    kind: "entrada" as "entrada" | "saida" | "ajuste",
    quantity: 0,
    unitCost: undefined as number | undefined,
    reason: "",
    supplier: "",
    invoiceNumber: "",
    notes: "",
  });
  const save = useMutation({
    mutationFn: () => createInventoryMovement({ companyId, ...f }),
    onSuccess: () => { toast.success("Movimento registrado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const item = items.find(i => i.id === f.itemId);
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Movimentar estoque</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Item *</Label>
            <Select value={f.itemId} onValueChange={v => setF({ ...f, itemId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} · {i.currentStock}{i.unit}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={f.kind} onValueChange={v => setF({ ...f, kind: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{f.kind === "ajuste" ? `Novo estoque (${item?.unit ?? ""})` : `Quantidade (${item?.unit ?? ""})`} *</Label>
              <Input type="number" value={f.quantity} onChange={e => setF({ ...f, quantity: Number(e.target.value) })} /></div>
          </div>
          {f.kind === "entrada" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo un. (R$)</Label><Input type="number" step="0.01" value={f.unitCost ?? ""} onChange={e => setF({ ...f, unitCost: e.target.value ? Number(e.target.value) : undefined })} /></div>
              <div><Label>Fornecedor</Label><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
              <div className="col-span-2"><Label>Nota fiscal</Label><Input value={f.invoiceNumber} onChange={e => setF({ ...f, invoiceNumber: e.target.value })} /></div>
            </div>
          )}
          {f.kind !== "entrada" && (
            <div><Label>Motivo</Label><Input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
          )}
          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.itemId || save.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
