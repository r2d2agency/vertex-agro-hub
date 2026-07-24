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
  component: () => (
    <PeopleByRolePage
      role="monitor"
      title="Monitores"
      description="Monitores de campo responsáveis por acompanhar sangrias, produção e ocorrências."
      emptyLabel="Nenhum monitor cadastrado nesta empresa."
    />
  ),
});
