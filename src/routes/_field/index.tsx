import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { getFieldMe, type FieldMe, captureLocation, submitCheckin } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_field/")({
  component: FieldHome,
});

function FieldHome() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getFieldMe().then(setMe).catch(() => undefined); }, []);

  async function doCheckin(companyId: string, farmId: string, farmName: string) {
    setBusy(farmId);
    const loc = await captureLocation();
    const res = await submitCheckin({ companyId, farmId, ...loc });
    setBusy(null);
    toast.success(res.queued ? `Check-in em fila — ${farmName}` : `Check-in registrado — ${farmName}`);
  }

  if (!me) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{today}</p>
        <h1 className="mt-1 text-xl font-semibold">Olá, {me.user.fullName?.split(" ")[0] ?? "campo"}!</h1>
        <p className="text-sm text-muted-foreground">
          {me.assignments.length > 0
            ? `Você tem ${me.assignments.length} fazenda${me.assignments.length > 1 ? "s" : ""} sob sua responsabilidade.`
            : me.isAdmin
            ? "Modo administrador — use os atalhos abaixo em qualquer fazenda."
            : "Sem fazendas atribuídas. Fale com seu supervisor."}
        </p>
      </section>

      {me.primaryRole !== "consultor" && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Atalhos</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link to="/campo/sangria" className="rounded-lg border border-border bg-card p-3 text-center text-xs">💧<br/>Sangria</Link>
            <Link to="/campo/producao" className="rounded-lg border border-border bg-card p-3 text-center text-xs">📦<br/>Produção</Link>
            <Link to="/campo/ocorrencia" className="rounded-lg border border-border bg-card p-3 text-center text-xs">📸<br/>Ocorrência</Link>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium">
          {me.primaryRole === "consultor" ? "Fazendas acompanhadas" : "Minhas fazendas"}
        </h2>
        {me.assignments.length === 0 && me.isAdmin && (
          <p className="text-xs text-muted-foreground">Use o app admin para atribuir fazendas.</p>
        )}
        <ul className="space-y-2">
          {me.assignments.map((a) => (
            <li key={a.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.farm.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {[a.farm.city, a.farm.state].filter(Boolean).join(" / ") || "—"} · {a.role}
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={busy === a.farm.id}
                  onClick={() => doCheckin(a.farm.companyId, a.farm.id, a.farm.name)}>
                  {busy === a.farm.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  <span className="ml-1">Check-in</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {me.primaryRole === "consultor" && (
        <section className="pt-2">
          <Link to="/campo/agenda">
            <Button className="w-full"><Check className="mr-2 h-4 w-4" /> Ver agenda de visitas</Button>
          </Link>
        </section>
      )}
    </div>
  );
}
