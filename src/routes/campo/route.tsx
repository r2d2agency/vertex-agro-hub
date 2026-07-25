import { createFileRoute, Outlet, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, WifiOff, Wifi, Download, Loader2, Bell } from "lucide-react";
import { hasAuthTokens, logout } from "@/lib/api";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { subscribeOutbox, flushOutbox } from "@/lib/offline/queue";
import { FieldBottomNav } from "@/components/vertex/field/bottom-nav";
import { Button } from "@/components/ui/button";
import vertexLogo from "@/assets/vertex-logo.png";

export const Route = createFileRoute("/campo")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !hasAuthTokens()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: FieldShell,
});

function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return prompt ? { show: async () => { await prompt.prompt(); setPrompt(null); } } : null;
}

function FieldShell() {
  const navigate = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const install = useInstallPrompt();

  useEffect(() => { getFieldMe().then(setMe).catch((e) => setError(e?.message ?? "Falha ao carregar")); }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const un = subscribeOutbox((s) => { setPending(s.pending); setFlushing(s.running); });
    return () => { un(); };
  }, []);

  async function signOut() { await logout(); navigate({ to: "/auth", replace: true }); }

  const content = (() => {
    if (error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      );
    }
    if (!me) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }
    const role = me.primaryRole;
    const firstName = me.user.fullName?.split(" ")[0] ?? "campo";
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={vertexLogo} alt="Vertex" className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">Olá, {firstName}</div>
                <div className="text-[11px] capitalize text-muted-foreground">
                  {role === "consultor" ? "Consultor" : role === "monitor" ? "Monitor" : role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setFlushing(true); flushOutbox().finally(() => setFlushing(false)); }}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  online ? "border-primary/40 bg-primary/10 text-primary" : "border-warning/40 bg-warning/10 text-warning"
                }`}
                title={online ? "Online" : "Offline"}
              >
                {flushing ? <Loader2 className="h-3 w-3 animate-spin" /> : online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {pending > 0 ? pending : online ? "On" : "Off"}
              </button>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Notificações">
                <Bell className="h-4 w-4" />
              </Button>
              {install && (
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={install.show} title="Instalar">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {me.isAdmin && (
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate({ to: "/dashboard" })} title="Admin">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-4">
          <Outlet />
        </main>

        <FieldBottomNav role={role} />
      </div>
    );
  })();

  return <div className="dark">{content}</div>;
}
