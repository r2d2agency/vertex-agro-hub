import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/tabelas")({
  head: () => ({ meta: [{ title: "Tabelas de Sangria — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Tabelas de Sangria" description="Divisão operacional dos talhões." sprint="Sprint 2" />,
});
