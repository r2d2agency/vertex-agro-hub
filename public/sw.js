/* Vertex Agro — Service Worker (offline-first light)
 *  - HTML/navegações: network-first (nunca serve HTML stale)
 *  - Assets hashed (/assets/*, /_build/*): cache-first
 *  - /api/*: nunca cacheia (dados sensíveis / mutáveis)
 *  - Suporta cleanup: envie mensagem { type: "SKIP_WAITING" } ou { type: "PURGE" }
 */

const VERSION = "v1";
const RUNTIME = `vertex-runtime-${VERSION}`;
const ASSETS = `vertex-assets-${VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith("vertex-") && k !== RUNTIME && k !== ASSETS)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "PURGE") {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("vertex-")).map((k) => caches.delete(k)));
    })());
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear API
  if (url.pathname.startsWith("/api/")) return;

  // Assets hashed → cache-first
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

  // HTML / navegações → network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response(
          "<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;padding:2rem;text-align:center\"><h1>Sem conexão</h1><p>Vertex Agro tentará sincronizar automaticamente quando você voltar a ficar online.</p></body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
  }
});
