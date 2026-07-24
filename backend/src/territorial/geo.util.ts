// Utilitários geo do backend — mesma semântica de src/lib/geo.ts
// Calcula centroide e bounding box a partir do JSON de boundary
// (mode: "multi" | "with-exclusions") ou legado (GeoJSON Polygon).

type Ring = [number, number][]; // [ [lng, lat], ... ]
type GeoPolygon = { type: 'Polygon'; coordinates: Ring[] };

type BoundaryMulti = { mode: 'multi'; polygons: GeoPolygon[] };
type BoundaryWithExclusions = {
  mode: 'with-exclusions';
  main: GeoPolygon;
  exclusions: GeoPolygon[];
};

export type BBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type GeoMeta = {
  centroidLat: number | null;
  centroidLng: number | null;
  bboxJson: BBox | null;
};

function normalize(
  input: unknown,
): BoundaryMulti | BoundaryWithExclusions | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  if (obj.mode === 'multi' && Array.isArray(obj.polygons)) {
    return { mode: 'multi', polygons: obj.polygons as GeoPolygon[] };
  }
  if (obj.mode === 'with-exclusions' && obj.main) {
    return {
      mode: 'with-exclusions',
      main: obj.main as GeoPolygon,
      exclusions: (obj.exclusions as GeoPolygon[]) ?? [],
    };
  }
  if (obj.type === 'Polygon' && Array.isArray(obj.coordinates)) {
    return { mode: 'multi', polygons: [input as GeoPolygon] };
  }
  return null;
}

function allPolygons(
  b: BoundaryMulti | BoundaryWithExclusions,
): GeoPolygon[] {
  return b.mode === 'multi' ? b.polygons : [b.main, ...b.exclusions];
}

export function computeGeo(boundary: unknown): GeoMeta {
  const b = normalize(boundary);
  if (!b) return { centroidLat: null, centroidLng: null, bboxJson: null };

  // centroide: média dos vértices do anel externo do polígono principal
  const main = b.mode === 'multi' ? b.polygons[0] : b.main;
  let centroidLat: number | null = null;
  let centroidLng: number | null = null;
  const ring = main?.coordinates?.[0];
  if (ring && ring.length >= 3) {
    const closed =
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1];
    const pts = closed ? ring.slice(0, -1) : ring;
    let sx = 0;
    let sy = 0;
    for (const [lng, lat] of pts) {
      sx += lng;
      sy += lat;
    }
    centroidLng = sx / pts.length;
    centroidLat = sy / pts.length;
  }

  // bbox: cobre todos os polígonos
  const polys = allPolygons(b);
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const p of polys) {
    for (const [lng, lat] of p.coordinates[0] ?? []) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  const bboxJson =
    isFinite(minLat) && isFinite(minLng)
      ? { minLat, minLng, maxLat, maxLng }
      : null;

  return { centroidLat, centroidLng, bboxJson };
}
