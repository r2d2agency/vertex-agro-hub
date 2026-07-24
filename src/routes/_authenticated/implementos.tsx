import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
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
  createImplement, deleteImplement, listImplements, updateImplement, listMachines,
  IMPLEMENT_CATEGORIES, IMPLEMENT_STATUSES, type Implement,
} from "@/lib/frota.functions";
import { listFarms } from "@/lib/fazendas.functions";

export const Route = createFileRoute("/_authenticated/implementos")({
  head: () => ({ meta: [
    { title: "Implementos — Vertex Agro" },
    { name: "description", content: "Cadastro de implementos e equipamentos acopláveis." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ImplementsPage,
});

const catLabel = (s: string) => IMPLEMENT_CATEGORIES.find((x) => x.value === s)?.label ?? s;
const stLabel = (s: string) => IMPLEMENT_STATUSES.find((x) => x.value === s)?.label ?? s;

function ImplementsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Implement | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Implement | null>(null);

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["implements", companyId],
    queryFn: () => listImplements(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteImplement(id),
    onSuccess: () => { toast.success("Implemento inativado"); qc.invalidateQueries({ queryKey: ["implements"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Implementos"
        description="Equipamentos sem motor: carretas, grades, pulverizadores, tanques."
        actions={companyId && <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Novo implemento</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        loading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : data.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum implemento cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((i) => (
              <Card key={i.id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><p className="truncate font-semibold">{i.name}</p></div>
                      <div className="mt-1 text-xs text-muted-foreground">{i.code && <span className="font-mono">{i.code}</span>} {i.patrimony && <>· Pat. {i.patrimony}</>}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">{catLabel(i.category)}</Badge>
                        <Badge variant="outline">{stLabel(i.status)}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{i.brand} {i.model} {i.year ? `· ${i.year}` : ""}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(i)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <ImplementDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        companyId={companyId}
        initial={editing ?? undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["implements"] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar implemento?</AlertDialogTitle>
            <AlertDialogDescription>O implemento será marcado como inativo. O histórico é preservado.</AlertDialogDescription>
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

const emptyImpl: Partial<Implement> = { name: "", category: "outro", status: "disponivel" };

function ImplementDialog({
  open, onOpenChange, companyId, initial, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string | null; initial?: Implement; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Implement>>(emptyImpl);
  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });
  const { data: machines = [] } = useQuery({ queryKey: ["machines", companyId], queryFn: () => listMachines(companyId!), enabled: !!companyId });

  useEffect(() => { if (open) setV(initial ? { ...initial } : { ...emptyImpl }); }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione empresa");
      const dto = { ...v, companyId, name: (v.name || "").trim() };
      return initial ? updateImplement(initial.id, dto) : createImplement(dto as any);
    },
    onSuccess: () => { toast.success(initial ? "Atualizado" : "Criado"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar implemento" : "Novo implemento"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!(v.name || "").trim()) return toast.error("Nome obrigatório"); mut.mutate(); }} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} required /></div>
            <div><Label>Código</Label><Input value={v.code || ""} onChange={(e) => setV({ ...v, code: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Patrimônio</Label><Input value={v.patrimony || ""} onChange={(e) => setV({ ...v, patrimony: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={v.category || "outro"} onValueChange={(x) => setV({ ...v, category: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{IMPLEMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={v.status || "disponivel"} onValueChange={(x) => setV({ ...v, status: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{IMPLEMENT_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
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
            <div>
              <Label>Máquina padrão</Label>
              <Select value={v.machineId || "none"} onValueChange={(x) => setV({ ...v, machineId: x === "none" ? null : x })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— nenhuma —</SelectItem>
                  {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
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
