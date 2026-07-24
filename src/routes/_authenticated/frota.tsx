import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { fleetOverview, MACHINE_STATUSES } from "@/lib/frota.functions";
import { Truck, Wrench, Users, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/frota")({
  head: () => ({ meta: [
    { title: "Frota — Vertex Agro" },
    { name: "description", content: "Visão geral de máquinas, implementos, operadores e operações." },
    { name: "robots", content: "noindex" },
  ] }),
  component: FrotaPage,
});

function FrotaPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const { data } = useQuery({
    queryKey: ["fleet-overview", companyId],
    queryFn: () => fleetOverview(companyId!),
    enabled: !!companyId,
  });

  const shortcuts = [
    { to: "/maquinas", label: "Máquinas", icon: Truck },
    { to: "/implementos", label: "Implementos", icon: Wrench },
    { to: "/operadores", label: "Operadores", icon: Users },
    { to: "/operacoes", label: "Operações", icon: ClipboardList },
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader title="Frota" description="Visão consolidada da operação de máquinas e implementos." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {shortcuts.map((s) => (
              <Card key={s.to} className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-5">
                  <s.icon className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.to === "/maquinas" && `${data?.totals.machines ?? 0} cadastradas`}
                      {s.to === "/implementos" && `${data?.totals.implements ?? 0} cadastrados`}
                      {s.to === "/operadores" && `${data?.totals.operators ?? 0} ativos`}
                      {s.to === "/operacoes" && `${data?.totals.operations ?? 0} operações`}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost"><Link to={s.to}>Abrir</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold">Máquinas por status</p>
              <div className="grid gap-2 md:grid-cols-3">
                {MACHINE_STATUSES.map((s) => (
                  <div key={s.value} className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm">{s.label}</span>
                    <span className="text-lg font-semibold">{data?.byStatus[s.value] ?? 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Próximas entregas desta sprint: <strong>Abastecimento</strong>, <strong>Estoque de diesel</strong>,
              <strong> Produtos e insumos</strong> e <strong>Manutenção</strong>. A estrutura de dados,
              permissões e sync offline já está preparada no backend.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
