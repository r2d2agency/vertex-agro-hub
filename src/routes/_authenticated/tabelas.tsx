import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  createTappingTable, deleteTappingTable, listTappingTables, updateTappingTable,
  type TappingTable, type TappingTableInput,
} from "@/lib/tabelas.functions";

export const Route = createFileRoute("/_authenticated/tabelas")({
  head: () => ({
    meta: [
      { title: "Tabelas de Sangria — Vertex Agro" },
      { name: "description", content: "Sistemas e tabelas operacionais de sangria." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TabelasPage,
});

const empty: TappingTableInput = {
  name: "", code: "", notation: "", cutType: "",
  frequencyDays: null, restDays: null, workDaysCycle: null,
  stimulation: "", description: "", active: true,
};

function TabelasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TappingTable | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<TappingTable | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["tapping-tables", companyId],
    queryFn: () => listTappingTables(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTappingTable(id),
    onSuccess: () => {
      toast.success("Tabela excluída");
      qc.invalidateQueries({ queryKey: ["tapping-tables", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Tabelas de Sangria"
        description="Sistemas de sangria (D/2, D/3, D/4), frequência e estimulação."
        actions={
          companyId ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova tabela
            </Button>
          ) : null
        }
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma tabela de sangria cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((t) => (
                <Card key={t.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{t.name}</p>
                          {!t.active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                        </div>
                        {t.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{t.code}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.notation && <Badge className="text-xs">{t.notation}</Badge>}
                          {t.cutType && <Badge variant="outline" className="text-xs">{t.cutType}</Badge>}
                          {t.frequencyDays != null && <Badge variant="outline" className="text-xs">a cada {t.frequencyDays}d</Badge>}
                          {t.restDays != null && <Badge variant="outline" className="text-xs">descanso {t.restDays}d</Badge>}
                          {t.workDaysCycle != null && <Badge variant="outline" className="text-xs">{t.workDaysCycle}d/ciclo</Badge>}
                        </div>
                        {t.stimulation && (
                          <p className="mt-2 text-xs text-muted-foreground">Estimulação: {t.stimulation}</p>
                        )}
                        {t.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <TableDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tapping-tables", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tabela?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação inativa a tabela (exclusão lógica).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TableDialog({
  open, onOpenChange, initial, companyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: TappingTable;
  companyId: string | null;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<TappingTableInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      name: initial.name,
      code: initial.code ?? "",
      notation: initial.notation ?? "",
      cutType: initial.cutType ?? "",
      frequencyDays: initial.frequencyDays ?? null,
      restDays: initial.restDays ?? null,
      workDaysCycle: initial.workDaysCycle ?? null,
      stimulation: initial.stimulation ?? "",
      description: initial.description ?? "",
      active: initial.active,
    });
    else setValues(empty);
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updateTappingTable(initial.id, values);
      return createTappingTable(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Tabela atualizada" : "Tabela criada");
      onSaved();
      onOpenChange(false);
      setValues(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setNum = (key: "frequencyDays" | "restDays" | "workDaysCycle") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setValues((v) => ({ ...v, [key]: raw === "" ? null : Number(raw) }));
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar tabela" : "Nova tabela de sangria"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.name.trim()) { toast.error("Nome obrigatório"); return; }
            mut.mutate();
          }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required /></div>
            <div><Label>Código</Label><Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Notação</Label><Input value={values.notation} onChange={(e) => setValues((v) => ({ ...v, notation: e.target.value }))} placeholder="Ex: D/3 6d/7" /></div>
            <div><Label>Tipo de corte</Label><Input value={values.cutType} onChange={(e) => setValues((v) => ({ ...v, cutType: e.target.value }))} placeholder="Ex: 1/2S" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Frequência (dias)</Label><Input type="number" min={0} value={values.frequencyDays ?? ""} onChange={setNum("frequencyDays")} /></div>
            <div><Label>Descanso (dias)</Label><Input type="number" min={0} value={values.restDays ?? ""} onChange={setNum("restDays")} /></div>
            <div><Label>Dias/ciclo</Label><Input type="number" min={0} value={values.workDaysCycle ?? ""} onChange={setNum("workDaysCycle")} /></div>
          </div>
          <div><Label>Estimulação</Label><Input value={values.stimulation} onChange={(e) => setValues((v) => ({ ...v, stimulation: e.target.value }))} placeholder="Ex: ET 2.5% 8/y" /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={values.active ?? true} onCheckedChange={(a) => setValues((v) => ({ ...v, active: a }))} />
            <Label>Ativa</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
