import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Truck } from "lucide-react";
import { getMachine, MACHINE_CATEGORIES, MACHINE_STATUSES } from "@/lib/frota.functions";

export const Route = createFileRoute("/_authenticated/maquinas/$id")({
  head: () => ({ meta: [
    { title: "Detalhe da máquina — Vertex Agro" },
    { name: "description", content: "Ficha completa da máquina com histórico, fotos e documentos." },
    { name: "robots", content: "noindex" },
  ] }),
  component: MachineDetailPage,
});

function MachineDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: () => getMachine(id),
  });

  if (isLoading) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>;
  if (!data) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Máquina não encontrada.</CardContent></Card>;

  const statusL = MACHINE_STATUSES.find((s) => s.value === data.status)?.label ?? data.status;
  const catL = MACHINE_CATEGORIES.find((s) => s.value === data.category)?.label ?? data.category;

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/maquinas"><ArrowLeft className="mr-1 h-4 w-4" /> Máquinas</Link></Button>
      </div>
      <PageHeader
        title={data.name}
        description={`${catL} · ${data.brand ?? ""} ${data.model ?? ""} ${data.year ? "· " + data.year : ""}`.trim()}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="mt-1"><Badge variant="outline">{statusL}</Badge></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Horímetro</div><div className="mt-1 text-lg font-semibold">{data.hourmeter ?? "—"} {data.hourmeterUnit || "h"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Placa</div><div className="mt-1 text-lg font-semibold">{data.plate || "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Combustível</div><div className="mt-1 text-lg font-semibold">{data.fuelType || "—"}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="implementos">Implementos</TabsTrigger>
          <TabsTrigger value="abastecimentos">Abastecimentos</TabsTrigger>
          <TabsTrigger value="operacoes">Operações</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <Card><CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div><div className="text-xs text-muted-foreground">Código</div><div>{data.code || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Patrimônio</div><div>{data.patrimony || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Série</div><div>{data.serial || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Capacidade tanque</div><div>{data.tankCapacity ?? "—"} L</div></div>
              <div><div className="text-xs text-muted-foreground">Fornecedor</div><div>{data.supplier || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Aquisição</div><div>{data.acquisitionDate ? new Date(data.acquisitionDate).toLocaleDateString("pt-BR") : "—"}</div></div>
              <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Observações</div><div>{data.notes || "—"}</div></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="implementos">
          <Card><CardContent className="p-5">
            {data.implements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum implemento vinculado.</p>
            ) : (
              <ul className="grid gap-2">
                {data.implements.map((i) => (
                  <li key={i.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><span>{i.name}</span></div>
                    <Badge variant="outline">{i.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        {["abastecimentos", "operacoes", "manutencoes"].map((k) => (
          <TabsContent key={k} value={k}>
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Módulo a ser entregue nas próximas sub-sprints (7.2, 7.4). A estrutura de dados e permissões já está preparada.
            </CardContent></Card>
          </TabsContent>
        ))}

        <TabsContent value="documentos">
          <Card><CardContent className="p-5">
            {data.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <ul className="grid gap-2">
                {data.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.kind} · {new Date(d.createdAt).toLocaleString("pt-BR")}</div>
                    </div>
                    {d.fileUrl && <Button asChild variant="ghost" size="sm"><a href={d.fileUrl} target="_blank" rel="noreferrer">Abrir</a></Button>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card><CardContent className="p-5">
            {data.statusLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
            ) : (
              <ol className="grid gap-2 border-l-2 pl-4">
                {data.statusLogs.map((l) => (
                  <li key={l.id} className="relative">
                    <span className="absolute -left-[9px] top-2 h-3 w-3 rounded-full bg-primary" />
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("pt-BR")}</div>
                      <div className="text-sm">
                        <Badge variant="outline" className="mr-2">{l.kind}</Badge>
                        {l.fromValue ?? "—"} → <strong>{l.toValue ?? "—"}</strong>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
