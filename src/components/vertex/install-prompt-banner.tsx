import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "vertex:install-banner-dismissed-until";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((window.navigator as any).standalone === true) return true; // iOS Safari
  return false;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia?.("(max-width: 768px)").matches ?? false);
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isDismissed() {
  if (typeof localStorage === "undefined") return false;
  const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Date.now() < until;
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
  } catch { /* noop */ }
}

// Mostra um banner pra instalar o app quando o visitante está no celular —
// Android/Chrome usa o prompt nativo; iOS Safari não tem esse evento, então
// mostra a instrução (Compartilhar > Adicionar à Tela de Início).
export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissedNow, setDismissedNow] = useState(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isDismissed()) return;

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const visible = !dismissedNow && (showIosHint || !!deferredPrompt);
  if (!visible) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function close() {
    dismiss();
    setDismissedNow(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instalar o app Vertex Agro</p>
          {showIosHint ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              Toque em <Share className="h-3 w-3" /> Compartilhar e depois em "Adicionar à Tela de Início"
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Acesso mais rápido e funciona offline.</p>
          )}
        </div>
        {!showIosHint && (
          <Button size="sm" className="shrink-0 rounded-lg" onClick={install}>Instalar</Button>
        )}
        <button onClick={close} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
