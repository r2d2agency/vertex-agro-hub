export type ParsedCoordinates =
  | { latitude: number; longitude: number; warning?: string }
  | { error: string };

// Faixa aproximada do território brasileiro — só gera aviso (não bloqueia),
// pra pegar o erro clássico de lat/lng trocados sem travar casos de borda
// legítimos (ex.: fazenda perto da fronteira).
const BR_LAT_RANGE: [number, number] = [-34, 6];
const BR_LNG_RANGE: [number, number] = [-74, -32];

function inRange(v: number, [min, max]: [number, number]) {
  return v >= min && v <= max;
}

// Aceita "lat, lng" com ponto decimal (-9.1234, -38.5678) ou "lat; lng" com
// vírgula decimal, formato de planilha BR (-9,1234; -38,5678). Formatos
// ambíguos (duas vírgulas sem ponto-e-vírgula) e graus/minutos/segundos são
// rejeitados explicitamente — não dá pra adivinhar sem gerar dado errado.
export function parseCoordinates(raw?: string | null): ParsedCoordinates | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  if (/[°'"]|[NSEWnsew]\b/.test(value)) {
    return { error: 'Formato de coordenadas em graus/minutos/segundos não é suportado. Converta para decimal.' };
  }

  let latStr: string | undefined;
  let lngStr: string | undefined;

  if (value.includes(';')) {
    const [a, b] = value.split(';').map((s) => s.trim());
    latStr = a?.replace(',', '.');
    lngStr = b?.replace(',', '.');
  } else {
    const parts = value.split(',').map((s) => s.trim());
    if (parts.length === 2) {
      [latStr, lngStr] = parts;
    } else {
      return {
        error:
          "Não foi possível interpretar as coordenadas. Use 'lat, lng' com ponto decimal (ex: -9.1234, -38.5678) ou 'lat; lng' com vírgula decimal.",
      };
    }
  }

  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!latStr || !lngStr || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { error: 'Coordenadas inválidas — confira o formato (lat, lng).' };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: 'Coordenadas fora do intervalo válido (latitude -90..90, longitude -180..180).' };
  }

  const warning =
    inRange(latitude, BR_LAT_RANGE) && inRange(longitude, BR_LNG_RANGE)
      ? undefined
      : 'Coordenadas fora da área esperada do Brasil — confira se latitude/longitude não estão trocadas.';

  return { latitude, longitude, warning };
}
