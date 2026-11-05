/* Vertex Agro — Service Worker (offline-capable) */
const VERSION = "v12";
const SHELL = `vertex-shell-${VERSION}`;
const ASSETS = `vertex-assets-${VERSION}`;

const SHELL_URLS = [
  "/", "/campo", "/auth", "/campo/sangria", "/campo/producao", "/campo/ocorrencia",
  "/campo/avaliacao", "/campo/consultor", "/campo/mais", "/campo/sincronizacao",
  "/campo/chuva", "/campo/abastecimento", "/campo/operacao-maquina", "/campo/checklist",
  "/campo/estimulacao", "/campo/agenda",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const manifestResponse = await fetch("/offline-assets.json", { cache: "no-cache" });
    if (!manifestResponse.ok) {
      throw new Error(`Offline asset manifest request failed: ${manifestResponse.status}`);
    }

    const assetUrls = await manifestResponse.json();
    if (!Array.isArray(assetUrls) || assetUrls.some((url) => typeof url !== "string")) {
      throw new Error("Offline asset manifest has an invalid format");
    }

    const assetCache = await caches.open(ASSETS);
    const failedCriticalAssets = [];
    for (let i = 0; i < assetUrls.length; i += 25) {
      const results = await Promise.allSettled(assetUrls.slice(i, i + 25).map((url) => assetCache.add(url)));
      results.forEach((result, index) => {
        if (result.status === "rejected" && /\.(js|css)(?:$|\?)/.test(assetUrls[i + index])) {
          failedCriticalAssets.push(assetUrls[i + index]);
        }
      });
    }
    if (failedCriticalAssets.length) {
      throw new Error(`Failed to precache critical offline assets: ${failedCriticalAssets.join(", ")}`);
    }

    await cache.add("/auth");
    await Promise.allSettled(SHELL_URLS.filter((url) => url !== "/auth").map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("vertex-") && k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_build/") || url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      try {
        const res = await fetch(req);
        if (res.ok) {
          cache.put(req.url, res.clone());
          return res;
        }
        if (res.status < 500) return res;
      } catch (e) {
        // Network failures and server 5xx responses use the cached app shell.
      }

      let cached = await cache.match(req);
      if (!cached) cached = await cache.match(req.url);
      if (!cached) cached = await cache.match("/auth");
      if (!cached && url.pathname.startsWith("/campo")) cached = await cache.match("/campo");
      if (!cached) cached = await cache.match("/");
      if (!cached) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (!k.startsWith("vertex-")) continue;
          const c = await caches.open(k);
          let m = await c.match(req);
          if (!m) m = await c.match("/auth");
          if (!m && url.pathname.startsWith("/campo")) m = await c.match("/campo");
          if (!m) m = await c.match("/") || await c.match(req.url);
          if (m) { cached = m; break; }
        }
      }
      if (cached) return cached;
      return new Response("<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;padding:2rem;text-align:center\"><h1>Sem conexão</h1></body>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
    })());
  }
});
