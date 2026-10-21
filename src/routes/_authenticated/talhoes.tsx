import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Map as MapIcon, ChevronLeft, UserCheck, UserX } from "lucide-react";
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
  createPlot, deletePlot, listPlots, updatePlot, listPlotTappingSummary,
  type Plot, type PlotInput, type PlotTappingSummary,
} from "@/lib/talhoes.functions";
import { listClones } from "@/lib/clones.functions";
import { listTappingTables } from "@/lib/tabelas.functions";
import { MapEditorClient } from "@/components/vertex/map-editor-client";
import { toBoundary, boundaryColor, type GeoBoundary } from "@/lib/geo";

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

const PLOT_PALETTE = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

const empty: PlotInput = {
  farmId: "", name: "", code: "", areaHa: null,
  cloneName: "", plantingYear: null, treeCount: null, tappingSystem: "", notes: "",
  boundary: null,
};

function TalhoesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  // Nada é listado de cara: o admin escolhe a fazenda e só então vê os
  // talhões dela, em ordem crescente pelo nome.
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [toDelete, setToDelete] = useState<Plot | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["plots", companyId],
    queryFn: () => listPlots(companyId!),
    enabled: !!companyId,
  });

  const { data: summaries = [] } = useQuery({
    queryKey: ["plot-tapping-summary", companyId],
    queryFn: () => listPlotTappingSummary(companyId!),
    enabled: !!companyId,
  });

  const summaryByPlot = useMemo(() => {
    const map = new Map<string, PlotTappingSummary>();
    for (const s of summaries) map.set(s.plotId, s);
    return map;
  }, [summaries]);

  // Só as fazendas que têm talhão entram na lista.
  const farmsWithPlots = useMemo(
    () => farms.filter((f) => data.some((p) => p.farmId === f.id)),
    [farms, data],
  );

  const selectedFarm = farmsWithPlots.find((f) => f.id === selectedFarmId) ?? null;
  const farmPlots = useMemo(
    () => (selectedFarmId ? data.filter((p) => p.farmId === selectedFarmId).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) : []),
    [data, selectedFarmId],
  );

  const del = useMutation({
    mutationFn: (id: string) => deletePlot(id),
    onSuccess: () => {
      toast.success("Talhão excluído");
      qc.invalidateQueries({ queryKey: ["plots", companyId] });
      qc.invalidateQueries({ queryKey: ["plot-tapping-summary", companyId] });
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
          ) : loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : farmsWithPlots.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum talhão cadastrado.</CardContent></Card>
          ) : !selectedFarm ? (
            // Primeiro nível: só as fazendas que têm talhão.
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {farmsWithPlots.map((f) => {
                const farmPlotsCount = data.filter((p) => p.farmId === f.id).length;
                const farmTrees = data
                  .filter((p) => p.farmId === f.id)
                  .reduce((sum, p) => sum + (p.treeCount ?? 0), 0);
                return (
                  <button key={f.id} type="button" onClick={() => setSelectedFarmId(f.id)} className="text-left">
                    <Card className="transition-colors hover:border-primary/40">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2">
                          <MapIcon className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{f.name}</p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {farmPlotsCount} talhão{farmPlotsCount === 1 ? "" : "s"} · {farmTrees} árvores
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : (
            // Segundo nível: os talhões da fazenda escolhida, em ordem pelo nome.
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setSelectedFarmId(null)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Todas as fazendas
              </Button>
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold">{selectedFarm.name}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {farmPlots.map((p) => {
                  const summary = summaryByPlot.get(p.id);
                  const hasTapper = (summary?.tapperCount ?? 0) > 0;
                  return (
                    <Card key={p.id} className="transition-colors hover:border-primary/40">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                                style={{ backgroundColor: boundaryColor(p.boundary) }}
                                aria-hidden
                              />
                              <MapIcon className="h-4 w-4 text-primary" />
                              <p className="truncate font-semibold">{p.name}</p>
                              {/* "Carinha" do sangrador: sinaliza que o talhão tem
                                  alguém alocado para sangrar. */}
                              {hasTapper ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  <UserCheck className="h-3 w-3" />
                                  {summary!.tapperCount} sangrador{summary!.tapperCount === 1 ? "" : "es"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  <UserX className="h-3 w-3" /> sem sangrador
                                </span>
                              )}
                            </div>
                            {p.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{p.code}</p>}
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {p.areaHa != null && <p>{p.areaHa} ha</p>}
                              {p.cloneName && <p>Clone: {p.cloneName}</p>}
                              {p.plantingYear && <p>Plantio: {p.plantingYear}</p>}
                              {p.tappingSystem && <p>Sistema: {p.tappingSystem}</p>}
                            </div>
                            <div className="mt-3 space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Árvores no talhão</span>
                                <span className="font-semibold">{summary?.plotTreeCount ?? p.treeCount ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Previstas para sangrar</span>
                                <span className="font-semibold">{summary?.plannedTreeCount ?? 0}</span>
                              </div>
                              {hasTapper && summary!.tappers.map((t) => (
                                <div key={t.id} className="flex items-center justify-between">
                                  <span className="truncate text-muted-foreground">{t.name ?? "Sangrador"}</span>
                                  <span className="font-semibold">{t.treeCount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <PlotDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        allPlots={data}
        defaultFarmId={selectedFarmId ?? undefined}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["plots", companyId] });
          qc.invalidateQueries({ queryKey: ["plot-tapping-summary", companyId] });
        }}
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
  open, onOpenChange, initial, companyId, farms, allPlots, defaultFarmId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Plot;
  companyId: string | null;
  farms: Farm[];
  allPlots: Plot[];
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
  const siblings = allPlots.filter(
    (p) => p.farmId === values.farmId && p.id !== initial?.id && !!p.boundary,
  );
  const overlays = siblings.map((p) => ({
    boundary: toBoundary(p.boundary),
    color: boundaryColor(p.boundary),
    label: p.name,
  }));
  const [color, setColor] = useState<string>("#16a34a");
  useEffect(() => {
    if (!open) return;
    setColor(boundaryColor(initial?.boundary, PLOT_PALETTE[allPlots.length % PLOT_PALETTE.length]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

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
            <div>
              <Label>Clone</Label>
              <Select
                value={values.cloneName || "__none"}
                onValueChange={(v) => setValues((s) => ({ ...s, cloneName: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder={clones.length ? "Selecione o clone" : "Nenhum clone cadastrado"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Sem clone —</SelectItem>
                  {clones.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ano de plantio</Label><Input type="number" value={values.plantingYear ?? ""} onChange={(e) => setValues((v) => ({ ...v, plantingYear: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div><Label>Nº de árvores</Label><Input type="number" value={values.treeCount ?? ""} onChange={(e) => setValues((v) => ({ ...v, treeCount: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div>
              <Label>Sistema de sangria</Label>
              <Select
                value={values.tappingSystem || "__none"}
                onValueChange={(v) => setValues((s) => ({ ...s, tappingSystem: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder={tables.length ? "Selecione a tabela" : "Nenhuma tabela cadastrada"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Sem sistema —</SelectItem>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.notation || t.name}>
                      {t.name}{t.notation ? ` — ${t.notation}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {siblings.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                  <span className="text-xs text-muted-foreground">Talhões existentes em {selectedFarm?.name}:</span>
                  {siblings.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: boundaryColor(p.boundary) }} />
                      {p.name}{p.areaHa != null ? ` · ${p.areaHa} ha` : ""}
                    </span>
                  ))}
                </div>
              )}
              <MapEditorClient
                key={values.farmId}
                value={toBoundary(values.boundary)}
                reference={toBoundary(selectedFarm?.boundary)}
                overlays={overlays}
                color={color}
                onColorChange={setColor}
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
