export type ViaCepResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  complemento: string;
  localidade: string; // cidade
  uf: string;
  erro?: boolean;
};

export async function lookupCep(rawCep: string): Promise<ViaCepResult | null> {
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export function formatCep(cep: string): string {
  const d = cep.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// Geocoding gratuito via Nominatim/OSM
export type GeocodeResult = { lat: number; lng: number; displayName: string };

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon), displayName: data[0].display_name };
  } catch {
    return null;
  }
}
