// Shared boundary types (browser-safe, no leaflet imports).
export type GeoPolygon = {
  type: "Polygon";
  coordinates: [number, number][][]; // [ring][point] as [lng, lat]
};

export type LatLng = { lat: number; lng: number };
