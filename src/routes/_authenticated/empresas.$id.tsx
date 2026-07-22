import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCompany } from "@/lib/companies.functions";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyForm } from "@/components/vertex/company-form";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/empresas/$id")({
  head: () => ({ meta: [{ title: "Editar empresa — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: EditarEmpresaPage,
});

function EditarEmpresaPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getCompany);
  const { data, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => get({ data: { id } }),
  });

  return (
    <div>
      <PageHeader title="Editar empresa" description="Atualize os dados cadastrais." />
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">Empresa não encontrada.</CardContent>
        </Card>
      ) : (
        <CompanyForm
          id={id}
          initial={{
            razao_social: data.razao_social ?? "",
            nome_fantasia: data.nome_fantasia ?? "",
            cnpj: data.cnpj ?? "",
            email: data.email ?? "",
            telefone: data.telefone ?? "",
            responsavel: data.responsavel ?? "",
            endereco: data.endereco ?? "",
            cidade: data.cidade ?? "",
            estado: data.estado ?? "",
            observacoes: data.observacoes ?? "",
            status: (data.status ?? "ativa") as "ativa" | "inativa" | "bloqueada",
          }}
        />
      )}
    </div>
  );
}
