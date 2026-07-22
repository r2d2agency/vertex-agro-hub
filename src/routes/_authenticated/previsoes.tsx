import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/previsoes")({
  head: () => ({ meta: [{ title: "Previsões — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Previsões" description="Previsões e projeções." sprint="Sprint 6" />,
});
