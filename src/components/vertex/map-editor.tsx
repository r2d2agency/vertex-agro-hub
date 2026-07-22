import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import area from "@turf/area";
import { polygon as turfPolygon } from "@turf/helpers";
import type { GeoPolygon } from "@/lib/geo";

// Fix default Leaflet marker icons (bundler strips them otherwise).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapEditorProps = {
  value: GeoPolygon | null;
  onChange: (polygon: GeoPolygon | null, areaHa: number | null) => void;
  reference?: GeoPolygon | null; // e.g. farm boundary shown as backdrop
  height?: number;
};

export default function MapEditor({ value, onChange, reference, height = 400 }: MapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnLayerRef = useRef<L.FeatureGroup | null>(null);
  const currentLayerRef = useRef<L.Polygon | null>(null);
  const [ready, setReady] = useState(false);

  // Init map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-10.5, -55.5], zoom: 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnLayerRef.current = drawn;

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#16a34a", weight: 3, fillOpacity: 0.2 },
        },
        rectangle: { shapeOptions: { color: "#16a34a", weight: 3, fillOpacity: 0.2 } } as L.DrawOptions.RectangleOptions,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: { featureGroup: drawn, remove: true },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const ev = e as L.DrawEvents.Created;
      // only one polygon at a time
      drawn.clearLayers();
      drawn.addLayer(ev.layer);
      currentLayerRef.current = ev.layer as L.Polygon;
      emitChange();
    });
    map.on(L.Draw.Event.EDITED, () => emitChange());
    map.on(L.Draw.Event.DELETED, () => {
      currentLayerRef.current = null;
      onChange(null, null);
    });

    mapRef.current = map;
    setReady(true);

    // Ensure sizing (dialogs render before map paints)
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load reference (backdrop, non-editable)
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const backdrop = L.geoJSON(reference ?? undefined, {
      style: { color: "#0f766e", weight: 2, dashArray: "4 4", fillOpacity: 0.05, interactive: false },
    });
    if (reference) {
      backdrop.addTo(map);
      try { map.fitBounds(backdrop.getBounds(), { padding: [20, 20], maxZoom: 16 }); } catch { /* empty */ }
    }
    return () => { backdrop.remove(); };
  }, [ready, reference]);

  // Load initial value polygon
  useEffect(() => {
    if (!ready || !drawnLayerRef.current || !mapRef.current) return;
    drawnLayerRef.current.clearLayers();
    currentLayerRef.current = null;
    if (value) {
      const latlngs = value.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
      const poly = L.polygon(latlngs, { color: "#16a34a", weight: 3, fillOpacity: 0.2 });
      drawnLayerRef.current.addLayer(poly);
      currentLayerRef.current = poly;
      try { mapRef.current.fitBounds(poly.getBounds(), { padding: [20, 20], maxZoom: 17 }); } catch { /* empty */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function emitChange() {
    const layer = currentLayerRef.current;
    if (!layer) return onChange(null, null);
    const latlngs = layer.getLatLngs()[0] as L.LatLng[];
    if (!latlngs || latlngs.length < 3) return onChange(null, null);
    const ring: [number, number][] = latlngs.map((p) => [p.lng, p.lat]);
    // close ring
    ring.push([ring[0][0], ring[0][1]]);
    const geo: GeoPolygon = { type: "Polygon", coordinates: [ring] };
    const m2 = area(turfPolygon(geo.coordinates));
    const ha = Math.round((m2 / 10000) * 100) / 100;
    onChange(geo, ha);
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="overflow-hidden rounded-md border border-border"
    />
  );
}
