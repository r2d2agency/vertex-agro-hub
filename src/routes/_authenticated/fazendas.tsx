import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TreeDeciduous } from "lucide-react";
import { toast } from "sonner";
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
  boundary: null,
};

function FazendasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Farm | null>(null);

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
                <Card key={f.id} className="transition-colors hover:border-primary/40">
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
                      </div>
                      <div className="flex flex-col gap-1">
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
    });
    else setValues(empty);
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
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required /></div>
            <div><Label>Código</Label><Input value={values.code} onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))} /></div>
            <div>
              <Label>Regional</Label>
              <Select value={values.regionalId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, regionalId: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Sem regional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem regional</SelectItem>
                  {regionals.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CEP</Label>
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
            </div>
            <div><Label>Cidade</Label><Input value={values.city} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))} /></div>
            <div><Label>UF</Label><UfSelect value={values.state ?? ""} onChange={(v) => setValues((s) => ({ ...s, state: v }))} /></div>
            <div><Label>Área total (ha)</Label><Input type="number" step="0.01" value={values.totalAreaHa ?? ""} onChange={(e) => setValues((v) => ({ ...v, totalAreaHa: e.target.value ? Number(e.target.value) : null }))} /></div>
            <div><Label>Proprietário</Label><Input value={values.owner} onChange={(e) => setValues((v) => ({ ...v, owner: e.target.value }))} /></div>
            <div className="col-span-2 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]"><Label>Latitude</Label><Input type="number" step="0.000001" value={values.latitude ?? ""} onChange={(e) => setValues((v) => ({ ...v, latitude: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div className="flex-1 min-w-[140px]"><Label>Longitude</Label><Input type="number" step="0.000001" value={values.longitude ?? ""} onChange={(e) => setValues((v) => ({ ...v, longitude: e.target.value ? Number(e.target.value) : null }))} /></div>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                if (!navigator.geolocation) return toast.error("Geolocalização indisponível no navegador");
                navigator.geolocation.getCurrentPosition(
                  (p) => { setValues((v) => ({ ...v, latitude: p.coords.latitude, longitude: p.coords.longitude })); toast.success("Localização capturada"); },
                  () => toast.error("Não foi possível obter a localização"),
                );
              }}><MapPin className="mr-1 h-3.5 w-3.5" /> Usar minha localização</Button>
              <Button type="button" variant="outline" size="sm" onClick={async () => {
                const q = [values.name, values.city, values.state, "Brasil"].filter(Boolean).join(", ");
                const g = await geocodeAddress(q);
                if (!g) return toast.error("Endereço não encontrado");
                setValues((v) => ({ ...v, latitude: g.lat, longitude: g.lng }));
                toast.success("Localização do endereço aplicada");
              }}>Buscar pelo endereço</Button>
            </div>
            <div className="col-span-2"><Label>Observações</Label><Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>

            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Polígono da fazenda</Label>
                <p className="text-xs text-muted-foreground">
                  Use as ferramentas do mapa para desenhar. A área calculada aparece como sugestão.
                </p>
              </div>
              <MapEditorClient
                value={toBoundary(values.boundary)}
                focus={values.latitude != null && values.longitude != null ? { lat: values.latitude, lng: values.longitude } : null}
                onChange={(b: GeoBoundary | null, ha: number | null) => {
                  setValues((v) => ({
                    ...v,
                    boundary: b,
                    totalAreaHa: ha ?? v.totalAreaHa,
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
