/**
 * Registro seguro do Service Worker.
 * Regras (Lovable/PWA):
 *  - NUNCA registra em dev / iframe / preview lovable
 *  - Suporta kill-switch via `?sw=off`
 *  - Alvo: /sw.js na raiz do site
 */

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("sw") === "off") return true;
    if (window.self !== window.top) return true;
    const h = window.location.hostname;
    if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
    if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
    if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
    if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  } catch { /* noop */ }
  return false;
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith("/sw.js")) await r.unregister();
    }
  } catch { /* noop */ }
}

export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  // Só no build de produção
  const isProd = (import.meta as any)?.env?.PROD === true;
  if (!isProd || isRefusedContext()) {
    await unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("[sw] registro falhou:", e);
  }
}
