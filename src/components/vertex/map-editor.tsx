import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { GeoBoundary, GeoPolygon } from "@/lib/geo";

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapEditorProps = {
  value: GeoBoundary | null;
  onChange: (boundary: GeoBoundary | null, areaHa: number | null) => void;
  reference?: GeoBoundary | null;
  height?: number;
  focus?: { lat: number; lng: number } | null;
};

type Mode = GeoBoundary["mode"];

const MAIN_STYLE = { color: "#16a34a", weight: 3, fillOpacity: 0.2 };
const EXCL_STYLE = { color: "#dc2626", weight: 2, fillOpacity: 0.25, dashArray: "4 4" };

export default function MapEditor({ value, onChange, reference, height = 400, focus }: MapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mainLayerRef = useRef<L.FeatureGroup | null>(null);
  const exclLayerRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const [mode, setMode] = useState<Mode>(value?.mode ?? "multi");
  const [ready, setReady] = useState(false);
  const [drawTarget, setDrawTarget] = useState<"main" | "exclusion">("main");

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-10.5, -55.5], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const main = new L.FeatureGroup(); map.addLayer(main); mainLayerRef.current = main;
    const excl = new L.FeatureGroup(); map.addLayer(excl); exclLayerRef.current = excl;

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const ev = e as L.DrawEvents.Created;
      const layer = ev.layer as L.Polygon;
      const target = (layer as unknown as { _target?: string })._target;
      // decide bucket
      if (drawTargetRef.current === "exclusion" || target === "exclusion") {
        layer.setStyle(EXCL_STYLE);
        exclLayerRef.current?.addLayer(layer);
      } else {
        layer.setStyle(MAIN_STYLE);
        mainLayerRef.current?.addLayer(layer);
      }
      emit();
    });
    map.on(L.Draw.Event.EDITED, () => emit());
    map.on(L.Draw.Event.DELETED, () => emit());

    mapRef.current = map;
    setReady(true);
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref para o handler saber o alvo corrente
  const drawTargetRef = useRef<"main" | "exclusion">("main");
  useEffect(() => { drawTargetRef.current = drawTarget; }, [drawTarget]);

  // Configure draw control by mode
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (drawControlRef.current) map.removeControl(drawControlRef.current);
    const featureGroup = drawTarget === "exclusion" && mode === "with-exclusions"
      ? exclLayerRef.current!
      : mainLayerRef.current!;
    const ctrl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: true,
          showArea: true,
          metric: true,
          shapeOptions: drawTarget === "exclusion" ? EXCL_STYLE : MAIN_STYLE,
          drawError: { color: "#dc2626", message: "As linhas não podem se cruzar" },
        } as L.DrawOptions.PolygonOptions,
        rectangle: { shapeOptions: drawTarget === "exclusion" ? EXCL_STYLE : MAIN_STYLE } as L.DrawOptions.RectangleOptions,
        polyline: false, circle: false, marker: false, circlemarker: false,
      },
      edit: { featureGroup, remove: true },
    });
    map.addControl(ctrl);
    drawControlRef.current = ctrl;
  }, [ready, mode, drawTarget]);

  // Load initial value
  useEffect(() => {
    if (!ready || !mainLayerRef.current || !exclLayerRef.current || !mapRef.current) return;
    mainLayerRef.current.clearLayers();
    exclLayerRef.current.clearLayers();
    if (value) {
      if (value.mode === "multi") {
        value.polygons.forEach((p) => addPolygon(p, mainLayerRef.current!, MAIN_STYLE));
      } else {
        addPolygon(value.main, mainLayerRef.current!, MAIN_STYLE);
        value.exclusions.forEach((p) => addPolygon(p, exclLayerRef.current!, EXCL_STYLE));
      }
      try {
        const all = L.featureGroup([mainLayerRef.current, exclLayerRef.current]);
        const b = all.getBounds();
        if (b.isValid()) mapRef.current.fitBounds(b, { padding: [20, 20], maxZoom: 17 });
      } catch { /* empty */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Reference backdrop
  useEffect(() => {
    if (!ready || !mapRef.current || !reference) return;
    const map = mapRef.current;
    const polys = reference.mode === "multi" ? reference.polygons : [reference.main];
    const layer = L.geoJSON(
      { type: "FeatureCollection", features: polys.map((p) => ({ type: "Feature", geometry: p, properties: {} })) } as GeoJSON.FeatureCollection,
      { style: { color: "#0f766e", weight: 2, dashArray: "4 4", fillOpacity: 0.05, interactive: false } }
    );
    layer.addTo(map);
    try { map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 16 }); } catch { /* empty */ }
    return () => { layer.remove(); };
  }, [ready, reference]);

  // Focus (usar minha localização / geocode)
  const focusLat = focus?.lat ?? null;
  const focusLng = focus?.lng ?? null;
  const didInitialFocus = useRef(false);
  useEffect(() => {
    if (!ready || !mapRef.current || focusLat == null || focusLng == null) return;
    // Só move a view no primeiro focus recebido; depois disso o usuário controla.
    if (didInitialFocus.current) return;
    didInitialFocus.current = true;
    mapRef.current.setView([focusLat, focusLng], 15);
  }, [ready, focusLat, focusLng]);

  function addPolygon(p: GeoPolygon, group: L.FeatureGroup, style: L.PathOptions) {
    const latlngs = p.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
    const poly = L.polygon(latlngs, style);
    group.addLayer(poly);
  }

  function layerToPolygon(layer: L.Layer): GeoPolygon | null {
    const p = layer as L.Polygon;
    const latlngs = p.getLatLngs()[0] as L.LatLng[];
    if (!latlngs || latlngs.length < 3) return null;
    const ring: [number, number][] = latlngs.map((pt) => [pt.lng, pt.lat]);
    ring.push([ring[0][0], ring[0][1]]);
    return { type: "Polygon", coordinates: [ring] };
  }

  function emit() {
    if (!mainLayerRef.current || !exclLayerRef.current) return onChange(null, null);
    const mainPolys: GeoPolygon[] = [];
    mainLayerRef.current.eachLayer((l) => { const p = layerToPolygon(l); if (p) mainPolys.push(p); });
    const exclPolys: GeoPolygon[] = [];
    exclLayerRef.current.eachLayer((l) => { const p = layerToPolygon(l); if (p) exclPolys.push(p); });

    if (mode === "multi") {
      if (mainPolys.length === 0) return onChange(null, null);
      const totalM2 = mainPolys.reduce((sum, p) => sum + area(turfPolygon(p.coordinates)), 0);
      const ha = Math.round((totalM2 / 10000) * 100) / 100;
      onChange({ mode: "multi", polygons: mainPolys }, ha);
    } else {
      if (mainPolys.length === 0) return onChange(null, null);
      const main = mainPolys[0];
      const mainM2 = area(turfPolygon(main.coordinates));
      const exclM2 = exclPolys.reduce((s, p) => s + area(turfPolygon(p.coordinates)), 0);
      const ha = Math.round((Math.max(0, mainM2 - exclM2) / 10000) * 100) / 100;
      onChange({ mode: "with-exclusions", main, exclusions: exclPolys }, ha);
    }
  }

  function clearAll() {
    mainLayerRef.current?.clearLayers();
    exclLayerRef.current?.clearLayers();
    onChange(null, null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-2 text-sm">
        <RadioGroup
          value={mode}
          onValueChange={(v) => { setMode(v as Mode); setDrawTarget("main"); setTimeout(emit, 0); }}
          className="flex flex-wrap gap-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="multi" id="mode-multi" />
            <Label htmlFor="mode-multi" className="cursor-pointer text-xs">Multi-polígono (adicione quantos precisar)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="with-exclusions" id="mode-excl" />
            <Label htmlFor="mode-excl" className="cursor-pointer text-xs">1 principal + exclusões (reservas/estradas)</Label>
          </div>
        </RadioGroup>

        {mode === "with-exclusions" && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Desenhando:</span>
            <Button type="button" size="sm" variant={drawTarget === "main" ? "default" : "outline"} onClick={() => setDrawTarget("main")}>Contorno</Button>
            <Button type="button" size="sm" variant={drawTarget === "exclusion" ? "default" : "outline"} onClick={() => setDrawTarget("exclusion")}>Exclusão</Button>
          </div>
        )}

        <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" onClick={clearAll}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar
        </Button>
      </div>
      <div ref={containerRef} style={{ height, width: "100%" }} className="overflow-hidden rounded-md border border-border" />
      <p className="text-xs text-muted-foreground">
        Use as ferramentas no canto do mapa para desenhar. Você pode desenhar vários polígonos até concluir.
      </p>
    </div>
  );
}
