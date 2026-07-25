import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Camera, ClipboardCheck, Droplets, Home, Package } from "lucide-react";

type Item = { to: string; label: string; icon: any };

const MONITOR: Item[] = [
  { to: "/campo", label: "Hoje", icon: Home },
  { to: "/campo/sangria", label: "Sangria", icon: Droplets },
  { to: "/campo/producao", label: "Produção", icon: Package },
  { to: "/campo/ocorrencia", label: "Ocorrência", icon: Camera },
];

const CONSULTOR: Item[] = [
  { to: "/campo", label: "Hoje", icon: Home },
  { to: "/campo/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/campo/ocorrencia", label: "Avaliação", icon: ClipboardCheck },
];

export function FieldBottomNav({ role }: { role: string }) {
  const items = role === "consultor" ? CONSULTOR : MONITOR;
  const location = useLocation();
  const pathname = location.pathname;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/campo" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to as any}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
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
