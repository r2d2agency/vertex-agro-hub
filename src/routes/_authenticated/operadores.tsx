import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
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
  createOperator, deleteOperator, listOperators, updateOperator,
  OPERATOR_STATUSES, type Operator,
} from "@/lib/frota.functions";
import { listFarms } from "@/lib/fazendas.functions";

export const Route = createFileRoute("/_authenticated/operadores")({
  head: () => ({ meta: [
    { title: "Operadores — Vertex Agro" },
    { name: "description", content: "Operadores de máquinas vinculados à fazenda." },
    { name: "robots", content: "noindex" },
  ] }),
  component: OperatorsPage,
});

const stLabel = (s: string) => OPERATOR_STATUSES.find((x) => x.value === s)?.label ?? s;

function OperatorsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Operator | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Operator | null>(null);

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["operators", companyId],
    queryFn: () => listOperators(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteOperator(id),
    onSuccess: () => { toast.success("Operador inativado"); qc.invalidateQueries({ queryKey: ["operators"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Operadores"
        description="Cadastro de operadores. O acesso ao App do Monitor virá em sub-sprints futuras."
        actions={companyId && <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Novo operador</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        loading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : data.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum operador cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((o) => (
              <Card key={o.id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><UserCog className="h-4 w-4 text-primary" /><p className="truncate font-semibold">{o.name}</p></div>
                      <div className="mt-1 text-xs text-muted-foreground">{o.cpf && <>CPF: {o.cpf}</>} {o.phone && <>· {o.phone}</>}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">{stLabel(o.status)}</Badge>
                        {o.cnhCategory && <Badge variant="outline">CNH {o.cnhCategory}</Badge>}
                      </div>
                      {o.cnhExpiresAt && <div className="mt-2 text-xs text-muted-foreground">CNH válida até {new Date(o.cnhExpiresAt).toLocaleDateString("pt-BR")}</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(o)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <OperatorDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        companyId={companyId}
        initial={editing ?? undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["operators"] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar operador?</AlertDialogTitle>
            <AlertDialogDescription>O registro é preservado para o histórico.</AlertDialogDescription>
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

const empty: Partial<Operator> = { name: "", status: "ativo" };

function OperatorDialog({
  open, onOpenChange, companyId, initial, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string | null; initial?: Operator; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Operator>>(empty);
  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });

  useEffect(() => { if (open) setV(initial ? { ...initial } : { ...empty }); }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione empresa");
      const dto = { ...v, companyId, name: (v.name || "").trim() };
      return initial ? updateOperator(initial.id, dto) : createOperator(dto as any);
    },
    onSuccess: () => { toast.success(initial ? "Atualizado" : "Criado"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar operador" : "Novo operador"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!(v.name || "").trim()) return toast.error("Nome obrigatório"); mut.mutate(); }} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} required /></div>
            <div><Label>CPF</Label><Input value={v.cpf || ""} onChange={(e) => setV({ ...v, cpf: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={v.phone || ""} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={v.email || ""} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
              <Label>Status</Label>
              <Select value={v.status || "ativo"} onValueChange={(x) => setV({ ...v, status: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OPERATOR_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Admissão</Label><Input type="date" value={v.admissionDate?.slice(0, 10) || ""} onChange={(e) => setV({ ...v, admissionDate: e.target.value || null })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria da CNH</Label><Input value={v.cnhCategory || ""} onChange={(e) => setV({ ...v, cnhCategory: e.target.value })} placeholder="Ex.: D, E" /></div>
            <div><Label>Validade CNH</Label><Input type="date" value={v.cnhExpiresAt?.slice(0, 10) || ""} onChange={(e) => setV({ ...v, cnhExpiresAt: e.target.value || null })} /></div>
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
