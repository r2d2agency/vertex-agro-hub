import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Activity, Droplets, PackageCheck, AlertTriangle, CalendarClock, FlaskConical, Camera, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({ meta: [
    { title: "Atividades Recentes — Vertex Agro" },
    { name: "description", content: "Feed em tempo real das últimas ações operacionais do seringal." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AtividadesPage,
});

const KIND_META: Record<HistoryEvent["kind"], { label: string; icon: typeof Activity; color: string }> = {
  sangria:     { label: "Sangria",     icon: Droplets,      color: "bg-blue-500/10 text-blue-700" },
  producao:    { label: "Produção",    icon: PackageCheck,  color: "bg-emerald-500/10 text-emerald-700" },
  ocorrencia:  { label: "Ocorrência",  icon: AlertTriangle, color: "bg-red-500/10 text-red-700" },
  agenda:      { label: "Agenda",      icon: CalendarClock, color: "bg-violet-500/10 text-violet-700" },
  estimulacao: { label: "Estimulação", icon: FlaskConical,  color: "bg-amber-500/10 text-amber-700" },
  fotografia:  { label: "Foto",        icon: Camera,        color: "bg-slate-500/10 text-slate-700" },
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function AtividadesPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();

  const [from, setFrom] = useState("2026-08-05");
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFrom(d.toISOString().slice(0, 10));
  }, []);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const farmName = useMemo(() => {
    const m = new Map(farms.map((f) => [f.id, f.name]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [farms]);

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ["atividades", companyId, from],
    queryFn: () => listHistory(companyId!, { from, limit: 100 }),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Atividades Recentes"
        description="Feed consolidado das últimas ações operacionais dos últimos 7 dias."
      />

      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(Object.keys(KIND_META) as HistoryEvent["kind"][]).map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              return (
                <Card key={k}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="grid gap-0.5">
                      <span className="text-xs text-muted-foreground">{meta.label}</span>
                      <span className="text-lg font-semibold">{counts[k] ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Últimas atividades</h3>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/historico">Ver histórico completo <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada nos últimos 7 dias.</p>
              ) : (
                <ol className="relative grid gap-3 border-l border-border pl-5">
                  {events.map((e) => {
                    const meta = KIND_META[e.kind];
                    const Icon = meta.icon;
                    return (
                      <li key={e.id} className="relative">
                        <span className={`absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full ${meta.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-card p-3">
                          <div className="grid gap-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{meta.label}</Badge>
                              <span className="text-sm font-medium">{e.title}</span>
                            </div>
                            {e.subtitle && <span className="text-xs text-muted-foreground">{e.subtitle}</span>}
                            <span className="text-xs text-muted-foreground">
                              {relativeTime(e.date)} · {farmName(e.farmId)}
                            </span>
                          </div>
                          {e.meta?.url && (
                            <img src={e.meta.url as string} alt="" className="h-14 w-14 rounded object-cover" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
