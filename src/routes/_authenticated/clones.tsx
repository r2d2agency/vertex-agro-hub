import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  createClone, deleteClone, listClones, updateClone,
  type Clone, type CloneInput,
} from "@/lib/clones.functions";

export const Route = createFileRoute("/_authenticated/clones")({
  head: () => ({
    meta: [
      { title: "Clones — Vertex Agro" },
      { name: "description", content: "Catálogo de clones de seringueira por empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClonesPage,
});

const empty: CloneInput = {
  name: "", code: "", origin: "", productivity: "", vigor: "",
  diseaseResistance: "", recommendedRegion: "", notes: "",
};

function ClonesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Clone | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Clone | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["clones", companyId],
    queryFn: () => listClones(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteClone(id),
    onSuccess: () => {
      toast.success("Clone excluído");
      qc.invalidateQueries({ queryKey: ["clones", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Clones"
        description="Catálogo de clones de seringueira por empresa."
        actions={
          companyId ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo clone
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
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum clone cadastrado.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((c) => (
                <Card key={c.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{c.name}</p>
                        </div>
                        {c.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{c.code}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.origin && <Badge variant="outline" className="text-xs">Origem: {c.origin}</Badge>}
                          {c.productivity && <Badge variant="outline" className="text-xs">Prod.: {c.productivity}</Badge>}
                          {c.vigor && <Badge variant="outline" className="text-xs">Vigor: {c.vigor}</Badge>}
                        </div>
                        {c.diseaseResistance && (
                          <p className="mt-2 text-xs text-muted-foreground">Resistência: {c.diseaseResistance}</p>
                        )}
                        {c.recommendedRegion && (
                          <p className="mt-1 text-xs text-muted-foreground">Região: {c.recommendedRegion}</p>
                        )}
                        {c.notes && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(c)}>
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

      <CloneDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["clones", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir clone?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação inativa o clone (exclusão lógica).</AlertDialogDescription>
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

function CloneDialog({
  open, onOpenChange, initial, companyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Clone;
  companyId: string | null;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<CloneInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      name: initial.name,
      code: initial.code ?? "",
      origin: initial.origin ?? "",
      productivity: initial.productivity ?? "",
      vigor: initial.vigor ?? "",
      diseaseResistance: initial.diseaseResistance ?? "",
      recommendedRegion: initial.recommendedRegion ?? "",
      notes: initial.notes ?? "",
    });
    else setValues(empty);
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updateClone(initial.id, values);
      return createClone(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Clone atualizado" : "Clone criado");
      onSaved();
      onOpenChange(false);
      setValues(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar clone" : "Novo clone"}</DialogTitle></DialogHeader>
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
            <div><Label>Código</Label><Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} placeholder="Ex: RRIM 600" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Origem</Label><Input value={values.origin} onChange={(e) => setValues((v) => ({ ...v, origin: e.target.value }))} placeholder="Ex: Malásia" /></div>
            <div><Label>Produtividade</Label><Input value={values.productivity} onChange={(e) => setValues((v) => ({ ...v, productivity: e.target.value }))} placeholder="Ex: Alta" /></div>
            <div><Label>Vigor</Label><Input value={values.vigor} onChange={(e) => setValues((v) => ({ ...v, vigor: e.target.value }))} placeholder="Ex: Médio" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Resistência a doenças</Label><Input value={values.diseaseResistance} onChange={(e) => setValues((v) => ({ ...v, diseaseResistance: e.target.value }))} /></div>
            <div><Label>Região recomendada</Label><Input value={values.recommendedRegion} onChange={(e) => setValues((v) => ({ ...v, recommendedRegion: e.target.value }))} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
