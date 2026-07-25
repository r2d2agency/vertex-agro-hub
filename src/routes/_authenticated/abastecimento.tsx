import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Fuel, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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
  listFuelTanks, createFuelTank, updateFuelTank, deleteFuelTank,
  listFuelMovements, createFuelMovement, deleteFuelMovement,
  type FuelTank,
} from "@/lib/frota-ops.functions";
import { listMachines, listOperators } from "@/lib/frota.functions";
import { listFarms } from "@/lib/territorio.functions";

export const Route = createFileRoute("/_authenticated/abastecimento")({
  head: () => ({ meta: [
    { title: "Abastecimento — Vertex Agro" },
    { name: "description", content: "Controle de tanques de diesel e abastecimento de máquinas." },
    { name: "robots", content: "noindex" },
  ] }),
  component: FuelPage,
});

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function FuelPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [tankForm, setTankForm] = useState<{ open: boolean; editing: FuelTank | null }>({ open: false, editing: null });
  const [mvForm, setMvForm] = useState<{ open: boolean; kind: "entrada" | "saida" | "ajuste"; tankId?: string } | null>(null);

  const { data: tanks = [] } = useQuery({
    queryKey: ["fuel-tanks", companyId], enabled: !!companyId,
    queryFn: () => listFuelTanks(companyId!),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["fuel-movements", companyId], enabled: !!companyId,
    queryFn: () => listFuelMovements(companyId!),
  });
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId], enabled: !!companyId,
    queryFn: () => listFarms(companyId!),
  });
  const { data: machines = [] } = useQuery({
    queryKey: ["machines", companyId], enabled: !!companyId,
    queryFn: () => listMachines(companyId!),
  });
  const { data: operators = [] } = useQuery({
    queryKey: ["operators", companyId], enabled: !!companyId,
    queryFn: () => listOperators(companyId!),
  });

  const totalDiesel = tanks.reduce((s, t) => s + t.currentLevel, 0);
  const totalCap = tanks.reduce((s, t) => s + (t.capacity ?? 0), 0);

  const delTank = useMutation({
    mutationFn: (id: string) => deleteFuelTank(id),
    onSuccess: () => { toast.success("Tanque removido"); qc.invalidateQueries({ queryKey: ["fuel-tanks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMv = useMutation({
    mutationFn: (id: string) => deleteFuelMovement(id),
    onSuccess: () => {
      toast.success("Movimento estornado");
      qc.invalidateQueries({ queryKey: ["fuel-movements"] });
      qc.invalidateQueries({ queryKey: ["fuel-tanks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Abastecimento e Estoque de Diesel"
        description="Tanques, entradas de combustível e saídas para as máquinas."
        actions={companyId && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTankForm({ open: true, editing: null })}>
              <Plus className="mr-2 h-4 w-4" /> Novo tanque
            </Button>
            <Button onClick={() => setMvForm({ open: true, kind: "saida" })} disabled={tanks.length === 0}>
              <Fuel className="mr-2 h-4 w-4" /> Abastecer
            </Button>
          </div>
        )}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Diesel disponível</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{totalDiesel.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Capacidade total</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{totalCap.toLocaleString("pt-BR")} L</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Tanques ativos</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{tanks.length}</CardContent></Card>
          </div>

          <Tabs defaultValue="tanks">
            <TabsList>
              <TabsTrigger value="tanks">Tanques</TabsTrigger>
              <TabsTrigger value="movements">Movimentações</TabsTrigger>
            </TabsList>

            <TabsContent value="tanks" className="mt-4 grid gap-3 md:grid-cols-2">
              {tanks.map(t => {
                const pct = t.capacity ? Math.min(100, (t.currentLevel / t.capacity) * 100) : 0;
                const low = t.minLevel != null && t.currentLevel <= t.minLevel;
                return (
                  <Card key={t.id}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{t.fuelType}{t.location ? ` · ${t.location}` : ""}</p>
                      </div>
                      {low && <Badge variant="destructive">Nível baixo</Badge>}
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{t.currentLevel.toFixed(0)} L</span>
                          <span className="text-muted-foreground">{t.capacity ? `${t.capacity.toFixed(0)} L` : "—"}</span>
                        </div>
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div className={`h-full ${low ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setMvForm({ open: true, kind: "entrada", tankId: t.id })}>
                          <ArrowDownToLine className="mr-1 h-3 w-3" /> Entrada
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setMvForm({ open: true, kind: "saida", tankId: t.id })}>
                          <ArrowUpFromLine className="mr-1 h-3 w-3" /> Saída
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setTankForm({ open: true, editing: t })}>Editar</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Remover ${t.name}?`)) delTank.mutate(t.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {tanks.length === 0 && <Card className="md:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum tanque cadastrado.</CardContent></Card>}
            </TabsContent>

            <TabsContent value="movements" className="mt-4">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr><th className="p-3">Data</th><th className="p-3">Tanque</th><th className="p-3">Tipo</th><th className="p-3">Litros</th><th className="p-3">Máquina</th><th className="p-3">Custo</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id} className="border-t">
                        <td className="p-3">{fmtDate(m.occurredAt)}</td>
                        <td className="p-3">{m.tank?.name ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant={m.kind === "entrada" ? "default" : m.kind === "saida" ? "secondary" : "outline"}>{m.kind}</Badge>
                        </td>
                        <td className="p-3 font-medium">{m.liters.toFixed(1)} L</td>
                        <td className="p-3">{m.machine?.name ?? "—"}</td>
                        <td className="p-3">{m.totalCost != null ? `R$ ${m.totalCost.toFixed(2)}` : "—"}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Estornar este movimento?")) delMv.mutate(m.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {movements.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma movimentação registrada.</td></tr>}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {companyId && tankForm.open && (
        <TankDialog
          companyId={companyId}
          farms={farms.map(f => ({ id: f.id, name: f.name }))}
          editing={tankForm.editing}
          onClose={() => setTankForm({ open: false, editing: null })}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["fuel-tanks"] }); setTankForm({ open: false, editing: null }); }}
        />
      )}

      {companyId && mvForm?.open && (
        <MovementDialog
          companyId={companyId}
          kind={mvForm.kind}
          initialTankId={mvForm.tankId}
          tanks={tanks}
          machines={machines.map(m => ({ id: m.id, name: m.name, plate: m.plate }))}
          operators={operators.map(o => ({ id: o.id, name: o.name }))}
          onClose={() => setMvForm(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["fuel-movements"] });
            qc.invalidateQueries({ queryKey: ["fuel-tanks"] });
            setMvForm(null);
          }}
        />
      )}
    </div>
  );
}

function TankDialog({ companyId, farms, editing, onClose, onSaved }: {
  companyId: string; farms: Array<{ id: string; name: string }>;
  editing: FuelTank | null; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: editing?.name ?? "",
    fuelType: editing?.fuelType ?? "Diesel S10",
    capacity: editing?.capacity ?? undefined as number | undefined,
    currentLevel: editing?.currentLevel ?? 0,
    minLevel: editing?.minLevel ?? undefined as number | undefined,
    farmId: editing?.farmId ?? undefined as string | undefined,
    location: editing?.location ?? "",
    notes: editing?.notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const dto = { companyId, ...f };
      return editing ? updateFuelTank(editing.id, dto) : createFuelTank(dto);
    },
    onSuccess: () => { toast.success(editing ? "Tanque atualizado" : "Tanque criado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar tanque" : "Novo tanque"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nome *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Combustível</Label>
              <Select value={f.fuelType} onValueChange={v => setF({ ...f, fuelType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                  <SelectItem value="Diesel S500">Diesel S500</SelectItem>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Etanol">Etanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fazenda</Label>
              <Select value={f.farmId ?? "__none"} onValueChange={v => setF({ ...f, farmId: v === "__none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Central</SelectItem>
                  {farms.map(fm => <SelectItem key={fm.id} value={fm.id}>{fm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Capacidade (L)</Label><Input type="number" value={f.capacity ?? ""} onChange={e => setF({ ...f, capacity: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div><Label>Nível atual (L)</Label><Input type="number" value={f.currentLevel} onChange={e => setF({ ...f, currentLevel: Number(e.target.value) })} /></div>
            <div><Label>Mínimo (L)</Label><Input type="number" value={f.minLevel ?? ""} onChange={e => setF({ ...f, minLevel: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          <div><Label>Local</Label><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.name || save.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ companyId, kind, initialTankId, tanks, machines, operators, onClose, onSaved }: {
  companyId: string; kind: "entrada" | "saida" | "ajuste"; initialTankId?: string;
  tanks: FuelTank[]; machines: Array<{ id: string; name: string; plate: string | null }>;
  operators: Array<{ id: string; name: string }>;
  onClose: () => void; onSaved: () => void;
}) {
  const [k, setK] = useState(kind);
  const [f, setF] = useState({
    tankId: initialTankId ?? tanks[0]?.id ?? "",
    liters: 0,
    unitCost: undefined as number | undefined,
    supplier: "",
    invoiceNumber: "",
    machineId: undefined as string | undefined,
    operatorId: undefined as string | undefined,
    hourmeter: undefined as number | undefined,
    notes: "",
  });
  const save = useMutation({
    mutationFn: () => createFuelMovement({ companyId, kind: k, ...f }),
    onSuccess: () => { toast.success("Movimento registrado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Movimentação de combustível</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={k} onValueChange={v => setK(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (compra)</SelectItem>
                  <SelectItem value="saida">Saída (abastecimento)</SelectItem>
                  <SelectItem value="ajuste">Ajuste de estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tanque *</Label>
              <Select value={f.tankId} onValueChange={v => setF({ ...f, tankId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} · {t.currentLevel.toFixed(0)}L</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{k === "ajuste" ? "Novo nível (L)" : "Litros"} *</Label>
              <Input type="number" value={f.liters} onChange={e => setF({ ...f, liters: Number(e.target.value) })} /></div>
            <div><Label>Custo unitário (R$/L)</Label>
              <Input type="number" step="0.01" value={f.unitCost ?? ""} onChange={e => setF({ ...f, unitCost: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
          {k === "entrada" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fornecedor</Label><Input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></div>
              <div><Label>Nota fiscal</Label><Input value={f.invoiceNumber} onChange={e => setF({ ...f, invoiceNumber: e.target.value })} /></div>
            </div>
          )}
          {k === "saida" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Máquina</Label>
                  <Select value={f.machineId ?? "__none"} onValueChange={v => setF({ ...f, machineId: v === "__none" ? undefined : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.plate ? ` · ${m.plate}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Operador</Label>
                  <Select value={f.operatorId ?? "__none"} onValueChange={v => setF({ ...f, operatorId: v === "__none" ? undefined : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Horímetro atual</Label>
                <Input type="number" value={f.hourmeter ?? ""} onChange={e => setF({ ...f, hourmeter: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </>
          )}
          <div><Label>Observações</Label><Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!f.tankId || !f.liters || save.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
