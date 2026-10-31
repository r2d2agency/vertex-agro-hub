/* Vertex Agro — Service Worker (offline-capable)
 *  - Precache do shell HTML ("/") no install
 *  - HTML/navegações: network-first, fallback para shell cacheado
 *  - Assets hashed: cache-first
 *  - /api/*: nunca cacheia
 */
const VERSION = "v4";
const SHELL = `vertex-shell-${VERSION}`;
const ASSETS = `vertex-assets-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    try { await cache.add("/"); } catch (e) {}
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
        if (res.ok) cache.put(req.url, res.clone());
        return res;
      } catch (e) {
        const cached = await cache.match(req) || await cache.match("/") || await cache.match(req.url);
        if (cached) return cached;
        return new Response("<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;padding:2rem;text-align:center\"><h1>Sem conexão</h1></body>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
  }
});
