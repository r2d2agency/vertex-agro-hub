import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { checkForUpdate, applyUpdate } from "@/lib/app-update";

const POLL_MS = 15 * 60 * 1000; // 15 min
const AUTO_APPLY_MS = 8000; // tempo pra avisar antes de recarregar sozinho

// Verifica e aplica atualizações automaticamente — checa ao voltar pro app,
// ao reconectar e periodicamente; some avisa e recarrega sozinho, sem
// depender do usuário saber que precisa limpar o cache.
export function AppUpdateWatcher() {
  const triggeredRef = useRef(false);

  useEffect(() => {
    async function check() {
      if (triggeredRef.current) return;
      const hasUpdate = await checkForUpdate();
      if (!hasUpdate || triggeredRef.current) return;
      triggeredRef.current = true;

      const timer = setTimeout(() => applyUpdate(), AUTO_APPLY_MS);
      toast.info("Nova versão disponível", {
        description: "Atualizando automaticamente em instantes...",
        duration: AUTO_APPLY_MS,
        action: {
          label: "Atualizar agora",
          onClick: () => { clearTimeout(timer); applyUpdate(); },
        },
      });
    }

    check();
    const interval = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    const onOnline = () => check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
