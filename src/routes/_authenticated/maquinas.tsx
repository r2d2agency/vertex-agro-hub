import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createMachine, deleteMachine, listMachines, updateMachine,
  FUEL_TYPES, MACHINE_CATEGORIES, MACHINE_STATUSES, type Machine,
} from "@/lib/frota.functions";
import { listFarms } from "@/lib/fazendas.functions";

export const Route = createFileRoute("/_authenticated/maquinas")({
  head: () => ({ meta: [
    { title: "Máquinas — Vertex Agro" },
    { name: "description", content: "Cadastro de máquinas, tratores e equipamentos motorizados." },
    { name: "robots", content: "noindex" },
  ] }),
  component: MachinesPage,
});

const statusColor: Record<string, string> = {
  disponivel: "bg-green-100 text-green-800",
  em_operacao: "bg-blue-100 text-blue-800",
  em_manutencao: "bg-orange-100 text-orange-800",
  parada: "bg-yellow-100 text-yellow-800",
  indisponivel: "bg-gray-200 text-gray-800",
  inativa: "bg-red-100 text-red-800",
};
const statusLabel = (s: string) => MACHINE_STATUSES.find((x) => x.value === s)?.label ?? s;
const catLabel = (s: string) => MACHINE_CATEGORIES.find((x) => x.value === s)?.label ?? s;

function MachinesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Machine | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Machine | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["machines", companyId, statusFilter],
    queryFn: () => listMachines(companyId!, { status: statusFilter || undefined }),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteMachine(id),
    onSuccess: () => { toast.success("Máquina inativada"); qc.invalidateQueries({ queryKey: ["machines"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Máquinas"
        description="Frota cadastrada por empresa e fazenda."
        actions={companyId && (
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova máquina</Button>
        )}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MACHINE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma máquina cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((m) => (
                <Card key={m.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          <Link to="/maquinas/$id" params={{ id: m.id }} className="truncate font-semibold hover:underline">{m.name}</Link>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                          {m.code && <span className="font-mono">{m.code}</span>}
                          {m.patrimony && <span>· Pat. {m.patrimony}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge className={statusColor[m.status] ?? ""} variant="outline">{statusLabel(m.status)}</Badge>
                          <Badge variant="outline">{catLabel(m.category)}</Badge>
                          {m.plate && <Badge variant="outline">{m.plate}</Badge>}
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {m.brand} {m.model} {m.year ? `· ${m.year}` : ""}
                          {m.hourmeter != null && <> · Horímetro: {m.hourmeter} {m.hourmeterUnit || "h"}</>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <MachineDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        companyId={companyId}
        initial={editing ?? undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["machines"] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar máquina?</AlertDialogTitle>
            <AlertDialogDescription>A máquina será marcada como inativa. O histórico é preservado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormState = Partial<Machine>;
const empty: FormState = { name: "", category: "trator", status: "disponivel", hourmeterUnit: "h", fuelType: "Diesel S10" };

function MachineDialog({
  open, onOpenChange, companyId, initial, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string | null; initial?: Machine; onSaved: () => void }) {
  const [v, setV] = useState<FormState>(empty);
  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });

  useEffect(() => {
    if (!open) return;
    setV(initial ? { ...initial } : { ...empty });
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const dto = { ...v, companyId, name: (v.name || "").trim() };
      if (initial) return updateMachine(initial.id, dto as any);
      return createMachine(dto as any);
    },
    onSuccess: () => { toast.success(initial ? "Máquina atualizada" : "Máquina criada"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar máquina" : "Nova máquina"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!(v.name || "").trim()) return toast.error("Nome obrigatório"); mut.mutate(); }} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} required /></div>
            <div><Label>Código interno</Label><Input value={v.code || ""} onChange={(e) => setV({ ...v, code: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Patrimônio</Label><Input value={v.patrimony || ""} onChange={(e) => setV({ ...v, patrimony: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={v.category || "trator"} onValueChange={(x) => setV({ ...v, category: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MACHINE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={v.status || "disponivel"} onValueChange={(x) => setV({ ...v, status: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MACHINE_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Marca</Label><Input value={v.brand || ""} onChange={(e) => setV({ ...v, brand: e.target.value })} /></div>
            <div><Label>Modelo</Label><Input value={v.model || ""} onChange={(e) => setV({ ...v, model: e.target.value })} /></div>
            <div><Label>Ano</Label><Input type="number" value={v.year ?? ""} onChange={(e) => setV({ ...v, year: e.target.value ? Number(e.target.value) : null })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Nº de série</Label><Input value={v.serial || ""} onChange={(e) => setV({ ...v, serial: e.target.value })} /></div>
            <div><Label>Placa</Label><Input value={v.plate || ""} onChange={(e) => setV({ ...v, plate: e.target.value })} /></div>
            <div>
              <Label>Fazenda</Label>
              <Select value={v.farmId || "none"} onValueChange={(x) => setV({ ...v, farmId: x === "none" ? null : x })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— nenhuma —</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><Label>Capacidade tanque (L)</Label><Input type="number" step="0.01" value={v.tankCapacity ?? ""} onChange={(e) => setV({ ...v, tankCapacity: e.target.value ? Number(e.target.value) : null })} /></div>
            <div>
              <Label>Combustível</Label>
              <Select value={v.fuelType || "Diesel S10"} onValueChange={(x) => setV({ ...v, fuelType: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Horímetro</Label><Input type="number" step="0.01" value={v.hourmeter ?? ""} onChange={(e) => setV({ ...v, hourmeter: e.target.value ? Number(e.target.value) : null })} /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={v.hourmeterUnit || "h"} onValueChange={(x) => setV({ ...v, hourmeterUnit: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="h">horas</SelectItem><SelectItem value="km">km</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de aquisição</Label><Input type="date" value={v.acquisitionDate?.slice(0, 10) || ""} onChange={(e) => setV({ ...v, acquisitionDate: e.target.value || null })} /></div>
            <div><Label>Fornecedor</Label><Input value={v.supplier || ""} onChange={(e) => setV({ ...v, supplier: e.target.value })} /></div>
          </div>
          <div><Label>Foto (URL)</Label><Input value={v.photoUrl || ""} onChange={(e) => setV({ ...v, photoUrl: e.target.value })} placeholder="https://…" /></div>
          <div><Label>Observações</Label><Textarea rows={3} value={v.notes || ""} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
