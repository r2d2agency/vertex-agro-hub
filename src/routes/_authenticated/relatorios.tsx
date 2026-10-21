import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, TrendingUp, Droplets, Users, Trees } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { getKpis } from "@/lib/kpis.functions";
import { listTappingSummary } from "@/lib/sangrias.functions";
import { listFarms } from "@/lib/fazendas.functions";
import { getLocalIsoDate } from "@/lib/date-utils";
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

  // Relatório de árvores por talhão: feitas, do talhão, da fazenda, do
  // sangrador e quantas sangrias foram realizadas.
  const [farmFilter, setFarmFilter] = useState("__all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ["tapping-summary", companyId, farmFilter, from, to],
    queryFn: () => listTappingSummary({
      companyId: companyId!,
      farmId: farmFilter === "__all" ? undefined : farmFilter,
      from: from || undefined,
      to: to || undefined,
    }),
    enabled: !!companyId,
  });

  const exportResumo = () =>
    downloadCsv(`resumo-arvores-${today()}`, summary.flatMap((row) => row.tappers.map((t) => ({
      fazenda: row.farmName,
      talhao: row.plotName,
      sangrador: t.name,
      arvoresDoTalhao: row.plotTreeCount,
      arvoresDaFazenda: row.farmTreeCount,
      previstasParaSangrar: row.plannedTreeCount,
      doSangrador: t.treeCount,
      feitas: t.treesDone,
      sangriasRealizadas: t.records,
    }))), [
      { key: "fazenda", label: "Fazenda" },
      { key: "talhao", label: "Talhão" },
      { key: "sangrador", label: "Sangrador" },
      { key: "arvoresDoTalhao", label: "Árvores no talhão" },
      { key: "arvoresDaFazenda", label: "Árvores na fazenda" },
      { key: "previstasParaSangrar", label: "Previstas para sangrar" },
      { key: "doSangrador", label: "Árvores do sangrador" },
      { key: "feitas", label: "Árvores feitas" },
      { key: "sangriasRealizadas", label: "Sangrias realizadas" },
    ]);

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

              {/* Relatório de árvores por talhão e por sangrador. */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2"><Trees className="h-4 w-4" /> Árvores por talhão</p>
                      <p className="text-xs text-muted-foreground">
                        Quantas árvores foram feitas, quantas tem no talhão, na fazenda e do sangrador, e quantas sangrias foram realizadas.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportResumo} disabled={!summary.length}>
                      <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                  </div>

                  <div className="mb-3 grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Fazenda</Label>
                      <Select value={farmFilter} onValueChange={setFarmFilter}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all">Todas as fazendas</SelectItem>
                          {farms.map((farm: any) => <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">De</Label>
                      <Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Até</Label>
                      <Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                  </div>

                  {summaryLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Carregando resumo...</p>
                  ) : summary.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum talhão com sangria no período.</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.map((row) => (
                        <div key={row.plotId} className="rounded-lg border p-3">
                          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium text-sm">{row.farmName} · {row.plotName}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.treesDone} feitas · {row.treesRealized} sangrias realizadas
                            </p>
                          </div>
                          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <MiniKpi label="Árvores no talhão" value={row.plotTreeCount} />
                            <MiniKpi label="Árvores na fazenda" value={row.farmTreeCount} />
                            <MiniKpi label="Previstas para sangrar" value={row.plannedTreeCount} />
                            <MiniKpi label="Árvores feitas" value={row.treesDone} />
                          </div>
                          {row.tappers.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum sangrador alocado neste talhão.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="text-muted-foreground">
                                  <tr className="border-b">
                                    <th className="py-1 text-left font-medium">Sangrador</th>
                                    <th className="py-1 text-right font-medium">Do sangrador</th>
                                    <th className="py-1 text-right font-medium">Feitas</th>
                                    <th className="py-1 text-right font-medium">Sangrias</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.tappers.map((t) => (
                                    <tr key={t.id} className="border-b last:border-0">
                                      <td className="py-1">{t.name}</td>
                                      <td className="py-1 text-right">{t.treeCount.toLocaleString("pt-BR")}</td>
                                      <td className="py-1 text-right">{t.treesDone.toLocaleString("pt-BR")}</td>
                                      <td className="py-1 text-right">{t.records.toLocaleString("pt-BR")}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

function MiniKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

function monthLabel(mes: string) {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}
function today() { return getLocalIsoDate(); }
