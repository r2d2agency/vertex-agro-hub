import L from "leaflet";

// Ícone personalizado da Vertex Agro — pin verde com folha estilizada.
// Renderizado como divIcon (SVG inline) para não depender de imagens externas.
export function vertexMarkerSvg(color = "#16a34a", accent = "#ffffff"): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
  <defs>
    <filter id="vshadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path filter="url(#vshadow)" fill="${color}" stroke="#0f172a" stroke-width="1"
    d="M16 1c-7.7 0-14 6.1-14 13.6 0 9.9 12.4 26.3 13 27.1a1.3 1.3 0 0 0 2 0c.6-.8 13-17.2 13-27.1C30 7.1 23.7 1 16 1Z"/>
  <!-- folha estilizada (V da Vertex) -->
  <path fill="${accent}"
    d="M10.5 10.5c4 0 8 1.6 10.5 5.2-1.4 4.6-4.9 7.5-9.4 8.3-.4-3.4.2-6.5 1.6-9.2-2 .3-3.5 1.5-4.6 3.2-.6-2.6.1-5.1 1.9-7.5Z"/>
  <circle cx="16" cy="15" r="2.2" fill="${color}" stroke="${accent}" stroke-width="1.2"/>
</svg>`.trim();
}

export function vertexDivIcon(color = "#16a34a"): L.DivIcon {
  return L.divIcon({
    className: "vertex-marker",
    html: vertexMarkerSvg(color),
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  });
}
