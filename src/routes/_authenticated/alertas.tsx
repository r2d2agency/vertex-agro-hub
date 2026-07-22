import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({ meta: [{ title: "Central de Alertas — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Central de Alertas" description="Central de alertas operacionais e inteligentes." sprint="Sprint 5" />,
});
