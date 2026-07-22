import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyForm } from "@/components/vertex/company-form";

export const Route = createFileRoute("/_authenticated/empresas/novo")({
  head: () => ({ meta: [{ title: "Nova empresa — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: NovaEmpresaPage,
});

function NovaEmpresaPage() {
  return (
    <div>
      <PageHeader title="Nova empresa" description="Cadastre uma empresa, grupo ou produtor rural." />
      <CompanyForm />
    </div>
  );
}
