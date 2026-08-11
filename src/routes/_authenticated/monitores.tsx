import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PeopleByRolePage, InviteDialog } from "@/components/vertex/people-by-role";
import { useSelectedCompany } from "@/components/vertex/company-picker";

export const Route = createFileRoute("/_authenticated/monitores")({
  head: () => ({
    meta: [
      { title: "Monitores — Vertex Agro" },
      { name: "description", content: "Cadastro e gestão de monitores de campo." },
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
          role="monitor"
          title="Monitores"
          description="Monitores de campo responsáveis por acompanhar sangrias, produção e ocorrências."
          emptyLabel="Nenhum monitor cadastrado nesta empresa."
          onAddClick={() => setCreating(true)}
        />
        {companyId && (
          <InviteDialog
            open={creating}
            role="monitor"
            roleLabel="Monitor"
            onOpenChange={setCreating}
            companyId={companyId}
            onSaved={() => qc.invalidateQueries({ queryKey: ["people", companyId] })}
          />
        )}
      </>
    );
  },
});
