import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { Activity, Droplets, Gauge, Leaf, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { getKpis } from "@/lib/kpis.functions";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [
    { title: "Indicadores — Vertex Agro" },
    { name: "description", content: "Indicadores consolidados de produção, sangria e produtividade." },
    { name: "robots", content: "noindex" },
  ] }),
  component: IndicadoresPage,
});

function fmt(n: number, digits = 0) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}
function monthLabel(mes: string) {
  const [y, m] = mes.split("-");
  return `${m}/${y.slice(2)}`;
}

function IndicadoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["kpis", companyId],
    queryFn: () => getKpis(companyId!),
    enabled: !!companyId,
  });

  const monthly = useMemo(() =>
    (data?.monthly ?? []).map((m) => ({
      ...m,
      mesLabel: monthLabel(m.mes),
      kgSecos: Math.round(m.kgSecos),
    })), [data]);

  const sangradores = (data?.sangradores ?? []).slice(0, 10);
  const totals = data?.totals;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Indicadores"
        description="Visão executiva de produção, DRC, sangria e produtividade por área."
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={<Droplets className="h-4 w-4" />} label="Kg secos" value={fmt(totals?.totalDryKg ?? 0)} />
            <KpiCard icon={<Activity className="h-4 w-4" />} label="Entregas" value={fmt(totals?.totalDeliveries ?? 0)} />
            <KpiCard icon={<Users className="h-4 w-4" />} label="Dias sangrados" value={fmt(totals?.totalTappingDays ?? 0)} />
            <KpiCard icon={<Gauge className="h-4 w-4" />} label="DRC médio" value={`${fmt(totals?.drcAvgPercent ?? 0, 1)}%`} />
            <KpiCard icon={<Leaf className="h-4 w-4" />} label="Área total" value={`${fmt(totals?.totalAreaHa ?? 0, 2)} ha`} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Produtividade" value={`${fmt(totals?.productivityKgHa ?? 0, 1)} kg/ha`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Produção mensal (kg secos)</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              {monthly.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mesLabel" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="kgSecos" name="Kg secos" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">{loading ? "Carregando…" : "Sem dados no período."}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top sangradores (litros)</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              {sangradores.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={sangradores}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="liters" name="Litros" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados de sangradores.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent><p className="text-xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}
