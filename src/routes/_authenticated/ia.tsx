import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles, TrendingUp, ListChecks, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listInsights, listActionPlans, listForecasts } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [
    { title: "Central IA — Vertex Agro" },
    { name: "description", content: "Painel central da inteligência artificial da Vertex Agro." },
    { name: "robots", content: "noindex" },
  ] }),
  component: IaPage,
});

const CARDS = [
  { to: "/alertas-ia", title: "Alertas Inteligentes", icon: AlertTriangle, description: "Anomalias e riscos detectados pela IA." },
  { to: "/assistente",  title: "Assistente Gerencial", icon: Bot, description: "Converse com a IA sobre sua operação." },
  { to: "/previsoes",   title: "Previsões",            icon: TrendingUp, description: "Projeções de produção de borracha seca." },
  { to: "/planos-acao", title: "Planos de Ação",       icon: ListChecks, description: "Planos priorizados e acompanhamento." },
] as const;

function IaPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();

  const insights = useQuery({ queryKey: ["ai-insights", companyId], queryFn: () => listInsights(companyId!), enabled: !!companyId });
  const plans = useQuery({ queryKey: ["action-plans", companyId], queryFn: () => listActionPlans(companyId!), enabled: !!companyId });
  const forecasts = useQuery({ queryKey: ["ai-forecast", companyId], queryFn: () => listForecasts(companyId!), enabled: !!companyId });

  const openInsights = (insights.data ?? []).filter((i) => !i.acknowledged).length;
  const openPlans = (plans.data ?? []).filter((p) => p.status !== "concluido" && p.status !== "cancelado").length;
  const lastForecast = forecasts.data?.[0];

  return (
    <div className="grid gap-6">
      <PageHeader title="Central IA" description="Ponto de partida para a inteligência artificial da plataforma." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Alertas pendentes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{openInsights}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Planos ativos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{openPlans}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Última previsão</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{lastForecast ? `${lastForecast.predictedDryKg.toLocaleString("pt-BR")} kg` : "—"}</p></CardContent></Card>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="block">
              <Card className="transition-colors hover:border-primary">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5 text-primary" /> {c.title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{c.description}</p></CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Como funciona</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>A IA da Vertex Agro é alimentada pelos dados operacionais da sua empresa: entregas de produção, dias de sangria, DRC, ocorrências e fazendas.</p>
        </CardContent>
      </Card>

    </div>
  );
}
