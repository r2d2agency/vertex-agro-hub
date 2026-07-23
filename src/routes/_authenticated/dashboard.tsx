import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TreeDeciduous,
  Users,
  Droplets,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listCompanies } from "@/lib/companies.functions";
import { listFarms } from "@/lib/fazendas.functions";
import { listPeople } from "@/lib/people.functions";
import { listOccurrences } from "@/lib/ocorrencias.functions";
import { getKpis } from "@/lib/kpis.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vertex Agro" },
      { name: "description", content: "Painel executivo Vertex Agro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function DashboardPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();

  const { data: allCompanies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });

  const { data: occurrences = [] } = useQuery({
    queryKey: ["occurrences", companyId, "open"],
    queryFn: () => listOccurrences(companyId!, { status: "open" }),
    enabled: !!companyId,
  });

  const { data: kpis } = useQuery({
    queryKey: ["kpis", companyId],
    queryFn: () => getKpis(companyId!),
    enabled: !!companyId,
  });

  const activeCompanies = allCompanies.filter((c) => c.status === "ativa").length;
  const monitors = people.filter((p) => p.roles.includes("monitor")).length;
  const criticalOccurrences = occurrences.filter(
    (o) => (o as { severity?: string }).severity === "critical" || (o as { severity?: string }).severity === "high",
  ).length;

  const monthly = kpis?.monthly ?? [];
  const perFarm = (kpis?.sangradores ?? []).slice(0, 8).map((s) => ({
    name: s.name,
    litros: s.liters,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard Executivo"
        description="Visão geral da operação com dados reais da empresa selecionada."
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Metric icon={Building2} label="Empresas ativas" value={String(activeCompanies)} />
            <Metric icon={TreeDeciduous} label="Fazendas ativas" value={String(farms.length)} />
            <Metric icon={Users} label="Monitores ativos" value={String(monitors)} />
            <Metric
              icon={Droplets}
              label="Entregas no período"
              value={String(kpis?.totals.totalDeliveries ?? 0)}
            />
            <Metric
              icon={TrendingUp}
              label="Produção (kg secos)"
              value={(kpis?.totals.totalDryKg ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            />
            <Metric
              icon={AlertTriangle}
              label="Ocorrências abertas"
              value={String(occurrences.length)}
              hint={criticalOccurrences ? `${criticalOccurrences} crítica(s)` : undefined}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produção mensal (kg secos)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {monthly.length === 0 ? (
                  <EmptyChart label="Sem produção registrada ainda." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="kgSecos" stroke="var(--chart-2)" strokeWidth={2} name="Kg secos" />
                      <Line type="monotone" dataKey="entregas" stroke="var(--chart-5)" strokeWidth={2} name="Entregas" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produção por sangrador (litros)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {perFarm.length === 0 ? (
                  <EmptyChart label="Sem sangrias registradas ainda." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perFarm}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="litros" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
