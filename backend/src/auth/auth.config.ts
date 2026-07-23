const DEFAULT_ACCESS_TTL = '900s';
const DEFAULT_REFRESH_TTL_SECONDS = 2_592_000;

export function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret';
}

export function jwtAccessTtl() {
  const raw = (process.env.JWT_ACCESS_TTL ?? DEFAULT_ACCESS_TTL).trim();
  if (!raw) return DEFAULT_ACCESS_TTL;

  // Aceita tanto segundos puros (900) quanto formatos do jsonwebtoken (15m, 1h, 7d).
  return /^\d+$/.test(raw) ? `${raw}s` : raw;
}

export function jwtRefreshTtlSeconds() {
  const raw = (process.env.JWT_REFRESH_TTL ?? String(DEFAULT_REFRESH_TTL_SECONDS)).trim();
  if (!raw) return DEFAULT_REFRESH_TTL_SECONDS;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return DEFAULT_REFRESH_TTL_SECONDS;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3_600 : 86_400;
  return value * multiplier;
}