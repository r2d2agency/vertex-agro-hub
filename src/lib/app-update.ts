// Verifica e aplica atualizações do PWA sem depender do usuário limpar
// cache manualmente. APP_VERSION é embutido no bundle no build (ver
// scripts/gen-version.mjs); /version.json é buscado em runtime — quando os
// dois divergem, existe uma versão mais nova publicada no servidor.
import { APP_VERSION } from "@/lib/app-version";

export { APP_VERSION };

export async function fetchRemoteVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
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
    window.location.reload();
  }
}
