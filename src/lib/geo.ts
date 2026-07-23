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

// Centroide (média dos vértices do anel externo) do polígono principal.
// Retorna { lat, lng } para uso em check-in/geofencing.
export function boundaryCentroid(b: GeoBoundary | null): LatLng | null {
  if (!b) return null;
  const main = b.mode === "multi" ? b.polygons[0] : b.main;
  if (!main) return null;
  const ring = main.coordinates[0];
  if (!ring || ring.length < 3) return null;
  // Ignora o último ponto se for repetido (fechamento do anel)
  const pts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  let sx = 0, sy = 0;
  for (const [lng, lat] of pts) { sx += lng; sy += lat; }
  return { lat: sy / pts.length, lng: sx / pts.length };
}

// Bounding box de todos os polígonos (para geofence simples por raio).
export function boundaryBBox(b: GeoBoundary | null): { minLat: number; minLng: number; maxLat: number; maxLng: number } | null {
  const polys = boundaryPolygons(b);
  if (polys.length === 0) return null;
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const p of polys) {
    for (const [lng, lat] of p.coordinates[0]) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  return { minLat, minLng, maxLat, maxLng };
}
