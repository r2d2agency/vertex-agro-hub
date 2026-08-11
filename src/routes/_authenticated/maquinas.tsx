import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck, Camera } from "lucide-react";
import { FileDropzone } from "@/components/vertex/file-dropzone";
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
    mutationFn: async (data: FormState) => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const dto = { ...data, companyId, name: (data.name || "").trim() };
      if (initial) return updateMachine(initial.id, dto as any);
      return createMachine(dto as any);
    },
    onSuccess: () => { 
      toast.success(initial ? "Máquina atualizada" : "Máquina criada"); 
      onSaved(); 
      onOpenChange(false); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar máquina" : "Nova máquina"}</DialogTitle></DialogHeader>
        <div className="flex flex-col h-full max-h-[80vh]">
          <Tabs defaultValue="dados" className="flex-1 overflow-auto">
            <div className="px-6">
              <TabsList className="mb-4">
                <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dados" className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome da Máquina *"><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Ex: Trator 01" required /></Field>
                <Field label="Código/Prefixo"><Input value={v.code || ""} onChange={(e) => setV({ ...v, code: e.target.value })} placeholder="Ex: T-01" /></Field>
                <Field label="Patrimônio"><Input value={v.patrimony || ""} onChange={(e) => setV({ ...v, patrimony: e.target.value })} /></Field>
                <Field label="Categoria">
                  <Select value={v.category} onValueChange={(val) => setV({ ...v, category: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MACHINE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marca"><Input value={v.brand || ""} onChange={(e) => setV({ ...v, brand: e.target.value })} /></Field>
                <Field label="Modelo"><Input value={v.model || ""} onChange={(e) => setV({ ...v, model: e.target.value })} /></Field>
                <Field label="Ano"><Input type="number" value={v.year || ""} onChange={(e) => setV({ ...v, year: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                <Field label="Chassi/Serial"><Input value={v.serial || ""} onChange={(e) => setV({ ...v, serial: e.target.value })} /></Field>
                <Field label="Placa"><Input value={v.plate || ""} onChange={(e) => setV({ ...v, plate: e.target.value })} /></Field>
                <Field label="Capacidade Tanque (L)"><Input type="number" step="0.01" value={v.tankCapacity ?? ""} onChange={(e) => setV({ ...v, tankCapacity: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Tipo Combustível">
                  <Select value={v.fuelType || ""} onValueChange={(val) => setV({ ...v, fuelType: val })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fazenda Vinculada">
                  <Select value={v.farmId || "none"} onValueChange={(x) => setV({ ...v, farmId: x === "none" ? null : x })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nenhuma —</SelectItem>
                      {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div>
                <Label>Notas/Observações</Label>
                <Textarea rows={3} value={v.notes || ""} onChange={(e) => setV({ ...v, notes: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="fotos" className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(v.photoUrls || []).map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setV({ ...v, photoUrls: v.photoUrls?.filter((_, idx) => idx !== i) })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <FileDropzone
                  preview="image"
                  accept="image/*"
                  label="Adicionar foto"
                  onUploaded={(url) => setV({ ...v, photoUrls: [...(v.photoUrls || []), url] })}
                  className="aspect-square"
                />
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="px-6 pb-6 space-y-4">
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Funcionalidade de Checklist técnico será configurada no Módulo de Manutenção.
              </div>
            </TabsContent>
          </Tabs>

          <div className="px-6 pb-6 border-t pt-4">
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={() => mut.mutate(v)} disabled={mut.isPending}>
              {mut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
