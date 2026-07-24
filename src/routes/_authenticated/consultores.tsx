import { createFileRoute } from "@tanstack/react-router";
import { PeopleByRolePage } from "@/components/vertex/people-by-role";

export const Route = createFileRoute("/_authenticated/consultores")({
  head: () => ({
    meta: [
      { title: "Consultores — Vertex Agro" },
      { name: "description", content: "Consultores técnicos vinculados à empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PeopleByRolePage
      role="consultor"
      title="Consultores"
      description="Consultores técnicos com acesso às fazendas e agendas da empresa."
      emptyLabel="Nenhum consultor cadastrado nesta empresa."
    />
  ),
});
