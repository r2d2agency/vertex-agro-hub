import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Moon, 
  Sun, 
  KeyRound,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { subscribeOutbox, flushOutbox } from "@/lib/offline/queue";

export const Route = createFileRoute("/campo/mais")({ component: PreferenciasPage });

function PreferenciasPage() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    
    const un = subscribeOutbox((s) => {
      setPending(s.pending);
      setRunning(s.running);
    });

    // Detect initial theme from document class
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      un();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    setTheme(newTheme);
    toast.success(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`);
  };

  const handleManualSync = async () => {
    if (!online) {
      toast.error("Você está offline. Conecte-se para sincronizar.");
      return;
    }
    try {
      const res = await flushOutbox();
      if (res.sent > 0) {
        toast.success(`${res.sent} registro(s) sincronizado(s)`);
      } else if (pending === 0) {
        toast.info("Tudo sincronizado");
      }
    } catch (e) {
      toast.error("Erro na sincronização manual");
    }
  };

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-base font-semibold">Preferências do Aplicativo</h1>
        <p className="text-xs text-muted-foreground mt-1">Gerencie seu app e sincronização</p>
      </header>

      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Sincronismo e Rede</h2>
        
        <div className="grid gap-2">
          {/* Status Offline/Online */}
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${online ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning"}`}>
                {online ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold">Modo Offline</div>
                <div className="text-[11px] text-muted-foreground">
                  {online ? "Conectado à rede" : "Operando sem internet"}
                </div>
              </div>
            </div>
            <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${online ? "border-primary/30 text-primary" : "border-warning/30 text-warning"}`}>
              {online ? "Online" : "Offline"}
            </div>
          </div>

          {/* Sincronismo */}
          <button
            onClick={handleManualSync}
            disabled={running}
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <RefreshCw className={`h-5 w-5 ${running ? "animate-spin text-primary" : ""}`} />
              </div>
              <div>
                <div className="text-sm font-semibold">Forçar sincronismo</div>
                <div className="text-[11px] text-muted-foreground">
                  {pending > 0 
                    ? `${pending} registro(s) aguardando envio` 
                    : "Todos os dados estão na nuvem"}
                </div>
              </div>
            </div>
            {pending > 0 && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground animate-pulse">
                {pending}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Aparência e Segurança</h2>
        
        <div className="grid gap-2">
          {/* Tema Claro/Escuro */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold">Tema do App</div>
                <div className="text-[11px] text-muted-foreground">
                  Mudar para modo {theme === "dark" ? "claro" : "escuro"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Trocar Senha */}
          <button
            onClick={() => navigate({ to: "/campo/perfil" })}
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Trocar senha</div>
                <div className="text-[11px] text-muted-foreground">Atualizar suas credenciais</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="pt-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/40 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3" />
          Vertex Agro Field v1.2.0 · 2026
        </div>
        
        <button
          onClick={() => navigate({ to: "/campo/sincronizacao" })}
          className="text-xs text-primary font-medium hover:underline underline-offset-4"
        >
          Ver fila técnica de sincronização
        </button>
      </div>
    </div>
  );
}
