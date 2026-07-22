import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/alertas-ia")({
  head: () => ({ meta: [{ title: "Alertas Inteligentes — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Alertas Inteligentes" description="Alertas gerados por inteligência artificial." sprint="Sprint 6" />,
});
