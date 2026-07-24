import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Camera, Plus, Trash2, MapPin } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import { listFarms } from "@/lib/fazendas.functions";
import {
  createPhoto, deletePhoto, listPhotos, PHOTO_CATEGORIES, type Photo, type PhotoInput,
} from "@/lib/fotografias.functions";

export const Route = createFileRoute("/_authenticated/fotografias")({
  head: () => ({ meta: [
    { title: "Fotografias — Vertex Agro" },
    { name: "description", content: "Galeria de fotografias georreferenciadas do campo." },
    { name: "robots", content: "noindex" },
  ] }),
  component: FotografiasPage,
});

const EMPTY: PhotoInput = {
  farmId: undefined, url: "", category: "campo", caption: "", author: "",
  latitude: null, longitude: null,
};

function FotografiasPage() {
  const qc = useQueryClient();
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [farmFilter, setFarmFilter] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PhotoInput>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Photo | null>(null);
  const [preview, setPreview] = useState<Photo | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const farmName = useMemo(() => {
    const m = new Map(farms.map((f) => [f.id, f.name]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [farms]);

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["photos", companyId, farmFilter, catFilter],
    queryFn: () => listPhotos(companyId!, {
      farmId: farmFilter || undefined, category: catFilter || undefined,
    }),
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: () => createPhoto(companyId!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["photos"] }); setOpen(false); toast.success("Fotografia adicionada"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });
  const remove = useMutation({
    mutationFn: () => deletePhoto(pendingDelete!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["photos"] }); setPendingDelete(null); toast.success("Fotografia removida"); },
  });

  function openNew() { setForm(EMPTY); setOpen(true); }

  function captureLocation() {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      () => toast.error("Não foi possível obter a localização"),
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Fotografias"
        description="Registro fotográfico do campo com localização."
        
        actions={<Button onClick={openNew} disabled={!companyId}><Plus className="h-4 w-4" /> Nova foto</Button>}
      />

      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            <div className="grid gap-1">
              <Label>Fazenda</Label>
              <Select value={farmFilter || "all"} onValueChange={(v) => setFarmFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Categoria</Label>
              <Select value={catFilter || "all"} onValueChange={(v) => setCatFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {PHOTO_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid items-end"><Button variant="outline" onClick={() => { setFarmFilter(""); setCatFilter(""); }}>Limpar</Button></div>
          </CardContent>
        </Card>
      )}

      {companyId && (
        <>
          {loading ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
          ) : items.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma fotografia registrada.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <button className="block w-full text-left" onClick={() => setPreview(p)}>
                    <div className="aspect-square w-full bg-muted">
                      <img src={p.url} alt={p.caption ?? "Fotografia"} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  </button>
                  <CardContent className="grid gap-1 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{farmName(p.farmId)}</span>
                      {p.category && <Badge variant="secondary">{p.category}</Badge>}
                    </div>
                    <span className="text-muted-foreground">{new Date(p.takenAt).toLocaleString("pt-BR")}</span>
                    {p.caption && <span className="line-clamp-2">{p.caption}</span>}
                    <div className="flex items-center justify-between pt-1">
                      {p.latitude != null && p.longitude != null ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                        </span>
                      ) : <span />}
                      <Button size="icon" variant="ghost" onClick={() => setPendingDelete(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova fotografia</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FileDropzone
              value={form.url || null}
              accept="image/*"
              preview="image"
              label="Arraste uma foto ou clique para selecionar"
              onUploaded={(url) => setForm((f) => ({ ...f, url }))}
              onClear={() => setForm((f) => ({ ...f, url: "" }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <Label>Fazenda</Label>
                <Select value={form.farmId ?? "none"} onValueChange={(v) => setForm({ ...form, farmId: v === "none" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Categoria</Label>
                <Select value={form.category ?? "campo"} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHOTO_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Latitude</Label>
                <Input type="number" step="0.000001" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div className="grid gap-1">
                <Label>Longitude</Label>
                <Input type="number" step="0.000001" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div className="md:col-span-2">
                <Button type="button" variant="outline" onClick={captureLocation}>
                  <MapPin className="h-4 w-4" /> Usar localização atual
                </Button>
              </div>
              <div className="grid gap-1">
                <Label>Autor</Label>
                <Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="grid gap-1 md:col-span-2">
                <Label>Legenda</Label>
                <Textarea rows={2} value={form.caption ?? ""} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!form.url || create.isPending} onClick={() => create.mutate()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{preview?.caption || "Fotografia"}</DialogTitle></DialogHeader>
          {preview && (
            <div className="grid gap-3">
              <img src={preview.url} alt={preview.caption ?? ""} className="max-h-[70vh] w-full rounded-md object-contain" />
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Fazenda: <span className="text-foreground">{farmName(preview.farmId)}</span></div>
                <div>Categoria: <span className="text-foreground">{preview.category ?? "—"}</span></div>
                <div>Data: <span className="text-foreground">{new Date(preview.takenAt).toLocaleString("pt-BR")}</span></div>
                <div>Autor: <span className="text-foreground">{preview.author ?? "—"}</span></div>
                {preview.latitude != null && preview.longitude != null && (
                  <div className="col-span-2">
                    <a className="text-primary underline" href={`https://www.openstreetmap.org/?mlat=${preview.latitude}&mlon=${preview.longitude}#map=17/${preview.latitude}/${preview.longitude}`} target="_blank" rel="noreferrer">
                      Ver localização ({preview.latitude.toFixed(5)}, {preview.longitude.toFixed(5)})
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fotografia?</AlertDialogTitle>
            <AlertDialogDescription>A fotografia será removida da galeria.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
