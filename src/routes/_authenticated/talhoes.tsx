import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms, type Farm } from "@/lib/fazendas.functions";
import {
  createPlot, deletePlot, listPlots, updatePlot, type Plot, type PlotInput,
} from "@/lib/talhoes.functions";
import { listClones } from "@/lib/clones.functions";
import { listTappingTables } from "@/lib/tabelas.functions";
import { MapEditorClient } from "@/components/vertex/map-editor-client";
import { toBoundary, type GeoBoundary } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/talhoes")({
  head: () => ({
    meta: [
      { title: "Talhões — Vertex Agro" },
      { name: "description", content: "Talhões vinculados às fazendas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TalhoesPage,
});

const empty: PlotInput = {
  farmId: "", name: "", code: "", areaHa: null,
  cloneName: "", plantingYear: null, treeCount: null, tappingSystem: "", notes: "",
  boundary: null,
};

function TalhoesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [farmFilter, setFarmFilter] = useState<string>("__all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [toDelete, setToDelete] = useState<Plot | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["plots", companyId, farmFilter],
    queryFn: () => listPlots(companyId!, farmFilter !== "__all" ? farmFilter : undefined),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePlot(id),
    onSuccess: () => {
      toast.success("Talhão excluído");
      qc.invalidateQueries({ queryKey: ["plots", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Talhões"
        description="Gerencie os talhões produtivos de cada fazenda."
        actions={companyId && farms.length > 0 ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Novo talhão</Button> : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {farms.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Cadastre uma fazenda antes de adicionar talhões.</CardContent></Card>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Fazenda:</span>
                <Select value={farmFilter} onValueChange={setFarmFilter}>
                  <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas</SelectItem>
                    {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {loadingList ? (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
              ) : data.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum talhão cadastrado.</CardContent></Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.map((p) => (
                    <Card key={p.id} className="transition-colors hover:border-primary/40">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <MapIcon className="h-4 w-4 text-primary" />
                              <p className="truncate font-semibold">{p.name}</p>
                            </div>
                            {p.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{p.code}</p>}
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {p.farm && <p>Fazenda: {p.farm.name}</p>}
                              {p.areaHa != null && <p>{p.areaHa} ha</p>}
                              {p.cloneName && <p>Clone: {p.cloneName}</p>}
                              {p.plantingYear && <p>Plantio: {p.plantingYear}</p>}
                              {p.treeCount && <p>{p.treeCount} árvores</p>}
                              {p.tappingSystem && <p>Sistema: {p.tappingSystem}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <PlotDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        defaultFarmId={farmFilter !== "__all" ? farmFilter : undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["plots", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir talhão?</AlertDialogTitle>
            <AlertDialogDescription>Exclusão lógica. Registros operacionais permanecem vinculados.</AlertDialogDescription>
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

function PlotDialog({
  open, onOpenChange, initial, companyId, farms, defaultFarmId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Plot;
  companyId: string | null;
  farms: Farm[];
  defaultFarmId?: string;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<PlotInput>(empty);

  const { data: clones = [] } = useQuery({
    queryKey: ["clones", companyId],
    queryFn: () => listClones(companyId!),
    enabled: !!companyId && open,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["tapping-tables", companyId],
    queryFn: () => listTappingTables(companyId!),
    enabled: !!companyId && open,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId,
      name: initial.name, code: initial.code ?? "",
      areaHa: initial.areaHa ?? null,
      cloneName: initial.cloneName ?? "",
      plantingYear: initial.plantingYear ?? null,
      treeCount: initial.treeCount ?? null,
      tappingSystem: initial.tappingSystem ?? "",
      notes: initial.notes ?? "",
      boundary: initial.boundary ?? null,
    });
    else setValues({ ...empty, farmId: defaultFarmId ?? farms[0]?.id ?? "" });
  }, [open, initial, defaultFarmId, farms]);

  const selectedFarm = farms.find((f) => f.id === values.farmId);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updatePlot(initial.id, values);
      return createPlot(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Talhão atualizado" : "Talhão criado");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar talhão" : "Novo talhão"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.name.trim()) return toast.error("Nome obrigatório");
            if (!values.farmId) return toast.error("Selecione uma fazenda");
            mut.mutate();
          }}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Fazenda *</Label>
              <Select value={values.farmId} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Nome *</Label><Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required /></div>
            <div><Label>Código</Label><Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></div>
            <div><Label>Área (ha)</Label><Input type="number" step="0.01" value={values.areaHa ?? ""} onChange={(e) => setValues((v) => ({ ...v, areaHa: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div><Label>Clone</Label><Input value={values.cloneName} onChange={(e) => setValues((v) => ({ ...v, cloneName: e.target.value }))} /></div>
            <div><Label>Ano de plantio</Label><Input type="number" value={values.plantingYear ?? ""} onChange={(e) => setValues((v) => ({ ...v, plantingYear: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div><Label>Nº de árvores</Label><Input type="number" value={values.treeCount ?? ""} onChange={(e) => setValues((v) => ({ ...v, treeCount: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div><Label>Sistema de sangria</Label><Input value={values.tappingSystem} onChange={(e) => setValues((v) => ({ ...v, tappingSystem: e.target.value }))} placeholder="Ex.: 1/2S d/3" /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>

            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Polígono do talhão</Label>
                <p className="text-xs text-muted-foreground">
                  {selectedFarm?.boundary
                    ? "Contorno da fazenda em destaque. Desenhe o talhão dentro."
                    : "Desenhe o polígono do talhão no mapa."}
                </p>
              </div>
              <MapEditorClient
                value={toBoundary(values.boundary)}
                reference={toBoundary(selectedFarm?.boundary)}
                onChange={(b: GeoBoundary | null, ha: number | null) => {
                  setValues((v) => ({
                    ...v,
                    boundary: b,
                    areaHa: ha ?? v.areaHa,
                  }));
                  if (ha != null) toast.info(`Área sugerida: ${ha} ha`);
                }}
                height={380}
              />
            </div>
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
