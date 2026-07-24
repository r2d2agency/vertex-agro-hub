import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, CheckCircle2, Info, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { ackInsight, generateInsights, listInsights, planFromInsight, type AiInsight } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/alertas-ia")({
  head: () => ({ meta: [
    { title: "Alertas Inteligentes — Vertex Agro" },
    { name: "description", content: "Anomalias, riscos e oportunidades detectados por inteligência artificial." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AlertasIaPage,
});

const SEV_META: Record<string, { label: string; icon: any; className: string }> = {
  critical: { label: "Crítico", icon: AlertTriangle, className: "text-destructive" },
  warning:  { label: "Atenção", icon: AlertTriangle, className: "text-warning" },
  info:     { label: "Info",    icon: Info,          className: "text-muted-foreground" },
};

function AlertasIaPage() {
  const qc = useQueryClient();
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["ai-insights", companyId],
    queryFn: () => listInsights(companyId!),
    enabled: !!companyId,
  });

  const gen = useMutation({
    mutationFn: () => generateInsights(companyId!),
    onSuccess: (r) => { toast.success(`${r.generated} insights gerados`); qc.invalidateQueries({ queryKey: ["ai-insights", companyId] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha ao gerar"),
  });
  const ack = useMutation({
    mutationFn: (id: string) => ackInsight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-insights", companyId] }),
  });
  const toPlan = useMutation({
    mutationFn: (id: string) => planFromInsight(id),
    onSuccess: () => { toast.success("Plano de ação criado"); qc.invalidateQueries({ queryKey: ["action-plans"] }); },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Alertas Inteligentes"
        description="Anomalias e recomendações geradas por IA a partir dos seus dados operacionais."
        actions={companyId ? (
          <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
            <Sparkles className="mr-2 h-4 w-4" /> {gen.isPending ? "Analisando…" : "Gerar insights"}
          </Button>
        ) : undefined}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        loading ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum insight ainda. Clique em <b>Gerar insights</b> para analisar os últimos 90 dias.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {items.map((it: AiInsight) => {
              const meta = SEV_META[it.severity] ?? SEV_META.info;
              const Icon = meta.icon;
              return (
                <Card key={it.id} className={it.acknowledged ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${meta.className}`} /> {it.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={it.severity === "critical" ? "destructive" : "outline"}>{meta.label}</Badge>
                        <Badge variant="secondary">{it.kind}</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {it.summary && <p className="text-sm text-muted-foreground">{it.summary}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{new Date(it.createdAt).toLocaleString("pt-BR")}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toPlan.mutate(it.id)} disabled={toPlan.isPending}>
                          <ListChecks className="mr-1 h-3 w-3" /> Gerar plano
                        </Button>
                        {!it.acknowledged && (
                          <Button size="sm" variant="ghost" onClick={() => ack.mutate(it.id)}>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Marcar como visto
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
