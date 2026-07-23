// Shared boundary types (browser-safe, no leaflet imports).
export type GeoPolygon = {
  type: "Polygon";
  coordinates: [number, number][][]; // [ring][point] as [lng, lat]
};

export type LatLng = { lat: number; lng: number };

// Novo formato: suporta multi-polígono e polígono com exclusões (buracos / reservas).
export type GeoBoundary =
  | { mode: "multi"; polygons: GeoPolygon[] }
  | { mode: "with-exclusions"; main: GeoPolygon; exclusions: GeoPolygon[] };

// Aceita formato novo, antigo (GeoPolygon) ou null. Normaliza para GeoBoundary.
export function toBoundary(input: unknown): GeoBoundary | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  if (obj.mode === "multi" && Array.isArray(obj.polygons)) {
    return { mode: "multi", polygons: obj.polygons as GeoPolygon[] };
  }
  if (obj.mode === "with-exclusions" && obj.main) {
    return {
      mode: "with-exclusions",
      main: obj.main as GeoPolygon,
      exclusions: (obj.exclusions as GeoPolygon[]) ?? [],
    };
  }
  // legacy: { type: "Polygon", coordinates: [...] }
  if (obj.type === "Polygon" && Array.isArray(obj.coordinates)) {
    return { mode: "multi", polygons: [input as GeoPolygon] };
  }
  return null;
}

export function boundaryPolygons(b: GeoBoundary | null): GeoPolygon[] {
  if (!b) return [];
  if (b.mode === "multi") return b.polygons;
  return [b.main, ...b.exclusions];
}
