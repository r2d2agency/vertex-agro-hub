import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Search, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { MapViewerClient } from "@/components/vertex/map-viewer-client";
import type { FarmMarker, PlotMarker } from "@/components/vertex/map-viewer";
import { listFarms } from "@/lib/fazendas.functions";
import { listPlots } from "@/lib/talhoes.functions";
import { listRegionals } from "@/lib/regionais.functions";
import { toBoundary } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/mapas")({
  head: () => ({
    meta: [
      { title: "Mapas — Vertex Agro" },
      { name: "description", content: "Visão consolidada de fazendas e talhões no mapa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MapasPage,
});

// Paleta para diferenciar regionais / fazendas
const PALETTE = ["#16a34a", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#e11d48", "#3b82f6", "#84cc16", "#f97316"];
function colorFor(index: number) { return PALETTE[index % PALETTE.length]; }

function MapasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [regionalFilter, setRegionalFilter] = useState<string>("__all__");
  const [search, setSearch] = useState("");
  const [showFarms, setShowFarms] = useState(true);
  const [showPlots, setShowPlots] = useState(true);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [addressQuery, setAddressQuery] = useState("");

  const { data: regionals = [] } = useQuery({
    queryKey: ["regionals", companyId],
    queryFn: () => listRegionals(companyId!),
    enabled: !!companyId,
  });
  const { data: farms = [], isLoading: loadingFarms } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const { data: plots = [] } = useQuery({
    queryKey: ["plots", companyId],
    queryFn: () => listPlots(companyId!),
    enabled: !!companyId,
  });

  const regionalColor = useMemo(() => {
    const map = new Map<string, string>();
    regionals.forEach((r, i) => map.set(r.id, colorFor(i)));
    return map;
  }, [regionals]);

  const filteredFarms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return farms.filter((f) => {
      if (regionalFilter !== "__all__" && (f.regionalId ?? "") !== regionalFilter) return false;
      if (!q) return true;
      return [f.name, f.code, f.city, f.owner].filter(Boolean).some((s) => (s as string).toLowerCase().includes(q));
    });
  }, [farms, regionalFilter, search]);

  const farmMarkers: FarmMarker[] = useMemo(() => filteredFarms.map((f, i) => ({
    id: f.id,
    name: f.name,
    regionalId: f.regionalId,
    regionalName: f.regional?.name ?? null,
    color: f.regionalId ? (regionalColor.get(f.regionalId) ?? colorFor(i)) : colorFor(i),
    areaHa: f.totalAreaHa,
    city: f.city,
    state: f.state,
    owner: f.owner,
    latitude: f.latitude,
    longitude: f.longitude,
    boundary: toBoundary(f.boundary),
  })), [filteredFarms, regionalColor]);

  const farmById = useMemo(() => new Map(filteredFarms.map((f) => [f.id, f])), [filteredFarms]);
  const plotMarkers: PlotMarker[] = useMemo(() => plots
    .filter((p) => farmById.has(p.farmId))
    .map((p) => {
      const parent = farmById.get(p.farmId)!;
      const color = parent.regionalId ? (regionalColor.get(parent.regionalId) ?? "#16a34a") : "#16a34a";
      return {
        id: p.id, name: p.name, farmId: p.farmId, farmName: parent.name,
        color, areaHa: p.areaHa, boundary: toBoundary(p.boundary),
      };
    }), [plots, farmById, regionalColor]);

  const totalAreaHa = useMemo(() => filteredFarms.reduce((s, f) => s + (f.totalAreaHa ?? 0), 0), [filteredFarms]);
  const plotsInScope = plotMarkers.length;

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocalização indisponível"); return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Não foi possível obter sua localização"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function searchAddress() {
    const q = addressQuery.trim();
    if (!q) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!arr.length) { toast.error("Endereço não encontrado"); return; }
      setFocus({ lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) });
    } catch { toast.error("Falha ao buscar endereço"); }
  }

  return (
    <div>
      <PageHeader
        title="Mapas"
        description="Visão consolidada das fazendas e talhões da empresa selecionada."
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Buscar fazenda</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, código, cidade, responsável..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">Regional</Label>
              <Select value={regionalFilter} onValueChange={setRegionalFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as regionais</SelectItem>
                  {regionals.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={useMyLocation}>
                <LocateFixed className="mr-1 h-4 w-4" /> Minha localização
              </Button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex gap-2">
              <Input placeholder="Buscar endereço, cidade, CEP..." value={addressQuery} onChange={(e) => setAddressQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }} />
              <Button type="button" variant="outline" onClick={searchAddress}><Search className="mr-1 h-4 w-4" /> Buscar</Button>
            </div>
            <div className="flex items-center gap-4 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <label className="flex items-center gap-2"><Switch checked={showFarms} onCheckedChange={setShowFarms} /> Fazendas</label>
              <label className="flex items-center gap-2"><Switch checked={showPlots} onCheckedChange={setShowPlots} /> Talhões</label>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Kpi label="Fazendas no mapa" value={String(filteredFarms.length)} />
            <Kpi label="Área total (ha)" value={totalAreaHa ? totalAreaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"} />
            <Kpi label="Talhões no mapa" value={String(plotsInScope)} />
          </div>

          {loadingFarms ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando mapa...</CardContent></Card>
          ) : (
            <MapViewerClient
              farms={farmMarkers}
              plots={plotMarkers}
              showFarms={showFarms}
              showPlots={showPlots}
              focus={focus}
              height={600}
            />
          )}

          {regionals.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {regionals.map((r, i) => (
                <Badge key={r.id} variant="outline" className="gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: regionalColor.get(r.id) ?? colorFor(i) }} />
                  {r.name}
                </Badge>
              ))}
            </div>
          )}

          {filteredFarms.length === 0 && !loadingFarms && (
            <Card className="mt-4"><CardContent className="p-6 text-center text-sm text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              Nenhuma fazenda encontrada com os filtros atuais.
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}
