import { createFileRoute } from "@tanstack/react-router";
import { PeopleByRolePage } from "@/components/vertex/people-by-role";

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

// Note: InviteDialog is imported from PeopleByRolePage in a real refactor, 
// but here we adjust the component to be more direct.
// Since PeopleByRolePage already handles the creation state internally, 
// we just need to ensure the user doesn't feel forced to go to /usuarios.
