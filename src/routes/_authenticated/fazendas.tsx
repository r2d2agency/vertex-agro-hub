import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, ReactNode } from "react";
import { Plus, Pencil, Trash2, TreeDeciduous, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  createFarm, deleteFarm, listFarms, updateFarm, type Farm, type FarmInput,
} from "@/lib/fazendas.functions";
import { listRegionals } from "@/lib/regionais.functions";
import { MapEditorClient } from "@/components/vertex/map-editor-client";
import { toBoundary, boundaryCentroid, type GeoBoundary } from "@/lib/geo";
import { CepInput } from "@/components/vertex/cep-input";
import { UfSelect } from "@/components/vertex/uf-select";
import { MapPin } from "lucide-react";
import { geocodeAddress } from "@/lib/via-cep";
import { FarmDetailDialog } from "@/components/vertex/farm-detail-dialog";
import { listPlots } from "@/lib/talhoes.functions";

export const Route = createFileRoute("/_authenticated/fazendas")({
  head: () => ({
    meta: [
      { title: "Fazendas — Vertex Agro" },
      { name: "description", content: "Cadastro de fazendas e áreas produtivas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FazendasPage,
});

const empty: FarmInput = {
  regionalId: "", name: "", code: "", city: "", state: "",
  totalAreaHa: null, latitude: null, longitude: null, owner: "", notes: "",
  boundary: null, photoUrls: [],
};


function FazendasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Farm | null>(null);
  const [detail, setDetail] = useState<Farm | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data: regionals = [] } = useQuery({
    queryKey: ["regionals", companyId],
    queryFn: () => listRegionals(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFarm(id),
    onSuccess: () => {
      toast.success("Fazenda excluída");
      qc.invalidateQueries({ queryKey: ["farms", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Fazendas"
        description="Cadastre fazendas com localização, área e responsáveis."
        actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova fazenda</Button> : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma fazenda cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((f) => (
                <Card
                  key={f.id}
                  className="cursor-pointer transition-colors hover:border-primary/60 hover:shadow-sm"
                  onClick={() => setDetail(f)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <TreeDeciduous className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{f.name}</p>
                        </div>
                        {f.code && <p className="mt-1 font-mono text-xs text-muted-foreground">{f.code}</p>}
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {f.regional && <p>Regional: {f.regional.name}</p>}
                          {(f.city || f.state) && <p>{f.city}{f.state ? ` / ${f.state}` : ""}</p>}
                          {f.totalAreaHa != null && <p>{f.totalAreaHa} ha</p>}
                          {f.owner && <p>Proprietário: {f.owner}</p>}
                        </div>
                        <FarmPlotsPreview companyId={companyId!} farmId={f.id} />
                      </div>
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(f)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <FarmDetailDialog
        farm={detail}
        companyId={companyId}
        onOpenChange={(o) => !o && setDetail(null)}
      />


      <FarmDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        regionals={regionals}
        onSaved={() => qc.invalidateQueries({ queryKey: ["farms", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fazenda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação inativa a fazenda e seus talhões continuam vinculados.</AlertDialogDescription>
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

function FarmPlotsPreview({ companyId, farmId }: { companyId: string; farmId: string }) {
  const { data } = useQuery({
    queryKey: ["farm-plots-preview", farmId],
    queryFn: () => listPlots(companyId, farmId),
    enabled: !!companyId,
  });
  if (!data) return null;
  if (data.length === 0) return <p className="mt-2 text-xs italic text-muted-foreground">Sem talhões cadastrados</p>;
  const shown = data.slice(0, 3);
  const rest = data.length - shown.length;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {shown.map((p) => (
        <span key={p.id} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
          {p.name}{p.areaHa != null ? ` · ${p.areaHa}ha` : ""}
        </span>
      ))}
      {rest > 0 && <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{rest}</span>}
    </div>
  );
}

function FarmDialog({
  open, onOpenChange, initial, companyId, regionals, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Farm;
  companyId: string | null;
  regionals: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<FarmInput>(empty);
  const [cep, setCep] = useState<string>("");
  const [activeTab, setActiveTab] = useState("dados");


  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      regionalId: initial.regionalId ?? "",
      name: initial.name, code: initial.code ?? "",
      city: initial.city ?? "", state: initial.state ?? "",
      totalAreaHa: initial.totalAreaHa ?? null,
      latitude: initial.latitude ?? null, longitude: initial.longitude ?? null,
      owner: initial.owner ?? "", notes: initial.notes ?? "",
      boundary: initial.boundary ?? null,
      photoUrls: initial.photoUrls ?? [],
    });
    else setValues(empty);
    setActiveTab("dados");

  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updateFarm(initial.id, values);
      return createFarm(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Fazenda atualizada" : "Fazenda criada");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar fazenda" : "Nova fazenda"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!values.name.trim()) { toast.error("Nome obrigatório"); return; } mut.mutate(); }}
          className="flex flex-col h-full"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start rounded-none h-12 bg-transparent gap-6">
                <TabsTrigger value="dados" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Dados Gerais</TabsTrigger>
                <TabsTrigger value="mapa" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Mapa e Área</TabsTrigger>
                <TabsTrigger value="fotos" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 flex gap-2">
                  Fotos <Badge variant="secondary" className="h-5 px-1.5">{values.photoUrls?.length || 0}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="dados" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Field label="Nome da Fazenda *">
                      <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required />
                    </Field>
                  </div>
                  <Field label="Código/Sigla">
                    <Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} />
                  </Field>
                  <Field label="Regional">
                    <Select value={values.regionalId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, regionalId: v === "__none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Sem regional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Sem regional</SelectItem>
                        {regionals.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="CEP">
                    <CepInput
                      value={cep}
                      onChange={setCep}
                      onFilled={(d) => {
                        setCep(d.cep);
                        setValues((s) => ({
                          ...s,
                          city: d.cidade || s.city,
                          state: d.uf || s.state,
                          notes: s.notes || (d.endereco ? `Endereço: ${d.endereco}${d.bairro ? ` — ${d.bairro}` : ""}` : ""),
                        }));
                      }}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Cidade">
                      <Input value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} />
                    </Field>
                    <Field label="UF">
                      <UfSelect value={values.state ?? ""} onChange={(v) => setValues((s) => ({ ...s, state: v }))} />
                    </Field>
                  </div>
                  <Field label="Proprietário / Responsável">
                    <Input value={values.owner} onChange={(e) => setValues((v) => ({ ...v, owner: e.target.value }))} />
                  </Field>
                  <Field label="Área total (ha)">
                    <Input type="number" step="0.01" value={values.totalAreaHa ?? ""} onChange={(e) => setValues((v) => ({ ...v, totalAreaHa: e.target.value ? Number(e.target.value) : null }))} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Observações">
                      <Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mapa" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-end gap-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                  <div className="flex-1 min-w-[140px]"><Field label="Latitude"><Input type="number" step="0.000001" value={values.latitude ?? ""} onChange={(e) => setValues((v) => ({ ...v, latitude: e.target.value ? Number(e.target.value) : null }))} /></Field></div>
                  <div className="flex-1 min-w-[140px]"><Field label="Longitude"><Input type="number" step="0.000001" value={values.longitude ?? ""} onChange={(e) => setValues((v) => ({ ...v, longitude: e.target.value ? Number(e.target.value) : null }))} /></Field></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
                    navigator.geolocation.getCurrentPosition(
                      (p) => { setValues((v) => ({ ...v, latitude: p.coords.latitude, longitude: p.coords.longitude })); toast.success("Localização capturada"); },
                      () => toast.error("Erro ao obter localização"),
                    );
                  }}><MapPin className="mr-1 h-3.5 w-3.5" /> GPS</Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Polígono da Fazenda</Label>
                    <p className="text-[10px] text-muted-foreground italic">
                      A área e o centroide são calculados automaticamente ao desenhar.
                    </p>
                  </div>
                  <MapEditorClient
                    value={toBoundary(values.boundary)}
                    focus={values.latitude != null && values.longitude != null ? { lat: values.latitude, lng: values.longitude } : null}
                    onChange={(b: GeoBoundary | null, ha: number | null) => {
                      const c = boundaryCentroid(b);
                      setValues((v) => ({
                        ...v,
                        boundary: b,
                        totalAreaHa: ha ?? v.totalAreaHa,
                        latitude: c ? Number(c.lat.toFixed(6)) : v.latitude,
                        longitude: c ? Number(c.lng.toFixed(6)) : v.longitude,
                      }));
                    }}
                    height={400}
                  />
                </div>
              </TabsContent>

              <TabsContent value="fotos" className="mt-0 space-y-4">
                <Field label="Galeria de Fotos da Fazenda">
                  <div className="space-y-4">
                    <FileDropzone
                      onUpload={(url) => setValues(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []), url] }))}
                      label="Arraste fotos da sede, entrada ou talhões estratégicos"
                    />
                    
                    {values.photoUrls && values.photoUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {values.photoUrls.map((url, idx) => (
                          <div key={idx} className="group relative aspect-video overflow-hidden rounded-md border bg-muted">
                            <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                            <button
                              type="button"
                              onClick={() => setValues(prev => ({ ...prev, photoUrls: prev.photoUrls?.filter((_, i) => i !== idx) }))}
                              className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!values.photoUrls || values.photoUrls.length === 0) && (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-xs">Nenhuma foto carregada ainda</p>
                      </div>
                    )}
                  </div>
                </Field>
              </TabsContent>
            </div>
          </Tabs>

          <div className="px-6 py-4 border-t bg-muted/10 flex justify-between items-center shrink-0">
            <p className="text-[10px] text-muted-foreground italic">* Campos obrigatórios</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending} className="px-8">
                {mut.isPending ? "Salvando..." : "Salvar Fazenda"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
