// Verifica e aplica atualizações do PWA sem depender do usuário limpar
// cache manualmente. APP_VERSION é embutido no bundle no build (ver
// scripts/gen-version.mjs); /version.json é buscado em runtime — quando os
// dois divergem, existe uma versão mais nova publicada no servidor.
import { APP_VERSION } from "@/lib/app-version";

export { APP_VERSION };

export async function fetchRemoteVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    // Dois níveles de bust: `?t=` ignora cache de memória do navegador e do
    // proxy; o `cache: "no-store"` responde a esse bypass no servidor e evita
    // que uma camada intermediária (CDN/proxy) sirva a versão antiga.
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

export async function checkForUpdate(): Promise<boolean> {
  const remote = await fetchRemoteVersion();
  return !!remote && remote !== APP_VERSION;
}

// Limpa o cache do service worker e recarrega — não deixa o usuário
// precisar saber fazer isso manualmente.
export async function applyUpdate() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.active?.postMessage({ type: "PURGE" });
      reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      await reg?.update().catch(() => undefined);
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("vertex-")).map((k) => caches.delete(k)));
    }
  } catch {
    // segue pro reload mesmo se a limpeza falhar
  } finally {
    // location.reload(true) é ignorado em alguns navegadores modernos; o
    // replace + bust garante que o fetch do HTML não use cache residual.
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
  }
}

/**
 * Reset de emergência para o iPhone, onde o PWA instalado na tela de início
 * teima em rodar o bundle antigo mesmo depois de um deploy.
 *
 * A diferença para `applyUpdate` é que aqui também desregistramos o service
 * worker por completo — no iOS um SW antigo continua sendo usado enquanto
 * estiver registrado, e `PURGE`/`SKIP_WAITING` não bastam. O registro é
 * recriado no próximo carregamento por `register-sw.ts`.
 *
 * Segurança: a fila do IndexedDB NÃO é apagada. Cada operação é isolada para
 * um passo falho não impedir os próximos, e só no final recarregamos.
 */
export async function emergencyReset() {
  if (typeof window === "undefined") return;
  const step = async (label: string, fn: () => Promise<void> | void) => {
    try { await fn(); } catch { /* ignora: um passo falho não pode parar os outros */ }
  };

  // 1. Service worker: PURGE + unregister. É o passo que resolve no iOS.
  await step("sw", async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    for (const reg of regs ?? []) {
      reg.active?.postMessage({ type: "PURGE" });
      reg.waiting?.postMessage({ type: "SKIP_WAITING" });
      await reg.unregister().catch(() => undefined);
    }
  });

  // 2. Cache Storage: apaga tudo, não só as chaves vertex-*.
  await step("caches", async () => {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });

  // 3. Reload bustado — sem `no-store` o Safari pode servir o HTML do cache.
  const url = new URL(window.location.href);
  url.searchParams.delete("_v");
  url.searchParams.set("_emergencia", Date.now().toString());
  const busted = url.toString();

  await step("prefetch", async () => {
    // Toca a rede antes do replace para o HTTP cache ser revalidado.
    await fetch(busted, { cache: "no-store", headers: { "cache-control": "no-cache" } });
  });

  window.location.replace(busted);
}
