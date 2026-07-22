import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/monitores")({
  head: () => ({ meta: [{ title: "Monitores — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Monitores" description="Cadastro e vínculo de monitores." sprint="Sprint 3" />,
});
