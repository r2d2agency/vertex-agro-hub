import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CompanyPicker,
  NoCompanyCard,
  useSelectedCompany,
} from "@/components/vertex/company-picker";
import {
  createRegional,
  deleteRegional,
  listRegionals,
  updateRegional,
  type Regional,
  type RegionalInput,
} from "@/lib/regionais.functions";

export const Route = createFileRoute("/_authenticated/regionais")({
  head: () => ({
    meta: [
      { title: "Regionais — Vertex Agro" },
      { name: "description", content: "Cadastro de regionais por empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegionaisPage,
});

const empty: RegionalInput = { name: "", code: "", description: "", manager: "" };

function RegionaisPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Regional | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Regional | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["regionals", companyId],
    queryFn: () => listRegionals(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteRegional(id),
    onSuccess: () => {
      toast.success("Regional excluída");
      qc.invalidateQueries({ queryKey: ["regionals", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Regionais"
        description="Divida a operação em regionais e supervisões."
        actions={
          companyId ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova regional
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
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma regional cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((r) => (
                <Card key={r.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{r.name}</p>
                        </div>
                        {r.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{r.code}</p>}
                        {r.manager && <p className="mt-2 text-xs text-muted-foreground">Responsável: {r.manager}</p>}
                        {r.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(r)}>
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

      <RegionalDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) { setCreating(false); setEditing(null); }
        }}
        initial={editing ?? undefined}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["regionals", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regional?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação inativa a regional (exclusão lógica).</AlertDialogDescription>
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

function RegionalDialog({
  open, onOpenChange, initial, companyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Regional;
  companyId: string | null;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<RegionalInput>(empty);

  useState(() => {
    if (initial) setValues({
      name: initial.name,
      code: initial.code ?? "",
      description: initial.description ?? "",
      manager: initial.manager ?? "",
    });
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updateRegional(initial.id, values);
      return createRegional(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Regional atualizada" : "Regional criada");
      onSaved();
      onOpenChange(false);
      setValues(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setValues(empty); }}>
      <DialogContent
        onOpenAutoFocus={() => {
          if (initial) setValues({
            name: initial.name,
            code: initial.code ?? "",
            description: initial.description ?? "",
            manager: initial.manager ?? "",
          });
          else setValues(empty);
        }}
      >
        <DialogHeader><DialogTitle>{initial ? "Editar regional" : "Nova regional"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!values.name.trim()) { toast.error("Nome obrigatório"); return; } mut.mutate(); }}
          className="grid gap-4"
        >
          <div><Label>Nome *</Label><Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código</Label><Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></div>
            <div><Label>Responsável</Label><Input value={values.manager} onChange={(e) => setValues((v) => ({ ...v, manager: e.target.value }))} /></div>
          </div>
          <div><Label>Descrição</Label><Textarea rows={3} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
