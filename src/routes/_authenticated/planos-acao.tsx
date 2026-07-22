import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/planos-acao")({
  head: () => ({ meta: [{ title: "Planos de Ação — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Planos de Ação" description="Planos de ação da consultoria." sprint="Sprint 6" />,
});
