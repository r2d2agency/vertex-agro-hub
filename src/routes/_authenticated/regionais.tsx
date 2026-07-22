import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/regionais")({
  head: () => ({ meta: [{ title: "Regionais — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Regionais" description="Cadastro de regionais por empresa." sprint="Sprint 2" />,
});
