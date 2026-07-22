import { createFileRoute } from "@tanstack/react-router";
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

const producaoData = [
  { mes: "Jan", previsto: 420, realizado: 388 },
  { mes: "Fev", previsto: 460, realizado: 445 },
  { mes: "Mar", previsto: 490, realizado: 502 },
  { mes: "Abr", previsto: 510, realizado: 478 },
  { mes: "Mai", previsto: 540, realizado: 561 },
  { mes: "Jun", previsto: 570, realizado: 549 },
];

const fazendaData = [
  { fazenda: "Santa Luzia", producao: 148 },
  { fazenda: "Boa Vista", producao: 121 },
  { fazenda: "Esperança", producao: 96 },
  { fazenda: "São João", producao: 184 },
];

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

function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard Executivo"
        description="Visão geral da operação. Dados demonstrativos — indicadores reais serão exibidos após o cadastro das operações."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric icon={Building2} label="Empresas ativas" value="1" hint="Vertex Agro" />
        <Metric icon={TreeDeciduous} label="Fazendas ativas" value="4" hint="dados demo" />
        <Metric icon={Users} label="Monitores ativos" value="7" />
        <Metric icon={Droplets} label="Sangrias no mês" value="1.284" hint="+8% vs. mês anterior" />
        <Metric icon={TrendingUp} label="Produção (t)" value="561" hint="103% da meta" />
        <Metric icon={AlertTriangle} label="Ocorrências abertas" value="3" hint="1 crítica" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produção previsto x realizado</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={producaoData}>
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
                <Line type="monotone" dataKey="previsto" stroke="var(--chart-5)" strokeWidth={2} />
                <Line type="monotone" dataKey="realizado" stroke="var(--chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produção por fazenda</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fazendaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fazenda" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="producao" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mapa das fazendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              Mapa Mapbox será ativado na Sprint 2 (Gestão Territorial).
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />
                <div>
                  <p className="text-foreground">Sangria concluída — Fazenda Santa Luzia, Tabela 03</p>
                  <p className="text-xs text-muted-foreground">há 12 minutos</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
                <div>
                  <p className="text-foreground">Estimulação próxima do vencimento — Boa Vista</p>
                  <p className="text-xs text-muted-foreground">há 1 hora</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                <div>
                  <p className="text-foreground">Ocorrência crítica: estrada interditada — Esperança</p>
                  <p className="text-xs text-muted-foreground">há 3 horas</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
