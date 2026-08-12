import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, History, Home, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

type Item = { to: string; label: string; icon: any };

const TABS: Item[] = [
  { to: "/campo", label: "Início", icon: Home },
  { to: "/campo/agenda", label: "Agenda", icon: CalendarDays },
  { to: "__fab__", label: "Operação", icon: Plus },
  { to: "/campo/historico", label: "Histórico", icon: History },
  { to: "/campo/mais", label: "Mais", icon: MoreHorizontal },
];

const OPERATIONS = [
  { to: "/campo/sangrador", label: "Cadastrar/vincular sangrador", emoji: "🧑‍🌾", roles: ["monitor", "admin"] },
  { to: "/campo/consultor", label: "Visita técnica (Consultoria)", emoji: "📋", roles: ["consultor", "admin"] },
  { to: "/campo/sangria", label: "Registrar sangria", emoji: "💧", roles: ["monitor", "admin"] },
  { to: "/campo/producao", label: "Registrar produção", emoji: "📦", roles: ["monitor", "admin"] },
  { to: "/campo/estimulacao", label: "Registrar estimulação", emoji: "🧪", roles: ["monitor", "admin"] },
  { to: "/campo/ocorrencia", label: "Registrar ocorrência", emoji: "⚠️" },
  { to: "/campo/operacao-maquina", label: "Apontar operação de máquina", emoji: "🚜" },
  { to: "/campo/abastecimento", label: "Abastecer máquina", emoji: "⛽" },
  { to: "/campo/checklist", label: "Checklist de máquina", emoji: "🧾" },
  { to: "/campo/insumo", label: "Consumo de insumo", emoji: "🧴" },
  { to: "/campo/avaliacao", label: "Avaliar equipe", emoji: "⭐" },
  { to: "/campo/chuva", label: "Informar chuva", emoji: "🌧️" },
];

export function FieldBottomNav({ role }: { role: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {TABS.map((it) => {
          if (it.to === "/campo" && role === "consultor") {
            it = { ...it, to: "/campo/consultor" };
          }
          if (it.to === "__fab__") {
            return (
              <li key="fab" className="flex justify-center">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <button
                      aria-label="Operação"
                      className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_var(--color-primary)] ring-4 ring-background transition active:scale-95"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl border-border/60 bg-card">
                    <SheetHeader>
                      <SheetTitle className="text-left">Nova operação</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 grid gap-2 pb-6">
                      {OPERATIONS.filter(op => !op.roles || op.roles.includes(role)).map((op) => (
                        <button
                          key={op.to}
                          onClick={() => { setOpen(false); navigate({ to: op.to as any }); }}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 text-left transition hover:border-primary/60 hover:bg-primary/5"
                        >
                          <span className="text-xl">{op.emoji}</span>
                          <span className="text-sm font-medium">{op.label}</span>
                        </button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </li>
            );
          }
          const active = pathname === it.to || (it.to !== "/campo" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to as any}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
