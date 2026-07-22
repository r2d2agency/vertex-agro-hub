import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: () => ({ meta: [{ title: "Visitas — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Visitas" description="Visitas técnicas com check-in por GPS." sprint="Sprint 6" />,
});
