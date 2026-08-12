import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PeopleByRolePage, InviteDialog } from "@/components/vertex/people-by-role";
import { useSelectedCompany } from "@/components/vertex/company-picker";

export const Route = createFileRoute("/_authenticated/consultores")({
  head: () => ({
    meta: [
      { title: "Consultores — Vertex Agro" },
      { name: "description", content: "Consultores técnicos vinculados à empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => {
    const [creating, setCreating] = useState(false);
    const { companyId } = useSelectedCompany();
    const qc = useQueryClient();

    return (
      <>
        <PeopleByRolePage
          role="consultor"
          title="Consultores"
          description="Consultores técnicos com acesso às fazendas e agendas da empresa."
          emptyLabel="Nenhum consultor cadastrado nesta empresa."
          onAddClick={() => setCreating(true)}
        />
        <div className="mt-4 flex justify-center">
          <Link to="/usuarios">
            <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Ir para Portal de RH (Cadastro Completo)</Button>
          </Link>
        </div>
        {companyId && (
          <InviteDialog
            open={creating}
            role="consultor"
            roleLabel="Consultor"
            onOpenChange={setCreating}
            companyId={companyId}
            onSaved={() => qc.invalidateQueries({ queryKey: ["people", companyId] })}
          />
        )}
      </>
    );
  },
});
