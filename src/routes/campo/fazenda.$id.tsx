import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";

export const Route = createFileRoute("/campo/fazenda/$id")({
  component: FarmDetailPage,
});

function FarmDetailPage() {
  const { id } = Route.useParams();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFieldMe().then(setMe).finally(() => setLoading(false));
  }, []);

  const farm = me?.assignments.find((a) => a.farm.id === id)?.farm;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!farm) return <div className="p-8 text-center text-muted-foreground">Fazenda não encontrada ou sem acesso.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-center text-base font-semibold">{farm.name}</h1>
      
      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Localização</span>
          <span className="text-sm">{farm.city} / {farm.state}</span>
        </div>
        
        {farm.latitude && farm.longitude && (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Coordenadas</span>
            <span className="text-sm font-mono text-primary">
              {farm.latitude.toFixed(6)}, {farm.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{farm.plots?.length || 0}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Talhões</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">—</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Prod. Média</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold px-1">Ações Rápidas</h2>
        <div className="grid grid-cols-1 gap-2">
           <p className="text-xs text-muted-foreground p-2 italic text-center">Funcionalidades de detalhes da fazenda em desenvolvimento.</p>
        </div>
      </section>
    </div>
  );
}