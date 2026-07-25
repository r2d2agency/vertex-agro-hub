import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CloudRain, Droplets, FileText, LogOut, RefreshCw, Settings } from "lucide-react";
import { logout } from "@/lib/api";

export const Route = createFileRoute("/campo/mais")({ component: MaisPage });

const ITEMS = [
  { to: "/campo/estimulacao", label: "Estimulação", icon: Droplets, desc: "Registrar aplicação de estimulantes" },
  { to: "/campo/chuva", label: "Informar chuva", icon: CloudRain, desc: "Reportar interrupção por chuva" },
  { to: "/campo/sincronizacao", label: "Sincronização", icon: RefreshCw, desc: "Ver e enviar registros pendentes" },
  { to: "/campo/historico", label: "Histórico completo", icon: FileText, desc: "Todos os registros do período" },
];

function MaisPage() {
  const nav = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Mais opções</h1>
      <ul className="space-y-2">
        {ITEMS.map((it) => (
          <li key={it.to}>
            <Link to={it.to as any} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:border-primary/50">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{it.desc}</div>
              </div>
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={() => nav({ to: "/configuracoes" })}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Settings className="h-5 w-5" /></div>
            <div><div className="text-sm font-semibold">Configurações</div><div className="text-[11px] text-muted-foreground">Preferências do app</div></div>
          </button>
        </li>
        <li>
          <button
            onClick={async () => { await logout(); nav({ to: "/auth", replace: true }); }}
            className="flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-left text-destructive"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/20"><LogOut className="h-5 w-5" /></div>
            <div><div className="text-sm font-semibold">Sair</div><div className="text-[11px] opacity-80">Encerrar sessão neste dispositivo</div></div>
          </button>
        </li>
      </ul>
    </div>
  );
}
