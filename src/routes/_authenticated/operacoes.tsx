import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createOperationType, deleteOperationType, listOperationTypes, updateOperationType,
  type OperationType,
} from "@/lib/frota.functions";

export const Route = createFileRoute("/_authenticated/operacoes")({
  head: () => ({ meta: [
    { title: "Operações — Vertex Agro" },
    { name: "description", content: "Catálogo de operações executadas pelas máquinas." },
    { name: "robots", content: "noindex" },
  ] }),
  component: OpsPage,
});

function OpsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<OperationType | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<OperationType | null>(null);

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["operation-types", companyId],
    queryFn: () => listOperationTypes(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteOperationType(id),
    onSuccess: () => { toast.success("Operação inativada"); qc.invalidateQueries({ queryKey: ["operation-types"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Operações"
        description="Catálogo pré-cadastrado de operações. O monitor seleciona ao invés de digitar."
        actions={companyId && <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova operação</Button>}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        loading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Operação</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Requer</th>
                    <th className="p-3">Consumo</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><span>{o.name}</span></div>
                        {o.code && <div className="font-mono text-xs text-muted-foreground">{o.code}</div>}
                      </td>
                      <td className="p-3">{o.category ?? "—"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {o.requiresHourmeter && <Badge variant="outline" className="text-xs">Horímetro</Badge>}
                          {o.requiresOperator && <Badge variant="outline" className="text-xs">Operador</Badge>}
                          {o.requiresPhoto && <Badge variant="outline" className="text-xs">Foto</Badge>}
                          {o.requiresLocation && <Badge variant="outline" className="text-xs">GPS</Badge>}
                        </div>
                      </td>
                      <td className="p-3">{o.consumesFuel ? "Sim" : "Não"}</td>
                      <td className="p-3"><Badge variant={o.active ? "default" : "outline"}>{o.active ? "Ativa" : "Inativa"}</Badge></td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(o)}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma operação cadastrada.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      )}

      <OpDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        companyId={companyId}
        initial={editing ?? undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["operation-types"] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar operação?</AlertDialogTitle>
            <AlertDialogDescription>A operação deixará de aparecer como opção nova, mas o histórico é preservado.</AlertDialogDescription>
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

const empty: Partial<OperationType> = {
  name: "", requiresHourmeter: true, requiresOperator: true,
  requiresPhoto: false, requiresLocation: true, consumesFuel: true, active: true,
};

function OpDialog({
  open, onOpenChange, companyId, initial, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string | null; initial?: OperationType; onSaved: () => void }) {
  const [v, setV] = useState<Partial<OperationType>>(empty);
  useEffect(() => { if (open) setV(initial ? { ...initial } : { ...empty }); }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Selecione empresa");
      const dto = { ...v, companyId, name: (v.name || "").trim() };
      return initial ? updateOperationType(initial.id, dto) : createOperationType(dto as any);
    },
    onSuccess: () => { toast.success(initial ? "Atualizado" : "Criado"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const flag = (key: keyof OperationType, label: string) => (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label>{label}</Label>
      <Switch checked={Boolean(v[key])} onCheckedChange={(x) => setV({ ...v, [key]: x })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar operação" : "Nova operação"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!(v.name || "").trim()) return toast.error("Nome obrigatório"); mut.mutate(); }} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} required /></div>
            <div><Label>Código</Label><Input value={v.code || ""} onChange={(e) => setV({ ...v, code: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label><Input value={v.category || ""} onChange={(e) => setV({ ...v, category: e.target.value })} placeholder="transporte, campo…" /></div>
            <div><Label>Unidade</Label><Input value={v.unit || ""} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="ha, km, viagens…" /></div>
          </div>
          <div><Label>Descrição</Label><Textarea rows={2} value={v.description || ""} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            {flag("requiresHourmeter", "Exige horímetro")}
            {flag("requiresOperator", "Exige operador")}
            {flag("requiresPhoto", "Exige fotografia")}
            {flag("requiresLocation", "Exige localização (GPS)")}
            {flag("consumesFuel", "Consome combustível")}
            {flag("active", "Ativa")}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
