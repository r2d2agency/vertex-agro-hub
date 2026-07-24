import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { BarChart3, Download, TrendingUp, Droplets, Users } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { getKpis } from "@/lib/kpis.functions";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Operacionais — Vertex Agro" },
      { name: "description", content: "Painel consolidado de produção, sangrias e desempenho por sangrador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
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

  const sangradores = data?.sangradores ?? [];

  const exportMensal = () =>
    downloadCsv(`producao-mensal-${today()}`, monthly, [
      { key: "mes", label: "Mês (AAAA-MM)" },
      { key: "mesLabel", label: "Mês" },
      { key: "kgSecos", label: "Kg secos" },
      { key: "entregas", label: "Entregas" },
    ]);

  const exportSangradores = () =>
    downloadCsv(`ranking-sangradores-${today()}`, sangradores, [
      { key: "name", label: "Sangrador" },
      { key: "liters", label: "Litros" },
      { key: "days", label: "Dias" },
      { key: "adherenceAvg", label: "Aderência média (%)", format: (v) => v == null ? "" : String(v) },
    ]);

  return (
    <div>
      <PageHeader
        title="Relatórios Operacionais"
        description="Visão consolidada dos últimos 12 meses: produção mensal, indicadores e ranking de sangradores."
      />

      {!isLoading && companies.length === 0 ? <NoCompanyCard /> : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {loading ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Carregando indicadores...</CardContent></Card>
          ) : !data ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Sem dados para exibir.</CardContent></Card>
          ) : (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Kg secos (12m)" value={data.totals.totalDryKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} />
                <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Entregas" value={data.totals.totalDeliveries.toLocaleString("pt-BR")} />
                <Kpi icon={<Droplets className="h-4 w-4" />} label="Dias de sangria" value={data.totals.totalTappingDays.toLocaleString("pt-BR")} />
                <Kpi label="DRC médio" value={`${data.totals.drcAvgPercent.toFixed(1)}%`} />
                <Kpi label="Área total (ha)" value={data.totals.totalAreaHa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
                <Kpi label="Prod. (kg/ha)" value={data.totals.productivityKgHa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
              </div>

              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Produção mensal (kg secos)</p>
                      <p className="text-xs text-muted-foreground">Últimos 12 meses agregando todas as entregas.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportMensal} disabled={!monthly.length}>
                      <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                  </div>
                  <div className="h-72 w-full">
                    {monthly.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem entregas no período.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                          <Line type="monotone" dataKey="kgSecos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Ranking de sangradores</p>
                      <p className="text-xs text-muted-foreground">Top 10 por volume de látex (litros) nos últimos 12 meses.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportSangradores} disabled={!sangradores.length}>
                      <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                  </div>
                  <div className="h-80 w-full">
                    {sangradores.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem sangrias no período.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sangradores} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                          <Legend />
                          <Bar dataKey="liters" name="Litros" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function monthLabel(mes: string) {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}
function today() { return new Date().toISOString().slice(0, 10); }
