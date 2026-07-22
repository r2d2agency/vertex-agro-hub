import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/fazendas")({
  head: () => ({ meta: [{ title: "Fazendas — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Fazendas" description="Cadastro de fazendas com perímetros geográficos." sprint="Sprint 2" />,
});
