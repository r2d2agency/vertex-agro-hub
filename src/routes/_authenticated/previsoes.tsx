import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listForecasts, runForecast } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/previsoes")({
  head: () => ({ meta: [
    { title: "Previsões — Vertex Agro" },
    { name: "description", content: "Projeções de produção de borracha seca com base no histórico." },
    { name: "robots", content: "noindex" },
  ] }),
  component: PrevisoesPage,
});

function PrevisoesPage() {
  const qc = useQueryClient();
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [horizon, setHorizon] = useState("30");

  const { data: items = [] } = useQuery({
    queryKey: ["ai-forecast", companyId],
    queryFn: () => listForecasts(companyId!),
    enabled: !!companyId,
  });
  const latest = items[0];

  const run = useMutation({
    mutationFn: () => runForecast(companyId!, Number(horizon)),
    onSuccess: () => { toast.success("Previsão gerada"); qc.invalidateQueries({ queryKey: ["ai-forecast", companyId] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Previsões"
        description="Projeção de kg secos combinando média histórica e tendência linear."
        actions={companyId ? (
          <div className="flex gap-2">
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              <Sparkles className="mr-2 h-4 w-4" /> Gerar previsão
            </Button>
          </div>
        ) : undefined}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && latest && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Previsão ({latest.horizonDays}d)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{latest.predictedDryKg.toLocaleString("pt-BR")} kg</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Baseline (média)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{latest.baselineDryKg.toLocaleString("pt-BR")} kg</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Confiança</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{((latest.confidence ?? 0) * 100).toFixed(0)}%</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Série histórica (kg secos/dia)</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              {latest.series && latest.series.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={latest.series}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground">Sem dados históricos.</p>}
            </CardContent>
          </Card>

          {latest.notes && <p className="text-xs text-muted-foreground">⚠ {latest.notes}</p>}
        </>
      )}

      {companyId && !latest && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma previsão gerada ainda. Escolha o horizonte e clique em <b>Gerar previsão</b>.</CardContent></Card>
      )}

      {items.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico de previsões</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {items.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{new Date(f.createdAt).toLocaleString("pt-BR")} · {f.horizonDays}d</span>
                <span className="font-medium">{f.predictedDryKg.toLocaleString("pt-BR")} kg</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
