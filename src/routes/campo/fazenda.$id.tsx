import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, Map as MapIcon, Ruler, Sprout, TreeDeciduous } from "lucide-react";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { getFarm, type Farm } from "@/lib/fazendas.functions";
import { listPlots, type Plot } from "@/lib/talhoes.functions";
import { listTappingRecords, type TappingRecord } from "@/lib/sangrias.functions";
import { getLocalIsoDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { MapViewerClient } from "@/components/vertex/map-viewer-client";
import type { FarmMarker, PlotMarker } from "@/components/vertex/map-viewer";

export const Route = createFileRoute("/campo/fazenda/$id")({
  component: FarmDetailPage,
});

function FarmDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [tapping, setTapping] = useState<TappingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFieldMe().then(setMe).catch(() => undefined);
  }, []);

  useEffect(() => {
    const companyId = me?.assignments.find((a) => a.farm.id === id)?.farm.companyId || me?.companies?.[0]?.id;
    if (!companyId) return;
    setLoading(true);
    const since = getLocalIsoDate(new Date(Date.now() - 30 * 86400000));
    const today = getLocalIsoDate();
    Promise.all([
      getFarm(id).catch(() => null),
      listPlots(companyId, id).catch(() => [] as Plot[]),
      listTappingRecords(companyId, { farmId: id, from: since, to: today }).catch(() => [] as TappingRecord[]),
    ])
      .then(([f, p, t]) => {
        setFarm(f);
        setPlots(p);
        setTapping(t);
      })
      .finally(() => setLoading(false));
  }, [id, me]);

  const fallbackFarm = (me?.assignments || []).find((a) => a.farm.id === id)?.farm;

  const treesExpected = useMemo(() => plots.reduce((acc, p) => acc + (p.treeCount ?? 0), 0), [plots]);
  const treesTapped = useMemo(() => tapping.reduce((acc, r) => acc + (r.treesTapped ?? 0), 0), [tapping]);
  const totalAreaHa = farm?.totalAreaHa ?? plots.reduce((acc, p) => acc + (p.areaHa ?? 0), 0);

  const farmMarkers: FarmMarker[] = useMemo(() => {
    if (!farm) return [];
    return [{
      id: farm.id,
      name: farm.name,
      color: "#16a34a",
      areaHa: farm.totalAreaHa,
      city: farm.city,
      state: farm.state,
      latitude: farm.latitude,
      longitude: farm.longitude,
      boundary: farm.boundary,
    }];
  }, [farm]);

  const plotMarkers: PlotMarker[] = useMemo(
    () => plots.map((p) => ({ id: p.id, name: p.name, farmId: p.farmId, color: "#0ea5e9", areaHa: p.areaHa, boundary: p.boundary })),
    [plots],
  );

  const focus = farm?.latitude && farm?.longitude ? { lat: farm.latitude, lng: farm.longitude } : null;

  if (loading && !farm) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!farm && !fallbackFarm) {
    return <div className="p-8 text-center text-muted-foreground">Fazenda não encontrada ou sem acesso.</div>;
  }

  const name = farm?.name ?? fallbackFarm?.name ?? "Fazenda";

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => nav({ to: "/campo/consultor" })}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg font-bold">{name}</h1>
      </header>

      {(farm?.city || farm?.state) && (
        <p className="text-sm text-muted-foreground">{[farm?.city, farm?.state].filter(Boolean).join(" / ")}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Ruler className="h-4 w-4" />} label="Área total" value={totalAreaHa ? `${totalAreaHa.toLocaleString("pt-BR")} ha` : "—"} />
        <Stat icon={<MapIcon className="h-4 w-4" />} label="Talhões" value={String(plots.length)} />
        <Stat icon={<TreeDeciduous className="h-4 w-4" />} label="Árvores previstas" value={treesExpected ? treesExpected.toLocaleString("pt-BR") : "—"} />
        <Stat icon={<Sprout className="h-4 w-4" />} label="Árvores sangradas (30d)" value={treesTapped ? treesTapped.toLocaleString("pt-BR") : "—"} />
      </div>

      {(farmMarkers.length > 0 || focus) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Mapa</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <MapViewerClient farms={farmMarkers} plots={plotMarkers} height={280} focus={focus} />
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Talhões</h2>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : plots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum talhão cadastrado para esta fazenda.</p>
        ) : (
          <div className="space-y-2">
            {plots.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  {p.areaHa != null && <span className="text-xs text-muted-foreground">{p.areaHa.toLocaleString("pt-BR")} ha</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {p.cloneName && <span>Clone: {p.cloneName}</span>}
                  {p.treeCount != null && <span>{p.treeCount.toLocaleString("pt-BR")} árvores previstas</span>}
                  {p.tappingSystem && <span>Sistema: {p.tappingSystem}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
