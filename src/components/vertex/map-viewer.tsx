import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { GeoBoundary } from "@/lib/geo";
import { boundaryCentroid, boundaryPolygons } from "@/lib/geo";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type FarmMarker = {
  id: string;
  name: string;
  regionalId?: string | null;
  regionalName?: string | null;
  color: string;
  areaHa?: number | null;
  city?: string | null;
  state?: string | null;
  owner?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  boundary?: GeoBoundary | null;
};

export type PlotMarker = {
  id: string;
  name: string;
  farmId: string;
  farmName?: string | null;
  color: string;
  areaHa?: number | null;
  boundary?: GeoBoundary | null;
};

export type MapViewerProps = {
  farms: FarmMarker[];
  plots?: PlotMarker[];
  showFarms?: boolean;
  showPlots?: boolean;
  height?: number;
  focus?: { lat: number; lng: number } | null;
  onSelectFarm?: (id: string) => void;
};

export default function MapViewer({
  farms, plots = [], showFarms = true, showPlots = true, height = 560, focus, onSelectFarm,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const farmsLayerRef = useRef<L.LayerGroup | null>(null);
  const plotsLayerRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-10.5, -55.5], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    farmsLayerRef.current = L.layerGroup().addTo(map);
    plotsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setReady(true);
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
  }, []);

  const bboxKey = useMemo(
    () => `${farms.map((f) => f.id).join(",")}|${plots.map((p) => p.id).join(",")}|${showFarms}|${showPlots}`,
    [farms, plots, showFarms, showPlots]
  );

  useEffect(() => {
    if (!ready || !mapRef.current || !farmsLayerRef.current || !plotsLayerRef.current) return;
    const map = mapRef.current;
    farmsLayerRef.current.clearLayers();
    plotsLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    if (showFarms) {
      for (const f of farms) {
        const polys = boundaryPolygons(f.boundary ?? null);
        polys.forEach((p) => {
          const latlngs = p.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
          const poly = L.polygon(latlngs, { color: f.color, weight: 2, fillOpacity: 0.2 });
          poly.bindPopup(farmPopup(f));
          if (onSelectFarm) poly.on("click", () => onSelectFarm(f.id));
          farmsLayerRef.current!.addLayer(poly);
          latlngs.forEach((ll) => bounds.extend(ll));
        });

        const center = boundaryCentroid(f.boundary ?? null) ??
          (f.latitude != null && f.longitude != null ? { lat: f.latitude, lng: f.longitude } : null);
        if (center) {
          const m = L.marker([center.lat, center.lng]);
          m.bindPopup(farmPopup(f));
          if (onSelectFarm) m.on("click", () => onSelectFarm(f.id));
          farmsLayerRef.current!.addLayer(m);
          bounds.extend([center.lat, center.lng]);
        }
      }
    }

    if (showPlots) {
      for (const p of plots) {
        const polys = boundaryPolygons(p.boundary ?? null);
        polys.forEach((poly) => {
          const latlngs = poly.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
          const layer = L.polygon(latlngs, { color: p.color, weight: 1.5, fillOpacity: 0.35, dashArray: "3 3" });
          layer.bindPopup(plotPopup(p));
          plotsLayerRef.current!.addLayer(layer);
          latlngs.forEach((ll) => bounds.extend(ll));
        });
      }
    }

    if (bounds.isValid()) {
      try { map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 }); } catch { /* empty */ }
    }
  }, [ready, bboxKey, farms, plots, showFarms, showPlots, onSelectFarm]);

  const focusLat = focus?.lat ?? null;
  const focusLng = focus?.lng ?? null;
  useEffect(() => {
    if (!ready || !mapRef.current || focusLat == null || focusLng == null) return;
    mapRef.current.setView([focusLat, focusLng], 15);
  }, [ready, focusLat, focusLng]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="overflow-hidden rounded-md border border-border" />;
}

function farmPopup(f: FarmMarker): string {
  const parts = [
    `<strong>${escape(f.name)}</strong>`,
    f.regionalName ? `<div style="font-size:12px;color:#555">Regional: ${escape(f.regionalName)}</div>` : "",
    f.owner ? `<div style="font-size:12px;color:#555">Responsável: ${escape(f.owner)}</div>` : "",
    f.city || f.state ? `<div style="font-size:12px;color:#555">${escape([f.city, f.state].filter(Boolean).join(" / "))}</div>` : "",
    f.areaHa != null ? `<div style="font-size:12px;color:#555">Área: ${f.areaHa} ha</div>` : "",
  ];
  return parts.filter(Boolean).join("");
}
function plotPopup(p: PlotMarker): string {
  return [
    `<strong>${escape(p.name)}</strong>`,
    p.farmName ? `<div style="font-size:12px;color:#555">Fazenda: ${escape(p.farmName)}</div>` : "",
    p.areaHa != null ? `<div style="font-size:12px;color:#555">Área: ${p.areaHa} ha</div>` : "",
  ].filter(Boolean).join("");
}
function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
