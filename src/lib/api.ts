const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "vertex_access_token";
const REFRESH_TOKEN_KEY = "vertex_refresh_token";

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  roles?: Array<{ role: string; companyId?: string | null }>;
};

function ensureApiUrl() {
  if (!CONFIGURED_API_BASE_URL) {
    throw new Error("Configure VITE_API_URL=/api no frontend e API_PROXY_TARGET apontando para o backend.");
  }

  if (typeof window !== "undefined") {
    try {
      const configuredUrl = new URL(CONFIGURED_API_BASE_URL, window.location.origin);

      // Em produção, chamadas diretas do browser para outro domínio voltam a depender de CORS.
      // Portanto, mesmo que o EasyPanel injete por engano a URL pública do backend no build,
      // o frontend usa o proxy same-origin /api e o server.mjs repassa para API_PROXY_TARGET.
      if (configuredUrl.origin !== window.location.origin) {
        return "/api";
      }
    } catch {
      return "/api";
    }
  }

  return CONFIGURED_API_BASE_URL;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasAuthTokens() {
  return Boolean(getAccessToken() && getRefreshToken());
}

export function setAuthTokens(tokens: AuthTokens) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  window.dispatchEvent(new Event("vertex-auth-change"));
}

export function clearAuthTokens() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("vertex-auth-change"));
}

async function refreshAccessToken() {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;

  const response = await fetch(`${ensureApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });

  if (!response.ok) {
    clearAuthTokens();
    return false;
  }

  const tokens = (await response.json()) as AuthTokens;
  setAuthTokens(tokens);
  return true;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    if (Array.isArray(body.message)) return body.message.join("\n");
    return body.message || body.error || `Erro ${response.status}`;
  } catch {
    return `Erro ${response.status}`;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean; retry?: boolean } = {},
): Promise<T> {
  const { auth = true, retry = true, headers, body, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${ensureApiUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
    body,
  });

  if (response.status === 401 && auth && retry) {
    if (await refreshAccessToken()) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
    clearAuthTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
      window.location.replace("/auth");
    }
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function login(email: string, password: string) {
  clearAuthTokens();
  const tokens = await apiRequest<AuthTokens>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
  setAuthTokens(tokens);
  return getCurrentUser();
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logout() {
  try {
    if (getAccessToken()) {
      await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
    }
  } finally {
    clearAuthTokens();
  }
}

export type UploadedFile = {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mime: string;
};

export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${ensureApiUrl()}/uploads`, {
    method: "POST",
    headers,
    body: form,
  });

  if (response.status === 401 && (await refreshAccessToken())) {
    return uploadFile(file);
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as UploadedFile;
}

